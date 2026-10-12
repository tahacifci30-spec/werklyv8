import { PhaseLine } from "@/components/PhaseLine";
import { firstPhone, telHref } from "@/lib/phone";
import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KpiIcon, type KpiKind } from "@/components/KpiIcon";
import { ListFilters } from "@/components/ListFilters";
import { MoreRows } from "@/components/MoreRows";
import { RevenueChart } from "@/components/RevenueChart";
import { TaskGroups } from "@/components/TaskGroups";
import { StatusBadge, btn } from "@/components/ui";
import { OWNER, bookings, conflicts, techLabel } from "@/lib/agenda";
import { requireSession } from "@/lib/auth";
import { PART_LABEL, addDays, dayLong, dayShort, todayNl } from "@/lib/dates";
import { dashboardFixture } from "@/lib/fixtures/dashboard";
import { daysSince, lastActivity } from "@/lib/metrics";
import { formatEur, formatRange, quoteTotal } from "@/lib/pricing/engine";
import { buckets, outstanding, paidInvoices, toInvoice } from "@/lib/revenue";
import { CALL_PREFIX } from "@/lib/notifications";
import { ReminderButton } from "@/components/lead/ReminderButton";
import { nextWorkday, reminderText, whatsapp } from "@/lib/reminders";
import { datesText } from "@/lib/roster";
import { pageSettings as getSettings, pageAgendaItems as listAgendaItems, listLeads, listRecentLeads } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  PHASES,
  PHASE_OF,
  QUOTE_REMINDER_DAYS,
  STATUS_LABEL,
  STATUS_ORDER,
  isOpen,
  isOwnerTurn,
  nextAction,
  phaseColor,
  quoteWaitingDays,
} from "@/lib/workflow";

export const metadata: Metadata = { title: "Aanvragen" };
export const dynamic = "force-dynamic";

type Alert = { id: string; name: string; text: string; tab?: string };

/** Dingen die meteen aandacht vragen: afmeldingen, botsingen en offertes zonder akkoord. */
function alerts(leads: Lead[], clashes: ReturnType<typeof conflicts>): Alert[] {
  const out: Alert[] = [];
  for (const l of leads) {
    if (!isOpen(l)) continue;
    const a = l.status === "visit_planned" ? l.appointment : l.status === "install_planned" ? l.install_appointment : undefined;
    if (a?.declined_at) out.push({ id: l.id, name: l.customer.name, text: `${techLabel(a.technician)} kan niet op ${dayShort(a.date)} om ${a.time}.`, tab: "afspraken" });
    const waiting = quoteWaitingDays(l);
    if (waiting !== null && waiting >= QUOTE_REMINDER_DAYS)
      out.push({ id: l.id, name: l.customer.name, text: `Offerte staat al ${waiting} dagen open. Stuur een herinnering.`, tab: "offerte" });
  }
  for (const { booking: b } of clashes) {
    if (b.appt.declined_at) continue;
    out.push({ id: b.lead.id, name: b.lead.customer.name, text: `${techLabel(b.appt.technician)} is niet beschikbaar op ${dayShort(b.appt.date)}, maar heeft dan een afspraak.`, tab: "afspraken" });
  }
  return out;
}

/** Welke tab van het dossier hoort bij de volgende stap. */
function tabFor(s: LeadStatus) {
  if (s === "quote_review" || s === "quote_sent") return "offerte";
  if (s === "install_done" || s === "invoice_sent") return "factuur";
  if (s === "completed" || s === "rejected") return "overview";
  return "afspraken";
}

/** Het ene gegeven dat bij deze stap telt: het moment, hoe lang het al wacht, of tot wanneer. */
function moment(l: Lead): string {
  if (l.status === "visit_planned" && l.appointment) return `${dayShort(l.appointment.date)} om ${l.appointment.time} met ${techLabel(l.appointment.technician)}`;
  if (l.status === "install_planned" && l.install_appointment) return `${dayShort(l.install_appointment.date)} met ${techLabel(l.install_appointment.technician)}`;
  if (l.status === "new" && l.preferred) return `Klant wil ${dayShort(l.preferred.first.date)}, ${PART_LABEL[l.preferred.first.part]}`;
  if (l.status === "quote_sent") {
    const d = quoteWaitingDays(l) ?? 0;
    return d === 0 ? "Vandaag verstuurd" : `${d} ${d === 1 ? "dag" : "dagen"} geleden verstuurd`;
  }
  if (l.status === "invoice_sent" && l.invoice?.due_date) return `Te betalen vóór ${dayShort(l.invoice.due_date)}`;
  if (l.status === "completed" && l.invoice?.paid_at) return `Betaald op ${dayShort(l.invoice.paid_at.slice(0, 10))}`;
  return `Sinds ${dayShort(lastActivity(l).slice(0, 10))}`;
}

/** Wacht op klant of monteur: per stap in de volgorde van het proces, en binnen een stap wat het eerst aan de beurt is. */
const STEP_TITLE: Partial<Record<LeadStatus, string>> = {
  visit_planned: "Bezoek gepland",
  quote_sent: "Offerte bij de klant",
  install_planned: "Installatie gepland",
  invoice_sent: "Wacht op betaling",
};
function waitDate(l: Lead) {
  if (l.status === "visit_planned") return l.appointment?.date ?? "";
  if (l.status === "install_planned") return l.install_appointment?.date ?? "";
  if (l.status === "quote_sent") return l.quote?.sent_at ?? "";
  if (l.status === "invoice_sent") return l.invoice?.due_date ?? "";
  return l.created_at;
}
function byWaitingStep(a: Lead, b: Lead) {
  const step = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  return step !== 0 ? step : waitDate(a).localeCompare(waitDate(b));
}

const amount = (l: Lead) =>
  l.invoice ? formatEur(quoteTotal(l.invoice.items)) : l.quote ? formatEur(quoteTotal(l.quote.items)) : formatRange(l.estimate);

/**
 * "Aan u" is gegroepeerd op soort werk, zodat u hetzelfde werk achter elkaar kunt doen:
 * eerst de klanten die u moet bellen, dan de offertes, dan de facturen.
 */
type Work = "bellen" | "offerte" | "factuur";
const WORK: { id: Work; title: string; short: string }[] = [
  { id: "bellen", title: "Klanten bellen", short: "Bellen" },
  { id: "offerte", title: "Offertes", short: "Offertes" },
  { id: "factuur", title: "Facturen", short: "Facturen" },
];
function workOf(l: Lead): Work {
  if (l.status === "visit_done" || l.status === "quote_review") return "offerte";
  if (l.status === "install_done") return "factuur";
  return "bellen";
}
/** Waarvoor u belt, of wat u met de offerte of factuur doet. */
function taskOf(l: Lead): string {
  switch (l.status) {
    case "new":
      return "Bezoek inplannen";
    case "install_to_plan":
      return "Installatie inplannen";
    case "visit_planned":
    case "install_planned":
      return "Nieuw moment inplannen";
    case "quote_sent":
      return "Herinneren aan de offerte";
    case "visit_done":
      return "Conceptofferte maken";
    case "quote_review":
      return "Offerte controleren";
    case "install_done":
      return "Factuur controleren";
    default:
      return nextAction(l);
  }
}

/** Zoveel rijen per groep staan er direct; de rest zit achter "Toon alle". Zo blijft de pagina kort, ook met veel aanvragen. */
const MOBILE_ROWS = 5;
/** Zoveel aanvragen toont de lijst onderaan direct, en zoveel komen er per keer bij. */
const LIST_ROWS = 25;
/** "Afgerond" toont standaard alleen de laatste maanden; ouder komt erbij als u erom vraagt. */
const DONE_MONTHS = 3;
/** De monteur van een klus: wie de installatie doet, anders wie het bezoek deed. */
const techOf = (l: Lead) => l.install_appointment?.technician ?? l.appointment?.technician ?? "";

type TableTab = "wacht" | "lopend" | "afgerond";
const TABS: { id: TableTab; label: string }[] = [
  { id: "wacht", label: "Wacht op klant of monteur" },
  { id: "lopend", label: "Alles wat loopt" },
  { id: "afgerond", label: "Afgerond" },
];

function Phone({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" }));
  return h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; n?: string; oud?: string; fase?: string; monteur?: string; data?: string }> }) {
  const session = await requireSession("owner");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const today = todayNl();

  // Oude afgeronde aanvragen worden alleen opgehaald als u erom vraagt: bij zoeken en bij "ook ouder tonen".
  const older = sp.oud === "1";
  const real = await Promise.all([
    q || older ? listLeads(session.company_id) : listRecentLeads(session.company_id),
    listAgendaItems(session.company_id),
    getSettings(session.company_id),
  ]);
  // Alleen in ontwikkeling: met ?data=worst (of leeg, een, veel) testgegevens in plaats van de echte.
  const fixture = process.env.NODE_ENV === "production" ? null : dashboardFixture(sp.data, { leads: real[0], items: real[1], settings: real[2] });
  const [all, items, settings] = fixture ? [fixture.leads, fixture.items, fixture.settings] : real;
  const clashes = conflicts(all, items);
  const alertList = alerts(all, clashes);
  // Een afspraak die niet door kan gaan omdat de monteur vrij of ziek is: die klant moet u bellen voor een nieuw moment.
  const clashIds = new Set(clashes.filter((c) => !c.booking.appt.declined_at).map((c) => c.booking.lead.id));
  const mine = (l: Lead) => isOwnerTurn(l) || clashIds.has(l.id);

  // Kerncijfers
  const aanU = all.filter(mine).sort((a, b) => lastActivity(a).localeCompare(lastActivity(b)));
  const work = WORK.map((w) => ({ ...w, leads: aanU.filter((l) => workOf(l) === w.id) })).filter((w) => w.leads.length > 0);
  // Ook van u: roosteraanvragen van het team, en gesprekken die via de website zijn ingepland.
  const rosterOpen = settings.roster.filter((r) => r.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const calls = items
    .filter((i) => i.id.startsWith(CALL_PREFIX) && i.date >= today)
    .sort((a, b) => `${a.date}${a.start ?? ""}`.localeCompare(`${b.date}${b.start ?? ""}`))
    .map((i) => {
      const m = i.title.match(/^(.*), bel (.+)$/);
      return { id: i.id, date: i.date, time: i.start ?? "", title: m ? m[1] : i.title, phone: m ? m[2].trim() : "" };
    });
  const taskCount = aanU.length + rosterOpen.length + calls.length;
  const quotesOut = all.filter((l) => l.status === "quote_sent" && l.quote);
  const quotesOutSum = quotesOut.reduce((sum, l) => sum + quoteTotal(l.quote!.items), 0);
  const toInvoiceCount = all.filter((l) => l.status === "install_done" && l.invoice).length;
  const months = buckets(paidInvoices(all), "month");
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const change = lastMonth && lastMonth.total > 0 ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100) : null;
  const open = outstanding(all);
  const openCount = all.filter((l) => l.status === "invoice_sent").length;
  const chart = months.slice(-6);
  const chartMax = Math.max(...chart.map((b) => b.total), 1);

  // Pijplijn: hoeveel lopende klussen per fase
  const active = all.filter(isOpen);
  const pipeline = PHASES.slice(0, 5).map((p) => ({ ...p, count: active.filter((l) => PHASE_OF[l.status] === p.id).length }));

  // Vandaag en daarna
  const todays = all
    .filter(isOpen)
    .flatMap((l) => {
      const out: { lead: Lead; kind: "Bezoek" | "Installatie"; date: string; time: string; tech: string }[] = [];
      if (l.status === "visit_planned" && l.appointment && !l.appointment.declined_at && l.appointment.date <= today)
        out.push({ lead: l, kind: "Bezoek", date: l.appointment.date, time: l.appointment.time, tech: l.appointment.technician });
      if (l.status === "install_planned" && l.install_appointment && !l.install_appointment.declined_at && l.install_appointment.date <= today)
        out.push({ lead: l, kind: "Installatie", date: l.install_appointment.date, time: l.install_appointment.time, tech: l.install_appointment.technician });
      return out;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const dueToday = todays.filter((t) => t.date === today);
  // Klanten met een afspraak op de volgende werkdag: die krijgen een herinnering.
  const remindDay = nextWorkday(today);
  const toRemind = bookings(all)
    // Geen herinnering voor een afspraak die niet doorgaat: de monteur heeft zich afgemeld of is die dag vrij of ziek.
    .filter((b) => !b.done && b.appt.date === remindDay && (!b.part || b.part.n === 1) && b.lead.status.endsWith("_planned") && !b.appt.declined_at && !clashIds.has(b.lead.id))
    .sort((a, b) => a.appt.time.localeCompare(b.appt.time));
  const phoneOf = (tech: string) => settings.team.find((m) => m.name === tech)?.phone;
  const overdue = todays.filter((t) => t.date < today);
  const upcoming = [
    ...bookings(all)
      .filter((b) => !b.done && b.lead.status !== "completed" && b.appt.date > today && !b.appt.declined_at && !clashIds.has(b.lead.id))
      .map((b) => ({ date: b.appt.date, time: b.appt.time, title: b.lead.customer.name, sub: `${b.kind === "visit" ? "Bezoek" : "Installatie"} in ${b.lead.customer.city}`, href: `/dashboard/${b.lead.id}?tab=afspraken` })),
    ...items
      .filter((i) => i.kind === "item" && i.date > today && !i.id.startsWith(CALL_PREFIX))
      .map((i) => ({ date: i.date, time: i.start ?? "00:00", title: i.title, sub: `Overige, ${techLabel(i.who)}`, href: `/dashboard/agenda?d=${i.date}` })),
  ]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 2);
  const offToday = items.filter((i) => i.kind === "off" && i.date <= today && (i.date_to ?? i.date) >= today);

  // Alle aanvragen. Wat op u wacht staat al bovenaan; hier staat de rest, en zoeken gaat door alles heen.
  const matches = (l: Lead) =>
    !q || [l.customer.name, l.customer.postcode, l.customer.city, l.customer.email, l.customer.phone].join(" ").toLowerCase().includes(q);
  const fase = PHASES.some((p) => p.id === sp.fase) ? sp.fase! : "";
  const monteur = settings.team.some((m) => m.name === sp.monteur) ? sp.monteur! : "";
  const picked = (l: Lead) => (!fase || PHASE_OF[l.status] === fase) && (!monteur || techOf(l) === monteur);
  const doneFrom = new Date();
  doneFrom.setMonth(doneFrom.getMonth() - DONE_MONTHS);
  const recentlyDone = (l: Lead) => older || lastActivity(l) >= doneFrom.toISOString();
  const inTab: Record<TableTab, Lead[]> = {
    wacht: all.filter((l) => isOpen(l) && !mine(l) && picked(l)).sort(byWaitingStep),
    lopend: all.filter((l) => isOpen(l) && picked(l)).sort(byWaitingStep),
    afgerond: all.filter((l) => !isOpen(l) && picked(l) && recentlyDone(l)).sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
  };
  const tab: TableTab = TABS.find((t) => t.id === sp.filter)?.id ?? "wacht";
  // Zoeken gaat door alles heen, ook door oude afgeronde aanvragen.
  const found = q ? all.filter((l) => matches(l) && picked(l)).sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || lastActivity(b).localeCompare(lastActivity(a))) : [];
  const rows = q ? found : inTab[tab];
  const stepped = !q && tab !== "afgerond";
  const count = Math.max(LIST_ROWS, Math.min(Number.parseInt(sp.n ?? "", 10) || LIST_ROWS, 5000));
  const shown = rows.slice(0, count);
  /** Link naar deze lijst met dezelfde keuzes, behalve wat u meegeeft. Het aantal rijen begint dan weer bij het begin. */
  const keep: Record<string, string> = { ...(q ? { q: sp.q ?? "" } : { filter: tab }), ...(older ? { oud: "1" } : {}), ...(fixture ? { data: sp.data ?? "" } : {}) };
  const listHref = (change: Record<string, string | undefined> = {}) => {
    const next = new URLSearchParams({ ...keep, fase, monteur });
    for (const [k, v] of Object.entries(change)) if (v) next.set(k, v); else next.delete(k);
    for (const k of [...next.keys()]) if (!next.get(k)) next.delete(k);
    return `/dashboard?${next}`;
  };

  const fasesCard = (
        <section aria-labelledby="pijplijn-title" className="order-3 min-w-0 rounded-2xl border border-line bg-surface p-5 lg:order-none">
          <h2 id="pijplijn-title" className="text-base font-semibold">Lopende klussen per fase</h2>
          <p className="mt-1 text-sm text-muted">{active.length} lopend</p>
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-background" aria-hidden="true">
            {pipeline.filter((p) => p.count > 0).map((p) => (
              <span key={p.id} className="h-full" style={{ flexGrow: p.count, background: p.color }} />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5">
            {pipeline.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="flex-1">{p.label}</span>
                <span className="tabular font-semibold">{p.count}</span>
              </li>
            ))}
          </ul>
        </section>
  );
  const omzetCard = (
          <section aria-labelledby="omzet-title" className="order-4 flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 lg:order-none lg:max-h-[34rem]">
            <div className="flex items-center justify-between gap-3">
              <h2 id="omzet-title" className="text-base font-semibold">Omzet per maand</h2>
              <Link href="/dashboard/revenue" className="-my-2 inline-flex min-h-11 items-center text-sm font-medium text-brand-strong hover:underline">Alle cijfers</Link>
            </div>
            {/* De grafiek groeit een beetje mee, maar nooit verder dan dit: anders worden de staven torenhoog als "Aan u" is uitgeklapt. */}
            <div className="mt-2 max-h-[22rem] flex-1">
              <RevenueChart series={chart} max={chartMax} />
            </div>
          </section>
  );

  /*
   * Groot scherm: links "Aan u" met daaronder de fases, rechts Vandaag met daaronder de omzet. Elke kaart staat
   * altijd op dezelfde plek en de onderkanten sluiten op elkaar aan. "Aan u" heeft daarom een vaste hoogte en
   * een eigen schuifbalk als er meer taken zijn dan er passen. Op de telefoon staat alles onder elkaar en zit
   * de rest per groep achter "Toon alle".
   */

  return (
    <AppShell session={session} wide>
      {/* Kop */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Werkly <span aria-hidden="true">›</span> <span className="font-medium text-foreground">Aanvragen</span>
          </p>
          <h1 className="display-md mt-1 text-4xl">{greeting()}</h1>
          <p className="mt-1 text-muted">
            {taskCount === 0 ? "Niets dat op u wacht." : `${taskCount} ${taskCount === 1 ? "taak wacht" : "taken wachten"} op u.`}{" "}
            {dueToday.length === 0 ? "Vandaag geen afspraken." : `Vandaag ${dueToday.length} ${dueToday.length === 1 ? "afspraak" : "afspraken"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium first-letter:uppercase">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
            </svg>
            <span className="first-letter:uppercase">{dayLong(today)}</span>
          </span>
          <Link href="/dashboard/agenda" className={btn.secondary}>Agenda openen</Link>
          <Link href="/dashboard/nieuw" className={btn.primary}>
            <span aria-hidden="true" className="text-lg leading-none">+</span> Aanvraag toevoegen
          </Link>
        </div>
      </div>

      {/* Aandachtspunten, als er iets is */}
      {alertList.length > 0 && (
        <div className="mt-6 rounded-2xl border border-signal/60 bg-signal/15">
          <Link href={`/dashboard/${alertList[0].id}?tab=${alertList[0].tab ?? "overview"}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-signal/10">
            <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal text-xs font-bold text-petrol">!</span>
            <span className="min-w-0 flex-1">
              <strong>{alertList[0].name}:</strong> {alertList[0].text}
            </span>
            <span aria-hidden="true" className="text-muted">›</span>
          </Link>
          {alertList.length > 1 && (
            <details className="group border-t border-signal/40">
              <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm font-medium text-petrol [&::-webkit-details-marker]:hidden">
                Nog {alertList.length - 1} {alertList.length === 2 ? "punt" : "punten"} die aandacht vragen
              </summary>
              <ul className="divide-y divide-signal/30 border-t border-signal/40">
                {alertList.slice(1).map((a, i) => (
                  <li key={a.id + i}>
                    <Link href={`/dashboard/${a.id}?tab=${a.tab ?? "overview"}`} className="block px-4 py-2.5 text-sm hover:bg-signal/10">
                      <strong>{a.name}:</strong> {a.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Cijfers: het geld dat onderweg is, van offerte tot betaald. Altijd bovenaan, ook op de telefoon (daar compact, twee aan twee). */}
      <div className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <Kpi kind="quotes" label="Offertes bij de klant" value={formatEur(quotesOutSum)} href="/dashboard?filter=wacht#lijst" note={`${quotesOut.length} ${quotesOut.length === 1 ? "wacht" : "wachten"} op akkoord`} />
        <Kpi kind="toInvoice" label="Nog te factureren" value={formatEur(toInvoice(all))} href="/dashboard/revenue/te-factureren" note={`${toInvoiceCount} ${toInvoiceCount === 1 ? "klus klaar" : "klussen klaar"}`} />
        <Kpi kind="open" label="Nog te ontvangen" value={formatEur(open)} href="/dashboard/revenue/openstaand" note={`${openCount} ${openCount === 1 ? "factuur" : "facturen"} open`} />
        <Kpi
          kind="revenue"
          label="Omzet deze maand"
          value={formatEur(thisMonth.total)}
          href="/dashboard/revenue"
          badge={change === null ? undefined : { text: Math.abs(change) > 999 ? (change > 0 ? "> +999%" : "< -999%") : `${change > 0 ? "+" : ""}${change}%`, good: change >= 0 }}
          note="t.o.v. vorige maand"
        />
      </div>

      {/* Aan u (alles, per soort werk) met rechts vandaag en de fases */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <section id="aan-u" aria-labelledby="aan-u-title" className="order-1 flex min-w-0 scroll-mt-24 flex-col rounded-2xl border border-line bg-surface lg:order-none lg:min-h-[27rem] lg:flex-1">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <h2 id="aan-u-title" className="flex items-center gap-2.5 text-base font-semibold"><span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-signal" />Aan u</h2>
            <span className="text-sm text-muted">{taskCount === 0 ? "" : `${taskCount} ${taskCount === 1 ? "taak" : "taken"}`}</span>
          </div>
          {taskCount === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
              <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-petrol">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              <p className="mt-3 font-semibold">Alles is afgewerkt</p>
              <p className="mt-1 text-sm text-muted">Er wacht nu niets op u. Nieuwe taken verschijnen hier vanzelf.</p>
            </div>
          ) : (
            <TaskGroups
              groups={[
                ...work.map((w) => ({
                  id: w.id,
                  label: w.short,
                  count: w.leads.length,
                  node: (
                <div>
                  <GroupTitle title={w.title} count={w.leads.length} />
                  <MoreRows total={w.leads.length} buttonClass={w.leads.length <= MOBILE_ROWS ? "hidden" : "lg:hidden"}>
                  <ul className="divide-y divide-line">
                    {w.leads.map((l, i) => {
                      const days = daysSince(lastActivity(l));
                      return (
                        <li key={l.id} className={`flex items-center gap-2 pr-4 transition-colors duration-100 hover:bg-background ${i >= MOBILE_ROWS ? "max-lg:group-data-[open=false]/more:hidden" : ""}`}>
                          <Link href={`/dashboard/${l.id}?tab=${tabFor(l.status)}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 active:bg-slate-100">
                            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phaseColor(l.status) }} />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 break-words font-semibold" title={l.customer.name}>{l.customer.name}</span>
                              <span className="block truncate text-sm text-muted">
                                <span className="font-medium text-petrol">{taskOf(l)}</span>
                                <span className="hidden sm:inline"> · {l.customer.city}</span>
                              </span>
                              {/* Op de telefoon staat de wachttijd onder de taak, zodat de taak zelf niet wordt afgekapt. */}
                              <span className={`block text-xs sm:hidden ${days >= 3 ? "font-medium text-amber-800" : "text-muted"}`}>
                                {days === 0 ? "Sinds vandaag" : `Wacht ${days} ${days === 1 ? "dag" : "dagen"}`} · {l.customer.city}
                              </span>
                            </span>
                            <span className={`hidden shrink-0 text-right text-xs sm:block ${days >= 3 ? "font-medium text-amber-800" : "text-muted"}`}>
                              {days === 0 ? "Sinds vandaag" : `Wacht ${days} ${days === 1 ? "dag" : "dagen"}`}
                            </span>
                          </Link>
                          {w.id === "bellen" ? (
                            <a
                              href={telHref(l.customer.phone)}
                              aria-label={`Bel ${l.customer.name}, ${l.customer.phone}`}
                              title={l.customer.phone}
                              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-soft px-3 text-sm xl:min-w-[9.5rem] font-semibold text-brand-strong transition-[background-color,color,transform] duration-100 hover:bg-brand hover:text-white active:scale-[0.96]"
                            >
                              <Phone />
                              <span className="tabular hidden xl:inline">{firstPhone(l.customer.phone)}</span>
                              <span className="xl:hidden">Bel</span>
                            </a>
                          ) : (
                            <span aria-hidden="true" className="px-1 text-muted">›</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  </MoreRows>
                </div>
                  ),
                })),
                ...(rosterOpen.length > 0
                  ? [{ id: "rooster", label: "Rooster", count: rosterOpen.length, node: (
                <div>
                  <GroupTitle title="Rooster" count={rosterOpen.length} />
                  <ul className="divide-y divide-line">
                    {rosterOpen.map((r) => (
                      <li key={r.id}>
                        <Link href="/dashboard/rooster" className="flex items-center gap-3 px-5 py-3 transition-colors duration-100 hover:bg-background active:bg-slate-100">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-signal" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 break-words font-semibold" title={techLabel(r.who)}>{techLabel(r.who)}</span>
                            <span className="block break-words text-sm font-medium text-petrol">{r.kind === "off" ? `${r.reason ?? "Vrij"} aangevraagd` : "Kan werken"}</span>
                            <span className="block break-words text-sm text-muted">{datesText(r.dates)}</span>
                          </span>
                          <span className="shrink-0 text-sm font-medium text-brand-strong">Beoordelen</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                  ) }]
                  : []),
                ...(calls.length > 0
                  ? [{ id: "gesprek", label: "Gesprekken", count: calls.length, node: (
                <div>
                  <GroupTitle title="Gesprekken via de website" count={calls.length} />
                  <ul className="divide-y divide-line">
                    {calls.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 pr-4 transition-colors duration-100 hover:bg-background">
                        <Link href={`/dashboard/agenda?m=${c.date.slice(0, 7)}&d=${c.date}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 active:bg-slate-100">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 break-words font-semibold" title={c.title}>{c.title}</span>
                            <span className="block truncate text-sm text-muted">
                              <span className="font-medium text-petrol">{c.date === today ? "Vandaag" : dayShort(c.date)}</span>
                              {c.time && ` om ${c.time}`}
                            </span>
                          </span>
                        </Link>
                        {c.phone && (
                          <a href={telHref(c.phone)} aria-label={`Bel ${c.phone}`} title={c.phone} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-soft px-3 text-sm xl:min-w-[9.5rem] font-semibold text-brand-strong transition-[background-color,color,transform] duration-100 hover:bg-brand hover:text-white active:scale-[0.96]">
                            <Phone />
                            <span className="tabular hidden xl:inline">{firstPhone(c.phone)}</span>
                            <span className="xl:hidden">Bel</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                  ) }]
                  : []),
              ]}
            />
          )}
        </section>
          {fasesCard}
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4 lg:[&>*:last-child]:flex-1">
        <section aria-labelledby="today" className="order-2 flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 lg:order-none lg:max-h-[40rem]">
          <div className="flex items-center justify-between gap-2">
            <h2 id="today" className="flex items-center gap-2.5 text-base font-semibold">
              <KpiIcon kind="today" className="h-8 w-8" />
              Vandaag
            </h2>
            <span className="text-sm text-muted">{dueToday.length} {dueToday.length === 1 ? "afspraak" : "afspraken"}</span>
          </div>
          {/* Bij veel afspraken schuift de lijst binnen de tegel, zodat de andere tegels op hun plek blijven. */}
          <div className="lg:-mr-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-3" tabIndex={-1}>
          {offToday.length > 0 && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
              Niet beschikbaar: {offToday.map((i) => techLabel(i.who).replace(" (eigenaar)", "")).join(", ")}
            </p>
          )}
          {dueToday.length === 0 ? (
            <p className="mt-3 text-muted">Geen afspraken vandaag.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dueToday.map((t) => (
                <li key={t.lead.id + t.kind} className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <span className="tabular w-12 shrink-0 text-lg font-semibold">{t.time}</span>
                  <Link href={`/dashboard/${t.lead.id}?tab=afspraken`} className="min-w-0 flex-1 hover:text-brand-strong">
                    <span className="block truncate font-medium" title={t.lead.customer.name}>{t.lead.customer.name}</span>
                    <span className="block truncate text-sm text-muted" title={`${t.kind} met ${techLabel(t.tech)}`}>
                      {t.kind} met {techLabel(t.tech)}
                    </span>
                  </Link>
                  {t.tech === OWNER && (
                    <Link href={`/technician/${t.lead.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong active:scale-[0.97]">
                      Afronden
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {overdue.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium text-amber-900">Nog af te ronden</p>
              <p className="text-xs text-muted">De afspraak is geweest, maar de monteur heeft hem nog niet afgerond.</p>
              <ul className="mt-2 space-y-1">
                {overdue.map((t) => (
                  <li key={t.lead.id + t.kind} className="flex items-center gap-2">
                    <Link href={`/dashboard/${t.lead.id}?tab=afspraken`} className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="w-24 shrink-0 text-sm font-medium first-letter:uppercase">
                        {dayShort(t.date)}
                        <span className="tabular block text-xs font-normal text-muted">{t.time}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" title={t.lead.customer.name}>{t.lead.customer.name}</span>
                        <span className="block truncate text-xs text-muted" title={`${t.kind} door ${techLabel(t.tech)}`}>
                          {t.kind} door {techLabel(t.tech)}
                        </span>
                      </span>
                    </Link>
                    {t.tech === OWNER && (
                      <Link href={`/technician/${t.lead.id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong hover:bg-brand hover:text-white">
                        Afronden
                      </Link>
                    )}
                    {t.tech !== OWNER && phoneOf(t.tech) && (
                      <a href={telHref(phoneOf(t.tech)!)} title={phoneOf(t.tech)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong hover:bg-brand hover:text-white">
                        <Phone /> Bel {t.tech.split(" ")[0]}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {toRemind.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium">
                Herinner uw klanten voor <span className="first-letter:uppercase">{remindDay === addDays(today, 1) ? "morgen" : dayShort(remindDay)}</span>
              </p>
              <p className="text-xs text-muted">Eén tik opent WhatsApp met het bericht al ingevuld.</p>
              <ul className="mt-2 space-y-1">
                {toRemind.map((b) => (
                  <li key={b.lead.id + b.kind} className="flex items-center gap-2">
                    <Link href={`/dashboard/${b.lead.id}?tab=afspraken`} className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="tabular w-12 shrink-0 text-sm font-medium">{b.appt.time}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" title={b.lead.customer.name}>{b.lead.customer.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {b.kind === "visit" ? "Bezoek" : "Installatie"} in {b.lead.customer.city}
                        </span>
                      </span>
                    </Link>
                    <ReminderButton id={b.lead.id} kind={b.kind} done={!!b.appt.reminded_at} href={whatsapp(b.lead.customer.phone, reminderText(b.lead, b.kind, b.appt, settings.company_name))} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium text-muted">Hierna</p>
              <ul className="mt-2 space-y-1">
                {upcoming.map((u) => (
                  <li key={u.href + u.date + u.time}>
                    <Link href={u.href} className="flex items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="w-24 shrink-0 text-sm font-medium first-letter:uppercase">
                        {dayShort(u.date)}
                        {u.time !== "00:00" && <span className="tabular block text-xs font-normal text-muted">{u.time}</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" title={u.title}>{u.title}</span>
                        <span className="block truncate text-xs text-muted" title={u.sub}>{u.sub}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          </div>
        </section>

          {omzetCard}
        </div>
      </div>
      </div>

      {/* Alle aanvragen */}
      <section id="lijst" aria-labelledby="lijst-title" className="mt-4 scroll-mt-24 rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 id="lijst-title" className="text-base font-semibold">{q ? `Zoekresultaten voor "${q}"` : "Alle aanvragen"}</h2>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <nav aria-label="Aanvragen per groep" className="flex min-w-0 max-w-full overflow-x-auto rounded-xl bg-background p-1 ring-1 ring-inset ring-line [scrollbar-width:none]">
              {TABS.map((t) => {
                const on = !q && t.id === tab;
                return (
                  <Link
                    key={t.id}
                    href={`${listHref({ filter: t.id, q: undefined, oud: undefined })}#lijst`}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-100 ${
                      on ? "bg-surface text-foreground shadow-sm ring-1 ring-line" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    <span className="tabular text-xs text-muted">{inTab[t.id].length}</span>
                  </Link>
                );
              })}
            </nav>
            <ListFilters
              params={keep}
              fase={fase}
              monteur={monteur}
              fases={PHASES.slice(0, 5).map((ph) => ({ value: ph.id, label: ph.label }))}
              monteurs={settings.team.map((m) => ({ value: m.name, label: techLabel(m.name) }))}
            />
            <form role="search" action="/dashboard#lijst" className="relative w-full sm:w-auto">
              <label htmlFor="q" className="sr-only">Zoek op naam, postcode of plaats</label>
              <input
                id="q"
                name="q"
                type="search"
                autoComplete="off"
                defaultValue={sp.q ?? ""}
                placeholder="Zoek naam of plaats"
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm placeholder:text-slate-500 focus:border-brand sm:w-56"
              />
            </form>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="border-t border-line p-6">
            {q ? (
              <>
                <p className="font-medium">Geen aanvragen gevonden voor &ldquo;{q}&rdquo;.</p>
                <Link href="/dashboard#lijst" className={`${btn.secondary} mt-4`}>Zoekopdracht wissen</Link>
              </>
            ) : (
              <>
                <p className="text-muted">
                  {fase || monteur
                    ? "Geen aanvragen met deze filters."
                    : tab === "wacht"
                      ? "Niets dat op een klant of monteur wacht."
                      : tab === "afgerond" && !older
                        ? `Niets afgerond in de laatste ${DONE_MONTHS} maanden.`
                        : "Geen aanvragen in deze groep."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(fase || monteur) && (
                    <Link href={listHref({ fase: undefined, monteur: undefined })} scroll={false} className={btn.secondary}>Filters wissen</Link>
                  )}
                  {tab === "afgerond" && !older && (
                    <Link href={listHref({ oud: "1" })} scroll={false} className={btn.secondary}>Ook ouder tonen</Link>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {q && (
              <p className="border-t border-line px-5 py-2 text-sm text-muted">
                {rows.length} gevonden, ook in afgeronde aanvragen.{" "}
                <Link href="/dashboard#lijst" className="font-medium text-brand-strong hover:underline">Zoekopdracht wissen</Link>
              </p>
            )}
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem_1rem] gap-4 border-t border-line px-5 py-2 text-xs font-medium text-muted md:grid" aria-hidden="true">
              <span>Klant</span>
              <span>Fase</span>
              <span>Volgende stap</span>
              <span className="text-right">Bedrag</span>
              <span />
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {shown.map((l, idx) => {
                const mine = isOwnerTurn(l);
                const newStep = stepped && (idx === 0 || shown[idx - 1].status !== l.status);
                return (
                  <li key={l.id}>
                    {newStep && (
                      <p className="flex items-center gap-2 bg-surface px-5 pb-1 pt-4 text-xs font-medium text-muted">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: phaseColor(l.status) }} />
                        {(tab === "wacht" && STEP_TITLE[l.status]) || STATUS_LABEL[l.status]}
                        <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] font-semibold text-foreground ring-1 ring-inset ring-line">
                          {rows.filter((x) => x.status === l.status).length}
                        </span>
                      </p>
                    )}
                    <Link
                      href={`/dashboard/${l.id}?tab=${tabFor(l.status)}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors duration-100 hover:bg-background active:bg-slate-100 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem_1rem]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold" title={l.customer.name}>{l.customer.name}</span>
                        <span className="block truncate text-sm text-muted" title={l.customer.city}>{l.customer.city}</span>
                      </span>
                      <span className="justify-self-end md:justify-self-start">
                        <StatusBadge status={l.status} />
                        <PhaseLine status={l.status} className="mt-2 hidden w-28 md:flex" />
                      </span>
                      <span className="col-span-2 min-w-0 md:col-span-1">
                        <span className={`block truncate text-sm font-medium ${mine ? "text-petrol" : "text-muted"}`}>
                          {mine ? nextAction(l) : isOpen(l) ? `Wacht op ${l.status === "visit_planned" || l.status === "install_planned" ? "monteur" : "klant"}` : nextAction(l)}
                        </span>
                        <span className="block truncate text-xs text-muted" title={moment(l)}>{moment(l)}</span>
                      </span>
                      <span className="tabular hidden text-right text-sm md:block">{amount(l)}</span>
                      <span aria-hidden="true" className="hidden text-muted md:block">›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {(rows.length > LIST_ROWS || (tab === "afgerond" && !q)) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-3 pl-5">
                <p className="text-sm text-muted">
                  {shown.length} van {rows.length}
                  {tab === "afgerond" && !q && !older ? `, afgerond in de laatste ${DONE_MONTHS} maanden` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tab === "afgerond" && !q && (
                    <Link href={listHref({ oud: older ? undefined : "1" })} scroll={false} className={`${btn.secondary} min-h-10 px-4`}>
                      {older ? `Alleen de laatste ${DONE_MONTHS} maanden` : "Ook ouder tonen"}
                    </Link>
                  )}
                  {count > LIST_ROWS && (
                    <Link href={listHref()} scroll={false} className={`${btn.secondary} min-h-10 px-4`}>
                      Toon minder
                    </Link>
                  )}
                  {shown.length < rows.length && (
                    <Link href={listHref({ n: String(count + LIST_ROWS) })} scroll={false} className={`${btn.secondary} min-h-10 px-4 text-brand-strong`}>
                      Toon {Math.min(LIST_ROWS, rows.length - shown.length)} meer
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

    </AppShell>
  );
}

function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
      {title}
      <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] text-foreground ring-1 ring-inset ring-line">{count}</span>
    </h3>
  );
}

function Kpi({
  kind,
  label,
  value,
  href,
  note,
  badge,
}: {
  kind: KpiKind;
  label: string;
  value: string;
  href: string;
  note: string;
  badge?: { text: string; good: boolean };
}) {
  // De omzet is de donkere tegel: het bedrag waar het om draait, in de kleur van de website.
  const dark = kind === "revenue";
  return (
    <Link
      href={href}
      className={`group flex min-w-0 flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-[border-color,transform] duration-100 active:scale-[0.98] ${
        dark ? "border-petrol bg-petrol text-white hover:border-signal" : "border-line bg-surface hover:border-brand/50"
      } max-sm:p-3`}
    >
      <span className={`flex items-center gap-2 text-sm font-medium sm:gap-3 ${dark ? "text-teal-50/85" : "text-muted"}`}>
        <KpiIcon kind={kind} tone={dark ? "signal" : "soft"} className="h-6 w-6 sm:h-9 sm:w-9" />
        <span className="min-w-0 flex-1 text-xs leading-tight sm:text-sm">{label}</span>
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 max-sm:hidden">›</span>
      </span>
      <span className={`tabular mt-1.5 whitespace-nowrap font-semibold tracking-tight sm:mt-4 ${value.length > 11 ? "text-base sm:text-2xl" : value.length > 9 ? "text-lg sm:text-[1.7rem]" : "text-xl sm:text-3xl"}`}>{value}</span>
      <span className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:mt-3 sm:text-sm ${dark ? "text-teal-50/75" : "text-muted"}`}>
        {badge && (
          <span className={`tabular rounded-md px-1.5 py-0.5 text-xs font-semibold ${badge.good ? (dark ? "bg-signal text-petrol" : "bg-emerald-50 text-emerald-800") : "bg-red-50 text-red-800"}`}>
            {badge.text}
          </span>
        )}
        {note}
      </span>
    </Link>
  );
}

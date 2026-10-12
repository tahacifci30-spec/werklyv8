/** Voorbeeldschermen op de website. Alleen om te laten zien, niet bedoeld om op te klikken. */

import { DEMO_JOBS, DEMO_REVENUE } from "@/lib/fixtures/demo-numbers";
import { KpiIcon, type KpiKind } from "../KpiIcon";
import { DemoRevenueChart } from "./DemoRevenueChart";
import { NavIcon } from "../SideNav";
import { ScaledScreen } from "./ScaledScreen";

function Frame({ caption, children, below = false, interactive = false }: { caption?: string; children: React.ReactNode; below?: boolean; interactive?: boolean }) {
  // Een scherm dat echt te bedienen is krijgt geen bijschrift en blijft bereikbaar voor muis, vinger en toetsenbord.
  if (interactive) return <div className="w-full">{children}</div>;
  return (
    <figure className={`mx-auto flex w-full ${below ? "flex-col-reverse" : "flex-col"}`}>
      <figcaption className={`${below ? "mt-4" : "mb-3"} flex items-center justify-center gap-2 text-sm font-medium text-muted`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {caption}
      </figcaption>
      <div aria-hidden="true" className="pointer-events-none select-none">
        {children}
      </div>
    </figure>
  );
}

/** `captionBelow`: bijschrift onder de telefoon, als er boven iets anders op de telefoon aansluit. */
export function PhoneMock({ caption, children, interactive, captionBelow }: { caption?: string; children: React.ReactNode; interactive?: boolean; captionBelow?: boolean }) {
  return (
    <Frame caption={caption} interactive={interactive} below={captionBelow}>
      {/* iPhone 16: 147,6 x 71,6 mm, met statusbalk, Dynamic Island en thuisbalk */}
      <div className="relative mx-auto flex aspect-[71.6/147.6] w-[min(100%,280px)] flex-col overflow-hidden rounded-[3rem] border-[10px] border-slate-900 bg-background shadow-lg ring-1 ring-slate-700/40">
        <div className="relative flex h-10 shrink-0 items-end justify-between px-6 pb-1 text-[11px] font-semibold text-slate-900">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-slate-900" />
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-px">
              {[3, 5, 7, 9].map((h) => (
                <span key={h} className="w-[2px] rounded-sm bg-slate-900" style={{ height: h }} />
              ))}
            </span>
            <span className="h-2.5 w-5 rounded-[3px] border border-slate-900 p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-slate-900" />
            </span>
          </span>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden px-4 pt-3">{children}</div>
        <div className="mx-auto mb-2 mt-1 h-1 w-24 shrink-0 rounded-full bg-slate-900" />
      </div>
    </Frame>
  );
}

/** Laptop met een scherm in 16:10 en een voet, voor het overzicht van de eigenaar. */
/** `large`: breder, voor een scherm met veel details dat leesbaar moet blijven. */
export function LaptopMock({ caption, children, interactive, large }: { caption?: string; children: React.ReactNode; interactive?: boolean; large?: boolean }) {
  return (
    <Frame caption={caption} below interactive={interactive}>
      <div className={`mx-auto w-full ${large ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className="rounded-t-2xl border-[8px] border-b-0 border-slate-900 bg-slate-900 shadow-2xl sm:border-[10px] sm:border-b-0">
          <div className="relative aspect-[16/11] overflow-hidden rounded-t-md bg-background">{children}</div>
        </div>
        <div className="relative mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg sm:h-4">
          <span className="absolute left-1/2 top-0 h-1 w-20 -translate-x-1/2 rounded-b-md bg-slate-500/60" />
        </div>
      </div>
    </Frame>
  );
}

/**
 * Het overzicht van de eigenaar zoals het in de app staat, met dezelfde cijfers en namen als het voorbeeldbedrijf
 * in de database (scripts/demo-data.ts), op een maandag. Op ware grootte opgebouwd en passend verkleind, zodat
 * het hele overzicht tot en met de omzet en de fases op het scherm past. Verandert het script, pas dit dan mee aan.
 */
export function OverviewScreen() {
  return (
    <ScaledScreen width={1840}>
      <DashboardReplica />
    </ScaledScreen>
  );
}

type Task = [name: string, task: string, city: string, wait: string, color: string, late: boolean, phone: string];
const CALLS: Task[] = [
  ["Fatima Smits", "Bezoek inplannen", "Uden", "Wacht 3 dagen", "#f5c542", true, "06 22327040"],
  ["Dennis de Wit", "Bezoek inplannen", "Zaltbommel", "Wacht 2 dagen", "#f5c542", false, "06 73530072"],
  ["Ingrid Mulder", "Installatie inplannen", "Boxtel", "Wacht 2 dagen", "#145450", false, "06 69066168"],
  ["Samira Postma", "Bezoek inplannen", "Oosterhout", "Wacht 1 dag", "#f5c542", false, "06 55018538"],
  ["Jeroen Vos", "Bezoek inplannen", "Valkenswaard", "Sinds vandaag", "#f5c542", false, "06 48024764"],
  ["Joost Brouwer", "Bezoek inplannen", "Waalwijk", "Sinds vandaag", "#f5c542", false, "06 70746626"],
  ["Renske Smit", "Nieuw moment inplannen", "Veldhoven", "Sinds vandaag", "#7cc4bb", false, "06 96036142"],
];
const CHIPS: [string, number][] = [["Alles", 13], ["Bellen", 7], ["Offertes", 2], ["Facturen", 2], ["Gesprekken", 2]];

const KPIS: [KpiKind, string, string, string, string?][] = [
  ["quotes", "Offertes bij de klant", "€ 15.950", "3 wachten op akkoord"],
  ["toInvoice", "Nog te factureren", "€ 5.670", "2 klussen klaar"],
  ["open", "Nog te ontvangen", "€ 18.950", "5 facturen open"],
  ["revenue", "Omzet deze maand", "€ 89.780", "t.o.v. vorige maand", "+6%"],
];

const PHASES: [string, number, string][] = [
  ["Aanvraag", 5, "#f5c542"],
  ["Bezoek", 5, "#7cc4bb"],
  ["Offerte", 5, "#0f766e"],
  ["Installatie", 6, "#145450"],
  ["Factuur", 5, "#0b3d3a"],
];

const sideItem = "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

/**
 * Het overzicht zoals de eigenaar het op zijn telefoon ziet: de vier bedragen en het begin van "Aan u".
 * Zelfde cijfers en namen als het laptopscherm. Op 375 px breed opgebouwd en passend verkleind.
 */
export function OverviewPhoneScreen() {
  return (
    <div className="relative -mx-4 -mt-3 flex-1">
      <ScaledScreen width={375}>
        <div className="bg-background px-4 pb-6 pt-3 text-foreground">
          <p className="display-md text-3xl">Goedemorgen</p>
          <p className="mt-1 text-sm text-muted">13 taken wachten op u. Vandaag 3 afspraken.</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {KPIS.map(([kind, label, value, note, badge]) => (
              <div key={label} className={`flex min-w-0 flex-col justify-between rounded-2xl border p-3.5 ${kind === "revenue" ? "border-petrol bg-petrol text-white" : "border-line bg-surface"}`}>
                <span className={`flex items-center gap-2 text-xs font-medium ${kind === "revenue" ? "text-teal-50/85" : "text-muted"}`}>
                  <KpiIcon kind={kind} tone={kind === "revenue" ? "signal" : "soft"} className="h-7 w-7" />
                  <span className="min-w-0 flex-1 leading-tight">{label}</span>
                </span>
                <span className="tabular mt-2 whitespace-nowrap text-xl font-semibold tracking-tight">{value}</span>
                <span className={`mt-1 flex items-center gap-1.5 text-xs ${kind === "revenue" ? "text-teal-50/75" : "text-muted"}`}>
                  {badge && <span className="tabular rounded-md bg-signal px-1.5 py-0.5 text-[11px] font-semibold text-petrol">{badge}</span>}
                  {note}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-surface pb-2">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="flex items-center gap-2.5 text-base font-semibold"><span className="h-5 w-1.5 rounded-full bg-signal" />Aan u</p>
              <p className="text-sm text-muted">13 taken</p>
            </div>
            <div className="mt-3 flex gap-2 overflow-hidden px-4">
              {CHIPS.map(([label, count], i) => (
                <span key={label} className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium ${i === 0 ? "border-petrol bg-petrol text-white" : "border-line bg-surface"}`}>
                  {label}
                  <span className={`tabular text-xs ${i === 0 ? "text-white/80" : "text-muted"}`}>{count}</span>
                </span>
              ))}
            </div>
            <p className="flex items-center gap-2 px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Klanten bellen
              <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] text-foreground ring-1 ring-inset ring-line">7</span>
            </p>
            <div className="divide-y divide-line">
              {CALLS.slice(0, 4).map(([name, task, city, wait, color, late]) => (
                <div key={name} className="flex items-center gap-3 py-3 pl-4 pr-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{name}</span>
                    <span className="block truncate text-sm font-medium text-petrol">{task}</span>
                    <span className={`block text-xs ${late ? "font-medium text-amber-800" : "text-muted"}`}>{wait} · {city}</span>
                  </span>
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong">
                    <PhoneIcon /> Bel
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScaledScreen>
    </div>
  );
}

function DashboardReplica() {
  return (
    <div className="flex h-[1265px] bg-background text-foreground">
      {/* Zijbalk, zoals AppShell */}
      <div className="flex w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="flex items-center justify-between gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/werkly-logo.svg" alt="" width={118} height={31} className="h-[31px] w-auto" />
          <span className="grid h-10 w-10 place-items-center rounded-xl text-muted">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
          </span>
        </div>
        <div className="relative mt-6 flex min-h-11 items-center rounded-xl border border-line bg-background pl-9 pr-3 text-sm text-slate-500">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          Zoek een klant
        </div>

        <p className="mt-7 px-3 text-xs font-medium text-muted">Werk</p>
        <div className="mt-2 space-y-1">
          <div className={`${sideItem} bg-brand-soft text-petrol`}>
            <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r-full bg-brand" />
            <NavIcon name="requests" className="h-5 w-5 shrink-0 text-brand" />
            <span className="flex-1">Aanvragen</span>
            <span className="tabular grid h-6 min-w-6 place-items-center rounded-md bg-brand px-1 text-xs font-semibold text-white">11</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="agenda" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Agenda</span>
            <span className="tabular grid h-6 min-w-6 place-items-center rounded-md bg-background px-1 text-xs font-semibold text-foreground ring-1 ring-inset ring-line">3</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="roster" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Rooster</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="revenue" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Omzet</span>
          </div>
        </div>

        <p className="mt-7 px-3 text-xs font-medium text-muted">Beheer</p>
        <div className="mt-2 space-y-1">
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="settings" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Instellingen</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="form" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Klantformulier</span>
            <span className="text-xs">↗</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="export" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Excel-export</span>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-background p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-petrol text-sm font-semibold text-white">E</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Eigenaar</span>
            <span className="block text-xs text-muted">Eigenaar</span>
          </span>
        </div>
      </div>

      {/* Inhoud, zoals app/dashboard/page.tsx */}
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-10 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              Werkly › <span className="font-medium text-foreground">Aanvragen</span>
            </p>
            <p className="display-md mt-1 text-4xl">Goedemorgen</p>
            <p className="mt-1 text-muted">13 taken wachten op u. Vandaag 3 afspraken.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold">Agenda openen</span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white">
              <span className="text-lg leading-none">+</span> Aanvraag toevoegen
            </span>
          </div>
        </div>

        {/* De waarschuwing bovenaan: een monteur heeft zich afgemeld. */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-signal/60 bg-signal/15 px-4 py-3 text-sm">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-signal font-bold text-petrol">!</span>
          <span className="flex-1">
            <strong>Renske Smit:</strong> Lars Visser kan morgen om 13:00 niet.
          </span>
          <span className="text-muted">›</span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          {KPIS.map(([kind, label, value, note, badge]) => (
            <div key={label} className={`flex min-w-0 flex-col justify-between rounded-2xl border p-5 ${kind === "revenue" ? "border-petrol bg-petrol text-white" : "border-line bg-surface"}`}>
              <span className={`flex items-center gap-3 text-sm font-medium ${kind === "revenue" ? "text-teal-50/85" : "text-muted"}`}>
                <KpiIcon kind={kind} tone={kind === "revenue" ? "signal" : "soft"} />
                <span className="flex-1 leading-tight">{label}</span>
                <span>›</span>
              </span>
              <span className="tabular mt-4 whitespace-nowrap text-3xl font-semibold tracking-tight">{value}</span>
              <span className={`mt-3 flex items-center gap-2 text-sm ${kind === "revenue" ? "text-teal-50/75" : "text-muted"}`}>
                {badge && <span className="tabular rounded-md bg-signal px-1.5 py-0.5 text-xs font-semibold text-petrol">{badge}</span>}
                {note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
          {/* Links: Aan u met daaronder de fases */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="relative flex h-[544px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-center justify-between px-5 pt-5">
                <p className="flex items-center gap-2.5 text-base font-semibold"><span className="h-5 w-1.5 rounded-full bg-signal" />Aan u</p>
                <p className="text-sm text-muted">13 taken</p>
              </div>
              <div className="mt-3 flex gap-2 px-5 pb-1">
                {CHIPS.map(([label, count], i) => (
                  <span key={label} className={`flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium ${i === 0 ? "border-petrol bg-petrol text-white" : "border-line bg-surface"}`}>
                    {label}
                    <span className={`tabular text-xs ${i === 0 ? "text-white/80" : "text-muted"}`}>{count}</span>
                  </span>
                ))}
              </div>
              <div className="mt-2 min-h-0 flex-1 overflow-hidden">
                <p className="flex items-center gap-2 px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Klanten bellen
                  <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] text-foreground ring-1 ring-inset ring-line">7</span>
                </p>
                <div className="divide-y divide-line">
                  {CALLS.map(([name, task, city, wait, color, late, phone]) => (
                    <div key={name} className="flex items-center gap-2 pr-6">
                      <span className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{name}</span>
                          <span className="block truncate text-sm text-muted">
                            <span className="font-medium text-petrol">{task}</span> · {city}
                          </span>
                        </span>
                        <span className={`shrink-0 text-right text-xs ${late ? "font-medium text-amber-800" : "text-muted"}`}>{wait}</span>
                      </span>
                      <span className="tabular inline-flex min-h-11 min-w-[9.5rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong">
                        <PhoneIcon /> {phone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* De schuifbalk van de lijst: er staan meer taken dan er in de tegel passen. */}
              <span className="absolute bottom-3 right-1.5 top-[7.5rem] w-1.5 rounded-full bg-slate-100">
                <span className="block h-2/5 w-full rounded-full bg-slate-400/70" />
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-base font-semibold">Lopende klussen per fase</p>
              <p className="mt-1 text-sm text-muted">26 lopend</p>
              <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-background">
                {PHASES.map(([label, count, color]) => (
                  <span key={label} className="h-full" style={{ flexGrow: count, background: color }} />
                ))}
              </div>
              <div className="mt-5 space-y-2.5">
                {PHASES.map(([label, count, color]) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="flex-1">{label}</span>
                    <span className="tabular font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rechts: Vandaag met daaronder de omzet */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2.5 text-base font-semibold">
                  <KpiIcon kind="today" className="h-8 w-8" />
                  Vandaag
                </p>
                <span className="text-sm text-muted">3 afspraken</span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["08:00", "Jeroen van der Veen", "Installatie met Lars Visser"],
                  ["08:30", "Saskia Postma", "Bezoek met Sven Bakker"],
                  ["11:30", "Renske Kaya", "Bezoek met Sven Bakker"],
                ].map(([time, name, sub]) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl bg-background p-3">
                    <span className="tabular w-12 shrink-0 text-lg font-semibold">{time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{name}</span>
                      <span className="block truncate text-sm text-muted">{sub}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium text-muted">Hierna</p>
              <div className="mt-2 space-y-1">
                {[
                  ["Morgen", "08:00", "Dennis Willems", "Installatie in Den Bosch"],
                  ["Morgen", "10:00", "Floor de Groot", "Bezoek in Eindhoven"],
                ].map(([day, time, title, sub]) => (
                  <div key={title} className="flex items-baseline gap-3 px-1 py-1.5">
                    <span className="w-24 shrink-0 text-sm font-medium">
                      {day}
                      <span className="tabular block text-xs font-normal text-muted">{time}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{title}</span>
                      <span className="block truncate text-xs text-muted">{sub}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-1 flex-col rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">Omzet per maand</p>
                <span className="text-sm font-medium text-brand-strong">Alle cijfers</span>
              </div>
              <div className="mt-2 flex-1">
                <DemoRevenueChart totals={DEMO_REVENUE} jobs={DEMO_JOBS} builtMonth={new Date().toISOString().slice(0, 7)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

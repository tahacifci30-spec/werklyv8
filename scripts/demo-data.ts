/**
 * Zet een compleet voorbeeldbedrijf in de database, om Werkly te laten zien.
 *
 *   node --env-file=.env.local --import ./tests/setup.mjs scripts/demo-data.ts
 *
 * Wat het doet:
 * 1. Bewaart ALLE bestaande aanvragen in backups/aanvragen-<moment>.json.
 * 2. Verwijdert alle aanvragen van het bedrijf.
 * 3. Zet er nieuwe in: ruim dertig lopende aanvragen in alle fases, in Noord-Brabant en het rivierengebied, ingepland bij
 *    meerdere monteurs, plus een jaar aan afgeronde klussen (20 tot 26 per maand, de laatste drie maanden oplopend).
 * Agenda-items, het team en de instellingen blijven staan. Draai het opnieuw vlak voor een demonstratie:
 * de afspraken worden gepland vanaf de eerstvolgende werkdag.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { addDays, dayShort, isWeekend, todayNl, workdaysFrom } from "@/lib/dates";
import { DEFAULT_COMPANY, emptyCheck, formatInvoiceNumber, newToken } from "@/lib/defaults";
import { estimatePrice } from "@/lib/pricing/engine";
import { CALL_PREFIX } from "@/lib/notifications";
import { deleteAgendaItem, getSettings, listAgendaItems, saveAgendaItem, saveLead, updateSettings } from "@/lib/store-supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AgendaItem, Lead, LeadStatus, QuoteItem, TechCheck } from "@/lib/types";

const company = DEFAULT_COMPANY;
const today = todayNl();
const settings = await getSettings(company);
// Gesprekken die via de website zijn ingepland worden vervangen door voorbeelden; de rest van de agenda blijft staan.
const allAgenda = await listAgendaItems(company);
const oldCalls = allAgenda.filter((i) => i.id.startsWith(CALL_PREFIX));
const agenda = allAgenda.filter((i) => !i.id.startsWith(CALL_PREFIX));
const TECHS = ["Sven Bakker", "Lars Visser"].filter((n) => settings.team.some((m) => m.name === n));
if (TECHS.length < 2) throw new Error("Verwacht de monteurs Sven Bakker en Lars Visser bij Instellingen > Team.");
const OWNER = "Eigenaar";

/* ---------- hulpjes ---------- */
// Vaste "toevalsgetallen", zodat elke keer hetzelfde bedrijf ontstaat.
let seedN = 7;
const rnd = () => ((seedN = (seedN * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
const at = (day: string, h = 10, m = 0) => new Date(`${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();
/** De werkdag op of vóór deze dag. */
const workday = (day: string) => {
  let d = day;
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
};
const ago = (n: number) => workday(addDays(today, -n));
const next = workdaysFrom(isWeekend(today) ? addDays(today, 1) : today, 8); // de komende werkdagen, te beginnen bij vandaag als dat een werkdag is

const FIRST = ["Maarten", "Annelies", "Joost", "Marieke", "Wouter", "Esther", "Bas", "Linda", "Jeroen", "Karin", "Dennis", "Saskia", "Rob", "Petra", "Erik", "Yvonne", "Martijn", "Ingrid", "Sander", "Monique", "Hasan", "Fatima", "Youssef", "Samira", "Kevin", "Chantal", "Ricardo", "Naomi", "Arjan", "Wendy", "Gerard", "Bianca", "Pim", "Floor", "Tim", "Renske"];
const LAST = ["van den Berg", "Janssen", "de Jong", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra", "Smits", "de Graaf", "van der Meer", "van der Linden", "Kok", "Jacobs", "de Haan", "Vermeulen", "van den Heuvel", "van der Veen", "van den Broek", "Schouten", "Yilmaz", "El Idrissi", "Kaya", "Willems", "Hoekstra", "Postma"];
const usedNames = new Set<string>(["Wendy Vermeulen"]);
function name() {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
}

/**
 * Het werkgebied: Noord-Brabant en het aangrenzende deel van Gelderland, rond de zaak in Den Bosch.
 * De eerste kolom is de streek waar een monteur op één dag blijft; overal een bestaande straat.
 */
type Place = [region: string, city: string, postcode: string, street: string];
const PLACES: Place[] = [
  ["midden", "Den Bosch", "5211", "Hinthamerstraat"], ["midden", "Rosmalen", "5241", "Dorpsstraat"], ["midden", "Vught", "5261", "Taalstraat"], ["midden", "Boxtel", "5281", "Stationsstraat"], ["midden", "Schijndel", "5481", "Hoofdstraat"], ["midden", "Sint-Michielsgestel", "5271", "Nieuwstraat"],
  ["west", "Tilburg", "5038", "Heuvelstraat"], ["west", "Waalwijk", "5141", "Grotestraat"], ["west", "Oisterwijk", "5061", "De Lind"], ["west", "Dongen", "5101", "Hoge Ham"], ["west", "Goirle", "5051", "Tilburgseweg"], ["west", "Kaatsheuvel", "5171", "Hoofdstraat"],
  ["breda", "Breda", "4811", "Ginnekenstraat"], ["breda", "Oosterhout", "4901", "Arendstraat"], ["breda", "Etten-Leur", "4871", "Markt"], ["breda", "Roosendaal", "4701", "Nieuwe Markt"],
  ["zuidoost", "Eindhoven", "5611", "Stratumseind"], ["zuidoost", "Best", "5683", "Hoofdstraat"], ["zuidoost", "Veldhoven", "5501", "Dorpstraat"], ["zuidoost", "Helmond", "5701", "Markt"], ["zuidoost", "Valkenswaard", "5551", "Eindhovenseweg"], ["zuidoost", "Geldrop", "5661", "Heuvel"],
  ["noordoost", "Oss", "5341", "Heuvel"], ["noordoost", "Uden", "5401", "Marktstraat"], ["noordoost", "Veghel", "5461", "Hoofdstraat"], ["noordoost", "Nijmegen", "6511", "Lange Hezelstraat"], ["noordoost", "Wijchen", "6601", "Touwslagersbaan"],
  ["rivieren", "Zaltbommel", "5301", "Gamerschestraat"], ["rivieren", "Tiel", "4001", "Waterstraat"], ["rivieren", "Culemborg", "4101", "Varkensmarkt"], ["rivieren", "Geldermalsen", "4191", "Herman Kuijkstraat"],
];
const place = (city: string) => PLACES.find((p) => p[1] === city)!;
const LETTERS = "ABCDEGHJKLMNPRSTVWXZ";

const ANSWERS: Record<string, string>[] = [
  { spaces: "living", area: "20_30", property: "terraced", outdoor: "facade", existing: "none" },
  { spaces: "living", area: "30_40", property: "corner", outdoor: "ground", existing: "none" },
  { spaces: "bedroom", area: "lt20", property: "apartment", outdoor: "balcony", existing: "replace" },
  { spaces: "living_bedroom", area: "30_40", property: "terraced", outdoor: "facade", system: "multisplit" },
  { spaces: "living_bedroom", area: "gt40", property: "detached", outdoor: "ground", system: "separate" },
  { spaces: "multiple", area: "gt40", property: "detached", outdoor: "roof", system: "multisplit" },
  { spaces: "living", area: "gt40", property: "detached", outdoor: "facade", existing: "piping" },
  { spaces: "bedroom", area: "20_30", property: "corner", outdoor: "facade", existing: "none" },
];
const unitsOf = (a: Record<string, string>) => (a.spaces === "multiple" ? 3 : a.spaces === "living_bedroom" ? 2 : 1);

const verified = (notes = ""): TechCheck => {
  const f = (value: string) => ({ value, source: "verified" as const });
  return { outdoor_unit: f("yes"), pipe_distance: f(pick(["1_5", "5_10", "5_10", "10_15"])), meter_box: f("ok"), wall_type: f(pick(["soft", "soft", "hard"])), mounting: f("yes"), notes, photos: [] };
};

let n = 0;
function lead(city: string, createdDay: string, answers = pick(ANSWERS)): Lead {
  const who = name();
  const [, town, pc, street] = place(city);
  const created = at(createdDay, 8 + Math.floor(rnd() * 12), Math.floor(rnd() * 60));
  n += 1;
  return {
    id: crypto.randomUUID(),
    company_id: company,
    created_at: created,
    customer: {
      name: who,
      email: `${who.toLowerCase().replace(/[^a-z]+/g, ".")}@example.nl`,
      phone: `06 ${String(10000000 + Math.floor(rnd() * 89999999))}`,
      postcode: `${pc} ${LETTERS[n % LETTERS.length]}${LETTERS[(n * 7) % LETTERS.length]}`,
      street: `${street} ${1 + Math.floor(rnd() * 140)}`,
      city: town,
    },
    answers,
    estimate: estimatePrice(answers, settings.pricing),
    status: "new",
    check: emptyCheck(),
    token: newToken(),
    consent_at: created,
    customer_photos: [],
    notes: [],
    log: [
      { at: created, text: "Klant heeft het formulier ingevuld" },
      { at: created, text: "Prijsindicatie berekend" },
    ],
  };
}

/** Offerteregels die passen bij de prijsindicatie van deze aanvraag. */
function quoteItems(l: Lead): QuoteItem[] {
  const units = unitsOf(l.answers);
  const total = Math.round((l.estimate.min + (l.estimate.max - l.estimate.min) * rnd()) / 10) * 10;
  const mounting = 650 * units;
  const out: QuoteItem[] = [
    { id: "a", label: `Airco-installatie (${units} ${units === 1 ? "unit" : "units"})`, amount: Math.max(900, total - mounting) },
    { id: "b", label: "Montage", amount: mounting },
  ];
  if (l.check.pipe_distance.value === "10_15") out.push({ id: "c", label: "Extra leiding (10–15 m)", amount: 150 });
  if (l.check.wall_type.value === "hard") out.push({ id: "d", label: "Boorwerk harde wand", amount: 120 });
  return out;
}

const VISIT_NOTES = ["", "", "Buitenunit kan aan de zijgevel, op consoles.", "Meterkast heeft een vrije groep.", "Leiding kan door de kruipruimte.", "Klant wil de binnenunit boven de deur.", "Balkon is geschikt voor de buitenunit."];
const INSTALL_NOTES = ["", "", "", "Alles volgens offerte geplaatst.", "Klant heeft uitleg gekregen over de app.", "Condensafvoer via de regenpijp."];

/** Stappen die een aanvraag doorloopt. Elke stap zet de gegevens en het logboek zoals de app dat doet. */
const step = {
  visitPlanned(l: Lead, day: string, time: string, tech: string, plannedOn: string) {
    l.status = "visit_planned";
    l.appointment = { date: day, time, technician: tech };
    l.log.push({ at: at(plannedOn, 9, 15), text: `Bezoek ingepland (${day} ${time}, ${tech})` });
  },
  visitDone(l: Lead) {
    const a = l.appointment!;
    const done = at(a.date, Number(a.time.slice(0, 2)) + 1, 20);
    l.check = { ...verified(pick(VISIT_NOTES)), completed_at: done };
    l.quote = { generated_at: done, items: quoteItems(l), values: l.answers };
    l.status = "quote_review";
    l.log.push({ at: done, text: `Bezoek afgerond door ${a.technician}` }, { at: done, text: "Conceptofferte gemaakt" });
  },
  quoteSent(l: Lead, day: string) {
    const sent = at(day, 16, 10);
    l.quote = { ...l.quote!, reviewed_at: sent, sent_at: sent };
    l.status = "quote_sent";
    l.log.push({ at: sent, text: "Offerte gecontroleerd" }, { at: sent, text: "Offerte verstuurd" });
  },
  accepted(l: Lead, day: string) {
    const when = at(day, 19, 5);
    l.quote = { ...l.quote!, decided_at: when };
    l.status = "install_to_plan";
    l.log.push({ at: when, text: "Klant is akkoord via de offertelink" });
  },
  installPlanned(l: Lead, day: string, tech: string, plannedOn: string, days = unitsOf(l.answers) === 3 ? 2 : 1) {
    l.status = "install_planned";
    l.install_appointment = { date: day, time: "08:00", technician: tech, days };
    l.log.push({ at: at(plannedOn, 10, 30), text: `Installatie ingepland (${day} 08:00, ${tech})` });
  },
  installDone(l: Lead, extra?: QuoteItem) {
    const a = l.install_appointment!;
    const done = at(workday(addDays(a.date, Math.ceil(a.days ?? 1) - 1)), 15, 40);
    l.install = {
      as_quoted: extra ? "no" : "yes",
      units: String(unitsOf(l.answers)),
      pipe_length: l.check.pipe_distance.value,
      checks: { condensate: true, vacuum_leak: true, test_run: true, explained: true, cleaned: true },
      serials: `BU-${10000 + Math.floor(rnd() * 89999)} / BI-${10000 + Math.floor(rnd() * 89999)}`,
      notes: extra ? `${extra.label} was nodig.` : pick(INSTALL_NOTES),
      photos: [],
      extras: extra ? [extra] : [],
      completed_at: done,
    };
    // Eigen kopieën van de regels: de factuur mag later wijzigen zonder dat de offerte meeverandert.
    l.invoice = { created_at: done, items: [...l.quote!.items.map((i) => ({ ...i })), ...(extra ? [{ ...extra, label: `Meerwerk: ${extra.label}` }] : [])] };
    l.status = "install_done";
    l.log.push({ at: done, text: `Installatie afgerond door ${a.technician}` }, { at: done, text: "Conceptfactuur gemaakt" });
  },
  invoiceSent(l: Lead, day: string, number: string) {
    const sent = at(day, 9, 30);
    l.invoice = { ...l.invoice!, number, sent_at: sent, due_date: addDays(day, 14) };
    l.status = "invoice_sent";
    l.log.push({ at: sent, text: `Factuur ${number} verstuurd` });
  },
  paid(l: Lead, day: string) {
    const when = at(day, 11, 0);
    l.invoice = { ...l.invoice!, paid_at: when };
    l.status = "completed";
    l.log.push({ at: when, text: "Betaling ontvangen, aanvraag afgerond" });
  },
};

const leads: Lead[] = [];
let invoiceSeq = 0;
const year = new Date().getFullYear();
const nextNumber = (y = year) => formatInvoiceNumber(y, ++invoiceSeq);

/* ---------- 1. Een jaar aan afgeronde klussen ---------- */
// Twaalf maanden, oudste eerst; de laatste is de lopende maand. De laatste drie lopen op.
const JOBS = [19, 21, 20, 22, 21, 23, 20, 22, 21, 22, 24, 26];
const now = new Date();
const monthTotals: number[] = [];
JOBS.forEach((jobs, m) => {
  const back = JOBS.length - 1 - m;
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1, 12);
  const lastDay = back === 0 ? now.getDate() : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const made: Lead[] = [];
  for (let j = 0; j < jobs; j++) {
    // Een betaling op een werkdag, en altijd binnen dezelfde maand (anders verschuift de omzet naar de maand ervoor).
    const raw = new Date(first.getFullYear(), first.getMonth(), 1 + Math.floor((j * lastDay) / jobs), 12).toISOString().slice(0, 10);
    let paidDay = workday(raw);
    if (paidDay.slice(0, 7) !== raw.slice(0, 7)) for (paidDay = raw; isWeekend(paidDay); ) paidDay = addDays(paidDay, 1);
    const p = pick(PLACES);
    const visitTech = TECHS[(m + j) % 2];
    const installTech = TECHS[(m + j + (j % 3 === 0 ? 0 : 1)) % 2];
    const l = lead(p[1], workday(addDays(paidDay, -34 - Math.floor(rnd() * 10))));
    const visit = workday(addDays(paidDay, -27));
    step.visitPlanned(l, visit, pick(["08:30", "10:00", "11:30", "13:00", "14:30"]), visitTech, workday(addDays(visit, -3)));
    step.visitDone(l);
    step.quoteSent(l, visit);
    step.accepted(l, workday(addDays(visit, 3)));
    const install = workday(addDays(paidDay, -11));
    step.installPlanned(l, install, installTech, workday(addDays(visit, 4)));
    step.installDone(l, rnd() < 0.18 ? { id: "x", label: pick(["Extra doorvoer", "Langere condensafvoer", "Extra wandgoot"]), amount: pick([90, 120, 180]) } : undefined);
    step.invoiceSent(l, workday(addDays(install, 1)), "");
    step.paid(l, paidDay);
    made.push(l);
  }
  monthTotals.push(made.reduce((s, l) => s + l.invoice!.items.reduce((t, i) => t + i.amount, 0), 0));
  leads.push(...made);
});
// De laatste drie maanden lopen ook in omzet rustig op (ongeveer 6% per maand): het verschil wordt over de klussen verdeeld.
for (let m = JOBS.length - 3; m < JOBS.length; m++) {
  const start = JOBS.slice(0, m).reduce((sum, x) => sum + x, 0);
  const each = Math.round((monthTotals[m - 1] * 1.06 - monthTotals[m]) / JOBS[m] / 10) * 10;
  for (const l of leads.slice(start, start + JOBS[m])) {
    const change = Math.max(each, 900 - l.quote!.items[0].amount);
    l.quote!.items[0].amount += change;
    l.invoice!.items[0].amount += change;
    monthTotals[m] += change;
  }
}
// Factuurnummers in de volgorde van versturen, per jaar doorlopend.
leads.sort((a, b) => a.invoice!.sent_at!.localeCompare(b.invoice!.sent_at!));
const seqByYear = new Map<number, number>();
for (const l of leads) {
  const y = Number(l.invoice!.sent_at!.slice(0, 4));
  const seq = (seqByYear.get(y) ?? 0) + 1;
  seqByYear.set(y, seq);
  const number = formatInvoiceNumber(y, seq);
  l.invoice!.number = number;
  l.log = l.log.map((e) => (e.text === "Factuur  verstuurd" ? { ...e, text: `Factuur ${number} verstuurd` } : e));
}
invoiceSeq = seqByYear.get(year) ?? 0;

/* ---------- 2. Lopende aanvragen in alle fases ---------- */
const [d0, d1, d2, d3, d4, d5] = next;

// Nieuw: de klant heeft net het formulier ingevuld en een voorkeur opgegeven.
(
  [
    ["Waalwijk", 0, d3, "morning"],
    ["Valkenswaard", 0, d4, "afternoon"],
    ["Oosterhout", 1, d2, "morning"],
    ["Zaltbommel", 2, d3, "afternoon"],
    ["Uden", 3, d4, "morning"],
  ] as const
).forEach(([city, days, day, part]) => {
  const l = lead(city, addDays(today, -days));
  l.preferred = { first: { date: day, part } };
  leads.push(l);
});

// Bezoek gepland: per monteur per dag in één regio.
(
  [
    ["Tilburg", d0, "08:30", TECHS[0]],
    ["Oisterwijk", d0, "11:30", TECHS[0]],
    ["Eindhoven", d1, "10:00", TECHS[1]],
    ["Veldhoven", d1, "13:00", TECHS[1]],
    ["Vught", d2, "08:30", OWNER],
  ] as const
).forEach(([city, day, time, tech], i) => {
  const l = lead(city, ago(4 + i));
  step.visitPlanned(l, day, time, tech, ago(2));
  if (i === 0) l.notes.push({ at: at(ago(2), 9, 20), by: "Eigenaar", text: "Klant is overdag bereikbaar. Parkeren kan voor de deur." });
  // Voorbeeld van een afmelding: de monteur kan toch niet, dus u belt de klant voor een nieuw moment.
  if (city === "Veldhoven") {
    const when = new Date(Date.now() - 3 * 3_600_000).toISOString();
    l.appointment = { ...l.appointment!, declined_at: when };
    l.log.push({ at: when, text: `${tech} kan niet op ${dayShort(day)} ${time} (bezoek)` });
  }
  leads.push(l);
});

// Offerte controleren: het bezoek is net geweest.
(
  [
    ["Oss", 1, TECHS[0]],
    ["Roosendaal", 1, TECHS[1]],
  ] as const
).forEach(([city, days, tech]) => {
  const l = lead(city, ago(days + 6));
  step.visitPlanned(l, ago(days), "13:00", tech, ago(days + 3));
  step.visitDone(l);
  leads.push(l);
});

// Offerte bij de klant.
(
  [
    ["Helmond", 1],
    ["Etten-Leur", 2],
    ["Nijmegen", 4],
  ] as const
).forEach(([city, days], i) => {
  const l = lead(city, ago(days + 9), ANSWERS[3 + i]);
  step.visitPlanned(l, ago(days + 2), "10:00", TECHS[i % 2], ago(days + 5));
  step.visitDone(l);
  step.quoteSent(l, ago(days));
  leads.push(l);
});

// Akkoord: installatie nog in te plannen.
(
  [
    ["Boxtel", 1, d5],
  ] as const
).forEach(([city, days, wish], i) => {
  const l = lead(city, ago(days + 12));
  step.visitPlanned(l, ago(days + 6), "11:30", TECHS[i % 2], ago(days + 9));
  step.visitDone(l);
  step.quoteSent(l, ago(days + 5));
  step.accepted(l, ago(days));
  l.install_preferred = { date: wish, part: "morning" };
  leads.push(l);
});

// Installatie gepland.
(
  [
    ["Best", d0, TECHS[1], 1],
    ["Den Bosch", d1, TECHS[0], 1],
    ["Breda", d2, TECHS[1], 2],
  ] as const
).forEach(([city, day, tech, days], i) => {
  const l = lead(city, ago(20 + i), days === 2 ? ANSWERS[5] : ANSWERS[i % 3]);
  step.visitPlanned(l, ago(14 + i), "10:00", TECHS[i % 2], ago(17 + i));
  step.visitDone(l);
  step.quoteSent(l, ago(13 + i));
  step.accepted(l, ago(9 + i));
  step.installPlanned(l, day, tech, ago(7), days);
  leads.push(l);
});

// Installatie klaar: factuur controleren.
(
  [
    ["Goirle", 1, TECHS[0], undefined],
    ["Rosmalen", 2, TECHS[1], { id: "x", label: "Extra doorvoer", amount: 180 }],
  ] as const
).forEach(([city, days, tech, extra]) => {
  const l = lead(city, ago(days + 24));
  step.visitPlanned(l, ago(days + 18), "08:30", tech, ago(days + 21));
  step.visitDone(l);
  step.quoteSent(l, ago(days + 17));
  step.accepted(l, ago(days + 13));
  step.installPlanned(l, ago(days), tech, ago(days + 10));
  step.installDone(l, extra);
  leads.push(l);
});

// Factuur verstuurd, nog niet betaald.
(
  [
    ["Tiel", 3],
    ["Dongen", 6],
    ["Geldrop", 9],
    ["Veghel", 11],
    ["Schijndel", 5],
  ] as const
).forEach(([city, days], i) => {
  const l = lead(city, ago(days + 30));
  step.visitPlanned(l, ago(days + 24), "10:00", TECHS[i % 2], ago(days + 27));
  step.visitDone(l);
  step.quoteSent(l, ago(days + 23));
  step.accepted(l, ago(days + 19));
  step.installPlanned(l, ago(days + 1), TECHS[(i + 1) % 2], ago(days + 15));
  step.installDone(l);
  step.invoiceSent(l, ago(days), nextNumber());
  leads.push(l);
});

// Eén afgewezen offerte: dat hoort er ook bij.
{
  const l = lead("Culemborg", ago(25));
  step.visitPlanned(l, ago(19), "14:30", TECHS[1], ago(22));
  step.visitDone(l);
  step.quoteSent(l, ago(18));
  l.quote = { ...l.quote!, decided_at: at(ago(12), 20, 15) };
  l.status = "rejected" satisfies LeadStatus;
  l.log.push({ at: at(ago(12), 20, 15), text: "Klant heeft de offerte afgewezen via de offertelink" });
  leads.push(l);
}

/* ---------- voorbeelden van gesprekken via de website ---------- */
const call = (hoursAgo: number, day: string, start: string, end: string, title: string): AgendaItem => ({
  id: `${CALL_PREFIX}${Date.now() - hoursAgo * 3_600_000}-${Math.random().toString(36).slice(2, 8)}`,
  company_id: company,
  kind: "item",
  title,
  date: day,
  start,
  end,
  who: OWNER,
  created_by: "Website",
});
const calls = [
  call(5, d1, "15:30", "16:00", "Gesprek met Henk Brouwer (VvE De Linde), bel 06 24681357"),
  call(26, d3, "11:00", "11:30", "Gesprek met Sophie de Bruijn (Tandartspraktijk Centrum), bel 06 13572468"),
];

/* ---------- controles vooraf ---------- */
// Niemand staat dubbel ingepland, en er botst niets met wat al in de agenda staat.
const future = leads.flatMap((l) => {
  const out: { who: string; day: string; label: string }[] = [];
  if (l.status === "visit_planned") out.push({ who: l.appointment!.technician, day: l.appointment!.date, label: `bezoek ${l.appointment!.time}` });
  if (l.status === "install_planned") for (let k = 0; k < (l.install_appointment!.days ?? 1); k++) out.push({ who: l.install_appointment!.technician, day: workdaysFrom(l.install_appointment!.date, k + 1)[k], label: "installatie" });
  return out;
});
for (const f of future) {
  const sameDay = future.filter((x) => x.who === f.who && x.day === f.day);
  if (sameDay.some((x) => x.label === "installatie") && sameDay.length > 1) throw new Error(`${f.who} staat dubbel op ${f.day}`);
  const off = agenda.find((i) => i.kind === "off" && i.who === f.who && i.date <= f.day && (i.date_to ?? i.date) >= f.day);
  if (off) throw new Error(`${f.who} is niet beschikbaar op ${f.day} (${off.title})`);
  const busy = agenda.find((i) => i.kind === "item" && i.who === f.who && i.date === f.day && i.start && f.label.startsWith("bezoek") && i.start <= "10:30" && (i.end ?? "23:59") > "08:30");
  if (busy) throw new Error(`${f.who} heeft op ${f.day} al "${busy.title}"`);
}

/* ---------- 3. Bewaren, leegmaken, vullen ---------- */
const summary = () => {
  const open = leads.filter((l) => l.status !== "completed" && l.status !== "rejected");
  const byStatus: Record<string, number> = {};
  for (const l of open) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  console.log(`Nieuw: ${leads.length} aanvragen, waarvan ${open.length} lopend`, JSON.stringify(byStatus));
  console.log("Afgeronde klussen per maand:", JOBS.join(", "));
  console.log("Omzet per maand:", monthTotals.map((t) => Math.round(t)).join(", "));
  console.log("Volgende factuurnummer:", formatInvoiceNumber(year, invoiceSeq + 1));
  console.log("Planning:", future.map((f) => `${f.day} ${f.who.split(" ")[0]} ${f.label}`).sort().join(" | "));
};
// Met PROEF=1 alleen laten zien wat er zou komen, zonder iets in de database te wijzigen.
if (process.env.PROEF) {
  summary();
  process.exit(0);
}
const db = supabaseAdmin();
const existing: unknown[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("requests").select("*").eq("company_id", company).order("created_at").range(from, from + 999);
  if (error) throw new Error(error.message);
  existing.push(...data);
  if (data.length < 1000) break;
}
mkdirSync("backups", { recursive: true });
const file = `backups/aanvragen-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(existing, null, 1));
console.log(`Bewaard: ${existing.length} bestaande aanvragen in ${file}`);

const { error: delError, count } = await db.from("requests").delete({ count: "exact" }).eq("company_id", company);
if (delError) throw new Error(delError.message);
console.log(`Verwijderd: ${count}`);

for (let i = 0; i < leads.length; i += 12) await Promise.all(leads.slice(i, i + 12).map((l) => saveLead(l)));
if (oldCalls.length) writeFileSync(file.replace("aanvragen-", "gesprekken-"), JSON.stringify(oldCalls, null, 1));
for (const c of oldCalls) await deleteAgendaItem(c.id, company);
for (const c of calls) await saveAgendaItem(c);
console.log(`Gesprekken via de website: ${oldCalls.length} verwijderd (bewaard naast de aanvragen), ${calls.length} voorbeelden toegevoegd`);
// Meldingen: alles van langer dan drie dagen geleden telt als gelezen, zodat alleen de recente voorbeelden nieuw zijn.
await updateSettings(company, (current) => ({ ...current, invoice_seq: invoiceSeq, demo_seeded: true, notifications_seen_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), notifications_read: [] }));

summary();

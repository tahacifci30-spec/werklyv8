import { addDays, todayNl } from "../dates";
import { CALL_PREFIX } from "../notifications";
import { seed } from "../seed";
import type { AgendaItem, Customer, Lead, RosterRequest, Settings } from "../types";

/**
 * Testgegevens voor het overzicht, alleen in ontwikkeling: typ ?data=worst, leeg, een of veel achter /dashboard.
 * Het voorbeeldbedrijf om te laten zien staat in de database zelf (scripts/demo-data.ts).
 * "Ergste geval" bevat waarden die een echte klant kan invullen, tot aan de grenzen die de app zelf toelaat:
 * naam 120 tekens, e-mail 160, telefoon 30, plaats 80, bedrijf 120, monteur 60, agendatitel 80.
 * Voor het bedrag van een offerteregel is geen grens gevonden.
 */
export type DataKind = "worst" | "leeg" | "een" | "veel";

type Data = { leads: Lead[]; items: AgendaItem[]; settings: Settings };

const LONG_TECH = "Konstantin Oberhauser-Wettstein van den Heuvel tot Beichlingen"; // 60 tekens: de grens bij Team
const TECH_2 = "Jo";

/** Elke rij een ander probleem, zoals echte gegevens: lang, kort, zonder spaties, andere schriften, rare tekens. */
const PEOPLE: Customer[] = [
  { name: "Aleksandra Wiśniewska-Kowalczyk", email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com", phone: "+31 (0)6 12 34 56 78", postcode: "7676 AB", street: "Burgemeester Van Roijensingel 123-bis", city: "Westerhaar-Vriezenveensewijk" },
  { name: "Jo", email: "a@b.co", phone: "0612345678", postcode: "9131 EJ", street: "Tibsterwei 1", city: "Ee" },
  {
    name: "Installatiebedrijf Van der Heijden-Schouwenaars & Zonen B.V. t.a.v. mevrouw Christina van den Broek-Hoogendoorn",
    email: "inkoop.facilitair+offertes-klimaatbeheersing@gemeentelijk-vastgoedbedrijf.example.org",
    phone: "06-12345678 / 073-1234567 (na 18u)",
    postcode: "9515 PN",
    street: "Gasselterboerveenschemond 12",
    city: "Gasselterboerveenschemond",
    company: "Stichting Gemeenschappelijke Woningbouwvereniging Noordoost-Brabantse Kempen en Omstreken",
  },
  { name: "🦊 Fox", email: "fox@example.com", phone: "+31612345678", postcode: "1011 AB", street: "Dam 1", city: "'s-Hertogenbosch" },
  { name: "Đặng Thị Ngọc Hân", email: "han@example.com", phone: "06 1234 5678", postcode: "5611 AB", street: "Stratumseind 1", city: "Sint-Michielsgestel" },
  { name: "نور الهدى عبد الرحمن", email: "nour@example.com", phone: "0612345678", postcode: "3011 AB", street: "Coolsingel 40", city: "Rotterdam" },
  { name: "<script>alert(1)</script> & Zn **bold**", email: "first.last+billing-notifications@example.com", phone: "0612345678", postcode: "5000 AA", street: "Stationsstraat 1", city: "Tilburg" },
  { name: "  Sam   Lee ", email: "sam@example.com", phone: "0612345678", postcode: "5000 AA", street: "Stationsstraat 2", city: "  Tilburg " },
  { name: "dana", email: "ops@sub.department.region.example.co.uk", phone: "0031612345678", postcode: "5000 AA", street: "Stationsstraat 3", city: "tilburg" },
  { name: "Christopher Alexander Montgomery III", email: "c@example.com", phone: "0612345678", postcode: "5000 AA", street: "Stationsstraat 4", city: "Hoogezand-Sappemeer" },
  { name: "María José de la Cruz y Fernández", email: "mj@example.com", phone: "0612345678", postcode: "5000 AA", street: "Stationsstraat 5", city: "Nieuw-Amsterdam" },
  { name: "王秀英", email: "wang@example.com", phone: "0612345678", postcode: "5000 AA", street: "Stationsstraat 6", city: "Oost-, West- en Middelbeers" },
];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const item = (id: string, over: Partial<AgendaItem>): AgendaItem => ({ id, company_id: "fixture", kind: "item", title: "", date: todayNl(), who: "Eigenaar", created_by: "Eigenaar", ...over });

function worst(base: Data): Data {
  const today = todayNl();
  const leads = seed().leads.map((l, i) => {
    const lead = clone(l);
    lead.id = `fx-${i}`;
    lead.customer = PEOPLE[i % PEOPLE.length];
    // Afspraken staan op naam van de langste en de kortste monteur.
    for (const a of [lead.appointment, lead.install_appointment]) if (a) a.technician = i % 2 ? TECH_2 : LONG_TECH;
    return lead;
  });

  // Bedragen: geen grens gevonden, dus een groot project en een regel van nul.
  const big = leads.find((l) => l.status === "quote_sent");
  if (big?.quote) big.quote.items = [{ id: "a", label: "Klimaatinstallatie kantoorpand (48 units)", amount: 12_345_678.9 }];
  const open = leads.find((l) => l.status === "invoice_sent");
  if (open?.invoice) open.invoice.items = [{ id: "a", label: "Installatie", amount: 987_654.32 }, { id: "b", label: "Korting", amount: -42.5 }];
  const zero = leads.find((l) => l.status === "install_done");
  if (zero?.invoice) zero.invoice.items = [{ id: "a", label: "Garantie", amount: 0 }];
  const paid = leads.find((l) => l.status === "completed" && l.invoice?.paid_at);
  if (paid?.invoice) paid.invoice.items = [{ id: "a", label: "Groot project", amount: 2_500_000 }];

  // Vandaag: twaalf afspraken, afgemelde monteur, en afspraken die al geweest zijn maar niet zijn afgerond.
  const planned = leads.filter((l) => l.status === "visit_planned" || l.status === "install_planned");
  for (let n = 0; planned.length > 0 && n < 12; n++) {
    const copy = clone(planned[n % planned.length]);
    copy.id = `fx-today-${n}`;
    copy.customer = PEOPLE[(n + 3) % PEOPLE.length];
    const a = copy.status === "visit_planned" ? copy.appointment : copy.install_appointment;
    if (a) {
      a.date = n < 8 ? today : addDays(today, -1 - n);
      a.time = `${String(8 + (n % 9)).padStart(2, "0")}:30`;
      a.technician = n % 3 === 0 ? "Eigenaar" : n % 3 === 1 ? LONG_TECH : TECH_2;
      if (n === 5) a.declined_at = new Date().toISOString();
    }
    leads.push(copy);
  }

  const items: AgendaItem[] = [
    // Zoals de app een gesprek opslaat: bij een lange naam en bedrijfsnaam wordt de naam ingekort, het nummer blijft heel.
    item(`${CALL_PREFIX}1-aaaaaa`, { date: today, start: "09:00", title: `${"Gesprek met Aleksandra Wiśniewska-Kowalczyk (Northwind Industries Holdings)".slice(0, 80 - ", bel +31 (0)6 12 34 56 78".length)}, bel +31 (0)6 12 34 56 78` }),
    item(`${CALL_PREFIX}2-bbbbbb`, { date: addDays(today, 1), start: "14:30", title: "Gesprek met Jo (X), bel 0612345678" }),
    item(`${CALL_PREFIX}3-cccccc`, { date: addDays(today, 2), title: "Gesprek met 🦊 Fox (Benachrichtigungseinstellungen GmbH), bel 06-12345678 / 073-1234567" }),
    item("fx-item-1", { date: addDays(today, 1), start: "00:00", title: "Jaarlijkse-onderhoudsbeurt-warmtepompinstallatie-bedrijfsverzamelgebouw-Noordkade", who: LONG_TECH }),
    item("fx-item-2", { date: addDays(today, 2), start: "12:00", end: "15:00", title: "x", who: TECH_2 }),
    item("fx-off-1", { kind: "off", title: "Ziek", date: addDays(today, -2), date_to: addDays(today, 5), who: LONG_TECH }),
    item("fx-off-2", { kind: "off", title: "Niet beschikbaar", date: today, who: TECH_2 }),
    item("fx-off-3", { kind: "off", title: "Verlof", date: today, who: "Eigenaar" }),
  ];

  const scattered = [1, 2, 3, 6, 9, 10, 13, 15, 16, 17, 20, 22, 23, 24, 27, 29, 30].map((n) => addDays(today, n));
  const roster: RosterRequest[] = [
    { id: "fx-r1", who: LONG_TECH, kind: "off", dates: scattered, reason: "Anders: verhuizing en daarna oppas voor de kleinkinderen (60)", note: "Lukt het echt niet anders, bel me dan even.", status: "pending", created_at: new Date().toISOString() },
    { id: "fx-r2", who: TECH_2, kind: "work", dates: [addDays(today, 1)], status: "pending", created_at: new Date().toISOString() },
  ];

  const settings: Settings = {
    ...base.settings,
    company_name: "Klimaattechniek & Installatiebedrijf Van den Heuvel-Schouwenaars B.V.",
    team: [...base.settings.team.filter((m) => m.name === "Eigenaar"), { name: LONG_TECH, days: [0, 1, 2, 3, 4], phone: "06-12345678 / 073-1234567 (na 18u)" }, { name: TECH_2, days: [] }],
    roster,
  };
  return { leads, items, settings };
}

/** Van elke soort precies één: zo vallen "1 taken" en "1 facturen" meteen op. */
function one(base: Data): Data {
  const all = seed().leads;
  const pick = (...statuses: Lead["status"][]) => statuses.map((s) => all.find((l) => l.status === s)).filter((l): l is Lead => !!l);
  const leads = pick("new", "quote_sent", "install_done", "invoice_sent", "visit_planned").map(clone);
  const visit = leads.find((l) => l.status === "visit_planned");
  if (visit?.appointment) visit.appointment.date = todayNl();
  const paid = clone(all.find((l) => l.status === "completed" && l.invoice?.paid_at));
  if (paid?.invoice) {
    paid.invoice.paid_at = new Date().toISOString();
    leads.push(paid);
  }
  const roster: RosterRequest[] = [{ id: "fx-r", who: base.settings.team[0]?.name ?? "Eigenaar", kind: "off", dates: [addDays(todayNl(), 3)], reason: "Vrij", status: "pending", created_at: new Date().toISOString() }];
  return { leads, items: [item(`${CALL_PREFIX}1-aaaaaa`, { date: addDays(todayNl(), 1), start: "10:00", title: "Gesprek met Jan (Koelhuis), bel 0612345678" })], settings: { ...base.settings, roster } };
}

/** Een groot bedrijf: duizend aanvragen in alle fases. */
function many(base: Data): Data {
  const source = seed().leads;
  const leads = Array.from({ length: 1000 }, (_, i) => {
    const lead = clone(source[i % source.length]);
    lead.id = `fx-${i}`;
    lead.customer = { ...lead.customer, name: `${lead.customer.name} ${i + 1}` };
    return lead;
  });
  return { leads, items: base.items, settings: base.settings };
}

export function dashboardFixture(kind: string | undefined, base: Data): Data | null {
  if (kind === "worst") return worst(base);
  if (kind === "leeg") return { leads: [], items: [], settings: { ...base.settings, roster: [] } };
  if (kind === "een") return one(base);
  if (kind === "veel") return many(base);
  return null;
}

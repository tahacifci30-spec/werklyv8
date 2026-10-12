/** Waarom Werkly: wat het oplevert (op de startpagina) en de vergelijking met een CRM en offertesoftware (op /waarom-werkly). */

import Link from "next/link";
import { btn } from "../ui";

const icons: Record<string, string> = {
  growth: "M3 17l6-6 4 4 8-8M15 7h6v6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  chat: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  doc: "M7 3h10l3 3v15H7zM10 12h7M10 16h7",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
};

/** Het eurosymbool is een gevuld beeld (eigen ontwerp); de andere iconen zijn lijntekeningen. */
const EURO_PATH =
  "M352.01,304.27c1.42-.75,2.83-1.32,3.92-1.2,1.01.11,2.42,2.01,2.42,3.34v47.75c0,3.68-1.9,7.29-5.07,9.22-29.66,18.07-63.47,28.11-98.37,29.12-39.93,1.11-79.13-9.96-112.48-31.77-35.64-23.31-62.91-57.43-77.51-97.68l-59.2-.03c-3.95,0-6.32-3.49-5.57-7.16l8.73-33.12c1.6-3.77,4.79-6.36,8.9-6.85l36.41-.03c-1.41-13.56-1.32-26.21,0-39.17H5.68c-1.76,0-3.59-1-4.42-2.06-.95-1.22-1.52-3.39-1.09-5l9.04-33.36c1.65-3.38,4.92-6.68,9.07-6.68l46.61-.06C87.19,68.13,138.85,21.51,202.19,5.77c43.34-10.77,88.97-6.32,129.66,12.12,3.45,1.13,6.28,4.56,5.28,8.41l-9.14,35.11c-.37,1.42-1.45,3.18-2.42,3.68-1.28.65-3.47.44-5.21.11-34.96-18.92-76.08-23.13-114.27-11.5-39.08,11.9-71.47,39.51-89.83,75.83h184.95c3.89.01,5.96,3.61,5.43,6.96l-8.93,33.48c-1.01,3.77-4.87,5.96-8.57,6.73H101.75c-1.75,13.04-1.73,26.13,0,39.18h178.78c3.4.2,6.27,3.29,5.37,6.7l-8.41,32.1c-1.1,4.19-4.65,8.33-9.55,8.33l-151.67.03c18.16,35.92,49.8,63.04,87.81,75.2,51.87,16.59,108.5,3.62,147.92-33.97Z";

/** Kleine verschuiving zodat het icoon optisch in het midden van zijn vlak staat. */
const NUDGE: Record<string, string> = { doc: "translate(-1.5 0)" };

function Icon({ name }: { name: string }) {
  if (name === "euro") {
    return (
      <svg viewBox="-20 -40 438.34 472.58" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d={EURO_PATH} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} transform={NUDGE[name]} />
    </svg>
  );
}

const benefits = [
  ["growth", "Meer aanvragen", "Het formulier is in een minuut ingevuld."],
  ["bolt", "Direct antwoord", "De klant ziet meteen een prijsindicatie."],
  ["chat", "Minder nabellen", "De klant vult alles zelf in, met foto's."],
  ["doc", "Sneller een offerte", "Na het bezoek staat het concept klaar."],
  ["euro", "Niets blijft liggen", "Meerwerk staat op de factuur."],
  ["eye", "Overzicht in één blik", "Elke aanvraag met de volgende stap."],
];

const rows: [string, string, string, string][] = [
  ["Klant vult een gericht klantformulier in", "Ja, met prijsindicatie", "Zelf formulier bouwen", "Nee"],
  ["Onbekende gegevens blijven zichtbaar", "Ja, per veld", "Nee", "Nee"],
  ["Monteur-checklist op locatie", "Ja", "Maatwerk", "Soms"],
  ["Conceptofferte uit bezoekgegevens", "Ja", "Nee", "Handmatig"],
  ["Klant geeft online akkoord", "Ja", "Soms", "Ja"],
  ["Agenda met werkdagen per monteur", "Ja", "Soms", "Nee"],
  ["Factuur, betaling en omzet", "Ja", "Soms", "Soms"],
  ["Inrichten en uitleg", "Wij richten het in, één keer uitleg", "Zelf inrichten, training nodig", "Zelf inrichten"],
  ["Koppeling met boekhouding (SnelStart)", "Nog niet, komt eraan", "Soms", "Soms"],
];

export function WhySection() {
  return (
    <section id="waarom" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <h2 className="display-md text-4xl sm:text-5xl">Waarom Werkly</h2>
        <p className="mt-4 max-w-2xl text-muted">
          Klanten haken af door wachten en nabellen, niet door uw vakwerk.
        </p>
        {/* Op een telefoon twee naast elkaar: zes kaarten onder elkaar is een lange lap om doorheen te vegen. */}
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {benefits.map(([icon, t, d]) => (
            <li key={t} className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-strong sm:h-12 sm:w-12">
                <Icon name={icon} />
              </span>
              <p className="mt-3 text-base font-semibold leading-snug sm:mt-4 sm:text-lg">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ul>
        <Link href="/waarom-werkly" className={`${btn.primary} mt-10 min-h-12 px-6 text-base`}>
          Vergelijk en reken het uit
        </Link>
      </div>
    </section>
  );
}

/** De vergelijkingstabel. Wat nog niet kan, staat er eerlijk en zonder vinkje bij. */
export function Comparison() {
  return (
    <div id="vergelijking" className="scroll-mt-24">
      <h2 className="display-md text-3xl sm:text-4xl">Werkly naast een CRM en offertesoftware</h2>
      <p className="mt-2 max-w-2xl text-muted">
        Veel software begint bij de offerte. Werkly begint eerder: bij de aanvraag die nog niet compleet is.
      </p>
        {/* Eén raster voor de hele tabel, zodat de kolommen in elke rij precies onder elkaar staan.
            Op een telefoon is de tabel breder dan het scherm: dan schuift alleen de tabel opzij, niet de pagina. */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Vergelijking, schuif opzij voor alle kolommen" tabIndex={0}>
            <table className="w-full min-w-[30rem] table-fixed border-collapse text-left text-xs sm:text-sm">
              <colgroup>
                <col className="w-[31%]" />
                <col className="w-[25%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted sm:text-xs">
                  <td className="sticky left-0 z-10 bg-slate-50" />
                  <th scope="col" className="bg-brand px-3 py-3 font-semibold text-white">Werkly</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Algemeen CRM</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Offerte-software</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, w, crm, off], i) => {
                  const stripe = i % 2 ? "bg-slate-50" : "bg-white";
                  return (
                    <tr key={label} className={`border-t border-line ${stripe}`}>
                      <th scope="row" className={`sticky left-0 z-10 px-3 py-3.5 align-middle font-medium sm:px-6 ${stripe}`}>
                        {label}
                      </th>
                      <td className={`bg-brand-soft px-3 py-3.5 align-middle ${w.startsWith("Nog niet") ? "font-medium text-slate-600" : "font-semibold text-brand-strong"}`}>
                        <span className="flex items-center gap-1.5">
                          {!w.startsWith("Nog niet") && (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m5 12 5 5 9-10" />
                            </svg>
                          )}
                          {w}
                        </span>
                      </td>
                      {[crm, off].map((c, k) => (
                        <td key={k} className={`px-3 py-3.5 align-middle ${c === "Nee" ? "text-slate-400" : "text-muted"}`}>
                          {c === "Nee" ? "✕ Nee" : c}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      <p className="mt-2 text-xs text-muted sm:hidden">Schuif de tabel opzij voor alle kolommen.</p>
    </div>
  );
}

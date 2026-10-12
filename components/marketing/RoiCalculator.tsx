"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { formatEur } from "@/lib/pricing/engine";

/**
 * Aannames, bewust voorzichtig. Ze staan zichtbaar onder de invoer.
 * TIME_SAVED: aandeel van de kantoortijd per klus dat we besparen.
 * MORE_REQUESTS: extra aanvragen door een kort formulier en een direct antwoord.
 */
const TIME_SAVED = 0.4;
const MORE_REQUESTS = 0.1;
const PLANS = [
  { id: "start", name: "Start", monthly: 150, setup: 999 },
  { id: "team", name: "Team", monthly: 250, setup: 1999 },
];

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const nl1 = (n: number) => n.toFixed(1).replace(".", ",");

/** Informatie-icoontje: uitleg bij hover, bij focus met het toetsenbord en bij tikken op een telefoon. */
function InfoTip({ children }: { children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Meer uitleg"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="relative grid h-6 w-6 place-items-center rounded-full border before:absolute before:-inset-2.5 before:content-[''] border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand-strong focus-visible:outline-offset-2"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="tip absolute bottom-full left-1/2 z-20 mb-2 w-64 max-w-[70vw] -translate-x-1/2 rounded-lg bg-petrol px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg"
        >
          {children}
          <span aria-hidden="true" className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-petrol" />
        </span>
      )}
    </span>
  );
}

function Field({
  id,
  label,
  unit,
  value,
  example,
  onChange,
  info,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  /** Voorbeeld in het lege veld, zodat duidelijk is wat voor getal bedoeld wordt */
  example: string;
  onChange: (v: string) => void;
  info?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <div className="relative">
        <input
          id={id}
          name={id}
          autoComplete="off"
          inputMode="decimal"
          placeholder={`bijv. ${example}`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 pr-20 text-lg font-semibold placeholder:font-normal placeholder:text-slate-400 focus:border-brand"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
    </div>
  );
}

export function RoiCalculator() {
  // De velden beginnen leeg: de uitkomst is pas iets waard als het de cijfers van de bezoeker zelf zijn.
  const [jobs, setJobs] = useState("");
  const [profit, setProfit] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [planId, setPlanId] = useState("start");
  const plan = PLANS.find((p) => p.id === planId)!;

  // Tijd
  const hoursPerMonth = num(jobs) * num(hours);
  const hoursSaved = hoursPerMonth * TIME_SAVED;
  const timeValue = hoursSaved * num(rate);
  // Meer aanvragen geven, bij dezelfde slagingskans als nu, evenveel procent meer klussen
  const extraJobs = num(jobs) * MORE_REQUESTS;
  const extraProfit = extraJobs * num(profit);

  const monthly = timeValue + extraProfit - plan.monthly;
  const yearly = Math.max(monthly, 0) * 12;
  const missing = [jobs, profit, hours, rate].filter((v) => v.trim() === "").length;
  const round = (n: number) => Math.round(n);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
        <h3 className="text-lg font-semibold">Vul uw cijfers in</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id="roi-jobs" label="Klussen per maand" unit="klussen" value={jobs} example="15" onChange={setJobs} />
          <Field
            id="roi-profit"
            label="Gemiddelde winst per klus"
            unit="€"
            value={profit}
            example="750"
            onChange={setProfit}
            info="Wat u overhoudt aan een klus nadat u het materiaal en de loonkosten heeft betaald."
          />
          <Field
            id="roi-hours"
            label="Kantoortijd per klus"
            unit="uur"
            value={hours}
            example="3"
            onChange={setHours}
            info="Tel de tijd op van de aanvraag tot en met de verstuurde factuur: gegevens nabellen, een bezoek plannen, de offerte uitwerken, de installatie inplannen en de factuur maken. Rijden en de klus zelf horen er niet bij."
          />
          <Field
            id="roi-rate"
            label="Wat is een uur van u waard?"
            unit="€ per uur"
            value={rate}
            example="50"
            onChange={setRate}
            info="Wat u zou verdienen als u dat uur op een klus zou werken, of wat een extra kracht op kantoor u kost."
          />
        </div>
        <fieldset className="mt-5">
          <legend className="mb-1.5 text-sm font-medium">Pakket</legend>
          <div className="grid grid-cols-2 gap-2">
            {PLANS.map((p) => (
              <label key={p.id} className="relative">
                <input type="radio" name="roi-plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} className="peer sr-only" />
                <span className="block min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="text-muted">{formatEur(p.monthly)} per maand</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-5 text-xs text-muted">
          Rekenvoorbeeld met voorzichtige aannames, geen garantie: {Math.round(TIME_SAVED * 100)}% minder kantoortijd per klus,{" "}
          {Math.round(MORE_REQUESTS * 100)}% meer aanvragen, en dus meer klussen, door een kort formulier met direct antwoord.
          Bedragen zijn exclusief btw.
        </p>
      </div>

      <div className="flex flex-col rounded-3xl bg-petrol p-5 text-white shadow-xl sm:p-7" aria-live="polite">
        <p className="text-sm font-medium text-teal-300">Uw voordeel met Werkly</p>
        {missing > 0 ? (
          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="display-md text-3xl sm:text-4xl">Vul eerst uw eigen cijfers in.</p>
            <p className="mt-3 max-w-sm text-slate-300">
              {missing === 4 ? "Vier getallen" : `Nog ${missing} ${missing === 1 ? "getal" : "getallen"}`} en u ziet hier wat Werkly u per maand en per jaar oplevert.
            </p>
          </div>
        ) : (
          <>
            <p className="tabular mt-2 text-5xl font-semibold tracking-tight sm:text-6xl">{formatEur(round(yearly))}</p>
            <p className="mt-1 text-slate-300">per jaar, na de maandkosten van {plan.name}</p>
            <p className="mt-1 text-sm text-slate-400">{formatEur(round(Math.max(monthly, 0)))} per maand</p>

            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-3">
                <dt>
                  <span className="block font-medium">Tijd terug</span>
                  <span className="text-slate-400">{round(hoursSaved)} uur per maand minder kantoorwerk</span>
                </dt>
                <dd className="tabular shrink-0 font-semibold">{formatEur(round(timeValue))}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-3">
                <dt>
                  <span className="block font-medium">Extra aanvragen</span>
                  <span className="text-slate-400">ongeveer {nl1(extraJobs)} extra klussen per maand</span>
                </dt>
                <dd className="tabular shrink-0 font-semibold">{formatEur(round(extraProfit))}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-3">
                <dt className="font-medium">Kosten {plan.name}</dt>
                <dd className="tabular shrink-0 font-semibold text-red-300">− {formatEur(plan.monthly)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-400">Bedragen in dit overzicht zijn per maand.</p>

            <p className="mt-5 text-sm font-medium text-slate-300">Eenmalige kosten</p>
            <dl className="mt-2 text-sm">
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-3">
                <dt className="font-medium">Opstartkosten {plan.name}</dt>
                <dd className="tabular shrink-0 font-semibold text-red-300">− {formatEur(plan.setup)}</dd>
              </div>
            </dl>
            {monthly <= 0 && (
              <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-200">Met deze cijfers verdient Werkly zich niet terug.</p>
            )}
          </>
        )}

        <Link href="/#demo" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
          Bespreek het met ons
        </Link>
      </div>
    </div>
  );
}

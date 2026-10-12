"use client";

import { useSyncExternalStore } from "react";
import { RevenueChart } from "../RevenueChart";

const subscribe = () => () => {};

/**
 * De omzetgrafiek van het voorbeeldbedrijf, met de echte grafiek uit de app. De bedragen staan vast; de maanden
 * lopen mee met de kalender, zodat de laatste staaf altijd "deze maand" is, ook als de website al weken live staat.
 */
export function DemoRevenueChart({ totals, jobs, builtMonth }: { totals: number[]; jobs: number[]; builtMonth: string }) {
  // Op de server en bij het eerste tekenen de maand van het bouwen; daarna de maand van de bezoeker.
  const month = useSyncExternalStore(subscribe, () => new Date().toISOString().slice(0, 7), () => builtMonth);
  const [year, m] = month.split("-").map(Number);
  const series = totals.map((total, i) => {
    const d = new Date(year, m - 1 - (totals.length - 1 - i), 1, 12);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("nl-NL", { month: "short" }).replace(".", ""),
      long: d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
      total,
      count: jobs[i],
    };
  });
  return <RevenueChart series={series} max={Math.max(...totals, 1)} />;
}

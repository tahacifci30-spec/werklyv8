"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Option = { value: string; label: string };

/**
 * Filters boven "Alle aanvragen": fase en monteur. Kiezen past de lijst direct aan, zonder knop en zonder dat het
 * scherm verspringt. `params` zijn de keuzes die al gelden (tabblad, zoekwoord), zodat die bewaard blijven.
 */
export function ListFilters({ params, fase, monteur, fases, monteurs }: { params: Record<string, string>; fase: string; monteur: string; fases: Option[]; monteurs: Option[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const go = (key: "fase" | "monteur", value: string) => {
    const next = new URLSearchParams({ ...params, fase, monteur, [key]: value });
    for (const k of [...next.keys()]) if (!next.get(k)) next.delete(k);
    start(() => router.push(`/dashboard${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const select = "min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand";

  return (
    <div className={`flex w-full items-center gap-2 sm:w-auto transition-opacity duration-100 ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
      <label className="sr-only" htmlFor="f-fase">Fase</label>
      <select id="f-fase" value={fase} onChange={(e) => go("fase", e.target.value)} className={select}>
        <option value="">Alle fases</option>
        {fases.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="f-monteur">Monteur</label>
      <select id="f-monteur" value={monteur} onChange={(e) => go("monteur", e.target.value)} className={select}>
        <option value="">Alle monteurs</option>
        {monteurs.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

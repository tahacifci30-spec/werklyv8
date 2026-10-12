"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyRosterChanges } from "@/app/actions";
import { useUnsavedWarning } from "@/components/useUnsavedWarning";

export type RosterDay = { date: string; weekday: string; num: number; today: boolean };
export type RosterCellData = {
  date: string;
  href: string;
  title: string;
  /** Tekst in het vakje: aantal afspraken, "Ziek", "NB" of leeg */
  label: string;
  works: boolean;
  off: boolean;
  /** Er wacht een aanvraag van de monteur voor deze dag */
  pending: boolean;
  canToggle: boolean;
};
export type RosterRow = { who: string; name: string; first: string; varying: boolean; cells: RosterCellData[] };

const key = (who: string, date: string) => `${who}|${date}`;

/**
 * Het weekrooster met de knoppen om iemand in of uit te roosteren.
 * Tikken verandert alleen het scherm, dus het reageert meteen, ook op een telefoon. Pas met "Wijzigingen bevestigen"
 * worden alle wijzigingen in één keer opgeslagen; met "Annuleren" staat alles weer zoals het was.
 */
export function RosterGrid({ days, rows }: { days: RosterDay[]; rows: RosterRow[] }) {
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [saving, start] = useTransition();
  const [error, setError] = useState(false);
  const dirty = changed.size > 0;
  useUnsavedWarning(dirty);

  const toggle = (k: string) => {
    setError(false);
    setChanged((old) => {
      const next = new Set(old);
      if (!next.delete(k)) next.add(k);
      return next;
    });
  };
  const confirm = () =>
    start(async () => {
      try {
        await applyRosterChanges([...changed].map((k) => ({ who: k.slice(0, k.lastIndexOf("|")), date: k.slice(k.lastIndexOf("|") + 1) })));
        start(() => setChanged(new Set()));
      } catch {
        setError(true);
      }
    });

  return (
    <>
      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] items-start gap-1 sm:grid-cols-[minmax(9rem,1.4fr)_repeat(7,minmax(0,1fr))] sm:gap-2">
        <span />
        {days.map((d) => (
          <div key={d.date} className={`rounded-lg py-1 text-center ${d.today ? "bg-brand text-white" : ""}`}>
            <p className={`text-[11px] font-medium uppercase ${d.today ? "text-white/85" : "text-muted"}`}>{d.weekday}</p>
            <p className="tabular text-sm font-semibold">{d.num}</p>
          </div>
        ))}

        {rows.map((r) => {
          const cells = r.cells.map((c) => {
            const flipped = changed.has(key(r.who, c.date));
            return { ...c, flipped, shownWorks: flipped ? !c.works : c.works, shownOff: flipped ? false : c.off };
          });
          const count = cells.filter((c) => c.shownWorks).length;
          return (
            <div key={r.who} className="contents">
              <div className="min-w-0 py-1 pr-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted">
                  {count} {count === 1 ? "dag" : "dagen"}
                  {r.varying ? ", wisselend" : ""}
                </p>
              </div>
              {cells.map((c) => {
                const act = c.shownWorks ? `${r.first} uitroosteren op deze dag` : `${r.first} inroosteren op deze dag`;
                return (
                  <div key={c.date} className="group relative">
                    <Link
                      href={c.href}
                      title={c.title}
                      onClick={(e) => {
                        if (dirty && !window.confirm("U heeft wijzigingen in het rooster die nog niet zijn bevestigd. Toch naar de agenda?")) e.preventDefault();
                      }}
                      className={`tabular grid h-11 place-items-center rounded-lg text-xs font-semibold transition-[background-color,color,transform] duration-100 active:scale-[0.96] sm:h-12 sm:text-sm ${
                        c.shownOff ? "bg-red-100 text-red-800" : c.shownWorks ? "bg-brand-soft text-brand-strong" : "bg-background text-slate-400"
                      } ${c.flipped ? "outline-dashed outline-2 -outline-offset-2 outline-brand" : c.pending ? "ring-2 ring-signal" : ""}`}
                    >
                      <span className="max-w-full truncate px-0.5">{c.flipped ? (c.shownWorks ? "✓" : "–") : c.label || (c.works ? "✓" : "–")}</span>
                    </Link>
                    {c.canToggle ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => toggle(key(r.who, c.date))}
                        aria-label={act}
                        aria-pressed={c.flipped}
                        title={act}
                        // Op een scherm met muis verschijnt de knop bij aanwijzen in de hoek; op een telefoon staat hij onder het vakje.
                        className={`absolute -right-1 -top-1 grid h-5 w-5 touch-manipulation select-none place-items-center rounded-full text-xs font-bold leading-none text-white opacity-0 shadow-sm transition-[opacity,transform] duration-100 hover:scale-110 focus-visible:opacity-100 active:scale-95 disabled:opacity-60 group-hover:opacity-100 sm:h-6 sm:w-6 sm:text-sm [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:h-9 [@media(hover:none)]:w-full [@media(hover:none)]:rounded-md [@media(hover:none)]:text-base [@media(hover:none)]:opacity-100 [@media(hover:none)]:shadow-none ${
                          c.shownWorks
                            ? "bg-red-600 [@media(hover:none)]:bg-red-50 [@media(hover:none)]:text-red-700"
                            : "bg-brand [@media(hover:none)]:bg-brand-soft [@media(hover:none)]:text-brand-strong"
                        }`}
                      >
                        <span aria-hidden="true">{c.shownWorks ? "×" : "+"}</span>
                      </button>
                    ) : (
                      // Dagen in het verleden hebben geen knop; deze ruimte houdt de rijen op een telefoon recht.
                      <span aria-hidden="true" className="hidden [@media(hover:none)]:mt-1 [@media(hover:none)]:block [@media(hover:none)]:h-9" />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Blijft onder in beeld zolang er iets is aangetikt, zodat bevestigen nooit uit het zicht raakt. */}
      {dirty && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 lg:bottom-4 mt-4 rounded-2xl bg-petrol p-3 text-white shadow-xl sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4" role="region" aria-label="Wijzigingen in het rooster">
          <p className="px-1 text-sm" aria-live="polite">
            <span className="font-semibold">
              {changed.size} {changed.size === 1 ? "wijziging" : "wijzigingen"}
            </span>{" "}
            nog niet opgeslagen.
            {error && <span className="mt-1 block font-medium text-red-200">Opslaan is niet gelukt. Probeer het opnieuw.</span>}
          </p>
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:mt-0 sm:flex sm:shrink-0">
            <button type="button" disabled={saving} onClick={() => setChanged(new Set())} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-100 hover:bg-white/10 active:scale-[0.97] disabled:opacity-50">
              Annuleren
            </button>
            <button type="button" disabled={saving} onClick={confirm} aria-busy={saving} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-signal px-4 text-sm font-semibold text-petrol transition-[filter,transform] duration-100 hover:brightness-95 active:scale-[0.97] disabled:opacity-60">
              {saving ? "Opslaan…" : "Wijzigingen bevestigen"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

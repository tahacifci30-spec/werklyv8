"use client";

import { useState } from "react";

/**
 * Een lijst waarvan de eerste rijen direct in beeld staan en de rest achter "Toon alle" zit.
 * De rijen zelf bepalen met `group-data-[open=false]/more:hidden` of ze dicht verborgen zijn.
 * Een gewone knop, geen link of vinkje: het scherm verspringt dus niet bij open- of dichtklappen.
 */
export function MoreRows({ total, buttonClass = "", children }: { total: number; buttonClass?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group/more" data-open={open}>
      {children}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`mx-5 mb-1 mt-2 flex min-h-11 w-[calc(100%-2.5rem)] items-center justify-center rounded-lg border border-line text-sm font-semibold text-brand-strong hover:bg-background active:bg-slate-100 ${buttonClass}`}
      >
        {open ? "Toon minder" : `Toon alle ${total}`}
      </button>
    </div>
  );
}

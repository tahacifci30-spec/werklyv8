"use client";

import { useState } from "react";

export type TaskGroup = { id: string; label: string; count: number; node: React.ReactNode };

/**
 * De taken in "Aan u", met bovenin een knop per soort werk. Eén tik toont alleen die groep, zodat u bij veel
 * taken niet eerst langs alle belafspraken hoeft om bij de facturen te komen. De kaart blijft even groot:
 * op een groot scherm schuift de lijst binnen de kaart.
 */
export function TaskGroups({ groups }: { groups: TaskGroup[] }) {
  const [show, setShow] = useState("alles");
  // Verdwijnt de gekozen groep (alles afgewerkt), dan staat alles weer in beeld.
  const active = groups.some((g) => g.id === show) ? show : "alles";
  const total = groups.reduce((n, g) => n + g.count, 0);
  const chips = [{ id: "alles", label: "Alles", count: total }, ...groups];

  return (
    <>
      {groups.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Toon één soort werk">
          {chips.map((c) => {
            const on = c.id === active;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setShow(c.id)}
                className={`flex min-h-10 shrink-0 touch-manipulation select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-100 active:scale-[0.97] ${
                  on ? "border-petrol bg-petrol text-white" : "border-line bg-surface text-foreground hover:border-brand/50"
                }`}
              >
                {c.label}
                <span className={`tabular text-xs ${on ? "text-white/80" : "text-muted"}`}>{c.count}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="lg:relative lg:mt-2 lg:flex-1">
        <div className="mt-2 pb-2 lg:absolute lg:inset-0 lg:mt-0 lg:overflow-y-auto" tabIndex={-1}>
          {groups
            .filter((g) => active === "alles" || g.id === active)
            .map((g) => (
              <div key={g.id}>{g.node}</div>
            ))}
        </div>
      </div>
    </>
  );
}

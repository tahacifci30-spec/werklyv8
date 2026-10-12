import { Fragment } from "react";
import type { LeadStatus } from "@/lib/types";
import { PHASES, PHASE_OF } from "@/lib/workflow";

const STEPS = PHASES.slice(0, 5);

/**
 * De vijf fases van een klus als lijn met bolletjes, in de kleur van elke fase. Wat geweest is en waar de klus nu
 * staat is gekleurd; wat nog komt is grijs. Zo ziet u in één blik hoe ver een klant is.
 */
export function PhaseLine({ status, labels = false, className = "" }: { status: LeadStatus; labels?: boolean; className?: string }) {
  const phase = PHASE_OF[status];
  // Afgerond: alles gekleurd. Afgesloten zonder klus: alles grijs.
  const at = phase === "afgerond" ? STEPS.length : STEPS.findIndex((s) => s.id === phase);
  const now = phase === "afgerond" ? "afgerond" : phase === "afgewezen" ? "afgesloten" : `fase ${at + 1} van ${STEPS.length}: ${STEPS[at].label}`;

  return (
    <span role="img" aria-label={`Voortgang, ${now}`} className={`flex items-start ${labels ? "sm:px-6" : ""} ${className}`}>
      {STEPS.map((s, i) => {
        const reached = i <= at;
        const current = i === at;
        return (
          // Bolletjes en lijnen staan los naast elkaar: elke lijn vult de ruimte tussen twee bolletjes en stopt bij de rand.
          <Fragment key={s.id}>
            {i > 0 && <span aria-hidden="true" className="mt-[5px] h-0.5 min-w-2 flex-1 rounded-full" style={{ background: reached ? s.color : "var(--line)" }} />}
            {/* De ring om de huidige fase steekt 4 px uit; met die ruimte ernaast sluit de lijn op de ring aan in plaats van eroverheen te lopen. */}
            <span className={`flex w-3 shrink-0 flex-col items-center ${current ? "mx-1" : ""}`}>
              <span
                aria-hidden="true"
                title={s.label}
                className={`block h-3 w-3 shrink-0 rounded-full ${current ? "ring-2 ring-offset-2 ring-offset-surface" : ""} ${reached ? "" : "border-2 border-line bg-surface"}`}
                style={reached ? { background: s.color, ...(current ? ({ "--tw-ring-color": s.color } as React.CSSProperties) : {}) } : undefined}
              />
              {labels && (
                <span aria-hidden="true" className={`mt-2 hidden whitespace-nowrap text-[13px] sm:block ${current ? "font-semibold text-foreground" : "text-muted"}`}>
                  {s.label}
                </span>
              )}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}

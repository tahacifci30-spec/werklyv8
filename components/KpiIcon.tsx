/** Icoon per onderdeel van het overzicht, in de huisstijl: donkergroen op lichtgroen. De vorm laat zien welk bedrag wat is. */
const KINDS = {
  // Offerte die bij de klant ligt: document met klokje
  quotes: { d: "M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h4" },
  // Klus klaar, factuur moet nog gemaakt worden: bon met potlood-streep
  toInvoice: { d: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" },
  // Factuur verstuurd, geld nog niet binnen: klok
  open: { d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" },
  // Betaald deze maand: stijgende lijn
  revenue: { d: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  // Afspraken van vandaag: agenda
  today: { d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
} as const;

export type KpiKind = keyof typeof KINDS;

/** `tone="signal"`: geel op een donkere tegel. */
export function KpiIcon({ kind, className = "h-9 w-9", tone = "soft" }: { kind: KpiKind; className?: string; tone?: "soft" | "signal" }) {
  const k = KINDS[kind];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-lg ${tone === "signal" ? "bg-signal text-petrol" : "bg-brand-soft text-petrol"} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={k.d} />
      </svg>
    </span>
  );
}

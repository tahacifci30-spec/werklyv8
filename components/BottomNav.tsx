"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  requests: <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />,
  agenda: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  revenue: <path d="M5 20V10M12 20V4M19 20v-7" />,
  roster: <path d="M4 5h16v15H4zM4 10h16M9 5v15M15 5v15" />,
  // hetzelfde tandwiel als in de zijbalk op een groot scherm
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z" />,
};

const OWNER_ITEMS = [
  { href: "/dashboard", label: "Aanvragen", icon: "requests", except: ["/dashboard/agenda", "/dashboard/rooster", "/dashboard/revenue", "/dashboard/settings"] },
  { href: "/dashboard/agenda", label: "Agenda", icon: "agenda", except: [] },
  { href: "/dashboard/rooster", label: "Rooster", icon: "roster", except: [] },
  { href: "/dashboard/revenue", label: "Omzet", icon: "revenue", except: [] },
  { href: "/dashboard/settings", label: "Instellingen", icon: "settings", except: [] },
];

const TECHNICIAN_ITEMS = [
  { href: "/technician", label: "Mijn werk", icon: "requests", except: ["/technician/rooster"] },
  { href: "/technician/rooster", label: "Rooster", icon: "roster", except: [] },
];

/** Navigatie onderaan het scherm op telefoons (maximaal 5 knoppen, altijd binnen beeld). */
export function BottomNav({ role }: { role: "owner" | "technician" }) {
  const pathname = usePathname();
  const items = role === "owner" ? OWNER_ITEMS : TECHNICIAN_ITEMS;
  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed inset-x-0 bottom-0 z-40 material material-bottom border-t border-line/60 pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
    >
      <ul className={`mx-auto grid max-w-lg ${items.length === 2 ? "grid-cols-2" : "grid-cols-5"}`}>
        {items.map((it) => {
          const active = pathname.startsWith(it.href) && !it.except.some((e) => pathname.startsWith(e));
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium max-[359px]:text-[10px] ${
                  active ? "text-brand-strong" : "text-muted"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icons[it.icon]}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

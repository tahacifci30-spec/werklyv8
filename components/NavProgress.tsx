"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Dunne balk bovenaan die direct beweegt zodra u op een link tikt, tot de nieuwe pagina er staat.
 * Zonder dit lijkt het bij tabbladen, "Toon meer" of een andere week alsof de tik niet is aangekomen,
 * omdat het scherm pas verandert als de server heeft geantwoord.
 */
export function NavProgress() {
  const here = `${usePathname()}?${useSearchParams()}`;
  const hereRef = useRef(here);
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const begin = () => {
      setFrom(hereRef.current);
      clearTimeout(timer);
      // Vangnet: gaat de pagina toch niet door (geannuleerd, download), dan verdwijnt de balk vanzelf.
      timer = setTimeout(() => setFrom(null), 8000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin || /\/export(\/|$)/.test(to.pathname)) return;
      if (to.pathname === location.pathname && to.search === location.search) return;
      begin();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (form?.method === "get") begin();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  if (from !== here) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden print:hidden">
      <span className="sr-only">Laden…</span>
      <span aria-hidden="true" className="nav-progress block h-full w-2/5 rounded-r-full bg-brand" />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { Logo } from "@/components/ui";
import { DEFAULT_COMPANY, getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "Prijsindicatie aanvragen",
  description: "Beantwoord 5 korte vragen en zie direct een prijsindicatie.",
};
export const dynamic = "force-dynamic";

/**
 * Het klantformulier. Met ?demo=1 (de links op de website van Werkly) is het een demonstratie:
 * er staat duidelijk bij dat het een voorbeeld is en wat de bezoeker invult wordt niet opgeslagen.
 */
export default async function IntakePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demo = (await searchParams).demo === "1";
  const s = await getSettings(DEFAULT_COMPANY);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Naar hoofdinhoud
      </a>
      {demo && (
        <div role="note" className="sticky top-0 z-20 bg-petrol px-4 py-2.5 text-center text-sm text-white">
          <span className="mr-2 rounded bg-signal px-1.5 py-0.5 text-xs font-bold text-petrol">DEMO</span>
          Zo ziet de klant van een installateur het formulier. Wat u invult wordt niet opgeslagen.{" "}
          <Link href="/" className="whitespace-nowrap font-semibold underline underline-offset-4">Terug naar Werkly</Link>
        </div>
      )}
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
        <IntakeFlow companyName={s.company_name} phone={s.phone} rules={s.pricing} demo={demo} />
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">
        Aangeboden via <span className="inline-block align-middle"><Logo href="/" /></span> ·{" "}
        <a href="/privacy" className="underline">Privacy</a>
      </footer>
    </>
  );
}

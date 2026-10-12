import type { Metadata } from "next";
import Link from "next/link";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { Comparison } from "@/components/marketing/WhySection";
import { btn } from "@/components/ui";

export const metadata: Metadata = {
  title: "Waarom Werkly",
  description: "Werkly naast een CRM en offertesoftware, en een rekentool waarmee u met uw eigen cijfers ziet wat het oplevert.",
};

/** De vergelijking en de rekentool: voor wie na de startpagina wil weten of het bij zijn bedrijf past. */
export default function WhyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-10 sm:pt-14">
          <Link href="/#waarom" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
            ← Terug naar de startpagina
          </Link>
          <h1 className="display mt-2 text-5xl sm:text-6xl">Waarom Werkly</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Wat Werkly anders doet dan een CRM of offertesoftware, en wat het u oplevert met uw eigen cijfers.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
          <Comparison />
        </section>

        <section id="rekentool" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <h2 className="display-md text-3xl sm:text-4xl">Reken zelf uit wat het oplevert</h2>
            <p className="mt-2 max-w-2xl text-muted">Vul vier getallen van uw eigen bedrijf in. De uitkomst verschijnt zodra ze er alle vier staan.</p>
            <div className="mt-8">
              <RoiCalculator />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="display-md text-3xl sm:text-4xl">Benieuwd of het bij uw bedrijf past?</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#demo" className={`${btn.primary} min-h-12 px-6 text-base`}>Plan een gesprek</Link>
            <Link href="/#prijzen" className={`${btn.secondary} min-h-12 px-6 text-base`}>Bekijk de prijzen</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

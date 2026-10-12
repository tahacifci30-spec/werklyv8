import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { FormEditor } from "@/components/settings/FormEditor";
import { CompanyForm, LegalForm, PricingForm, ProductsForm, TeamForm } from "@/components/settings/SettingsForms";
import { Card, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { NOTICES } from "@/lib/notices";
import { formatRange, priceBounds } from "@/lib/pricing/engine";
import { PRICE_GROUPS, getPath, toDisplay } from "@/lib/pricing/fields";
import { pageSettings as getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "Instellingen" };
export const dynamic = "force-dynamic";

/** De onderdelen van de instellingen, per groep, in de volgorde van de pagina. */
const SECTIONS: [string, [string, string][]][] = [
  ["Uw bedrijf", [["bedrijf", "Bedrijf"], ["factuur", "Factuurgegevens"]]],
  ["Team", [["team", "Team en logins"]]],
  ["Klantformulier en prijzen", [["vragen", "Vragen en bedragen"], ["prijs", "Basisprijs"], ["voorbeeld", "Voorbeeld"], ["producten", "Vaste producten"], ["delen", "Formulier delen"]]],
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireSession("owner");
  const { notice } = await searchParams;
  const s = await getSettings(session.company_id);

  const values: Record<string, number> = {};
  for (const g of PRICE_GROUPS) for (const f of g.fields) values[f.path] = toDisplay(f, getPath(s.pricing, f.path));

  const bounds = priceBounds(s.pricing);
  const examples: [string, string][] = [
    ["Goedkoopste antwoorden", formatRange(bounds.low)],
    ["Duurste antwoorden", formatRange(bounds.high)],
    ["Klant weet niets (alles 'Weet ik niet')", formatRange(bounds.unknown)],
  ];

  const embed = `<iframe src="/intake" title="Prijsindicatie aanvragen" style="width:100%;min-height:720px;border:0" loading="lazy"></iframe>`;

  return (
    <AppShell session={session} wide>
      <h1 className="display-md text-4xl">Instellingen</h1>
      <div className="mt-4">
        <Flash key={notice} message={notice ? NOTICES[notice] : undefined} />
      </div>

      {/*
        De instellingen in drie groepen, in de volgorde waarin u ze bij de start invult. Op een groot scherm staat
        het menu vast aan de linkerkant; op een telefoon blijft het als rij knoppen bovenin staan tijdens het schuiven.
      */}
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,46rem)] lg:items-start lg:gap-10">
        <nav
          aria-label="Onderdelen van de instellingen"
          className="material sticky top-14 z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-line/60 px-4 py-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:top-8 lg:mx-0 lg:mb-0 lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-filter-none"
        >
          {SECTIONS.map(([group, items]) => (
            <div key={group} className="contents lg:mb-5 lg:block">
              <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted lg:block">{group}</p>
              {items.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-muted transition-colors duration-100 hover:border-brand/50 hover:text-foreground lg:flex lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-3 lg:hover:bg-surface"
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <div className="px-1">
            <h2 className="display-md text-2xl">Uw bedrijf</h2>
            <p className="mt-1 text-sm text-muted">Wat klanten van u zien, en wat op de factuur staat.</p>
          </div>
          <Card id="bedrijf" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Bedrijf</SectionTitle>
            <CompanyForm values={{ company_name: s.company_name, phone: s.phone, email: s.email }} />
          </Card>
          <Card id="factuur" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Gegevens voor de factuur</SectionTitle>
            <LegalForm values={s.legal} />
          </Card>
          <div className="mt-6 px-1">
            <h2 className="display-md text-2xl">Team</h2>
            <p className="mt-1 text-sm text-muted">Wie er werkt, op welke dagen, en wie mag inloggen.</p>
          </div>
          <Card id="team" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Team en werkdagen</SectionTitle>
            <TeamForm team={s.team.map((m) => ({ name: m.name, days: m.days, email: m.email ?? "", phone: m.phone ?? "", hasLogin: !!m.pass }))} />
          </Card>
          <div className="mt-6 px-1">
            <h2 className="display-md text-2xl">Klantformulier en prijzen</h2>
            <p className="mt-1 text-sm text-muted">Wat de klant gevraagd wordt en wat het kost.</p>
          </div>
          <Card id="vragen" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Klantformulier: vragen en bedragen</SectionTitle>
            <FormEditor form={s.pricing.form} />
          </Card>
          <Card id="prijs" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Basisprijs en bandbreedte</SectionTitle>
            <p className="mb-5 text-sm text-muted">
              De prijsindicatie is de basisprijs plus de bedragen van de gekozen antwoorden hierboven. Bedragen zijn inclusief btw.
              Bestaande aanvragen behouden de prijs die de klant zag.
            </p>
            <PricingForm values={values} />
          </Card>
          <Card id="voorbeeld" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Wat uw klant te zien krijgt</SectionTitle>
            <ul className="divide-y divide-line text-sm">
              {examples.map(([label, range]) => (
                <li key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 max-w-md text-muted">{label}</span>
                  <strong className="tabular">{range}</strong>
                </li>
              ))}
            </ul>
          </Card>
          <Card id="producten" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Vaste producten</SectionTitle>
            <ProductsForm products={s.products} />
          </Card>
          <Card id="delen" className="scroll-mt-32 lg:scroll-mt-8">
            <SectionTitle>Klantformulier delen</SectionTitle>
            <p className="text-sm text-muted">
              Zet het formulier op uw website of deel de link. Aanvragen komen direct in uw overzicht.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value="/intake" label="Link kopiëren" />
            </div>
            <label htmlFor="embed" className="mt-5 block text-sm font-medium">
              Code om het formulier in uw website te zetten
            </label>
            <textarea id="embed" readOnly rows={3} value={embed} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs" />
            <p className="mt-1 text-xs text-muted">Vervang het pad door het volledige adres van uw Werkly-omgeving.</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

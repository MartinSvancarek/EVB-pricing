import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Kpi, Section } from "@/components/ui";
import { fmtCzk, fmtDate } from "@/lib/format";
import { currentFx } from "@/lib/analytics";
import { Plus } from "lucide-react";
import { PricingTable } from "./PricingTable";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; provider?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [services, pricingsAll, fx] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.modelPricing.findMany({
      include: { function: { include: { service: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    currentFx(),
  ]);

  const providers = [...new Set(pricingsAll.map((p) => p.provider))].sort();
  const activeCount = pricingsAll.filter((p) => p.status === "active").length;
  const inactiveCount = pricingsAll.length - activeCount;
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const recentlyUpdated = pricingsAll.filter((p) => p.updatedAt.getTime() >= sevenDaysAgo).length;

  return (
    <>
      <PageHeader
        title="Pricing"
        subtitle="Centrální přehled cen všech AI modelů. Inline editace cen a statusu. Filtry fungují dynamicky (bez potvrzení)."
      />

      <div className="card mb-4 p-3 text-sm text-muted">
        <strong className="text-text">Co je tato stránka?</strong> Správa cenníku AI modelů a providerů. Každý řádek = jeden model s jeho cenou (USD), případně vstup/výstup pro chat modely. Ceny se přepočítávají na CZK podle aktuálního FX kurzu. Filtrujte podle služby, providera nebo vyhledáváním.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Aktivní záznamy" value={activeCount} />
        <Kpi label="Inactive" value={inactiveCount} />
        <Kpi label="Upraveno (7 dní)" value={recentlyUpdated} />
        <Link href="/settings/fx">
          <Kpi label="FX kurz" value={fx ? `${fx.toFixed(3)}` : "—"} sub="CZK / USD" />
        </Link>
      </div>

      <PricingTable
        pricings={pricingsAll.map((p) => ({
          id: p.id,
          model: p.model,
          provider: p.provider,
          fallbackProvider: p.fallbackProvider,
          serviceName: p.function.service.name,
          serviceCode: p.function.service.code,
          serviceColor: p.function.service.color,
          billingType: p.billingType,
          priceUsd: p.priceUsd,
          inputPriceUsd: p.inputPriceUsd,
          outputPriceUsd: p.outputPriceUsd,
          status: p.status as "active" | "inactive",
          updatedAt: p.updatedAt.toISOString(),
        }))}
        services={services.map((s) => ({ code: s.code, name: s.name }))}
        providers={providers}
        fx={fx ?? 23}
        initialFilters={{ service: sp.service ?? "", provider: sp.provider ?? "", status: sp.status ?? "active", q: sp.q ?? "" }}
      />

      <div className="mt-4">
        <Link href="/pricing/new" className="btn-primary">
          <Plus size={14} /> Nová cena
        </Link>
      </div>
    </>
  );
}

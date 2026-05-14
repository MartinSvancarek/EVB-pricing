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
  const [services, pricingsAll, fx, functions] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.modelPricing.findMany({
      include: { function: { include: { service: true } } },
      orderBy: { model: "asc" },
    }),
    currentFx(),
    prisma.function.findMany({ include: { service: true }, orderBy: { name: "asc" } }),
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
        subtitle="Správa ceníku AI modelů a providerů. Každý řádek = model s cenou USD (příp. vstup/výstup). Ceny se přepočítávají na CZK dle FX. Inline editace, dynamické filtry."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Aktivní záznamy" value={activeCount} tooltip="Počet modelů se statusem 'active' v cenníku." />
        <Kpi label="Inactive" value={inactiveCount} tooltip="Počet deaktivovaných modelů (historické nebo nahrazené)." />
        <Kpi label="Upraveno (7 dní)" value={recentlyUpdated} tooltip="Počet záznamů upravených v posledních 7 dnech." />
        <Link href="/settings/fx">
          <Kpi label="FX kurz" value={fx ? `${fx.toFixed(3)}` : "—"} sub="CZK / USD" tooltip="Aktuální FX kurz pro přepočet USD → CZK. Klikněte pro úpravu." />
        </Link>
      </div>

      <PricingTable
        pricings={pricingsAll.map((p) => ({
          id: p.id,
          model: p.model,
          provider: p.provider,
          fallbackProvider: p.fallbackProvider,
          functionId: p.functionId,
          serviceName: p.function.service.name,
          serviceCode: p.function.service.code,
          serviceColor: p.function.service.color,
          billingType: p.billingType,
          priceUsd: p.priceUsd,
          inputPriceUsd: p.inputPriceUsd,
          outputPriceUsd: p.outputPriceUsd,
          resolution: p.resolution,
          credits: p.credits,
          durationSec: p.durationSec,
          status: p.status as "active" | "inactive",
          updatedAt: p.updatedAt.toISOString(),
        }))}
        services={services.map((s) => ({ code: s.code, name: s.name }))}
        providers={providers}
        functions={functions.map((f) => ({ id: f.id, name: f.name, serviceName: f.service.name, serviceCode: f.service.code }))}
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

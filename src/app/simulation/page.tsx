import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { loadCosts, periodLastNDays, bucketBy, currentFx, loadRevenue, periodMTD } from "@/lib/analytics";
import { SimulationClient } from "./SimulationClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const sp = await searchParams;
  const period = periodLastNDays(30);
  const [data, fx, revenue, services] = await Promise.all([
    loadCosts(period),
    currentFx(),
    loadRevenue(periodMTD()),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  const buckets = bucketBy(data.enriched, "service");
  const totalCzk = buckets.reduce((s, b) => s + b.costCzk, 0);
  const totalTokens = data.enriched.reduce(
    (s, e) =>
      s +
      (e.u.inputTokens != null ? Number(e.u.inputTokens) : 0) +
      (e.u.outputTokens != null ? Number(e.u.outputTokens) : 0),
    0,
  );

  // Per service baseline
  const servicesWithCost = services.filter((svc) => buckets.find((x) => x.serviceId === svc.id && x.costCzk > 0));
  const hasMultipleServices = servicesWithCost.length > 1;

  const defaultShares: Record<string, number> = { chat: 23, graphics: 40, video: 30, audio: 2, deep_research: 5 };

  const baseline = services.map((svc) => {
    const b = buckets.find((x) => x.serviceId === svc.id);
    const tokens = b ? b.inputTokens + b.outputTokens : 0;
    const units = b ? b.units : 0;
    const usage = tokens + units;
    const costCzk = b ? b.costCzk : 0;
    const sharePct = defaultShares[svc.code] ?? (hasMultipleServices
      ? (totalCzk > 0 ? Math.round((costCzk / totalCzk) * 100) : 0)
      : Math.round(100 / services.length));
    const costPerUnit = usage > 0 ? costCzk / usage : 0;
    return {
      serviceId: svc.id,
      serviceCode: svc.code,
      serviceName: svc.name,
      serviceColor: svc.color,
      actualCostCzk: costCzk,
      actualUsage: usage,
      actualSharePercent: sharePct,
      costPerUnit,
      hasData: usage > 0,
    };
  });

  // If loading a saved scenario, pass its allocations
  let loadedScenario: { name: string; description: string | null; totalTokens: number; revenue: number; fx: number; shares: Record<string, number> } | null = null;
  if (sp.scenario) {
    const sc = await prisma.simulationScenario.findUnique({
      where: { id: sp.scenario },
      include: { allocations: true },
    });
    if (sc) {
      loadedScenario = {
        name: sc.name,
        description: sc.description,
        totalTokens: Number(sc.totalTokensAssumption),
        revenue: sc.revenueCzkAssumption,
        fx: sc.fxRate,
        shares: Object.fromEntries(sc.allocations.map((a) => [a.serviceId, Math.round(a.sharePercent)])),
      };
    }
  }

  return (
    <>
      <PageHeader
        title="Simulation"
        subtitle="What-if simulace interního rozdělení nákladů na tokeny mezi služby. Vlevo měníte %, vpravo vidíte live přepočet cost ratio a nákladů. Jde o interní cost alokaci, ne veřejné ceny."
        actions={<Link href="/simulation/scenarios" className="btn">Uložené scénáře</Link>}
      />

      <SimulationClient
        baseline={baseline}
        defaults={{
          totalTokensAssumption: Math.round(totalTokens),
          revenueCzkAssumption: Math.round(revenue || 4_500_000),
          fx: fx ?? 23,
        }}
        loadedScenario={loadedScenario}
      />
    </>
  );
}

import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { loadCosts, periodLastNDays, bucketBy, currentFx, loadRevenue, periodMTD } from "@/lib/analytics";
import { SimulationClient } from "./SimulationClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SimulationPage() {
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

  // Per service: actual cost, tokens, cost_per_token
  const baseline = services.map((svc) => {
    const b = buckets.find((x) => x.serviceId === svc.id);
    const tokens = b ? b.inputTokens + b.outputTokens : 0;
    const units = b ? b.units : 0;
    const usage = tokens + units;
    const costCzk = b ? b.costCzk : 0;
    const sharePct = totalCzk > 0 ? (costCzk / totalCzk) * 100 : 0;
    const costPerToken = usage > 0 ? costCzk / usage : 0;
    return {
      serviceId: svc.id,
      serviceCode: svc.code,
      serviceName: svc.name,
      serviceColor: svc.color,
      actualCostCzk: costCzk,
      actualUsage: usage,
      actualSharePercent: sharePct,
      costPerUnit: costPerToken,
      hasData: usage > 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Simulation"
        subtitle="What-if interní rozdělení nákladů na tokeny mezi služby. Nejde o veřejné ceny."
        actions={<Link href="/simulation/scenarios" className="btn">Uložené scénáře</Link>}
      />
      <SimulationClient
        baseline={baseline}
        defaults={{
          totalTokensAssumption: Math.round(totalTokens),
          revenueCzkAssumption: Math.round(revenue || 4_500_000),
          fx: fx ?? 23,
        }}
      />
    </>
  );
}

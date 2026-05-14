import Link from "next/link";
import { PageHeader, Kpi, Section } from "@/components/ui";
import { CostTrendChart, StackedBarByService } from "@/components/charts";
import { fmtCzk, fmtUsd, fmtNumber, fmtPct } from "@/lib/format";
import {
  loadCosts,
  loadRevenue,
  periodLastNDays,
  periodMTD,
  bucketBy,
  timeSeries,
  trackingCoverage,
} from "@/lib/analytics";
import { costRatio, ratioStatus } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const mtd = periodMTD();
  const last30 = periodLastNDays(30);

  const [mtdData, last30Data, mtdRevenue, coverage] = await Promise.all([
    loadCosts(mtd),
    loadCosts(last30),
    loadRevenue(mtd),
    trackingCoverage(),
  ]);

  const mtdCosts = mtdData.enriched.reduce(
    (acc, e) => {
      acc.usd += e.costUsd ?? 0;
      acc.czk += e.costCzk ?? 0;
      acc.tokens +=
        (e.u.inputTokens != null ? Number(e.u.inputTokens) : 0) +
        (e.u.outputTokens != null ? Number(e.u.outputTokens) : 0);
      return acc;
    },
    { usd: 0, czk: 0, tokens: 0 },
  );

  const ratio = costRatio(mtdCosts.czk, mtdRevenue);
  const status = ratioStatus(ratio);

  // service breakdown
  const services = mtdData.services;
  const serviceColors: Record<string, string> = Object.fromEntries(services.map((s) => [s.code, s.color]));
  const buckets = bucketBy(mtdData.enriched, "service");
  const topService = buckets[0];

  // 30d trend with daily ratio (use proportional revenue)
  const dailyRevenue = mtdRevenue / Math.max(1, Math.round((mtd.to.getTime() - mtd.from.getTime()) / 86_400_000) + 1);
  const ts = timeSeries(last30Data.enriched);
  const trendData = ts.map((p) => ({
    date: p.date.slice(5),
    cost: Math.round(p.costCzk),
    ratio: dailyRevenue > 0 ? p.costCzk / dailyRevenue : null,
  }));
  const stackedData = ts.map((p) => ({
    date: p.date.slice(5),
    ...Object.fromEntries(services.map((s) => [s.code, Math.round(p.perService[s.code] ?? 0)])),
  }));

  // top 10 functions
  const fnBuckets = bucketBy(mtdData.enriched, "function").slice(0, 10);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Aktuální měsíc · cíl cost ratio 20 % · pokrytí trackingu ${fmtPct(coverage.coverage, 0)}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Kpi
          label="Cost ratio MTD"
          value={ratio != null ? fmtPct(ratio) : "N/A"}
          sub={ratio == null ? "Zadejte obrat v Settings → Revenue" : "cíl ≤ 20 %"}
          status={status}
        />
        <Kpi label="Náklady MTD" value={fmtCzk(mtdCosts.czk)} sub={fmtUsd(mtdCosts.usd, { compact: true })} />
        <Kpi label="Token usage MTD" value={fmtNumber(mtdCosts.tokens, { compact: true })} sub="vstup + výstup" />
        <Kpi
          label="Top služba"
          value={topService?.serviceName ?? "—"}
          sub={
            topService
              ? `${fmtCzk(topService.costCzk, { compact: true })} · ${fmtPct(topService.costCzk / mtdCosts.czk, 0)}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section title="Trend nákladů a cost ratio (30 dní)">
          <CostTrendChart data={trendData} />
        </Section>
        <Section title="Denní náklady CZK – po službách">
          <StackedBarByService
            data={stackedData}
            serviceCodes={services.map((s) => s.code)}
            serviceColors={serviceColors}
          />
        </Section>
      </div>

      <Section title="Top 10 funkcí podle nákladů (MTD)">
        <table className="table">
          <thead>
            <tr>
              <th>Služba</th>
              <th>Funkce</th>
              <th className="text-right">Náklady CZK</th>
              <th className="text-right">% z celku</th>
              <th className="text-right">Tokeny</th>
            </tr>
          </thead>
          <tbody>
            {fnBuckets.map((b) => (
              <tr key={b.functionId}>
                <td>
                  <span className="badge" style={{ borderColor: `${b.serviceColor}55`, color: b.serviceColor }}>
                    {b.serviceName}
                  </span>
                </td>
                <td>{b.functionName}</td>
                <td className="text-right font-mono">{fmtCzk(b.costCzk)}</td>
                <td className="text-right text-muted">{fmtPct(b.costCzk / Math.max(mtdCosts.czk, 1), 1)}</td>
                <td className="text-right text-muted">{fmtNumber(b.inputTokens + b.outputTokens, { compact: true })}</td>
              </tr>
            ))}
            {fnBuckets.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-6">
                  Žádná data za období. Zkontrolujte tracking nebo seedněte databázi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <div className="flex gap-2">
        <Link href="/cost-analytics/cost" className="btn-primary">
          Otevřít cost analytics
        </Link>
        <Link href="/simulation" className="btn">
          Spustit simulaci
        </Link>
        <Link href="/pricing" className="btn">
          Editovat pricing
        </Link>
      </div>
    </>
  );
}

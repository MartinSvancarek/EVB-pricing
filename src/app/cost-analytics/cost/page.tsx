import { PageHeader, Kpi, Section } from "@/components/ui";
import { fmtCzk, fmtPct, fmtUsd, fmtNumber } from "@/lib/format";
import {
  loadCosts,
  loadRevenue,
  parsePeriod,
  previousPeriod,
  bucketBy,
  timeSeries,
} from "@/lib/analytics";
import { costRatio, ratioStatus, deltaPct } from "@/lib/calc";
import { CostTrendChart, ServiceDonut, StackedBarByService } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function CostView({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const prev = previousPeriod(period);

  const [data, prevData, revenue] = await Promise.all([
    loadCosts(period),
    loadCosts(prev),
    loadRevenue(period),
  ]);

  const totalCzk = data.enriched.reduce((s, e) => s + (e.costCzk ?? 0), 0);
  const totalUsd = data.enriched.reduce((s, e) => s + (e.costUsd ?? 0), 0);
  const prevCzk = prevData.enriched.reduce((s, e) => s + (e.costCzk ?? 0), 0);
  const ratio = costRatio(totalCzk, revenue);
  const dp = deltaPct(totalCzk, prevCzk);

  const ts = timeSeries(data.enriched);
  const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000) + 1);
  const dailyRevenue = revenue / days;
  const trendData = ts.map((p) => ({
    date: p.date.slice(5),
    cost: Math.round(p.costCzk),
    ratio: dailyRevenue > 0 ? p.costCzk / dailyRevenue : null,
  }));

  const services = data.services;
  const serviceColors = Object.fromEntries(services.map((s) => [s.code, s.color]));
  const stackedData = ts.map((p) => ({
    date: p.date.slice(5),
    ...Object.fromEntries(services.map((s) => [s.code, Math.round(p.perService[s.code] ?? 0)])),
  }));

  const buckets = bucketBy(data.enriched, "service");
  const donutData = buckets.map((b) => ({ name: b.serviceName, value: Math.round(b.costCzk), color: b.serviceColor }));
  const fnBuckets = bucketBy(data.enriched, "function");

  return (
    <>
      <PageHeader title="Cost analytics – CZK / USD" subtitle="Reálné peněžní náklady za zvolené období." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Náklady CZK" value={fmtCzk(totalCzk)} sub={fmtUsd(totalUsd, { compact: true })} />
        <Kpi
          label="Cost ratio"
          value={ratio != null ? fmtPct(ratio) : "N/A"}
          sub={ratio == null ? "Zadejte obrat" : "cíl ≤ 20 %"}
          status={ratioStatus(ratio)}
        />
        <Kpi label="Obrat (perioda)" value={fmtCzk(revenue)} />
        <Kpi
          label="Δ vs. předchozí období"
          value={dp != null ? `${dp >= 0 ? "+" : ""}${fmtPct(dp)}` : "—"}
          status={dp == null ? "unknown" : dp > 0 ? "bad" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section title="Náklady CZK + cost ratio v čase">
          <CostTrendChart data={trendData} />
        </Section>
        <Section title="Podíl služeb na nákladech">
          <ServiceDonut data={donutData} />
        </Section>
      </div>

      <Section title="Denní náklady CZK – stack po službách">
        <StackedBarByService data={stackedData} serviceCodes={services.map((s) => s.code)} serviceColors={serviceColors} />
      </Section>

      <Section title={`Breakdown podle funkcí (${fnBuckets.length})`}>
        <div className="overflow-auto max-h-96">
          <table className="table">
            <thead>
              <tr>
                <th>Služba</th>
                <th>Funkce</th>
                <th className="text-right">Usage</th>
                <th className="text-right">Náklady USD</th>
                <th className="text-right">Náklady CZK</th>
                <th className="text-right">% z celku</th>
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
                  <td className="text-right text-muted">
                    {fmtNumber(b.inputTokens + b.outputTokens + b.units, { compact: true })}
                  </td>
                  <td className="text-right font-mono">{fmtUsd(b.costUsd, { compact: true })}</td>
                  <td className="text-right font-mono">{fmtCzk(b.costCzk)}</td>
                  <td className="text-right text-muted">{fmtPct(b.costCzk / Math.max(totalCzk, 1), 1)}</td>
                </tr>
              ))}
              {fnBuckets.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-6">Žádná data.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

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
  const rawSvcBuckets = bucketBy(data.enriched, "service");
  const svcBuckets = services.map((svc) => {
    const existing = rawSvcBuckets.find((b) => b.serviceId === svc.id);
    return existing ?? {
      serviceId: svc.id,
      serviceCode: svc.code,
      serviceName: svc.name,
      serviceColor: svc.color,
      inputTokens: 0,
      outputTokens: 0,
      units: 0,
      costUsd: 0,
      costCzk: 0,
    };
  });

  return (
    <>
      <PageHeader title="Cost analytics – CZK / USD" subtitle="Reálné peněžní náklady na AI providery (OpenAI, Anthropic, …). Cost ratio = podíl nákladů na obratu – cíl ≤ 20 %. Vyberte období vpravo nahoře." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Náklady CZK" value={fmtCzk(totalCzk)} sub={fmtUsd(totalUsd, { compact: true })} tooltip="Celkové náklady na AI providery v CZK za zvolené období." />
        <Kpi
          label="Cost ratio"
          value={ratio != null ? fmtPct(ratio) : "N/A"}
          sub={ratio == null ? "Zadejte obrat" : "cíl ≤ 20 %"}
          status={ratioStatus(ratio)}
          tooltip="Poměr nákladů vůči obratu za období. Cíl je udržet pod 20 %."
        />
        <Kpi label="Obrat (perioda)" value={fmtCzk(revenue)} tooltip="Obrat zákazníků za dané období (zadaný v Settings → Revenue)." />
        <Kpi
          label="Δ vs. předchozí období"
          value={dp != null ? `${dp >= 0 ? "+" : ""}${fmtPct(dp)}` : "—"}
          status={dp == null ? "unknown" : dp > 0 ? "bad" : "good"}
          tooltip="Procentuální změna nákladů oproti předchozímu stejně dlouhému období."
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

      <Section title={`Breakdown podle služeb (${svcBuckets.length})`}>
        <div className="overflow-auto max-h-96">
          <table className="table">
            <thead>
              <tr>
                <th>Služba</th>
                <th>Usage</th>
                <th>Náklady USD</th>
                <th>Náklady CZK</th>
                <th>% z celku</th>
              </tr>
            </thead>
            <tbody>
              {svcBuckets.map((b) => (
                <tr key={b.serviceId}>
                  <td>
                    <span className="badge" style={{ borderColor: `${b.serviceColor}55`, color: b.serviceColor }}>
                      {b.serviceName}
                    </span>
                  </td>
                  <td className="text-muted">
                    {fmtNumber(b.inputTokens + b.outputTokens + b.units, { compact: true })}
                  </td>
                  <td className="font-mono">{fmtUsd(b.costUsd, { compact: true })}</td>
                  <td className="font-mono">{fmtCzk(b.costCzk)}</td>
                  <td className="text-muted">{fmtPct(b.costCzk / Math.max(totalCzk, 1), 1)}</td>
                </tr>
              ))}
              {svcBuckets.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-6">Žádná data.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

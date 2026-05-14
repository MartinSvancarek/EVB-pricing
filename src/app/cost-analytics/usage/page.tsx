import { PageHeader, Kpi, Section } from "@/components/ui";
import { fmtNumber, fmtPct } from "@/lib/format";
import { loadCosts, parsePeriod, bucketBy, timeSeries } from "@/lib/analytics";
import { StackedAreaByService } from "@/components/charts";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsageView({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const [data, missingFns] = await Promise.all([
    loadCosts(period),
    prisma.function.count({ where: { isActive: true, dataSource: "missing" } }),
  ]);

  const totalTokens = data.enriched.reduce(
    (s, e) =>
      s +
      (e.u.inputTokens != null ? Number(e.u.inputTokens) : 0) +
      (e.u.outputTokens != null ? Number(e.u.outputTokens) : 0),
    0,
  );
  const totalUnits = data.enriched.reduce((s, e) => s + (e.u.units != null ? Number(e.u.units) : 0), 0);

  const services = data.services;
  const serviceColors = Object.fromEntries(services.map((s) => [s.code, s.color]));
  const ts = timeSeries(data.enriched);
  const stackedData = ts.map((p) => ({
    date: p.date.slice(5),
    ...Object.fromEntries(services.map((s) => [s.code, Math.round(p.perServiceUsage[s.code] ?? 0)])),
  }));

  const buckets = bucketBy(data.enriched, "service");
  const top = buckets[0];

  const modelBuckets = bucketBy(data.enriched, "model").slice(0, 10);

  return (
    <>
      <PageHeader title="Cost analytics – Usage" subtitle="Token a usage objem napříč službami, funkcemi a modely." />

      <div className="card mb-4 p-3 text-sm text-muted">
        <strong className="text-text">Co je tato stránka?</strong> Analýza objemu spotřeby tokenů a dalších jednotek (obrázky, sekundy videa/audia). Slouží k identifikaci nejnákladnějších služeb a modelů z hlediska spotřeby, nezávisle na ceně.
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Tokeny celkem" value={fmtNumber(totalTokens, { compact: true })} sub="vstup + výstup" />
        <Kpi label="Ostatní jednotky" value={fmtNumber(totalUnits, { compact: true })} sub="image / s / req / min" />
        <Kpi
          label="Top služba (usage)"
          value={top?.serviceName ?? "—"}
          sub={top ? fmtNumber(top.inputTokens + top.outputTokens + top.units, { compact: true }) : undefined}
        />
        <Kpi
          label="Funkcí bez trackingu"
          value={missingFns}
          status={missingFns > 0 ? "warn" : "good"}
        />
      </div>

      <Section title="Usage v čase – stack po službách">
        <StackedAreaByService data={stackedData} serviceCodes={services.map((s) => s.code)} serviceColors={serviceColors} />
      </Section>

      <Section title="Top 10 modelů podle usage">
        <table className="table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Služba</th>
              <th className="text-right">Vstup tokeny</th>
              <th className="text-right">Výstup tokeny</th>
              <th className="text-right">Jednotky</th>
            </tr>
          </thead>
          <tbody>
            {modelBuckets.map((b) => (
              <tr key={`${b.serviceId}|${b.model}`}>
                <td className="text-muted">{b.provider}</td>
                <td className="font-mono text-xs">{b.model}</td>
                <td>{b.serviceName}</td>
                <td className="text-right">{fmtNumber(b.inputTokens, { compact: true })}</td>
                <td className="text-right">{fmtNumber(b.outputTokens, { compact: true })}</td>
                <td className="text-right">{fmtNumber(b.units, { compact: true })}</td>
              </tr>
            ))}
            {modelBuckets.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-6">Žádná data.</td></tr>}
          </tbody>
        </table>
      </Section>
    </>
  );
}

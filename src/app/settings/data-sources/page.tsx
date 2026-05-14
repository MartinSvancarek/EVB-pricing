import { prisma } from "@/lib/db";
import { PageHeader, Section, Kpi } from "@/components/ui";
import { fmtPct } from "@/lib/format";
import { DataSourceSelect } from "./DataSourceSelect";

export const dynamic = "force-dynamic";

export default async function DataSourcesPage() {
  const fns = await prisma.function.findMany({ include: { service: true }, orderBy: [{ service: { name: "asc" } }, { name: "asc" }] });
  const total = fns.length;
  const byStatus = fns.reduce<Record<string, number>>((acc, f) => {
    acc[f.dataSource] = (acc[f.dataSource] ?? 0) + 1;
    return acc;
  }, {});
  const tracked = total - (byStatus.missing ?? 0);

  return (
    <>
      <PageHeader title="Settings · Data sources" subtitle="Které funkce mají tracking a kde data tečou." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <Kpi label="Pokrytí trackingu" value={total ? fmtPct(tracked / total) : "—"} status={tracked === total ? "good" : "warn"} />
        <Kpi label="Manual" value={byStatus.manual ?? 0} />
        <Kpi label="Grafana" value={byStatus.grafana ?? 0} />
        <Kpi label="API" value={byStatus.api ?? 0} />
        <Kpi label="Missing" value={byStatus.missing ?? 0} status={(byStatus.missing ?? 0) > 0 ? "bad" : "good"} />
      </div>
      <Section title={`Funkce (${total})`}>
        <table className="table">
          <thead>
            <tr><th>Služba</th><th>Funkce</th><th>Aktivní</th><th>Zdroj dat</th></tr>
          </thead>
          <tbody>
            {fns.map((f) => (
              <tr key={f.id}>
                <td>
                  <span className="badge" style={{ borderColor: `${f.service.color}55`, color: f.service.color }}>
                    {f.service.name}
                  </span>
                </td>
                <td>{f.name}</td>
                <td>{f.isActive ? "Ano" : "Ne"}</td>
                <td><DataSourceSelect id={f.id} value={f.dataSource as any} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

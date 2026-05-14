import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { fmtCzk, fmtDateTime, fmtNumber } from "@/lib/format";
import { DeleteScenarioButton } from "./DeleteScenarioButton";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await prisma.simulationScenario.findMany({
    orderBy: { createdAt: "desc" },
    include: { allocations: { include: { service: true } } },
  });
  return (
    <>
      <PageHeader
        title="Uložené scénáře"
        subtitle="Snapshot scénářů simulace s parametry a alokací."
        actions={<Link href="/simulation" className="btn-primary">Nový scénář</Link>}
      />
      <Section title={`Scénáře (${scenarios.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Popis</th>
              <th className="text-right">Tokeny</th>
              <th className="text-right">Obrat CZK</th>
              <th className="text-right">FX</th>
              <th>Alokace</th>
              <th>Vytvořeno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-muted text-xs">{s.description}</td>
                <td className="text-right font-mono">{fmtNumber(Number(s.totalTokensAssumption), { compact: true })}</td>
                <td className="text-right font-mono">{fmtCzk(s.revenueCzkAssumption)}</td>
                <td className="text-right font-mono">{s.fxRate.toFixed(3)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {s.allocations.map((a) => (
                      <span
                        key={a.id}
                        className="badge text-[10px]"
                        style={{ borderColor: `${a.service.color}55`, color: a.service.color }}
                      >
                        {a.service.name} {a.sharePercent.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-xs text-muted">{fmtDateTime(s.createdAt)}</td>
                <td><DeleteScenarioButton id={s.id} /></td>
              </tr>
            ))}
            {scenarios.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted py-6">Žádné scénáře.</td></tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );
}

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { deleteScenario } from "../actions";
import { fmtNumber, fmtCzk } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await prisma.simulationScenario.findMany({
    orderBy: { createdAt: "desc" },
    include: { allocations: true },
  });

  return (
    <>
      <PageHeader
        title="Uložené scénáře"
        subtitle="Kliknutím na název se otevře simulátor s předvyplněnými hodnotami. Tlačítkem Smazat ho trvale odstraníte."
        actions={<Link href="/simulation" className="btn">Zpět na simulaci</Link>}
      />

      {scenarios.length === 0 ? (
        <p className="text-muted">Zatím nemáte žádné scénáře.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Popis</th>
              <th>Tokeny</th>
              <th>Obrat CZK</th>
              <th>FX</th>
              <th>Služby</th>
              <th>Vytvořeno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc) => (
              <tr key={sc.id} className="group">
                <td>
                  <Link
                    href={`/simulation?scenario=${sc.id}`}
                    className="text-primary hover:underline font-medium"
                    title="Načíst scénář do simulátoru"
                  >
                    {sc.name}
                  </Link>
                </td>
                <td className="text-muted text-sm">{sc.description || "—"}</td>
                <td className="font-mono">{fmtNumber(Number(sc.totalTokensAssumption))}</td>
                <td className="font-mono">{fmtCzk(sc.revenueCzkAssumption)}</td>
                <td className="font-mono">{sc.fxRate}</td>
                <td className="text-xs text-muted">
                  {sc.allocations.map((a) => `${Math.round(a.sharePercent)}%`).join(" / ")}
                </td>
                <td className="text-muted text-sm">{sc.createdAt.toLocaleDateString("cs")}</td>
                <td>
                  <form action={deleteScenario}>
                    <input type="hidden" name="id" value={sc.id} />
                    <button
                      className="text-xs text-bad hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Smazat scénář"
                    >
                      Smazat
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PackagesTable } from "./PackagesTable";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const [packages, history] = await Promise.all([
    prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.packageHistory.findMany({
      include: { package: { select: { name: true } } },
      orderBy: { changedAt: "desc" },
      take: 50,
    }),
  ]);

  // Separate enterprise (custom) from regular
  const enterpriseMin = packages.find((p) => p.code === "enterprise_min");
  const enterpriseMax = packages.find((p) => p.code === "enterprise_max");
  const regular = packages.filter((p) => !p.isCustom);

  return (
    <>
      <PageHeader
        title="Balíčky"
        subtitle="Přehled balíčků s cenami, kredity a limity. Enterprise balíček má nastavitelný rozsah (min–max). Hodnoty jsou s DPH v Kč."
      />
      <PackagesTable
        regular={regular.map((p) => ({ ...p, credits: Number(p.credits), imageLimit: p.imageLimit != null ? Number(p.imageLimit) : null, videoLimit: p.videoLimit != null ? Number(p.videoLimit) : null }))}
        enterpriseMin={enterpriseMin ? { ...enterpriseMin, credits: Number(enterpriseMin.credits), imageLimit: enterpriseMin.imageLimit != null ? Number(enterpriseMin.imageLimit) : null, videoLimit: enterpriseMin.videoLimit != null ? Number(enterpriseMin.videoLimit) : null } : null}
        enterpriseMax={enterpriseMax ? { ...enterpriseMax, credits: Number(enterpriseMax.credits), imageLimit: enterpriseMax.imageLimit != null ? Number(enterpriseMax.imageLimit) : null, videoLimit: enterpriseMax.videoLimit != null ? Number(enterpriseMax.videoLimit) : null } : null}
      />

      {history.length > 0 && (
        <div className="card mt-4">
          <h3 className="text-sm font-semibold mb-3">Historie změn</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Balíček</th>
                <th>Pole</th>
                <th>Stará hodnota</th>
                <th>Nová hodnota</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="text-xs text-muted">{fmtDate(h.changedAt.toISOString())}</td>
                  <td className="text-sm">{h.package.name}</td>
                  <td className="text-xs font-mono">{h.field}</td>
                  <td className="text-xs font-mono">{h.oldValue != null ? h.oldValue.toLocaleString("cs-CZ") : "—"}</td>
                  <td className="text-xs font-mono">{h.newValue != null ? h.newValue.toLocaleString("cs-CZ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

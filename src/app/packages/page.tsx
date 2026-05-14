import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PackagesTable } from "./PackagesTable";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });

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
    </>
  );
}

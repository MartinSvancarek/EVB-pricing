"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function activeVersionId(): Promise<string | null> {
  const v = await prisma.packageVersion.findFirst({ where: { isActive: true } });
  return v?.id ?? null;
}

export async function undoPackageChange(historyId: string) {
  const entry = await prisma.packageHistory.findUniqueOrThrow({
    where: { id: historyId },
  });

  const current = await prisma.package.findUniqueOrThrow({ where: { id: entry.packageId } });
  const currentValue = (current as any)[entry.field] as number | null;
  const versionId = await activeVersionId();

  await prisma.$transaction([
    prisma.package.update({
      where: { id: entry.packageId },
      data: { [entry.field]: entry.oldValue },
    }),
    prisma.packageHistory.create({
      data: {
        packageId: entry.packageId,
        versionId,
        field: entry.field,
        oldValue: currentValue,
        newValue: entry.oldValue,
        changedBy: "admin (undo)",
      },
    }),
  ]);

  revalidatePath("/packages");
}

export async function updatePackageField(id: string, field: string, value: number | null) {
  const allowed = [
    "monthlyPriceCzk", "yearlyPriceCzk", "monthlyInYearly",
    "twoYearPriceCzk", "threeYearPriceCzk", "credits",
    "imageLimit", "videoLimit",
  ];
  if (!allowed.includes(field)) throw new Error("Invalid field");

  const current = await prisma.package.findUniqueOrThrow({ where: { id } });
  const oldValue = (current as any)[field] as number | null;
  const versionId = await activeVersionId();

  await prisma.$transaction([
    prisma.package.update({ where: { id }, data: { [field]: value } }),
    prisma.packageHistory.create({
      data: { packageId: id, versionId, field, oldValue, newValue: value, changedBy: "admin" },
    }),
  ]);

  revalidatePath("/packages");
}

export async function savePackageVersion(name: string, description?: string) {
  if (!name.trim()) throw new Error("Zadejte název verze.");
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });
  const snapshot = JSON.stringify(packages.map((p) => ({
    code: p.code, name: p.name, monthlyPriceCzk: p.monthlyPriceCzk,
    yearlyPriceCzk: p.yearlyPriceCzk, monthlyInYearly: p.monthlyInYearly,
    twoYearPriceCzk: p.twoYearPriceCzk, threeYearPriceCzk: p.threeYearPriceCzk,
    credits: p.credits, imageLimit: p.imageLimit, videoLimit: p.videoLimit,
    isCustom: p.isCustom, creditsNote: p.creditsNote, sortOrder: p.sortOrder,
  })));

  // Deactivate all, create new as active
  await prisma.packageVersion.updateMany({ data: { isActive: false } });
  await prisma.packageVersion.create({
    data: { name, description: description || null, snapshot, isActive: true, createdBy: "admin" },
  });
  revalidatePath("/packages");
}

export async function loadPackageVersion(versionId: string) {
  const version = await prisma.packageVersion.findUniqueOrThrow({ where: { id: versionId } });
  const snapshot = JSON.parse(version.snapshot) as Array<Record<string, any>>;

  for (const snap of snapshot) {
    const existing = await prisma.package.findUnique({ where: { code: snap.code } });
    if (!existing) continue;
    await prisma.package.update({
      where: { id: existing.id },
      data: {
        monthlyPriceCzk: snap.monthlyPriceCzk, yearlyPriceCzk: snap.yearlyPriceCzk,
        monthlyInYearly: snap.monthlyInYearly, twoYearPriceCzk: snap.twoYearPriceCzk,
        threeYearPriceCzk: snap.threeYearPriceCzk, credits: snap.credits,
        imageLimit: snap.imageLimit, videoLimit: snap.videoLimit,
      },
    });
  }

  // Mark this version as active
  await prisma.packageVersion.updateMany({ data: { isActive: false } });
  await prisma.packageVersion.update({ where: { id: versionId }, data: { isActive: true } });
  revalidatePath("/packages");
}

export async function deletePackageVersion(versionId: string) {
  const version = await prisma.packageVersion.findUniqueOrThrow({ where: { id: versionId } });
  // Don't allow deleting the active version
  if (version.isActive) throw new Error("Nelze smazat aktivní verzi.");
  await prisma.packageVersion.delete({ where: { id: versionId } });
  // Also remove history entries for that version
  await prisma.packageHistory.deleteMany({ where: { versionId } });
  revalidatePath("/packages");
}

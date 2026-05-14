"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updatePackageField(id: string, field: string, value: number | null) {
  const allowed = [
    "monthlyPriceCzk", "yearlyPriceCzk", "monthlyInYearly",
    "twoYearPriceCzk", "threeYearPriceCzk", "credits",
    "imageLimit", "videoLimit",
  ];
  if (!allowed.includes(field)) throw new Error("Invalid field");

  const current = await prisma.package.findUniqueOrThrow({ where: { id } });
  const oldValue = (current as any)[field] as number | null;

  await prisma.$transaction([
    prisma.package.update({ where: { id }, data: { [field]: value } }),
    prisma.packageHistory.create({
      data: { packageId: id, field, oldValue, newValue: value, changedBy: "admin" },
    }),
  ]);

  revalidatePath("/packages");
}

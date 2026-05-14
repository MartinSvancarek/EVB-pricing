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
  await prisma.package.update({ where: { id }, data: { [field]: value } });
  revalidatePath("/packages");
}

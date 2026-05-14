import { prisma } from "@/lib/db";
import { PricingForm } from "../new/page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPricing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [pricing, functions] = await Promise.all([
    prisma.modelPricing.findUnique({ where: { id } }),
    prisma.function.findMany({ include: { service: true }, orderBy: { name: "asc" } }),
  ]);
  if (!pricing) notFound();
  return <PricingForm functions={functions} initial={pricing} returnUrl={sp.returnUrl} />;
}

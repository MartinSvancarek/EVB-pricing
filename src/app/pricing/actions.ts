"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";

const PricingSchema = z.object({
  id: z.string().optional(),
  functionId: z.string().min(1),
  provider: z.string().min(1),
  fallbackProvider: z.string().nullable().optional(),
  model: z.string().min(1),
  billingType: z.enum(["token_io", "token_unit", "image", "audio_second", "video_second", "request", "minute"]),
  priceUsd: z.coerce.number().nullable().optional(),
  inputPriceUsd: z.coerce.number().nullable().optional(),
  outputPriceUsd: z.coerce.number().nullable().optional(),
  unitPriceUsd: z.coerce.number().nullable().optional(),
  unitLabel: z.string().nullable().optional(),
  markupCoefficient: z.coerce.number().min(0).default(1),
  internalNote: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

function clean<T extends Record<string, any>>(o: T): T {
  for (const k of Object.keys(o)) {
    if (o[k] === "" || o[k] === undefined) (o as any)[k] = null;
    if (typeof o[k] === "number" && isNaN(o[k])) (o as any)[k] = null;
  }
  return o;
}

export async function savePricing(formData: FormData) {
  const returnUrl = (formData.get("returnUrl") as string) || "/pricing";
  const raw = Object.fromEntries(formData);
  delete (raw as any).returnUrl;
  const parsed = PricingSchema.parse(raw);
  const data = clean({
    functionId: parsed.functionId,
    provider: parsed.provider,
    fallbackProvider: parsed.fallbackProvider ?? null,
    model: parsed.model,
    billingType: parsed.billingType,
    priceUsd: parsed.priceUsd ?? null,
    inputPriceUsd: parsed.inputPriceUsd ?? null,
    outputPriceUsd: parsed.outputPriceUsd ?? null,
    unitPriceUsd: parsed.unitPriceUsd ?? null,
    unitLabel: parsed.unitLabel ?? null,
    markupCoefficient: parsed.markupCoefficient,
    internalNote: parsed.internalNote ?? null,
    status: parsed.status,
    updatedBy: "martin@everbot.cz",
  });

  if (parsed.id) {
    const before = await prisma.modelPricing.findUnique({ where: { id: parsed.id } });
    const after = await prisma.modelPricing.update({ where: { id: parsed.id }, data });
    await prisma.auditLog.create({
      data: {
        entityType: "ModelPricing",
        entityId: after.id,
        userEmail: "martin@everbot.cz",
        action: "update",
        diff: JSON.stringify({ before, after }),
      },
    });
  } else {
    const after = await prisma.modelPricing.create({ data });
    await prisma.auditLog.create({
      data: {
        entityType: "ModelPricing",
        entityId: after.id,
        userEmail: "martin@everbot.cz",
        action: "create",
        diff: JSON.stringify({ after }),
      },
    });
  }
  revalidatePath("/pricing");
  redirect(returnUrl);
}

export async function inlineUpdatePricing(id: string, patch: Partial<{ priceUsd: number | null; inputPriceUsd: number | null; outputPriceUsd: number | null; unitPriceUsd: number | null; markupCoefficient: number; status: "active" | "inactive"; provider: string; fallbackProvider: string | null; functionId: string }>) {
  const before = await prisma.modelPricing.findUnique({ where: { id } });
  const after = await prisma.modelPricing.update({ where: { id }, data: { ...patch, updatedBy: "martin@everbot.cz" } });
  await prisma.auditLog.create({
    data: {
      entityType: "ModelPricing",
      entityId: id,
      userEmail: "martin@everbot.cz",
      action: "update",
      diff: JSON.stringify({ before, after, patch }),
    },
  });
  revalidatePath("/pricing");
}

export async function archivePricing(id: string) {
  await prisma.modelPricing.update({ where: { id }, data: { status: "inactive" } });
  await prisma.auditLog.create({
    data: { entityType: "ModelPricing", entityId: id, userEmail: "martin@everbot.cz", action: "archive" },
  });
  revalidatePath("/pricing");
}

"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveScenario(input: {
  name: string;
  description?: string;
  totalTokensAssumption: number;
  revenueCzkAssumption: number;
  fxRate: number;
  shares: Array<{ serviceId: string; sharePercent: number }>;
}) {
  const sum = input.shares.reduce((s, a) => s + a.sharePercent, 0);
  if (Math.abs(sum - 100) > 0.01) throw new Error(`Suma % musí být 100, je ${sum.toFixed(2)}`);

  const scenario = await prisma.simulationScenario.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      totalTokensAssumption: BigInt(Math.round(input.totalTokensAssumption)),
      revenueCzkAssumption: input.revenueCzkAssumption,
      fxRate: input.fxRate,
      createdBy: "martin@everbot.cz",
      allocations: {
        create: input.shares.map((a) => ({
          serviceId: a.serviceId,
          sharePercent: a.sharePercent,
        })),
      },
    },
  });
  revalidatePath("/simulation/scenarios");
  return scenario.id;
}

export async function deleteScenario(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing scenario id");
  await prisma.simulationScenario.delete({ where: { id } });
  revalidatePath("/simulation/scenarios");
}

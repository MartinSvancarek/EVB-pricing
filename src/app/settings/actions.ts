"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addFx(formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  const rate = Number(formData.get("rate"));
  if (!dateStr || !isFinite(rate) || rate <= 0) return;
  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);
  await prisma.fxRate.upsert({
    where: { date },
    update: { czkPerUsd: rate, source: "manual" },
    create: { date, czkPerUsd: rate, source: "manual" },
  });
  revalidatePath("/settings/fx");
}

export async function addRevenue(formData: FormData) {
  const start = new Date(String(formData.get("start")));
  const end = new Date(String(formData.get("end")));
  const amount = Number(formData.get("amount"));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || !isFinite(amount)) return;
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  await prisma.revenue.upsert({
    where: { periodStart_periodEnd: { periodStart: start, periodEnd: end } },
    update: { amountCzk: amount },
    create: { periodStart: start, periodEnd: end, amountCzk: amount },
  });
  revalidatePath("/settings/revenue");
}

export async function setFunctionDataSource(functionId: string, dataSource: "manual" | "grafana" | "api" | "missing") {
  await prisma.function.update({ where: { id: functionId }, data: { dataSource } });
  revalidatePath("/settings/data-sources");
  revalidatePath("/dashboard");
}

export async function addUser(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const role = String(formData.get("role") ?? "viewer") as "admin" | "viewer";
  if (!email || !name) return;
  await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
  revalidatePath("/settings/users");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings/users");
}

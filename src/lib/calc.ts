// Core calculation logic. See docs/04-calculations.md.
import type { ModelPricing, UsageRecord, FxRate, Revenue } from "@prisma/client";

export function costUsdForUsage(
  usage: Pick<UsageRecord, "inputTokens" | "outputTokens" | "units">,
  pricing: Pick<ModelPricing, "billingType" | "priceUsd" | "inputPriceUsd" | "outputPriceUsd" | "unitPriceUsd">,
): number | null {
  if (!pricing) return null;
  const input = usage.inputTokens != null ? Number(usage.inputTokens) : 0;
  const output = usage.outputTokens != null ? Number(usage.outputTokens) : 0;
  const units = usage.units != null ? Number(usage.units) : 0;

  switch (pricing.billingType) {
    case "token_io":
      if (pricing.inputPriceUsd == null && pricing.outputPriceUsd == null) return null;
      return (
        (input / 1_000_000) * (pricing.inputPriceUsd ?? 0) +
        (output / 1_000_000) * (pricing.outputPriceUsd ?? 0)
      );
    case "token_unit":
      if (pricing.unitPriceUsd == null) return null;
      return ((input + output) / 1_000_000) * pricing.unitPriceUsd;
    default: {
      const unitPrice = pricing.unitPriceUsd ?? pricing.priceUsd;
      if (unitPrice == null) return null;
      return units * unitPrice;
    }
  }
}

/** Find FX rate for a given date (closest <= date). */
export function fxForDate(rates: FxRate[], date: Date): number | null {
  const t = date.getTime();
  let best: FxRate | null = null;
  for (const r of rates) {
    const rt = r.date.getTime();
    if (rt <= t && (!best || rt > best.date.getTime())) best = r;
  }
  return best?.czkPerUsd ?? null;
}

/** Pro-rated revenue overlapping [from, to]. */
export function revenueForRange(revenues: Revenue[], from: Date, to: Date): number {
  let sum = 0;
  const fromT = from.getTime();
  const toT = to.getTime();
  for (const r of revenues) {
    const s = Math.max(r.periodStart.getTime(), fromT);
    const e = Math.min(r.periodEnd.getTime(), toT);
    if (e < s) continue;
    const totalDays = Math.max(1, Math.round((r.periodEnd.getTime() - r.periodStart.getTime()) / 86_400_000) + 1);
    const overlapDays = Math.round((e - s) / 86_400_000) + 1;
    sum += (r.amountCzk * overlapDays) / totalDays;
  }
  return sum;
}

export type CostBucket = {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceColor: string;
  functionId?: string;
  functionName?: string;
  model?: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  units: number;
  costUsd: number;
  costCzk: number;
};

export function costRatio(totalCzk: number, revenueCzk: number): number | null {
  if (!revenueCzk || revenueCzk <= 0) return null;
  return totalCzk / revenueCzk;
}

export function ratioStatus(ratio: number | null): "good" | "warn" | "bad" | "unknown" {
  if (ratio == null) return "unknown";
  if (ratio < 0.2) return "good";
  if (ratio <= 0.25) return "warn";
  return "bad";
}

export function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}

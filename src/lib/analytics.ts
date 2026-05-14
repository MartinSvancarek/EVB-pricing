import { prisma } from "./db";
import { costUsdForUsage, fxForDate, revenueForRange, type CostBucket } from "./calc";

export type Period = { from: Date; to: Date };

export function periodMTD(): Period {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

export function periodYTD(): Period {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

export function periodLastNDays(n: number): Period {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (n - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

export function parsePeriod(searchParams: { from?: string; to?: string; range?: string }): Period {
  if (searchParams.from && searchParams.to) {
    const from = new Date(searchParams.from);
    const to = new Date(searchParams.to);
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);
    return { from, to };
  }
  switch (searchParams.range) {
    case "day":
      return periodLastNDays(1);
    case "week":
      return periodLastNDays(7);
    case "mtd":
      return periodMTD();
    case "ytd":
      return periodYTD();
    case "month":
    default:
      return periodLastNDays(30);
  }
}

export function previousPeriod(p: Period): Period {
  const days = Math.round((p.to.getTime() - p.from.getTime()) / 86_400_000) + 1;
  const to = new Date(p.from);
  to.setUTCDate(to.getUTCDate() - 1);
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

export type AnalyticsFilters = {
  serviceIds?: string[];
  functionIds?: string[];
  models?: string[];
  providers?: string[];
};

export async function loadCosts(period: Period, filters: AnalyticsFilters = {}) {
  const [usages, services, functions, pricings, fxRates] = await Promise.all([
    prisma.usageRecord.findMany({
      where: {
        periodStart: { gte: period.from, lte: period.to },
        ...(filters.functionIds?.length ? { functionId: { in: filters.functionIds } } : {}),
        ...(filters.models?.length ? { model: { in: filters.models } } : {}),
        ...(filters.providers?.length ? { provider: { in: filters.providers } } : {}),
      },
      orderBy: { periodStart: "asc" },
    }),
    prisma.service.findMany(),
    prisma.function.findMany(),
    prisma.modelPricing.findMany({ where: { status: "active" } }),
    prisma.fxRate.findMany(),
  ]);

  const svcById = new Map(services.map((s) => [s.id, s]));
  const fnById = new Map(functions.map((f) => [f.id, f]));
  // pricing key: functionId|model
  const pricingKey = (functionId: string, model: string) => `${functionId}|${model}`;
  const pricingMap = new Map<string, (typeof pricings)[number]>();
  for (const p of pricings) pricingMap.set(pricingKey(p.functionId, p.model), p);

  const allowedServiceIds = filters.serviceIds?.length ? new Set(filters.serviceIds) : null;

  const enriched = usages
    .map((u) => {
      const fn = fnById.get(u.functionId);
      if (!fn) return null;
      if (allowedServiceIds && !allowedServiceIds.has(fn.serviceId)) return null;
      const svc = svcById.get(fn.serviceId)!;
      const pricing = pricingMap.get(pricingKey(u.functionId, u.model));
      const costUsd = pricing ? costUsdForUsage(u, pricing) : null;
      const fx = fxForDate(fxRates, u.periodStart);
      const costCzk = costUsd != null && fx != null ? costUsd * fx : null;
      return { u, fn, svc, costUsd, costCzk, pricing, fx };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { enriched, services, functions, pricings, fxRates };
}

export function bucketBy(
  enriched: Awaited<ReturnType<typeof loadCosts>>["enriched"],
  groupBy: "service" | "function" | "model",
): CostBucket[] {
  const map = new Map<string, CostBucket>();
  for (const e of enriched) {
    let key: string;
    if (groupBy === "service") key = e.svc.id;
    else if (groupBy === "function") key = e.fn.id;
    else key = `${e.svc.id}|${e.u.model}`;

    let b = map.get(key);
    if (!b) {
      b = {
        serviceId: e.svc.id,
        serviceCode: e.svc.code,
        serviceName: e.svc.name,
        serviceColor: e.svc.color,
        functionId: groupBy !== "service" ? e.fn.id : undefined,
        functionName: groupBy !== "service" ? e.fn.name : undefined,
        model: groupBy === "model" ? e.u.model : undefined,
        provider: groupBy === "model" ? e.u.provider : undefined,
        inputTokens: 0,
        outputTokens: 0,
        units: 0,
        costUsd: 0,
        costCzk: 0,
      };
      map.set(key, b);
    }
    b.inputTokens += e.u.inputTokens != null ? Number(e.u.inputTokens) : 0;
    b.outputTokens += e.u.outputTokens != null ? Number(e.u.outputTokens) : 0;
    b.units += e.u.units != null ? Number(e.u.units) : 0;
    b.costUsd += e.costUsd ?? 0;
    b.costCzk += e.costCzk ?? 0;
  }
  return [...map.values()].sort((a, b) => b.costCzk - a.costCzk);
}

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  costUsd: number;
  costCzk: number;
  perService: Record<string, number>; // service code -> czk
  perServiceUsage: Record<string, number>; // service code -> tokens+units (combined)
};

export function timeSeries(enriched: Awaited<ReturnType<typeof loadCosts>>["enriched"]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const e of enriched) {
    const key = e.u.periodStart.toISOString().slice(0, 10);
    let p = map.get(key);
    if (!p) {
      p = { date: key, costUsd: 0, costCzk: 0, perService: {}, perServiceUsage: {} };
      map.set(key, p);
    }
    p.costUsd += e.costUsd ?? 0;
    p.costCzk += e.costCzk ?? 0;
    p.perService[e.svc.code] = (p.perService[e.svc.code] ?? 0) + (e.costCzk ?? 0);
    const usage =
      (e.u.inputTokens != null ? Number(e.u.inputTokens) : 0) +
      (e.u.outputTokens != null ? Number(e.u.outputTokens) : 0) +
      (e.u.units != null ? Number(e.u.units) : 0);
    p.perServiceUsage[e.svc.code] = (p.perServiceUsage[e.svc.code] ?? 0) + usage;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadRevenue(period: { from: Date; to: Date }) {
  const revenues = await prisma.revenue.findMany();
  return revenueForRange(revenues, period.from, period.to);
}

export async function trackingCoverage(): Promise<{ tracked: number; total: number; coverage: number }> {
  const fns = await prisma.function.findMany({ where: { isActive: true } });
  const total = fns.length;
  const tracked = fns.filter((f) => f.dataSource !== "missing").length;
  return { tracked, total, coverage: total ? tracked / total : 0 };
}

export async function currentFx(): Promise<number | null> {
  const r = await prisma.fxRate.findFirst({ orderBy: { date: "desc" } });
  return r?.czkPerUsd ?? null;
}

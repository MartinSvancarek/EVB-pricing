import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  console.log("Resetting…");
  await prisma.scenarioAllocation.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.modelPricing.deleteMany();
  await prisma.function.deleteMany();
  await prisma.service.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.package.deleteMany();

  // Users
  await prisma.user.createMany({
    data: [
      { email: "martin@everbot.cz", name: "Martin Švancárek", role: "admin" },
      { email: "viewer@everbot.cz", name: "Interní viewer", role: "viewer" },
    ],
  });

  // FX rates – last 60 days (consistent 22.8)
  for (let i = 0; i < 60; i++) {
    await prisma.fxRate.create({
      data: { date: daysAgo(i), czkPerUsd: 22.8, source: "manual" },
    });
  }

  // Revenue – last 3 months
  for (let m = 0; m < 3; m++) {
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m + 1, 0));
    await prisma.revenue.create({
      data: { periodStart: start, periodEnd: end, amountCzk: 5_638_684 },
    });
  }

  // Packages (balíčky)
  const packages = [
    { code: "free", name: "Balíček zdarma", monthlyPriceCzk: 0, yearlyPriceCzk: 0, monthlyInYearly: 0, twoYearPriceCzk: null, threeYearPriceCzk: null, credits: 5, imageLimit: 125, videoLimit: 5, isCustom: false, creditsNote: null, sortOrder: 0 },
    { code: "basic", name: "Basic", monthlyPriceCzk: 590, yearlyPriceCzk: 7_080, monthlyInYearly: 590, twoYearPriceCzk: 14_160, threeYearPriceCzk: 21_240, credits: 20_000, imageLimit: 500, videoLimit: 23, isCustom: false, creditsNote: null, sortOrder: 1 },
    { code: "business", name: "Business", monthlyPriceCzk: 2_490, yearlyPriceCzk: 29_880, monthlyInYearly: 2_490, twoYearPriceCzk: 59_760, threeYearPriceCzk: 89_640, credits: 300_000, imageLimit: 7_500, videoLimit: 352, isCustom: false, creditsNote: null, sortOrder: 2 },
    { code: "creator", name: "Creator", monthlyPriceCzk: 4_990, yearlyPriceCzk: 59_880, monthlyInYearly: 4_990, twoYearPriceCzk: 119_760, threeYearPriceCzk: 179_640, credits: 700_000, imageLimit: 17_500, videoLimit: 823, isCustom: false, creditsNote: null, sortOrder: 3 },
    { code: "premium", name: "Premium", monthlyPriceCzk: 6_990, yearlyPriceCzk: 83_880, monthlyInYearly: 6_990, twoYearPriceCzk: 167_760, threeYearPriceCzk: 251_640, credits: 1_000_000, imageLimit: 25_000, videoLimit: 1_176, isCustom: false, creditsNote: null, sortOrder: 4 },
    { code: "unlimited", name: "Unlimited", monthlyPriceCzk: 2_097, yearlyPriceCzk: 25_164, monthlyInYearly: 2_097, twoYearPriceCzk: 50_328, threeYearPriceCzk: 75_492, credits: 300_000, imageLimit: 7_500, videoLimit: 353, isCustom: false, creditsNote: "Limit 300 000 kreditů (marketed as unlimited)", sortOrder: 5 },
    { code: "enterprise_min", name: "Enterprise (min)", monthlyPriceCzk: null, yearlyPriceCzk: 100_656, monthlyInYearly: 8_388, twoYearPriceCzk: 201_312, threeYearPriceCzk: 301_968, credits: 1_200_000, imageLimit: 30_000, videoLimit: 1_411, isCustom: true, creditsNote: "Custom – spodní hranice", sortOrder: 6 },
    { code: "enterprise_max", name: "Enterprise (max)", monthlyPriceCzk: null, yearlyPriceCzk: 4_194_000, monthlyInYearly: 349_500, twoYearPriceCzk: 8_388_000, threeYearPriceCzk: 12_582_000, credits: 50_000_000, imageLimit: 1_250_000, videoLimit: 58_800, isCustom: true, creditsNote: "Custom – horní hranice", sortOrder: 7 },
  ];
  for (const p of packages) {
    await prisma.package.create({ data: p as any });
  }

  // Services
  const services = [
    { code: "chat", name: "Chat", color: "#5b8cff" },
    { code: "video", name: "Video", color: "#e0574a" },
    { code: "graphics", name: "Grafika", color: "#3fb27f" },
    { code: "audio", name: "Audio", color: "#e0a23a" },
    { code: "deep_research", name: "Deep research", color: "#a26bff" },
  ];
  const svcMap: Record<string, string> = {};
  for (const s of services) {
    const created = await prisma.service.create({ data: s });
    svcMap[s.code] = created.id;
  }

  // ─── GRAPHICS MODELS ───
  const graphicsModels = [
    "Nano Banana", "Nano Banana Pro", "Nano Banana 2",
    "Stable Diffusion Core", "Stable Diffusion Ultra",
    "Stable Diffusion 3 Medium", "Stable Diffusion 3 Large", "Stable Diffusion 3 Large Turbo",
    "Everbot grafika (Midjourney V6)", "Everbot grafika 2 (Midjourney V7)",
    "Ideogram 2.0", "Ideogram 3.0 Quality",
    "Flux 1.1 Pro", "Flux 1.1 Pro Ultra", "Flux Schnell", "Flux 2 Max",
    "DALL-E 3",
    "Mystic Classic Fast Mode", "Mystic 2K Resolution",
    "HiDream", "OmniGen v1", "Recraft V3",
    "GPT Image 1", "GPT Image 1.5", "GPT Image 2",
    "Seedream 4.5", "Qwen Image Edit", "Qwen Image Edit Plus",
    "Reve edit", "Wan 2.7 Image Pro",
  ];

  // ─── VIDEO MODELS ───
  const videoModels = [
    "Kling 1.5", "Kling 1.6", "Kling 2.0", "Kling 2.1", "Kling 2.5", "Kling 2.6",
    "Google Veo 2", "Google Veo 3.1 Fast", "Google Veo 3.1 Quality", "Veo 3.1 Lite",
    "Wanx 2.1", "Wan 2.2", "Wan 2.5", "Wan 2.6",
    "Ray2", "Hailuo", "Hailuo 2", "Hailuo 2.3",
    "Runway Gen-3", "Runway Gen-4 Turbo",
    "Hunyuan", "Waver 1.0",
    "Seedance 1.0 Lite", "Seedance 1.0 Pro",
    "Sora 2", "Sora 2 Pro", "Sora 2 Storyboard",
  ];

  // ─── CHAT MODELS ───
  const chatModels = [
    "GPT 5.2", "GPT 5.2 Chat (Instant)", "GPT 5.1", "GPT 5.1 Chat (Instant)",
    "GPT 5", "GPT 5 Mini", "GPT 5 Nano",
    "GPT 4o", "GPT 4o Mini", "GPT 4.1",
    "GPT o4 Mini", "GPT o3", "GPT o3 Mini High", "GPT o1",
    "Claude 4.5 Sonnet", "Claude 4.5 Haiku",
    "Claude 4 Sonnet 1M", "Claude 4 Sonnet", "Claude 4 Sonnet Reasoning",
    "Claude 4.6 Opus", "Claude 4.5 Opus", "Claude 4.1 Opus", "Claude 4 Opus", "Claude 4 Opus Reasoning",
    "Claude 3.7 Sonnet", "Claude 3.7 Sonnet Reasoning",
    "Claude 3 Opus", "Claude 3 Haiku",
    "Qwen 3-235B-A22B",
    "Gemini 3 Pro", "Gemini 3 Flash", "Gemini 2.5 Pro", "Gemini 2.5 Flash",
    "DeepSeek R1", "DeepSeek V3.1", "DeepSeek V3",
    "Llama 4 Maverick", "Llama 4 Scout", "Llama 3.1-405B",
    "Mistral 3.1 Medium", "Mistral Small 3.1", "Mistral Medium 3", "Mistral Large 2",
    "Grok 4", "Grok 4 Fast", "Grok 4 Fast Reasoning", "Grok 3", "Grok 3 Mini",
    "Super Research",
  ];

  // ─── DEEP RESEARCH MODELS ───
  const deepResearchModels = [
    "Perplexity Deep Research",
    "GPT-o3 Deep Research",
    "Claude Sonnet 4 Advanced Research",
    "NinjaTech Deep Research",
  ];

  function providerFor(model: string): string {
    const m = model.toLowerCase();
    if (m.includes("gpt") || m.includes("dall-e") || m.includes("whisper") || m.includes("sora") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) return "OpenAI";
    if (m.includes("claude")) return "Anthropic";
    if (m.includes("gemini") || m.includes("veo") || m.includes("google")) return "Google";
    if (m.includes("stable diffusion")) return "Stability";
    if (m.includes("flux") || m.includes("schnell")) return "Black Forest Labs";
    if (m.includes("ideogram")) return "Ideogram";
    if (m.includes("midjourney") || m.includes("everbot grafika")) return "Everbot / Midjourney";
    if (m.includes("kling")) return "Kuaishou";
    if (m.includes("hailuo")) return "MiniMax";
    if (m.includes("runway")) return "Runway";
    if (m.includes("hunyuan") || m.includes("wanx") || m.includes("wan")) return "Tencent";
    if (m.includes("ray")) return "Luma AI";
    if (m.includes("seedance") || m.includes("seedream")) return "ByteDance";
    if (m.includes("waver")) return "Waver AI";
    if (m.includes("deepseek")) return "DeepSeek";
    if (m.includes("llama")) return "Meta";
    if (m.includes("mistral")) return "Mistral";
    if (m.includes("qwen")) return "Alibaba";
    if (m.includes("grok")) return "xAI";
    if (m.includes("perplexity")) return "Perplexity";
    if (m.includes("ninjatech")) return "NinjaTech";
    if (m.includes("nano banana")) return "Everbot";
    if (m.includes("mystic")) return "Everbot";
    if (m.includes("hidream")) return "HiDream";
    if (m.includes("omnigen")) return "OmniGen";
    if (m.includes("recraft")) return "Recraft";
    if (m.includes("reve")) return "Reve";
    if (m.includes("super research")) return "Everbot";
    return "Other";
  }

  // Create Functions + Pricings for GRAPHICS
  const gfxFn = await prisma.function.create({
    data: { serviceId: svcMap.graphics, code: "image_generation", name: "Generování obrázku", dataSource: "grafana" },
  });
  for (let idx = 0; idx < graphicsModels.length; idx++) {
    const m = graphicsModels[idx];
    await prisma.modelPricing.create({
      data: {
        functionId: gfxFn.id, provider: providerFor(m), model: m,
        billingType: "image", priceUsd: idx === 0 ? 0.08 : +(0.04 + Math.random() * 0.08).toFixed(4),
        unitLabel: "1 image", status: "active", updatedBy: "martin@everbot.cz",
      },
    });
  }

  // Create Functions + Pricings for VIDEO
  const videoFn = await prisma.function.create({
    data: { serviceId: svcMap.video, code: "video_generation", name: "Generování videa", dataSource: "manual" },
  });
  const videoMeta: Record<string, { resolution?: string; credits?: number; durationSec?: number }> = {
    "Kling 1.5": { resolution: "1080p", credits: 10, durationSec: 5 },
    "Kling 1.6": { resolution: "1080p", credits: 10, durationSec: 5 },
    "Kling 2.0": { resolution: "1080p", credits: 20, durationSec: 5 },
    "Kling 2.1": { resolution: "1080p", credits: 20, durationSec: 10 },
    "Kling 2.5": { resolution: "4K", credits: 35, durationSec: 10 },
    "Kling 2.6": { resolution: "4K", credits: 40, durationSec: 10 },
    "Google Veo 2": { resolution: "1080p", credits: 25, durationSec: 8 },
    "Google Veo 3.1 Fast": { resolution: "1080p", credits: 30, durationSec: 8 },
    "Google Veo 3.1 Quality": { resolution: "4K", credits: 50, durationSec: 8 },
    "Veo 3.1 Lite": { resolution: "720p", credits: 15, durationSec: 5 },
    "Wanx 2.1": { resolution: "1080p", credits: 12, durationSec: 5 },
    "Wan 2.2": { resolution: "1080p", credits: 12, durationSec: 5 },
    "Wan 2.5": { resolution: "1080p", credits: 18, durationSec: 10 },
    "Wan 2.6": { resolution: "4K", credits: 25, durationSec: 10 },
    "Ray2": { resolution: "1080p", credits: 20, durationSec: 5 },
    "Hailuo": { resolution: "1080p", credits: 15, durationSec: 5 },
    "Hailuo 2": { resolution: "1080p", credits: 20, durationSec: 10 },
    "Hailuo 2.3": { resolution: "4K", credits: 30, durationSec: 10 },
    "Runway Gen-3": { resolution: "1080p", credits: 25, durationSec: 10 },
    "Runway Gen-4 Turbo": { resolution: "4K", credits: 40, durationSec: 10 },
    "Hunyuan": { resolution: "1080p", credits: 18, durationSec: 5 },
    "Waver 1.0": { resolution: "1080p", credits: 15, durationSec: 5 },
    "Seedance 1.0 Lite": { resolution: "720p", credits: 10, durationSec: 5 },
    "Seedance 1.0 Pro": { resolution: "1080p", credits: 30, durationSec: 10 },
    "Sora 2": { resolution: "1080p", credits: 50, durationSec: 10 },
    "Sora 2 Pro": { resolution: "4K", credits: 100, durationSec: 20 },
    "Sora 2 Storyboard": { resolution: "1080p", credits: 60, durationSec: 15 },
  };
  for (let idx = 0; idx < videoModels.length; idx++) {
    const m = videoModels[idx];
    const meta = videoMeta[m] ?? {};
    await prisma.modelPricing.create({
      data: {
        functionId: videoFn.id, provider: providerFor(m), model: m,
        billingType: "video_second", priceUsd: idx === 0 ? 0.50 : +(0.25 + Math.random() * 0.5).toFixed(4),
        unitLabel: "1 second", status: "active", updatedBy: "martin@everbot.cz",
        resolution: meta.resolution ?? null,
        credits: meta.credits ?? null,
        durationSec: meta.durationSec ?? null,
      },
    });
  }

  // Create Functions + Pricings for CHAT
  const chatFn = await prisma.function.create({
    data: { serviceId: svcMap.chat, code: "assistant_reply", name: "Chat – odpověď", dataSource: "grafana" },
  });
  for (let idx = 0; idx < chatModels.length; idx++) {
    const m = chatModels[idx];
    await prisma.modelPricing.create({
      data: {
        functionId: chatFn.id, provider: providerFor(m), model: m,
        billingType: "token_io", priceUsd: null,
        inputPriceUsd: idx === 0 ? 5.5 : +(1 + Math.random() * 10).toFixed(4),
        outputPriceUsd: idx === 0 ? 22 : +(4 + Math.random() * 40).toFixed(4),
        unitLabel: "1M tokens", status: "active", updatedBy: "martin@everbot.cz",
      },
    });
  }

  // Create Functions + Pricings for DEEP RESEARCH
  const drFn = await prisma.function.create({
    data: { serviceId: svcMap.deep_research, code: "research_run", name: "Deep research run", dataSource: "manual" },
  });
  for (let idx = 0; idx < deepResearchModels.length; idx++) {
    const m = deepResearchModels[idx];
    await prisma.modelPricing.create({
      data: {
        functionId: drFn.id, provider: providerFor(m), model: m,
        billingType: "token_io", priceUsd: null,
        inputPriceUsd: idx === 0 ? 9 : +(6 + Math.random() * 8).toFixed(4),
        outputPriceUsd: idx === 0 ? 36 : +(25 + Math.random() * 20).toFixed(4),
        unitLabel: "1M tokens", status: "active", updatedBy: "martin@everbot.cz",
      },
    });
  }

  // AUDIO function
  const audioFn = await prisma.function.create({
    data: { serviceId: svcMap.audio, code: "transcription", name: "Transkripce", dataSource: "manual" },
  });
  await prisma.modelPricing.create({
    data: {
      functionId: audioFn.id, provider: "OpenAI", model: "Whisper-1",
      billingType: "audio_second", priceUsd: 0.02, unitLabel: "1 second",
      status: "active", updatedBy: "martin@everbot.cz",
    },
  });


  // ─── Usage data (60 days) for tracked functions ───
  // Prices: Grafika $0.08/img, Video $0.50/s, Chat $5.5/$22 per 1M, DR $9/$36 per 1M, Audio $0.02/s
  // Target: 26% cost ratio with revenue 5,638,684 CZK, FX 22.8
  // Total daily cost USD ≈ $2,143
  // Cost weights: Chat 1x, DR 1.5x, Grafika 8x, Audio 10x, Video 15x
  // Daily costs: Chat $60, DR $20, Audio $52, Grafika $836, Video $1,175
  const trackedFns: Array<{ fn: any; dailyUnits?: number; dailyInput?: number; dailyOutput?: number; tokenBased: boolean }> = [
    { fn: gfxFn, dailyUnits: 10_450, tokenBased: false },
    { fn: videoFn, dailyUnits: 2_350, tokenBased: false },
    { fn: chatFn, dailyInput: 5_000_000, dailyOutput: 1_500_000, tokenBased: true },
    { fn: drFn, dailyInput: 1_000_000, dailyOutput: 300_000, tokenBased: true },
    { fn: audioFn, dailyUnits: 2_600, tokenBased: false },
  ];

  for (const spec of trackedFns) {
    const pricing = await prisma.modelPricing.findFirst({ where: { functionId: spec.fn.id } });
    if (!pricing) continue;
    for (let i = 0; i < 60; i++) {
      const noise = 0.7 + Math.random() * 0.6;
      const data: any = {
        functionId: spec.fn.id, provider: pricing.provider, model: pricing.model,
        periodStart: daysAgo(i), source: spec.fn.dataSource === "grafana" ? "grafana" : "manual",
      };
      if (spec.tokenBased) {
        data.inputTokens = BigInt(Math.round(spec.dailyInput! * noise));
        data.outputTokens = BigInt(Math.round(spec.dailyOutput! * noise));
      } else {
        data.units = BigInt(Math.round(spec.dailyUnits! * noise));
      }
      await prisma.usageRecord.create({ data });
    }
  }

  // Sample saved scenario
  const scenario = await prisma.simulationScenario.create({
    data: {
      name: "Video 35 %",
      description: "Snížení podílu videa z ~40 % na 35 %",
      totalTokensAssumption: BigInt(900_000_000),
      revenueCzkAssumption: 4_700_000,
      fxRate: 22.8,
      createdBy: "martin@everbot.cz",
    },
  });
  const scenarioShares: Record<string, number> = { chat: 30, video: 35, graphics: 20, audio: 8, deep_research: 7 };
  for (const [code, pct] of Object.entries(scenarioShares)) {
    await prisma.scenarioAllocation.create({
      data: { scenarioId: scenario.id, serviceId: svcMap[code], sharePercent: pct },
    });
  }

  console.log("Seed done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

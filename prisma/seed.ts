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

  // Users
  await prisma.user.createMany({
    data: [
      { email: "martin@everbot.cz", name: "Martin Švancárek", role: "admin" },
      { email: "viewer@everbot.cz", name: "Interní viewer", role: "viewer" },
    ],
  });

  // FX rates – last 90 days, around 23 CZK/USD
  for (let i = 0; i < 90; i++) {
    const date = daysAgo(i);
    await prisma.fxRate.create({
      data: {
        date,
        czkPerUsd: 22.8 + Math.sin(i / 7) * 0.4,
        source: "manual",
      },
    });
  }

  // Revenue – last 3 months
  for (let m = 0; m < 3; m++) {
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m + 1, 0));
    await prisma.revenue.create({
      data: { periodStart: start, periodEnd: end, amountCzk: 4_500_000 + m * 200_000 },
    });
  }

  // Services
  const services = [
    { code: "chat", name: "Chat", color: "#5b8cff" },
    { code: "video", name: "Video", color: "#e0574a" },
    { code: "graphics", name: "Grafika", color: "#3fb27f" },
    { code: "audio", name: "Audio", color: "#e0a23a" },
    { code: "deep_research", name: "Deep research", color: "#a26bff" },
    { code: "voice", name: "Voice", color: "#26b3c4" },
  ];
  const svcMap: Record<string, string> = {};
  for (const s of services) {
    const created = await prisma.service.create({ data: s });
    svcMap[s.code] = created.id;
  }

  // Functions + pricings + usage
  const fnSpecs: Array<{
    svc: string;
    code: string;
    name: string;
    dataSource: string;
    pricings: Array<{
      provider: string;
      model: string;
      billingType: string;
      inputPriceUsd?: number;
      outputPriceUsd?: number;
      unitPriceUsd?: number;
      unitLabel?: string;
      markup?: number;
    }>;
    dailyTokens?: { input: number; output: number };
    dailyUnits?: number;
  }> = [
    {
      svc: "chat",
      code: "assistant_reply",
      name: "Asistent – odpověď",
      dataSource: "grafana",
      pricings: [
        { provider: "OpenAI", model: "gpt-4o", billingType: "token_io", inputPriceUsd: 2.5, outputPriceUsd: 10, unitLabel: "1M tokens", markup: 1.5 },
        { provider: "Anthropic", model: "claude-sonnet-4", billingType: "token_io", inputPriceUsd: 3, outputPriceUsd: 15, unitLabel: "1M tokens", markup: 1.5 },
      ],
      dailyTokens: { input: 5_000_000, output: 1_500_000 },
    },
    {
      svc: "chat",
      code: "summarization",
      name: "Sumarizace",
      dataSource: "grafana",
      pricings: [
        { provider: "OpenAI", model: "gpt-4o-mini", billingType: "token_io", inputPriceUsd: 0.15, outputPriceUsd: 0.6, unitLabel: "1M tokens", markup: 1.4 },
      ],
      dailyTokens: { input: 8_000_000, output: 800_000 },
    },
    {
      svc: "video",
      code: "video_generation",
      name: "Generování videa",
      dataSource: "manual",
      pricings: [
        { provider: "Google", model: "veo-3", billingType: "video_second", unitPriceUsd: 0.5, unitLabel: "1 second", markup: 1.3 },
      ],
      dailyUnits: 1200,
    },
    {
      svc: "graphics",
      code: "image_generation",
      name: "Generování obrázku",
      dataSource: "grafana",
      pricings: [
        { provider: "OpenAI", model: "gpt-image-1", billingType: "image", unitPriceUsd: 0.04, unitLabel: "1 image 1024×1024", markup: 1.6 },
        { provider: "Stability", model: "sd3-large", billingType: "image", unitPriceUsd: 0.065, unitLabel: "1 image", markup: 1.4 },
      ],
      dailyUnits: 4500,
    },
    {
      svc: "audio",
      code: "transcription",
      name: "Transkripce",
      dataSource: "manual",
      pricings: [
        { provider: "OpenAI", model: "whisper-1", billingType: "audio_second", unitPriceUsd: 0.006 / 60, unitLabel: "1 second", markup: 1.2 },
      ],
      dailyUnits: 180_000,
    },
    {
      svc: "deep_research",
      code: "research_run",
      name: "Deep research run",
      dataSource: "missing",
      pricings: [
        { provider: "OpenAI", model: "o1", billingType: "token_io", inputPriceUsd: 15, outputPriceUsd: 60, unitLabel: "1M tokens", markup: 1.7 },
      ],
    },
    {
      svc: "voice",
      code: "voice_clone",
      name: "Voice clone TTS",
      dataSource: "missing",
      pricings: [
        { provider: "ElevenLabs", model: "eleven_v3", billingType: "minute", unitPriceUsd: 0.18, unitLabel: "1 minute", markup: 1.5 },
      ],
    },
  ];

  for (const f of fnSpecs) {
    const fn = await prisma.function.create({
      data: {
        serviceId: svcMap[f.svc],
        code: f.code,
        name: f.name,
        dataSource: f.dataSource,
      },
    });
    for (const p of f.pricings) {
      await prisma.modelPricing.create({
        data: {
          functionId: fn.id,
          provider: p.provider,
          model: p.model,
          billingType: p.billingType,
          inputPriceUsd: p.inputPriceUsd ?? null,
          outputPriceUsd: p.outputPriceUsd ?? null,
          unitPriceUsd: p.unitPriceUsd ?? null,
          unitLabel: p.unitLabel ?? null,
          markupCoefficient: p.markup ?? 1,
          status: "active",
          updatedBy: "martin@everbot.cz",
        },
      });
    }

    // Generate 60 days of usage for trackable functions
    if (f.dataSource === "missing") continue;
    const primary = f.pricings[0];
    for (let i = 0; i < 60; i++) {
      const periodStart = daysAgo(i);
      const noise = 0.7 + Math.random() * 0.6;
      const data: any = {
        functionId: fn.id,
        provider: primary.provider,
        model: primary.model,
        periodStart,
        source: f.dataSource as "manual" | "grafana",
      };
      if (f.dailyTokens) {
        data.inputTokens = BigInt(Math.round(f.dailyTokens.input * noise));
        data.outputTokens = BigInt(Math.round(f.dailyTokens.output * noise));
      }
      if (f.dailyUnits) {
        data.units = BigInt(Math.round(f.dailyUnits * noise));
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
  const shares: Record<string, number> = {
    chat: 30, video: 35, graphics: 18, audio: 7, deep_research: 5, voice: 5,
  };
  for (const [code, pct] of Object.entries(shares)) {
    await prisma.scenarioAllocation.create({
      data: { scenarioId: scenario.id, serviceId: svcMap[code], sharePercent: pct },
    });
  }

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

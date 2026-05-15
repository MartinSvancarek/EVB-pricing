# 3. Datový model

## 3.1 Přehled entit

```
Service (1) ──< Function (1) ──< ModelPricing
                                       │
                                       └──< UsageRecord

FxRate (časová řada – jeden záznam per den)
Revenue (měsíční obrat CZK)
SimulationScenario ──< ScenarioAllocation (per Service)
```

## 3.2 Služby (Service)

Aktuální služby v systému:

| Kód | Název | Billing type |
|---|---|---|
| `chat` | Chat | token_io |
| `graphics` | Grafika | image |
| `video` | Video | video_second |
| `audio` | Audio | audio_second |
| `deep_research` | Deep research | token_io |

## 3.3 Schéma (Prisma)

### Service
```prisma
model Service {
  id        String   @id @default(cuid())
  code      String   @unique       // chat, graphics, video, audio, deep_research
  name      String
  color     String   @default("#5b8cff")
  isActive  Boolean  @default(true)
}
```

### Function
Funkce uvnitř služby (např. služba `chat` → funkce `assistant_reply`).
```prisma
model Function {
  id          String  @id @default(cuid())
  serviceId   String  // FK → Service
  code        String
  name        String
  description String?
  dataSource  String  @default("missing")  // manual | grafana | api | missing
  isActive    Boolean @default(true)
  @@unique([serviceId, code])
}
```

### ModelPricing
Cena modelu pro danou funkci. Jedna funkce může mít více pricing záznamů (různí provideři).
```prisma
model ModelPricing {
  id                String  @id @default(cuid())
  functionId        String  // FK → Function
  provider          String  // OpenAI, Anthropic, Google, ElevenLabs, ...
  fallbackProvider  String?
  model             String  // gpt-4o, claude-sonnet-4, veo-3, ...
  billingType       String  // token_io | token_unit | image | audio_second | video_second | request | minute
  priceUsd          Float?  // celková cena za jednotku (fallback pro unitPriceUsd)
  inputPriceUsd     Float?  // per 1M input tokens (pokud token_io)
  outputPriceUsd    Float?  // per 1M output tokens (pokud token_io)
  unitPriceUsd      Float?  // per 1 jednotka (pokud non-token)
  unitLabel         String? // "1M tokens", "1 image", "1 second"
  resolution        String? // "1920x1080", "4K"
  credits           Float?  // credit cost per generation
  durationSec       Float?  // output duration in seconds
  markupCoefficient Float   @default(1.0)
  internalNote      String?
  status            String  @default("active")  // active | inactive
  validFrom         DateTime?
  validTo           DateTime?
}
```

### UsageRecord
Denní agregát usage (1 záznam = 1 funkce × 1 model × 1 den).
```prisma
model UsageRecord {
  id           String   @id @default(cuid())
  functionId   String   // FK → Function
  provider     String
  model        String
  periodStart  DateTime // den
  inputTokens  BigInt?  // pro token_io billing
  outputTokens BigInt?  // pro token_io billing
  units        BigInt?  // pro non-token billing (images, seconds)
  source       String   @default("manual")  // manual | grafana | api
  @@index([functionId, periodStart])
  @@index([periodStart])
}
```

### FxRate
```prisma
model FxRate {
  id        String   @id @default(cuid())
  date      DateTime @unique
  czkPerUsd Float
  source    String   @default("manual")  // manual | cnb
}
```

### Revenue
```prisma
model Revenue {
  id          String   @id @default(cuid())
  periodStart DateTime
  periodEnd   DateTime
  amountCzk   Float
  note        String?
  @@unique([periodStart, periodEnd])
}
```

### SimulationScenario + ScenarioAllocation
```prisma
model SimulationScenario {
  id                    String @id @default(cuid())
  name                  String
  description           String?
  totalTokensAssumption BigInt
  revenueCzkAssumption  Float
  fxRate                Float
  createdBy             String?
  allocations           ScenarioAllocation[]
}

model ScenarioAllocation {
  id           String @id @default(cuid())
  scenarioId   String // FK → SimulationScenario (onDelete: Cascade)
  serviceId    String // FK → Service
  sharePercent Float  // suma per scénář = 100.00
}
```

## 3.4 Klíčové vazby

- `Service 1 → N Function`
- `Function 1 → N ModelPricing`
- `Function 1 → N UsageRecord`
- `SimulationScenario 1 → N ScenarioAllocation → 1 Service`

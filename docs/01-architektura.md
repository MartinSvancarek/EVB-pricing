# 1. Architektura aplikace

## 1.1 Účel

EVB Pricing je interní admin nástroj pro sledování a řízení nákladů na AI služby (OpenAI, Anthropic, Google, ElevenLabs atd.). Umožňuje:

- Sledovat reálné náklady (USD/CZK) v čase
- Spravovat ceníky modelů
- Simulovat dopad změny rozložení nákladů mezi službami
- Monitorovat cost ratio vůči obratu

## 1.2 Tech stack

| Vrstva | Technologie |
|---|---|
| Framework | Next.js 14+ (App Router, Server Components) |
| Jazyk | TypeScript |
| Styling | Tailwind CSS |
| Grafy | Recharts |
| DB | SQLite (Prisma ORM) |
| Runtime | Node.js |

## 1.3 Struktura projektu

```
src/
├── app/
│   ├── dashboard/           Přehled – KPI, trendy, breakdown
│   ├── packages/            Balíčky – správa a historie
│   ├── pricing/             Ceník – CRUD modelových cen
│   ├── simulation/          Simulace – what-if cost allocation
│   ├── cost-analytics/      Analýza nákladů – cost + usage pohledy
│   └── settings/            Nastavení – FX, revenue, users, data sources
├── components/              Sdílené UI komponenty (charts, sidebar, topbar)
└── lib/                     Business logika (calc, analytics, format, db)
prisma/
├── schema.prisma            Datový model
└── seed.ts                  Seed data pro vývoj
docs/                        Dokumentace
```

## 1.4 Navigace (levý sidebar)

| # | Sekce | Route | Ikona |
|---|---|---|---|
| 1 | Přehled | `/dashboard` | LayoutDashboard |
| 2 | Balíčky | `/packages` | Package |
| 3 | Ceník | `/pricing` | Tags |
| 4 | Simulace | `/simulation` | FlaskConical |
| 5 | Analýza nákladů | `/cost-analytics/cost` | BarChart3 |
| 6 | Nastavení | `/settings/fx` | Settings |

## 1.5 Sitemap

```
/dashboard
/packages
/pricing
  /pricing/new
  /pricing/:id
/simulation
  /simulation/scenarios
/cost-analytics
  /cost-analytics/cost
  /cost-analytics/usage
/settings
  /settings/fx
  /settings/revenue
  /settings/data-sources
  /settings/users
```

## 1.6 Globální UI prvky

- **Top bar**: výběr periody (Day / Week / Month / Custom), FX kurz, badge tracking coverage
- **Perioda**: propaguje se přes search params (`?from=&to=&range=`)
- **Formáty**: CZK → `1 234 Kč`, USD → `$1,234`, % → `26,0 %`

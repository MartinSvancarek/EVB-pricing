# EVB Pricing – interní admin pro správu AI pricingu a nákladů

Interní webová aplikace pro centrální správu cen AI modelů, sledování nákladů a simulaci interního cost rozdělení.

> Tento repozitář obsahuje **návrh MVP** (informační architekturu, datový model, logiku výpočtů, UX flow). Reálná data budou doplněna manuálně nebo napojením později.

## Obsah dokumentace

- [docs/01-architecture.md](docs/01-architecture.md) – Sekce, sitemap, navigace
- [docs/02-views.md](docs/02-views.md) – Detailní návrh každého view (KPI, filtry, grafy, tabulky, CTA)
- [docs/03-data-model.md](docs/03-data-model.md) – Entity, pole, vazby
- [docs/04-calculations.md](docs/04-calculations.md) – Logika výpočtů (USD, CZK, cost ratio, simulace)
- [docs/05-ux-flow.md](docs/05-ux-flow.md) – UX flow pro interního admin uživatele
- [docs/06-mvp-and-stack.md](docs/06-mvp-and-stack.md) – Rozsah MVP, doporučený tech stack, data readiness

## Hlavní byznys cíle

1. Dostat náklady na tokeny vůči obratu na **20 %**.
2. Mít **1 centrální místo** pro pricing AI modelů a funkcí.
3. Mít přehled o **aktuálních i historických** nákladech.
4. Umět **simulovat dopad** změny pricingu / interní cost logiky před nasazením.
5. Být připraveni na druhou iteraci: 1× týdně porovnávat ceny dodavatelů vs. naše interní nastavení.

## TL;DR návrh

- **3 hlavní view**: Pricing, Cost Analytics, Simulation.
- **2 podpůrná view**: Dashboard (úvodní přehled), Settings (FX kurz, periody, scénáře, zdroje dat).
- **Datový model**: `Service → Function → ModelPricing` + `UsageRecord` + `SimulationScenario` + `FxRate` + `Revenue`.
- **Tech stack (doporučení)**: Next.js (App Router) + TypeScript + Postgres + Prisma + Tailwind + shadcn/ui + Recharts. Auth přes interní SSO (Google Workspace / Azure AD). Hosting Vercel nebo interní k8s.
- **Data readiness**: každá metrika má příznak `data_source` (manual / grafana / api / missing) a UI jasně zobrazuje *„tracking není kompletní“* badge.

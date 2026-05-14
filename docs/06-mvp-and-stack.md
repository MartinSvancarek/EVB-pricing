# 6. MVP rozsah, doporučený stack, data readiness

## 6.1 Co JE v MVP

- **Pricing**: list (filtry, inline edit), detail/edit, audit log, status active/inactive.
- **Cost Analytics**: usage view + cost view, periody Day/Week/Month/Custom, KPI, 2–3 grafy, breakdown tabulka, export CSV.
- **Simulation**: live what-if simulátor, ukládání scénářů, seznam scénářů.
- **Settings**: FX kurz (manuální), Revenue (manuální měsíční zápis), Users (Admin/Viewer), Data sources (jen seznam funkcí + příznak zdroje).
- **Dashboard**: 4 KPI karty + 2 grafy + tabulka top 10.
- **Auth**: SSO (Google Workspace nebo Azure AD) – jen interní emaily.
- **Audit log**: zápis při každé změně pricingu.
- **Data readiness badge**: globální i řádkový.

## 6.2 Co NENÍ v MVP (vědomě odloženo)

- Automatický fetch FX z ČNB API.
- Automatické napojení na Grafana / providery (jen schéma + manuální import CSV).
- Hodinová granularita usage (jen denní).
- Verzování pricingu mimo `valid_from/valid_to` + audit log.
- Porovnání 2 scénářů side-by-side.
- Notifikace (Slack / email) při překročení cost ratio.
- Multi-tenant, granulární role-based permissions.
- Týdenní porovnání dodavatel vs. interní nastavení (cíl v2).
- Veřejné customer-facing pricing (toto je interní nástroj).

## 6.3 Doporučený tech stack

| Vrstva | Volba | Důvod |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | SSR pro rychlé tabulky, jeden repo BE+FE, dobrá DX |
| UI | **Tailwind + shadcn/ui** | rychlý interní look, table/form komponenty |
| Grafy | **Recharts** (nebo Tremor) | dostatečné pro KPI + line/bar/area/donut |
| Backend | **Next.js API routes / Server actions** | jednoduché pro interní app, není potřeba samostatný BE |
| DB | **PostgreSQL** | decimal, jsonb pro audit, časové dotazy |
| ORM | **Prisma** | typesafe, migrace, dobrá DX |
| Auth | **NextAuth (Auth.js)** s Google/Azure provider | SSO, omezení na doménu |
| Tabulky | **TanStack Table** | inline edit, sort, filtr, virtualizace |
| Validace | **Zod** | sdílení schémat FE/BE |
| Hosting | **Vercel** (nebo interní k8s) | rychlé nasazení MVP |
| Observability | **Sentry** + **Logtail** | minimum |

> Alternativa „no-code MVP“: **Retool** nebo **Appsmith** nad Postgres. Rychlejší start (dny), ale horší UX pro Simulation a custom grafy. **Doporučuji Next.js**, protože Simulation a Cost Analytics view potřebují live přepočet a custom layout, kde no-code víc překáží než pomáhá.

## 6.4 Data readiness – jak to řešit prakticky

1. Při zavedení každé `Function` se nastaví `data_source`:
   - `manual` – data tečou ručním importem CSV.
   - `grafana` – propojeno s Grafana panelem (URL + panel id).
   - `api` – přímé napojení na providera (v2).
   - `missing` – tracking ještě neexistuje.
2. UI **nikdy neskrývá** funkce s `missing` – jen je odlišuje:
   - kurzíva v tabulkách
   - badge „no tracking“ s tooltipem
   - v součtech jsou vyloučené, ale počet vyloučených je v footeru tabulky („3 funkce vyloučeny – chybí tracking“).
3. Cost ratio se počítá jen z dostupných dat + zobrazí se warning „pokrytí trackingu 78 %“.
4. V Settings → Data Sources je **single source of truth**, kolik % funkcí je trackováno a které chybí.

## 6.5 Doporučení – realizovat in-house, ne SaaS

- **Doporučuji vlastní vývoj** (Next.js MVP). Důvody:
  - Specifické view (Simulation s live what-if) žádný off-the-shelf nástroj nepokrývá.
  - Citlivá interní data (ceny, markup, obrat) – nechcete je v SaaS.
  - Nízká složitost MVP – 3 hlavní view, 1 admin role.
  - Snadné napojení na vlastní Grafanu a interní API ve v2.
- **Retool/Appsmith** zvažte jen pokud potřebujete běžící prototyp během dnů a jste ochotní později přepsat.

## 6.6 Roadmapa (po MVP)

- **v1.1**: Auto-fetch FX z ČNB, Grafana konektor, hodinová granularita, Slack alert pri prekročení 20 %.
- **v1.2**: Týdenní auto-porovnání dodavatel vs. interní (scraping/API providerů).
- **v2**: Forecast nákladů (lineární regrese / Prophet), per-customer cost (pokud začneme měřit).

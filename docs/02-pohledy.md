# 2. Pohledy (views)

## 2.1 Přehled (`/dashboard`)

**Účel:** Vstupní stránka. Na první pohled vidět cost ratio a kde jsou náklady.

**KPI karty (4):**
- Cost ratio MTD (zelená < 20 %, oranžová 20–25 %, červená > 25 %)
- Náklady MTD v CZK (+ USD)
- Token/usage MTD (suma)
- Tracking coverage (%)

**Grafy:**
- Trend: denní náklady CZK (bar) + cost ratio (line) za posledních 30 dnů
- Stacked bar: denní náklady rozpadlé po službách

**Tabulka:** Služby s breakdown (náklad USD, CZK, podíl %, tokeny/jednotky)

---

## 2.2 Balíčky (`/packages`)

**Účel:** Správa cenových balíčků pro zákazníky.

**Funkce:**
- Tabulka balíčků s historií změn
- Undo posledního zápisu
- Přeložené popisky polí (monthlyPriceCzk → „Měsíční cena" atd.)

---

## 2.3 Ceník (`/pricing`)

**Účel:** Správa cen modelů a funkcí (CRUD).

**List view (`/pricing`):**
- Tabulka všech pricing záznamů
- Sloupce: služba, funkce, provider, model, typ účtování, ceny, status
- Filtry, řazení

**Detail (`/pricing/:id` a `/pricing/new`):**
- Formulář: služba, funkce, provider, model, billing type, ceny USD, markup, status
- Automatický přepočet CZK dle aktuálního FX

---

## 2.4 Simulace (`/simulation`)

**Účel:** What-if analýza rozložení nákladů mezi službami.

**Model:** Cost-allocation – simulovaný náklad = skutečný celkový náklad × (simulované % / 100).

**Levá strana (vstupy):**
- Globální parametry: celkový obrat CZK, FX kurz
- Tabulka služeb: aktuální %, simulované % (editovatelné)
- Validace: suma musí být 100 %
- Uložení jako scénář

**Pravá strana (výstupy – live):**
- Simulované KPI: celkové náklady, cost ratio, delta
- Tabulka „Dopad na služby": per-service aktuální vs. simulovaný náklad + delta
- Bar chart: porovnání aktuální vs. simulovaný per service

**Scénáře (`/simulation/scenarios`):**
- Seznam uložených scénářů
- Smazání scénáře
- Načtení scénáře do simulátoru

---

## 2.5 Analýza nákladů – Cost (`/cost-analytics/cost`)

**Účel:** Reálné peněžní náklady na AI providery.

**KPI karty (4):**
- Náklady CZK (+ USD)
- Cost ratio
- Δ vs. předchozí období
- Tracking coverage

**Grafy:**
- Trend: denní náklady + cost ratio (bar + line)
- Stacked bar: per service per den
- Donut: podíl služeb na nákladech (tooltip: %, tokeny, USD/CZK)

**Tabulka:** Breakdown per service – náklad USD, CZK, podíl, tokeny/jednotky

---

## 2.6 Analýza nákladů – Usage (`/cost-analytics/usage`)

**Účel:** Sledování objemu usage (tokeny, obrázky, sekundy).

**Grafy a tabulky:** Stacked area usage v čase per service, breakdown tabulka.

---

## 2.7 Nastavení (`/settings`)

**Subsekce:**

| Route | Účel |
|---|---|
| `/settings/fx` | FX kurz CZK/USD – manuální zadání, historie |
| `/settings/revenue` | Měsíční obrat CZK |
| `/settings/data-sources` | Přehled zdrojů dat per funkce |
| `/settings/users` | Interní uživatelé (smazání) |

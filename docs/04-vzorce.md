# 4. Vzorce a výpočty

Toto je referenční dokument všech výpočtů v aplikaci. Implementace: `src/lib/calc.ts`.

Každá sekce obsahuje technický vzorec i vysvětlení v běžné řeči.

---

## 4.1 Náklad za usage záznam (USD)

Funkce: `costUsdForUsage(usage, pricing)`

```
if billing_type == "token_io":
    cost_usd = (input_tokens / 1 000 000) × input_price_usd
             + (output_tokens / 1 000 000) × output_price_usd

elif billing_type == "token_unit":
    cost_usd = ((input_tokens + output_tokens) / 1 000 000) × unit_price_usd

else (image / audio_second / video_second / request / minute):
    unit_price = unit_price_usd ?? price_usd    ← fallback na priceUsd
    cost_usd = units × unit_price
```

Pokud pricing nemá potřebné ceny → vrací `null` (v UI badge „no pricing").

> **Lidsky:**
> Toto je základní výpočet „kolik nás stál jeden den provozu konkrétní AI funkce".
>
> Máme dva typy služeb:
> - **Tokenové** (Chat, Deep research): Platíme za tokeny – „kousky textu" co AI zpracuje. Cena se udává za 1 milion tokenů. Zvlášť se platí vstup (co pošleme AI) a výstup (co AI odpoví). Takže náklad = kolik milionů vstupních tokenů × cena za milion + kolik milionů výstupních tokenů × cena za milion.
> - **Jednotkové** (Grafika, Video, Audio): Platíme za každý kus – za každý vygenerovaný obrázek, za každou sekundu videa, za každou sekundu audia. Náklad = počet kusů × cena za kus.
>
> Příklad: Vygenerovali jsme 500 obrázků, každý stojí $0.07 → náklad = 500 × $0.07 = $35.

---

## 4.2 Přepočet USD → CZK

Funkce: `fxForDate(rates, date)`

```
fx = nejbližší FxRate kde date ≤ usage.periodStart
cost_czk = cost_usd × fx.czkPerUsd
```

Vždy se používá kurz k datu usage, ne aktuální – historické náklady se nemění.

> **Lidsky:**
> Providery (OpenAI, Anthropic atd.) účtují v dolarech. My potřebujeme vědět náklady v korunách, protože obrat máme v CZK.
>
> Pro přepočet použijeme kurz, který platil v den, kdy se usage stalo. Nepoužíváme dnešní kurz – jinak by se nám historická čísla měnila pokaždé, když se pohne kurz.
>
> Příklad: Dne 1.5. jsme utratili $100 a kurz byl 22.8 → náklad = 2 280 Kč. I když dnes je kurz 23.5, ten historický záznam zůstane 2 280 Kč.

---

## 4.3 Revenue za období (pro-rated)

Funkce: `revenueForRange(revenues, from, to)`

```
Pro každý Revenue záznam jehož [periodStart, periodEnd] se překrývá s [from, to]:
    overlap_days = počet překrývajících se dnů
    total_days = celý rozsah Revenue záznamu
    revenue += amountCzk × (overlap_days / total_days)
```

> **Lidsky:**
> Obrat (revenue) zadáváme měsíčně – např. „květen 2026: 5 638 684 Kč". Ale někdy se díváme na období, které neodpovídá celému měsíci (např. jen prvních 15 dní).
>
> V tom případě vezmeme měsíční obrat a spočítáme poměrnou část. Pokud máme 5 638 684 Kč za 31 dní a díváme se na 15 dní → obrat pro to období = 5 638 684 × (15/31) ≈ 2 728 712 Kč.
>
> Kdyby období zasahovalo do dvou měsíců, sčítáme poměrné části z obou.

---

## 4.4 Cost ratio

Funkce: `costRatio(totalCzk, revenueCzk)`

```
cost_ratio = total_czk / revenue_czk
```

Pokud `revenue_czk ≤ 0` → `null` (UI: „N/A – zadejte obrat").

**Indikace:**
- `< 20 %` → zelená (good)
- `20–25 %` → oranžová (warn)
- `> 25 %` → červená (bad)

> **Lidsky:**
> Cost ratio je **nejdůležitější metrika** celé aplikace. Říká: „Kolik procent z našeho obratu spolknou náklady na AI."
>
> Výpočet je jednoduchý: celkové náklady v CZK děleno obrat v CZK.
>
> Příklad: Náklady za měsíc = 1 466 058 Kč, obrat = 5 638 684 Kč → cost ratio = 26 %. To znamená, že 26 haléřů z každé koruny obratu jde na AI providery.
>
> Cíl je dostat se pod 20 %. Pokud jsme nad 25 %, svítí to červeně – znamená to, že AI nás stojí příliš a musíme buď snížit spotřebu, vyjednat levnější ceny, nebo zvýšit obrat.

---

## 4.5 Delta vůči předchozímu období

Funkce: `deltaPct(current, previous)`

```
delta_pct = (current - previous) / previous
```

Pokud `previous = 0` → `null`.

Předchozí období = stejně dlouhý interval bezprostředně před zvoleným obdobím.

> **Lidsky:**
> Ukazuje, o kolik procent se náklady změnily oproti minulému období. Pokud se díváme na „posledních 30 dní", tak předchozí období je 30 dní před tím.
>
> Příklad: Tento měsíc náklady 1 200 000 Kč, minulý měsíc 1 000 000 Kč → delta = +20 % (náklady vzrostly o pětinu).
>
> Slouží k rychlému odhalení: „Rosteme? Klesáme? O kolik?"

---

## 4.6 Simulace – cost-allocation model

Implementace: `src/app/simulation/SimulationClient.tsx`

**Vstupy:**
- `actualTotalCzk` – skutečný celkový náklad za posledních 30 dnů
- `revenueCzkAssumption` – předpokládaný obrat (default: 5 638 684 Kč)
- `fx` – FX kurz (default: 22.8)
- `actualShares[service]` – aktuální procentní podíl (editovatelný, default z reálných dat)
- `simShares[service]` – simulovaný procentní podíl (editovatelný)

**Výpočet:**

```
Pro každou službu s:
    sim_cost_czk[s] = actualTotalCzk × (simShares[s] / 100)

sim_total_czk = Σ sim_cost_czk[s]       // == actualTotalCzk pokud suma share = 100 %
sim_cost_ratio = sim_total_czk / revenueCzkAssumption

delta_czk[s] = sim_cost_czk[s] - (actualTotalCzk × actualShares[s] / 100)
delta_total = sim_total_czk - actualTotalCzk
delta_ratio = sim_cost_ratio - (actualTotalCzk / revenueCzkAssumption)
```

**Validace:** Suma simulovaných podílů musí být 100 %. Pokud není → warning v UI.

> **Lidsky:**
> Simulace odpovídá na otázku: **„Co se stane s náklady, když změníme rozložení využívání služeb?"**
>
> Jak to funguje:
> 1. Vezmeme skutečné celkové náklady za posledních 30 dní (např. 1 466 058 Kč).
> 2. Každá služba má svůj podíl – např. Grafika 40 %, Video 30 %, Chat 23 %, atd.
> 3. Uživatel změní podíly na „simulované" – např. sníží Video z 30 % na 20 % a zvýší Chat na 33 %.
> 4. Nový náklad per služba = celkový náklad × nový podíl. Takže pokud celkem utratíme 1 466 058 Kč a Video dostane 20 % místo 30 %, jeho náklad klesne z ~440 000 Kč na ~293 000 Kč.
>
> Toto **nepredikuje budoucnost** – jen ukazuje „kdyby se rozložení změnilo, jak by to ovlivnilo poměry". Slouží k rozhodování typu: „Vyplatí se přesunout zákazníky z Video na Chat?"
>
> Příklad: Aktuálně Grafika žere 40 % nákladů. Pokud snížíme na 30 % (třeba optimalizací rozlišení), ušetříme 10 % z celkových nákladů ≈ 146 606 Kč měsíčně.

---

## 4.7 Tracking coverage

```
total_functions   = počet aktivních Function
tracked_functions = počet aktivních Function kde dataSource ≠ "missing"
coverage = tracked_functions / total_functions
```

Zobrazeno v top baru a na dashboardu.

> **Lidsky:**
> Říká, kolik procent našich AI funkcí skutečně měříme. Pokud máme 10 funkcí a 8 z nich posílá data → coverage = 80 %.
>
> Pokud coverage není 100 %, cost ratio je nepřesný – skutečné náklady mohou být vyšší, protože některé funkce neměříme.

---

## 4.8 Agregace v čase (time series)

Implementace: `src/lib/analytics.ts` → `timeSeries()`

- Groupuje enriched usage záznamy po dnech
- Per den: celková costCzk + per-service breakdown
- Slouží pro trend grafy a stacked bar/area charty

> **Lidsky:**
> Seskupí všechny záznamy podle dní a spočítá „kolik jsme utratili každý den" – celkem i per služba. Výstup jde do grafů, kde vidíte sloupcový graf denních nákladů.

---

## 4.9 Bucket agregace

Implementace: `src/lib/analytics.ts` → `bucketBy(enriched, groupKey)`

Seskupí enriched záznamy dle klíče (`"service"` | `"function"` | `"model"`) a sčítá:
- `inputTokens`, `outputTokens`, `units`
- `costUsd`, `costCzk`

Vrací pole `CostBucket[]`.

> **Lidsky:**
> Sečte všechny záznamy dohromady podle zvoleného kritéria. Např. „seskup dle služby" → dostanete 5 řádků (Chat, Grafika, Video, Audio, Deep research) kde každý má celkový náklad a spotřebu za zvolené období. Používá se pro tabulky breakdown a donut graf.

---

## 4.10 Aktuální seed data (dev)

| Služba | Podíl nákladů | Billing | Klíčový pricing |
|---|---|---|---|
| Grafika | 40 % | image | $0.07/image |
| Video | 30 % | video_second | $0.55/s |
| Chat | 23 % | token_io | $8/$32 per 1M |
| Deep research | 5 % | token_io | $15/$55 per 1M |
| Audio | 2 % | audio_second | $0.0001/s |

- Revenue: 5 638 684 Kč/měsíc
- FX: 22.8 CZK/USD (60 dnů)
- Cílový cost ratio: ~26 %

> **Lidsky:**
> Toto jsou testovací data pro vývoj. Odrážejí reálnou strukturu – Grafika je nejdražší (40 % všech nákladů), Video druhá (30 %), Chat třetí (23 %). Audio je zanedbatelné (2 %).
>
> Obrat firmy je ~5.6M Kč měsíčně. Při celkových AI nákladech ~1.47M Kč vychází cost ratio na 26 %, což je nad cílem (20 %) – proto v dashboardu svítí oranžově/červeně.

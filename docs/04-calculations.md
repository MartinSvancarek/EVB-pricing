# 4. Logika výpočtů

Veškeré peněžní operace v interním účetnictví jsou v `decimal`, ne `float`. Zaokrouhlování až při zobrazení.

## 4.1 Cena za usage (USD)

Pro daný `UsageRecord` u konkrétní funkce:

```
pricing = priceForUsage(function_id, model, period_start)
  // vrátí ModelPricing platný k datu period_start
  // (status=active AND valid_from <= date AND (valid_to IS NULL OR valid_to >= date))

if billing_type == 'token_io':
    cost_usd = (input_tokens  / 1_000_000) * pricing.input_price_usd
             + (output_tokens / 1_000_000) * pricing.output_price_usd

elif billing_type == 'token_unit':
    cost_usd = ((input_tokens + output_tokens) / 1_000_000) * pricing.unit_price_usd

else:  // image / audio_second / video_second / request / minute
    cost_usd = units * pricing.unit_price_usd
```

> Pokud pro daný den neexistuje aktivní pricing → `cost_usd = NULL` a v UI se řádek označí badge **„no active pricing“**.

## 4.2 Přepočet USD → CZK

```
fx = fxRateForDate(period_start)          // nejbližší ≤ datum
cost_czk = cost_usd * fx.czk_per_usd
```

> Použití kurzu **k datu usage**, ne aktuálního – jinak by historické náklady „jezdily“ při změně kurzu.

## 4.3 Interní prodejní cena

```
internal_sell_usd = pricing_input_or_unit_usd * markup_coefficient
internal_sell_czk = internal_sell_usd * fx_current
```

Pouze pro zobrazení v Pricing view, neukládá se denormalizovaně.

## 4.4 Agregace nákladů za období

Pro rozsah `[from, to]` a sadu filtrů (služba/funkce/model/provider):

```
total_usd = SUM(cost_usd) WHERE period_start IN [from, to] AND filtry
total_czk = SUM(cost_czk) WHERE …
```

Breakdowny v Cost Analytics jsou jen `GROUP BY service_id` / `function_id` / `model` nad stejným dotazem.

## 4.5 Cost ratio vůči obratu

```
revenue_czk = SUM(Revenue.amount_czk) překrývající se s [from, to]
              (proporcionálně k počtu dnů, pokud období neodpovídá celému měsíci)

cost_ratio  = total_czk / revenue_czk
```

Cíl: `cost_ratio <= 0.20`.

UI indikace:
- `< 20 %` → zelená
- `20–25 %` → oranžová
- `> 25 %` → červená

Pokud `revenue_czk = 0` nebo chybí → zobraz „N/A · zadejte obrat v Settings“.

## 4.6 Simulace – výpočet

**Vstupy uživatele:**
- `total_tokens_assumption` (T)
- `revenue_czk_assumption` (R)
- `fx` (snapshot)
- `share_simulated[service]` v % (suma 100 %)

**Krok 1 – aktuální (baseline) náklad na 1 token per service:**
```
For each service s:
    actual_cost_czk[s]   = SUM(UsageRecord.cost_czk za poslední plnou periodu, group by service)
    actual_tokens[s]     = SUM(input + output tokens, group by service)
    cost_per_token[s]    = actual_cost_czk[s] / actual_tokens[s]   // průměrný unit cost služby
    actual_share[s]      = actual_cost_czk[s] / SUM(actual_cost_czk)
```

**Krok 2 – simulovaný stav:**
```
For each service s:
    sim_tokens[s]    = T * (share_simulated[s] / 100)
    sim_cost_czk[s]  = sim_tokens[s] * cost_per_token[s]   // držíme efektivitu služby

sim_total_czk        = SUM(sim_cost_czk)
sim_cost_ratio       = sim_total_czk / R
```

**Krok 3 – delta:**
```
delta_total_czk      = sim_total_czk - actual_total_czk
delta_ratio_pp       = (sim_cost_ratio - actual_cost_ratio) * 100
delta_per_service[s] = sim_cost_czk[s] - actual_cost_czk[s]
```

**Validace:**
- `SUM(share_simulated) MUST == 100.00` (s tolerancí 0.01).
- Pokud služba nemá historická data → `cost_per_token[s]` nelze spočítat → uživatel musí ručně zadat odhad (input pole „odhad CZK / 1k tokenů“).

## 4.7 Pokrytí trackingem (data readiness skóre)

```
total_functions      = COUNT(Function WHERE is_active)
tracked_functions    = COUNT(Function WHERE is_active AND data_source != 'missing')
tracking_coverage    = tracked_functions / total_functions
```

Zobrazeno v Top baru a Settings → Data sources. Pod 100 % → globální badge „Tracking incomplete“.

## 4.8 Trendy a delta vůči předchozímu období

Pro KPI „Δ vs. předchozí období“:

```
prev_from = from - (to - from + 1 day)
prev_to   = from - 1 day
delta_pct = (current - previous) / previous * 100
```

Pokud `previous = 0` → zobraz „—“ místo dělení nulou.

# 2. Návrh jednotlivých view

Pro každé view: **účel · KPI · filtry · grafy · tabulky · CTA**.

---

## 2.1 Dashboard (`/dashboard`)

**Účel:** Vstupní obrazovka. Na 5 vteřin pochopit, jak na tom jsme s cost ratio a kde hoří.

**KPI (horní lišta, 4 karty):**
- **Cost ratio MTD** (cíl 20 %, barevná indikace: <20 % zelená, 20–25 % oranžová, >25 % červená)
- **Náklady MTD** v CZK (a v USD pod tím)
- **Token usage MTD** (suma)
- **Top služba podle nákladů** (název + % podíl)

**Grafy:**
- Trend cost ratio za posledních 30 dnů (line chart, čárkovaná linka cíle 20 %).
- Stacked bar: denní náklady CZK rozpadlé po službách (chat / video / grafika / audio / deep research).

**Tabulka:**
- Top 10 funkcí podle nákladů za zvolené období (sloupce: služba, funkce, model, náklady CZK, % z celku, trend ↑↓).

**CTA:**
- „Otevřít Cost Analytics“, „Spustit simulaci“, „Editovat pricing“.
- Badge „Tracking incomplete“ pokud > 0 funkcí má `data_source = missing`.

---

## 2.2 Pricing – list (`/pricing`)

**Účel:** Centrální správa cen všech modelů a funkcí. Optimalizováno pro rychlou orientaci a editaci.

**KPI (lišta nad tabulkou):**
- Počet aktivních pricing záznamů
- Počet inactive
- Počet záznamů upravených za posledních 7 dnů
- Aktuální FX kurz CZK/USD (klikací → Settings)

**Filtry (horní řádek):**
- Služba (chat / video / grafika / audio / deep research / …)
- Provider (OpenAI / Anthropic / Google / ElevenLabs / Stability / vlastní / …)
- Model (závislé na provideru)
- Typ účtování (per token input/output / per image / per second / per request / per minute)
- Status (active / inactive / all)
- Fulltext (název funkce)

**Tabulka – sloupce:**
| Sloupec | Pozn. |
|---|---|
| Služba | badge s barvou |
| Funkce | název interní funkce |
| Provider | |
| Model | |
| Typ účtování | enum |
| Vstupní cena USD | inline editable |
| Výstupní cena USD | inline editable, prázdné pokud N/A |
| Jednotková cena USD | pro služby bez I/O (image, audio sec) |
| Cena CZK (přepočet) | read-only, počítá se z USD × FX |
| Markup koeficient | např. 1.5× (interní logika) |
| Interní prodejní cena | USD × markup (read-only) |
| Status | toggle active/inactive |
| Poslední úprava | datum + autor |
| Akce | edit, duplicate, archivovat |

**Chování:**
- **Inline editace** pro ceny a markup (tab/enter potvrzuje, zápis přes optimistic update).
- **Bulk akce**: změna statusu, hromadný přepočet markupu.
- **Sort** na všech sloupcích, **sticky header**.
- Řádek se žlutým proužkem pokud cena nebyla upravena > 60 dnů (signál „check supplier prices“).

**CTA:**
- „+ Nová cena“ (modal nebo `/pricing/new`)
- „Export CSV“
- „Import CSV“ (později – v MVP jen stub)

---

## 2.3 Pricing – detail / edit (`/pricing/:id`)

**Účel:** Plný formulář pro vytvoření / editaci jedné pricing položky.

**Sekce formuláře:**
1. **Identifikace**
   - Služba (select)
   - Funkce (select s možností „+ vytvořit novou funkci“)
   - Provider (select)
   - Model (text + autocomplete známých modelů)
2. **Účtování**
   - Typ účtování (radio: per token I/O / per token unit / per image / per second / per minute / per request)
   - Jednotka (auto podle typu, např. „1M tokens“, „1 image 1024×1024“, „1 second“)
3. **Ceny**
   - Vstupní cena USD (jen pokud per token I/O)
   - Výstupní cena USD (jen pokud per token I/O)
   - Jednotková cena USD (jinak)
   - Náhled CZK (live přepočet podle FX z Settings)
4. **Interní logika**
   - Markup koeficient (default 1.0)
   - Poznámka k logice (textarea)
5. **Stav**
   - Active / Inactive toggle
   - Platnost od – do (nepovinné, pro budoucí historii)
6. **Audit log** (read-only seznam: kdo, kdy, co změnil)

**CTA:** Uložit, Uložit a duplikovat, Zrušit, Archivovat.

---

## 2.4 Cost Analytics – Usage (`/cost-analytics/usage`)

**Účel:** Sledovat objem usage (tokeny / volání / sekundy) napříč službami, funkcemi a modely.

**KPI (4 karty):**
- Total usage za období (tokeny + ostatní jednotky odděleně)
- Usage MoM Δ (%)
- Top služba podle usage
- Funkcí bez trackingu (počet, červené pokud > 0)

**Filtry:**
- **Časová perioda**: Day / Week / Month / Custom range (date picker)
- Granularita osy X: hodina / den / týden / měsíc (auto podle periody)
- Služba (multi-select)
- Funkce (multi-select)
- Model (multi-select)
- Provider (multi-select)
- Zdroj dat (manual / grafana / api / missing)

**Grafy:**
- **Stacked area**: usage v čase, stack po službách. Toggle: stack po funkci / modelu.
- **Bar chart**: top 10 modelů podle usage za období.
- **Heatmapa**: služba × den (intenzita = usage), pro odhalení špiček.

**Tabulka (breakdown):**
| Služba | Funkce | Model | Provider | Vstup tokeny | Výstup tokeny | Jiné jednotky | Zdroj dat |
|---|---|---|---|---|---|---|---|
| … | … | … | … | … | … | … | badge |

- Řádky bez dat → kurzíva + badge „missing tracking“.

**CTA:** Export CSV, „Přepnout na cost view“.

---

## 2.5 Cost Analytics – Cost (`/cost-analytics/cost`)

**Účel:** Reálné peněžní náklady (USD i CZK) za období.

**KPI (4 karty):**
- Náklady USD za období
- Náklady CZK za období
- **Cost ratio** = náklady CZK / obrat CZK za období (s indikací proti cíli 20 %)
- Δ vs. předchozí stejně dlouhé období (%)

**Filtry:** stejné jako Usage view.

**Grafy:**
- **Line chart**: náklady CZK v čase, druhá osa cost ratio (%) s čarou cíle 20 %.
- **Stacked bar**: denní/týdenní náklady rozpadlé po službách.
- **Donut**: podíl služeb na celkových nákladech za období.

**Tabulka (breakdown):**
| Služba | Funkce | Model | Usage | Náklady USD | Náklady CZK | % z celku | Trend |
|---|---|---|---|---|---|---|---|
| … | … | … | … | … | … | … | spark line |

**CTA:** Export CSV, „Spustit simulaci s těmito daty“ (předvyplní Simulation view aktuálním rozdělením).

---

## 2.6 Simulation (`/simulation`)

**Účel:** What-if analýza interního rozdělení nákladů na tokeny mezi službami. **Nejde o veřejné ceny.**

**Layout: dvě kolonky vedle sebe – „Současný stav“ vs. „Simulovaný stav“.**

**Vstupy (levá kolonka, editovatelné):**
- Tabulka služeb se sloupci:
  - Služba
  - **Aktuální % podílu na nákladech na tokeny** (read-only, dopočítáno z reálných dat)
  - **Simulované %** (input, editovatelné, suma se kontroluje na 100 %)
  - Δ (rozdíl)
- Globální vstupy:
  - Předpokládaný celkový objem tokenů (default = MTD nebo poslední měsíc)
  - Předpokládaný obrat CZK (default z Settings → Revenue)
  - FX kurz (default z Settings)

**Výstupy (pravá kolonka, read-only):**
- KPI:
  - **Cost ratio – aktuální** vs. **simulované** (s Δ pp.)
  - Celkové náklady CZK – aktuální vs. simulované
  - Náklady na službu CZK – aktuální vs. simulované
- Graf:
  - **Side-by-side bar** nákladů po službách (aktuální vs. simulované).
  - **Gauge / progress** cost ratio vs. cíl 20 %.
- Tabulka „dopad na službu“:
  | Služba | Náklady aktuální CZK | Náklady simulované CZK | Δ CZK | Δ % |

**CTA:**
- „Uložit jako scénář“ (název + popis)
- „Reset na aktuální stav“
- „Načíst scénář“ (dropdown s uloženými)
- „Porovnat 2 scénáře“ (v MVP volitelné)

---

## 2.7 Simulation – Scenarios (`/simulation/scenarios`)

Jednoduchá tabulka uložených scénářů.

| Název | Autor | Vytvořeno | Cost ratio simulované | Δ vs. aktuální | Akce |
|---|---|---|---|---|---|
| „Video 35 %“ | M. Š. | 14. 5. 2026 | 18,2 % | −2,3 pp | Otevřít / Smazat |

---

## 2.8 Settings

Submoduly:

- **/settings/fx** – aktuální FX CZK/USD (manuální input + volitelný auto-fetch z ČNB API ve v2). Historie kurzů.
- **/settings/data-sources** – seznam funkcí a jejich zdroj dat (manual / grafana / api / missing). Stav trackingu agregovaný (% pokrytí). Pro Grafanu: URL + API key + dashboard/panel mapping (v2).
- **/settings/revenue** – tabulka obratu CZK po měsících (manuální zadání). Slouží jako jmenovatel v cost ratio.
- **/settings/users** – interní uživatelé, role (Admin / Viewer).

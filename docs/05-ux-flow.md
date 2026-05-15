# 5. UX flow pro interního admin uživatele

Tři hlavní user journeys – každá optimalizovaná pro jeden konkrétní úkol.

## 5.1 Flow A – „Aktualizovat cenu modelu po změně dodavatele“

Cíl: během < 1 minuty změnit cenu a vidět dopad.

1. Login (SSO) → landing **Dashboard**.
2. Klik na **Pricing** v sidebaru.
3. Filtr: Provider = `OpenAI`, Model = `gpt-4o` → tabulka se zúží na relevantní řádky.
4. **Inline edit** sloupce „Vstupní cena USD“ → tab → „Výstupní cena USD“ → enter.
5. Toast „Uloženo · cena CZK přepočtena · zapsáno do audit logu“.
6. Sloupec „Poslední úprava“ se aktualizuje.
7. Volitelně: klik „Spustit simulaci“ → přejde na Simulation s novou cenou v baseline.

## 5.2 Flow B – „Týdenní review nákladů“

Cíl: zjistit, jestli držíme cíl 20 % a kde rostou náklady.

1. Dashboard → vidím KPI **Cost ratio MTD** + trend graf.
2. Pokud `> 20 %` → klik na KPI → přejdu na **Cost Analytics → Cost** (`/cost-analytics/cost`).
3. Globální perioda se nastaví na MTD (z top baru).
4. V donut grafu vidím dominantní službu → klik → filtr „Služba = X“ se aplikuje.
5. V tabulce řadím podle „Trend“ → najdu funkci s největším růstem.
6. Klik na řádek → modal s detailem usage v čase + odkaz na Pricing daného modelu.
7. Pokud je problém v ceně → otevřu Pricing a upravím markup nebo vyberu jiný model.
8. Pokud je problém v interním rozdělení → klik **„Spustit simulaci s těmito daty“** → Simulation view.

## 5.3 Flow C – „Simulace dopadu změny rozdělení“

Cíl: ověřit before/after dopad na cost ratio.

1. Sidebar → **Simulation**.
2. Levá kolonka: vidím aktuální % rozdělení per služba (z reálných dat).
3. Editace: změním `video` z 40 % na 35 %, `chat` z 30 % na 35 %.
4. Vpravo se **live** přepočítává:
   - simulované cost ratio
   - delta CZK celkem
   - per-service delta
5. Pokud výsledek vyhovuje → **„Uložit jako scénář“** → modal (název, popis).
6. Scénář je dohledatelný v `/simulation/scenarios`.
7. Volitelně: porovnám 2 scénáře side-by-side (v2).

## 5.4 Globální UX pravidla

- **Top bar** vždy zobrazuje: zvolenou periodu, FX kurz, badge `tracking incomplete` (pokud relevantní), avatar uživatele.
- **Empty states**: pokud chybí data, vždy vysvětlit *proč* a co s tím (např. „Funkce nemá tracking. Připojte v Settings → Data Sources.").
- **Loading**: skeletony, ne spinnery.
- **Destruktivní akce** (smazat scénář, archivovat pricing): confirm modal s napsáním názvu entity.
- **Klávesové zkratky** v Pricing tabulce: `e` = edit aktivního řádku, `n` = nový záznam, `/` = focus filtru.
- **Copy/format CZK**: `1 234,56 Kč`. **USD**: `$1,234.56`. **%**: `20,0 %`.
- Všechny tabulky mají Export CSV.
- Všude jasná značka u dat ze zdroje `missing` nebo `manual` (ikonka + tooltip).

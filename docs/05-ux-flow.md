# 5. UX flow

## 5.1 Týdenní review nákladů

1. Otevřít **Přehled** → KPI cost ratio + trend
2. Pokud ratio > 20 % → klik přejde na **Analýza nákladů**
3. Donut ukazuje dominantní službu, tooltip s % + USD/CZK
4. V tabulce vidím per-service breakdown
5. Pokud problém v ceně → **Ceník** → editace
6. Pokud problém v rozložení → **Simulace**

## 5.2 Simulace dopadu změny

1. **Simulace** → levá strana: editace „Simulované %" per služba
2. Pravá strana live přepočítává cost ratio + delty
3. Uložit jako scénář → dohledatelný v `/simulation/scenarios`

## 5.3 Aktualizace ceny modelu

1. **Ceník** → seznam pricing záznamů
2. Klik na řádek → detail formulář
3. Editace cen USD → automatický přepočet CZK
4. Uložení

## 5.4 Správa FX kurzu

1. **Nastavení → FX** → tabulka historie kurzů
2. Přidání nového kurzu (datum + hodnota)
3. Kurz se automaticky používá pro přepočet od daného data

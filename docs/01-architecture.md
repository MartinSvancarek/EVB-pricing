# 1. Informační architektura

## 1.1 Hlavní sekce aplikace

| # | Sekce | Účel |
|---|---|---|
| 1 | **Dashboard** | Rychlý přehled klíčových KPI (cost ratio, MTD náklady, top služby) – vstupní stránka. |
| 2 | **Pricing** | Správa cen modelů a funkcí (CRUD, filtry, hromadná editace). |
| 3 | **Cost Analytics** | Sledování usage objemu a reálných nákladů v čase, breakdowny. |
| 4 | **Simulation** | Interní cost rozdělení, scénáře, what-if analýza. |
| 5 | **Settings** | FX kurz CZK/USD, periody účtování, zdroje dat, uživatelé, scénáře. |

> MVP = sekce 2, 3, 4. Dashboard a Settings v jednoduché formě (Dashboard = KPI lišta + odkazy, Settings = formulář pro FX a uživatele).

## 1.2 Sitemap

```
/
├── /dashboard                  (úvod, KPI přehled)
├── /pricing
│   ├── /                       (tabulka všech cen modelů × funkcí)
│   ├── /new                    (vytvoření nové ceny)
│   └── /:id                    (detail + edit)
├── /cost-analytics
│   ├── /usage                  (A) Token / usage volume pohled
│   └── /cost                   (B) USD / CZK pohled
├── /simulation
│   ├── /                       (live simulátor – aktuální vs. simulovaný stav)
│   └── /scenarios              (uložené scénáře)
└── /settings
    ├── /fx                     (FX kurz CZK/USD, historie)
    ├── /data-sources           (Grafana napojení, manuální zdroje, status trackingu)
    ├── /revenue                (zadání obratu pro výpočet cost ratio)
    └── /users                  (interní uživatelé, role)
```

## 1.3 Navigace

- **Levý sidebar** s ikonami a popisky pro 5 hlavních sekcí.
- **Top bar**: výběr globální periody (Day / Week / Month / Custom), badge „tracking incomplete“ když některá metrika nemá kompletní data, FX kurz (klikem otevře Settings → FX).
- **Breadcrumbs** v detailních view.
- **Globální vyhledávání** (jen pricing entity – model, funkce, služba).

## 1.4 Role a oprávnění (MVP)

| Role | Pricing | Cost Analytics | Simulation | Settings |
|---|---|---|---|---|
| Admin | CRUD | read | CRUD scénářů | CRUD |
| Editor | CRUD | read | CRUD scénářů | read |
| Viewer | read | read | read | – |

V MVP stačí 2 role: **Admin** a **Viewer**. Granularitu přidat ve v2.

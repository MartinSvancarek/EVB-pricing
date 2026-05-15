# 3. Datový model

## 3.1 Entity – přehled

```
Service (1) ──< Function (1) ──< ModelPricing
                                       │
                                       └──< UsageRecord >── (agregace v čase)

FxRate (časová řada)
Revenue (měsíční obrat CZK)
SimulationScenario ──< ScenarioAllocation (per Service)
User
AuditLog (polymorfní k libovolné entitě)
```

## 3.2 Entity – pole

### Service
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| code | string | unikátní, např. `chat`, `video`, `graphics`, `audio`, `deep_research` |
| name | string | display |
| color | string | barva pro UI badge |
| is_active | bool | |
| created_at / updated_at | timestamp | |

### Function
Funkce uvnitř služby (např. služba `chat` má funkce `assistant_reply`, `summarization`, `tool_call`).
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| service_id | uuid | FK → Service |
| code | string | unikátní v rámci služby |
| name | string | |
| description | text | |
| data_source | enum | `manual` / `grafana` / `api` / `missing` |
| is_active | bool | |
| created_at / updated_at | timestamp | |

### ModelPricing
Konkrétní cena daného modelu pro danou funkci. Funkce může mít víc aktivních pricing variant (různí provideři).
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| function_id | uuid | FK → Function |
| provider | string | OpenAI, Anthropic, Google, ElevenLabs, … |
| model | string | např. `gpt-4o`, `claude-sonnet-4`, `veo-3` |
| billing_type | enum | `token_io` / `token_unit` / `image` / `audio_second` / `video_second` / `request` / `minute` |
| input_price_usd | decimal(12,6) | per 1M tokens (pokud `token_io`) |
| output_price_usd | decimal(12,6) | per 1M tokens (pokud `token_io`) |
| unit_price_usd | decimal(12,6) | per 1 jednotka (pokud není `token_io`) |
| unit_label | string | „1M tokens“, „1 image 1024×1024“, „1 second“ |
| markup_coefficient | decimal(6,3) | default 1.000 |
| internal_note | text | |
| status | enum | `active` / `inactive` |
| valid_from | date | nepovinné |
| valid_to | date | nepovinné |
| created_at / updated_at | timestamp | |
| updated_by | uuid | FK → User |

> **Vazba k UsageRecord přes `function_id` + `model`** (ne přes pricing_id), aby se dala dohledat historická cena podle data usage – viz `priceForUsage()` v calculations.

### UsageRecord
Agregát usage za časové okno (den) – minimální granularita pro MVP.
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| function_id | uuid | FK → Function |
| provider | string | duplikováno pro rychlé filtry |
| model | string | duplikováno |
| period_start | date | den |
| input_tokens | bigint | nullable |
| output_tokens | bigint | nullable |
| units | bigint | nullable (pro non-token billing) |
| source | enum | `manual` / `grafana` / `api` |
| ingested_at | timestamp | |

> Index: `(function_id, period_start)`, `(model, period_start)`, `(period_start)`.

### FxRate
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| date | date | unikátní |
| czk_per_usd | decimal(10,4) | |
| source | enum | `manual` / `cnb` |

### Revenue
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| period_start | date | první den měsíce |
| period_end | date | poslední den měsíce |
| amount_czk | decimal(14,2) | |
| note | text | |

### SimulationScenario
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| name | string | |
| description | text | |
| total_tokens_assumption | bigint | |
| revenue_czk_assumption | decimal(14,2) | |
| fx_rate | decimal(10,4) | snapshot |
| created_by | uuid | FK → User |
| created_at | timestamp | |

### ScenarioAllocation
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| scenario_id | uuid | FK → SimulationScenario |
| service_id | uuid | FK → Service |
| share_percent | decimal(5,2) | suma per scénář = 100.00 |

### User
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| email | string | unikátní |
| name | string | |
| role | enum | `admin` / `viewer` |
| is_active | bool | |

### AuditLog
| Pole | Typ | Pozn. |
|---|---|---|
| id | uuid | PK |
| entity_type | string | např. `ModelPricing` |
| entity_id | uuid | |
| user_id | uuid | FK → User |
| action | enum | `create` / `update` / `delete` / `archive` |
| diff | jsonb | předchozí vs. nová hodnota |
| created_at | timestamp | |

## 3.3 Vazby (shrnutí)

- `Service 1 — N Function`
- `Function 1 — N ModelPricing`
- `Function 1 — N UsageRecord`
- `SimulationScenario 1 — N ScenarioAllocation — 1 Service`
- `User 1 — N AuditLog`, `User 1 — N ModelPricing` (jako `updated_by`)

## 3.4 Poznámky k MVP

- **Žádná hodinová granularita** v MVP – jen denní agregát v `UsageRecord`. Hodinová ve v2.
- **Historie cen** se v MVP řeší přes `valid_from`/`valid_to` a `AuditLog` (není potřeba samostatná `ModelPricingHistory` tabulka).
- **Funkce bez trackingu** = `Function.data_source = missing`. UI to viditelně označí.

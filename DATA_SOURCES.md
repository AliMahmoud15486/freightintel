# Freightintel ("Margin Sentinel") — Data Sources

> Inventory of every data source feeding the app and its scoring, classified by how "real" each one is.
> Repo: `AliMahmoud15486/freightintel` · Last pushed 2026-03-21

---

## 1. Live external data (real APIs, no key required)

### Yahoo Finance v8 API

- Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- The **only genuine live numeric feed.** 14 tickers used as proxies:

| Category        | Symbols                                                    | Used for                                     |
| --------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Energy          | `BZ=F` Brent, `CL=F` WTI, `NG=F` Nat Gas, `XLE` Energy ETF | Oil-price → margin impact, freight surcharge |
| Freight         | `BDRY` Dry Bulk ETF, `ZIM`, `MAERSK-B.CO`, `CHRW`          | Freight-rate proxy / shipping health         |
| Metals          | `GC=F` Gold                                                | Pulse ticker                                 |
| Fertilizer / Ag | `UAN`, `MOS`, `NTR`, `ZC=F` Corn, `ZW=F` Wheat             | Hormuz crisis → e-grocery margin             |

### RSS news feeds (7 sources, fetched server-side)

- Supply Chain Dive
- FT Commodities
- Splash247
- FreightWaves
- Hellenic Shipping News
- The Loadstar
- Journal of Commerce

---

## 2. LLM-derived signals (Gemini 2.5 Flash interprets the RSS feeds)

The news feeds are raw text. Gemini turns them into structured scoring inputs:

- **Severity** — critical / warning / info
- **Tags**
- **Affected categories**
- **Geo-coordinates** of disruptions (for the map)

> ⚠️ These "live disruption" signals are **LLM interpretations of news headlines** — not a structured disruption API, and not independently verified.

---

## 3. Static / seeded data (hardcoded in the repo)

> This is where most of the "intelligence" actually lives. Source: `seed-lanes.mjs` + router constants.

- **20 freight lanes** — ports, regions, `baseTransitDays`, `costIndex`, and `zones` (red_sea, suez, strait_of_hormuz, pacific, atlantic, malacca). All typed by hand.
- **Carrier reliability scores** — Maersk 82, Hapag-Lloyd 85, MSC 78, COSCO 74, Evergreen 75, CMA CGM 80, etc. **Invented constants** — not sourced from carrier performance data.
- **Base category margins** — Electronics 28.5%, Apparel 42%, E-Grocery 12%, etc. (baseline at $70/bbl oil).
- **Seasonal risk bonuses** — Red Sea +15, Pacific typhoon +8 (hand-coded in `seasonalRiskBonus()`).
- **Carrier disruption status** (`getShippingLinesCache`) — affected / severity / reason per carrier.

---

## 4. User-supplied data (DB tables)

- `merchant_profiles` — margin targets, carrier preferences
- `margin_history` — merchant-entered margin snapshots

---

## Scoring lineage (carrier risk score)

`riskScore = 40% severity + 30% news + 20% zone overlap + 10% reliability`

| Weight | Component           | Source                            | Reliability            |
| ------ | ------------------- | --------------------------------- | ---------------------- |
| 40%    | Disruption severity | Gemini classification of RSS news | LLM-judged, unverified |
| 30%    | News mentions       | Gemini classification of RSS news | LLM-judged, unverified |
| 20%    | Zone overlap        | Hardcoded lane zones              | Seeded                 |
| 10%    | Carrier reliability | Invented constants                | Seeded                 |

---

## Bottom line

- **1 real numeric API** (Yahoo Finance) — oil/freight/fertilizer prices are genuinely live and accurate.
- **7 news feeds** interpreted by an LLM into disruption signals (live-ish, but unverified).
- **Everything structural** (lanes, carrier reliability, base margins, seasonal weights) is **hand-seeded demo data**.

The prices make it feel live; the freight intelligence is **seeded, not sourced**.

### To make it production-grade, swap seeded parts for real sources:

- Carrier reliability → real schedule-reliability data (e.g. Sea-Intelligence)
- Freight rates → real indices (Drewry WCI, Freightos FBX, Shanghai SCFI)
- Disruption signals → a structured maritime/disruption feed instead of LLM-on-RSS

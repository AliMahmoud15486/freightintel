# Freightintel — Margin Sentinel

> **Real-time freight-disruption & margin-intelligence dashboard for import/export merchants.**
> Tracks how global shipping disruptions (Red Sea, Suez, Strait of Hormuz, Pacific) ripple into freight costs and erode product margins — then recommends safer carriers and lanes.

The product is branded **Margin Sentinel**; the repo is `freightintel`.

---

## What it does

- **Live market pulse** — Brent/WTI crude, natural gas, dry-bulk freight, fertilizer & grain prices (Yahoo Finance).
- **Disruption news intelligence** — aggregates 7 supply-chain RSS feeds and uses an LLM to classify severity, tag topics, and geolocate disruptions onto a map.
- **Carrier Recommendation Engine** — scores & ranks carriers per lane on a weighted risk model, with an LLM-generated plain-English rationale.
- **Predictive Risk** — 30/60-day disruption-probability forecasts per lane, combining live signals with seasonal heuristics and LLM reasoning.
- **Margin Analysis** — per-category and per-SKU margin erosion driven by live oil prices and disruption counts.
- **Crisis Scenarios** — interactive Hormuz-crisis impact matrix (elements × sectors).
- **Merchant Profile** — margin targets, carrier/lane preferences, notification settings, and historical margin snapshots.
- **Email alerts** — disruption alerts to subscribers via Resend.

> ℹ️ For a precise breakdown of what data is live vs. LLM-derived vs. hand-seeded, see **[DATA_SOURCES.md](DATA_SOURCES.md)**.

---

## Tech stack

| Layer      | Tech                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| Frontend   | React 18 + Vite, Wouter (routing), Tailwind CSS, Radix UI, Recharts, framer-motion  |
| API        | tRPC over Express                                                                   |
| Data layer | Drizzle ORM on MySQL                                                                |
| LLM        | Gemini 2.5 Flash via Manus Forge gateway (OpenAI-compatible `/v1/chat/completions`) |
| Email      | Resend                                                                              |
| Storage    | AWS S3                                                                              |
| Tooling    | TypeScript, Vitest, Prettier, pnpm                                                  |

**Architecture:** an _LLM-augmented rule engine_ — deterministic scoring formulas make the decisions; the LLM only classifies messy news text and writes human-readable rationale. If the LLM call fails, the system falls back to deterministic signals.

---

## Pages / routes

| Route        | Page             | Purpose                                                      |
| ------------ | ---------------- | ------------------------------------------------------------ |
| `/`          | Home / Dashboard | Pulse ticker, disruption map, crisis banner, carrier engine  |
| `/margins`   | Margins          | Category & SKU margin analysis, waterfall, crisis indicators |
| `/scenarios` | Crisis Scenarios | Interactive Hormuz crisis impact matrix                      |
| `/profile`   | Merchant Profile | Margin targets, carrier prefs, notifications, history        |
| `*`          | NotFound         | 404 fallback                                                 |

---

## Project structure

```
client/          React + Vite frontend
  src/pages/     Dashboard, Margins, CrisisScenarios, MerchantProfile, ...
  src/hooks/     useMarketData, useAuth, ...
server/
  _core/         llm.ts, env.ts, emailAlerts.ts, alertTrigger.ts, oauth.ts, ...
  routers/       news, predictiveRisk, carrierRecommendation, marginAnalysis,
                 marginCalculator, crisisScenarios, marketData, merchantProfile
drizzle/         schema.ts, relations.ts (MySQL tables)
shared/          shared types & constants
seed-lanes.mjs   Seeds freight_lanes + lane_carriers
```

**Database tables:** `users`, `subscribers`, `sent_alerts`, `freight_lanes`, `lane_carriers`, `risk_forecasts`, `merchant_profiles`, `margin_history`.

---

## Getting started

### Prerequisites

- Node.js (built/tested on Node 20+; repo pins `@types/node` 24)
- pnpm `10.4.1`
- A MySQL database

### Install

```bash
pnpm install
```

### Environment variables

Create a `.env` file:

```bash
# App / auth
VITE_APP_ID=
JWT_SECRET=                 # cookie/session secret
OAUTH_SERVER_URL=
OWNER_OPEN_ID=

# Database
DATABASE_URL=               # MySQL connection string

# LLM (Manus Forge gateway, OpenAI-compatible)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# Email (Resend)
RESEND_API_KEY=
ALERT_FROM_EMAIL=onboarding@resend.dev
```

### Database setup

```bash
pnpm db:push          # generate + run Drizzle migrations
node seed-lanes.mjs   # seed freight lanes & carriers
```

### Run

```bash
pnpm dev              # dev server (tsx watch)
pnpm build            # production build (Vite + esbuild)
pnpm start            # run production build
```

---

## Scripts

| Script         | Command                                       |
| -------------- | --------------------------------------------- |
| `pnpm dev`     | Start dev server with hot reload              |
| `pnpm build`   | Build client (Vite) + bundle server (esbuild) |
| `pnpm start`   | Run the production build                      |
| `pnpm check`   | TypeScript type-check (`tsc --noEmit`)        |
| `pnpm format`  | Format with Prettier                          |
| `pnpm test`    | Run the Vitest suite                          |
| `pnpm db:push` | Generate & run Drizzle migrations             |

---

## Testing

```bash
pnpm test
```

Vitest covers the tRPC routers (carrier recommendation, crisis scenarios, margin analysis/calculator, market data, merchant profile, predictive risk) plus auth and email-alert logic. CI runs via GitHub Actions (`.github/workflows/test.yml`).

> ⚠️ The LLM layer has **no evals and no tracing** — tests assert router behavior and output _shape_, not the accuracy of LLM classifications.

---

## Status & roadmap

Active prototype (Manus-assisted build). See [`todo.md`](todo.md) for the working backlog and [`ideas.md`](ideas.md) for the design direction (chosen theme: "Dark Intelligence" — cyber-industrial, orange-on-navy).

Production hardening would focus on:

- Replacing hand-seeded carrier reliability with real schedule-reliability data
- Real freight-rate indices (Drewry WCI, Freightos FBX, Shanghai SCFI)
- A structured disruption feed instead of LLM-on-RSS
- LLM evals + tracing/observability

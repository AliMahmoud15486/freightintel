# Margin Sentinel — Project TODO

## Core Dashboard Features
- [x] Global Pulse Bar with animated ticker
- [x] Navigation Sidebar with routing (Dashboard, Maps, Oil Data, Margins, Alerts, Reports)
- [x] Top Header with notifications and user profile
- [x] Supply Chain Disruption Map with hotspot overlays (Suez Canal, Ningbo Port Strike, LA Congestion)
- [x] Cost Inflation Drivers panel (line chart + stacked bar chart)
- [x] Impact-First News Feed with severity tags (Critical/Warning)
- [x] Retailer Action Panel (watchlist + alerts)
- [x] Landing Cost Calculator
- [x] Alerts System with badge notifications

## Live Data API Integration
- [x] Yahoo Finance API integration (BZ=F Brent Crude, CL=F WTI Crude)
- [x] Live pulse bar with real Brent/WTI prices (refreshes every 60s)
- [x] Live 6-month oil history chart (WTI + Brent weekly data)
- [x] Accurate daily change calculation (prev day close, not week-start)
- [x] Graceful fallback to simulated data when API unavailable
- [x] LIVE badge indicator on charts when real data is active
- [x] FBX Container Index static proxy (BDI returns 0 on Yahoo Finance)

## Margins Analysis Page
- [x] Margins page route (/margins)
- [x] KPI cards (avg margin, oil impact, critical SKUs, margin at risk, best performer)
- [x] Margin waterfall chart (base → current with cost erosion breakdown)
- [x] Margin trend line chart (6-month, derived from live oil prices)
- [x] Category comparison horizontal bar chart
- [x] SKU-level margin tracker table with sort/filter
- [x] Risk badges (Critical/Warning/Safe)
- [x] Live oil price display in page header

## Navigation
- [x] Dashboard link (/) — implemented
- [x] Margins link (/margins) — implemented
- [ ] Maps page (/maps) — coming soon
- [ ] Oil Data page (/oil) — coming soon
- [ ] Alerts page (/alerts) — coming soon
- [ ] Reports page (/reports) — coming soon

## Testing
- [x] Vitest tests for marketData.pulseBar (live prices, daily change, fallback)
- [x] Vitest tests for marketData.oilHistory (data points, fallback)
- [x] Vitest tests for marketData.currentPrices
- [x] Auth logout test (existing)

## Change Requests
- [x] Remove Landing Cost Calculator from Retailer Action Panel
- [x] Remove user profile (Alexis Sedoser) from NavigationSidebar
- [x] Remove login/user profile from TopHeader
- [x] Make dashboard fully public (no auth required)
- [x] Remove My Watchlist from Retailer Action Panel

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
- [x] Build RSS aggregator backend (Supply Chain Dive, FT Commodities, Splash247)
- [x] LLM-powered severity classification and tag extraction for news items
- [x] Update ImpactNewsFeed component to consume live news from tRPC
- [x] 15-minute server-side cache to avoid over-fetching RSS feeds
- [x] Expand backend pulseBar endpoint with all ticker symbols (Brent, WTI, Nat Gas, Shipping ETF)
- [x] Fix daily change % to use accurate prev-close comparison for all symbols
- [x] Rewrite GlobalPulseBar to consume all live ticker data with real prices and changes
- [x] Wire Critical Margin Risks counter to live news critical count
- [x] Wire alert strip headlines to live critical news items
- [x] Update navigation sidebar alerts badge to reflect live critical count
- [x] Remove alert bell icon from top-right header
- [x] Remove Reports from navigation sidebar
- [x] Derive Active Disruptions count from live critical news items
- [x] Derive Avg Delay Impact from LLM-extracted ETA fields in news items
- [x] Derive Freight Cost Index from live shipping market data (BDRY, ZIM, Maersk)
- [x] Update Dashboard stats cards to consume live KPI tRPC procedure
- [x] Remove Categories at Risk KPI card from Dashboard stats row
- [x] Add live Categories at Risk list to RetailerActionPanel right sidebar
- [x] Make Categories at Risk items clickable to filter the Impact News Feed
- [x] Multi-category selection: allow selecting multiple categories to filter the news feed simultaneously
- [x] Extend news LLM classification to extract geographic locations from each article
- [x] Rewrite SupplyChainMap to render live disruption markers from news data
- [x] Add coordinate-based marker positioning on equirectangular map projection
- [x] Hide left navigation sidebar (keep code, just not rendered)
- [x] Make heatmap fully responsive — fill available width and use proportional height
- [x] Make heatmap wide, tall, and fully responsive across all screen sizes
- [x] Fix Supply Chain Disruption Map — restored as full-width panel with min-height 460px
- [x] Fix Shipping Routes overlay — render animated SVG polylines for major shipping lanes
- [x] Fix Port Status overlay — show major world ports with congestion/open/closed status
- [x] Fix Weather Status overlay — show weather disruption zones with impact indicators
- [x] Datajar rebrand: apply magenta-to-orange gradient to logo wordmark and key accents
- [x] Datajar rebrand: update CSS variables and global accent color to gradient palette
- [x] Datajar rebrand: update pulse bar, alert strip, KPI cards, and panel headers with new palette
- [x] Datajar rebrand: update buttons and interactive elements with pill-shaped gradient style
- [x] Responsive: Fix Dashboard main layout (flex row → column on mobile)
- [x] Responsive: Fix TopHeader for mobile (compact logo, hide breadcrumb)
- [x] Responsive: Fix GlobalPulseBar for mobile (scrollable ticker)
- [x] Responsive: Fix AlertStrip for mobile
- [x] Responsive: Fix SupplyChainMap for mobile (reduce map height, stack controls)
- [x] Responsive: Fix KPI cards for mobile (single column)
- [x] Responsive: Fix CostInflationDrivers charts for mobile (stack vertically)
- [x] Responsive: Fix ImpactNewsFeed for mobile (full width, readable cards)
- [x] Responsive: Fix RetailerActionPanel for mobile (full width below news feed)
- [x] Responsive: Add mobile navigation menu / hamburger for small screens
- [x] Responsive: On mobile, show RetailerActionPanel (Alerts + Categories) above ImpactNewsFeed\n
- [x] Block 1 (SupplyChainMap): Add marine and air shipping lines panel showing affected vs unaffected routes
- [x] Block 2 (RetailerActionPanel): Add international shipping companies panel showing affected vs unaffected carriers
- [x] Real-time shipping lines: Add news.shippingLines tRPC procedure with LLM carrier classification
- [x] Real-time shipping lines: Update ShippingLinesPanel to consume live tRPC data with 5-hour refresh
- [x] Shipping lines: Set server cache TTL to 5 hours and frontend refetchInterval to 5 hours
- [x] Shipping lines: ShippingLinesPanel consumes trpc.news.shippingLines directly with live timestamp
- [x] Layout: Move RetailerActionPanel (Shipping Companies + Alerts + Categories) below SupplyChainMap+ShippingLinesPanel

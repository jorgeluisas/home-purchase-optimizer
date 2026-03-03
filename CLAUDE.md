# Home Purchase Optimizer — Session Context

## What This App Is
A React app for home buyers in major US markets. Compares down payment strategies, models wealth impact, shows tax implications, includes affordability calculator with comfort targeting, sensitivity analysis, and risk visualization. Supports 4 locations: San Francisco (default), Florida, New York City, and Chicago. Built with Next.js + Recharts, inline styles + responsive CSS.

## Current Branch
`main`

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component — all UI rendering (~5,214 lines)
├── calculations.js             # All financial math & utilities (~752 lines)
├── layout.js                   # App layout (viewport meta, dark background, metadata)
└── page.js                     # Entry point (Suspense wrapper)
```

**Architecture decision:** Financial math is extracted to `calculations.js` for testability and reuse. UI rendering stays in a single file intentionally — the component shares 20+ state variables across 7 tabs, making prop-threading across files more error-prone than keeping it inline.

## All Features Implemented

### Core
- **Best Strategy tab**: Optimizer finds best down payment + leverage strategy, shows verdict (Strong Buy/Buy/Close Call/etc.), action plan, wealth impact, cash flow analysis
- **Side-by-Side tab**: Compare custom scenarios head-to-head
- **Build Your Strategy tab**: Manual strategy builder with cash-out refi, interest tracing, equity analysis, editable location-specific assumptions
- **Own vs Rent tab**: Year-by-year wealth comparison with interactive chart
- **Taxes tab**: Federal + state bracket breakdown, SALT deduction analysis (adapts to selected location)

### 3-Way App Mode (PR #10)
- **Explore mode** (`appMode === 'explore'`): "What Can I Buy?" → affordability matrix → optional optimization. Default mode.
- **Target mode** (`appMode === 'target'`): "I Have a Target" → enter home price → get best strategy. Shows Best Strategy + Sensitivity tabs.
- **Deep mode** (`appMode === 'deep'`): Full access to all 7 tabs, all inputs, all analysis tools.
- **Mode selector**: 3 radio-style buttons at top with descriptions. Replaces old `isExpertMode` toggle.
- **Tab visibility**: Explore shows only Afford + (Best Strategy if optimized); Target shows Best Strategy + Sensitivity; Deep shows all 7 tabs.
- **Input visibility**: Explore hides Home Price, Monthly Rent, Run Optimization button. Target shows all core inputs. Deep shows everything including Advanced Settings.

### Build Your Strategy Enhancements (PRs #11-12)
- **Cash-out refi slider**: 0–100% of home value, mutually exclusive with HELOC
- **Cash-out refi explainer**: How it works, LTV calculation, deductibility limit, warnings when non-deductible interest exceeds income
- **Interest tracing**: Labels margin/HELOC/cash-out interest as "traceable" in Financing Structure, shows per-source deduction breakdown in Interest Tracing Summary
- **"Interest Tracing Benefit"**: Renamed from "Investment Interest Benefit" in `renderNonRecovBreakdown` (affects all tabs)
- **"Cash After Close"**: Renamed from "Remaining" with formula breakdown (Savings − Down Payment − Closing + HELOC/Cash-Out)
- **Tax Analysis detail**: Federal + state mortgage deduction breakdown (itemized vs standard deduction, extra deductions, marginal rate, savings), interest tracing section (per-source), total summary with explicit "{state} mortgage: $X" labeling
- **Equity & Wealth Build**: Milestone table (years 1/5/10/15/20/30) showing equity, appreciation, total home equity, portfolio, total wealth + 30-year summary breakdown
- **Updated presets**: Conservative (30/0/0/0), Balanced (25/10/0/20 cash-out), Aggressive (20/20/50 HELOC/0)

### Multi-State Location Toggle
- **4 locations**: San Francisco (default), Florida, New York City, Chicago (IL)
- **Location dropdown** in "Your Finances" input section, first input before Target Home Price
- **LOCATIONS config** in `calculations.js` — each location has property costs, state tax functions, deduction rules, Prop 13 flag, payroll tax, mansion tax, and display info
- **State tax functions**: `calcCAStateTax`, `calcNYStateTax` + `calcNYCLocalTax`, `calcILStateTax` (flat 4.95%), Florida (no state tax)
- **All calc functions parametrized** with `loc` param defaulting to `LOCATIONS.sf`
- **Conditional rendering**: Prop 13 section (CA only), CA Mental Health Tax (CA only), mortgage deduction limit text, state-specific bracket tables on Tax tab
- **Location persisted in URL** as `loc` param

| | SF | Florida | NYC | Chicago |
|---|---|---|---|---|
| Property tax | 1.18% | 0.89% | 1.05% | 2.1% |
| Transfer tax | 0.68% | 0.70% | 1.4% | 1.2% |
| State income tax | CA brackets (1-12.3% + 1% MHT) | None | NY (4-10.9%) + NYC (3.08-3.88%) | IL flat 4.95% |
| Prop 13 | Yes | No | No | No |
| Mansion tax | No | No | Yes (1% > $1M) | No |
| Payroll tax | 1.1% SDI | 0% | 0% | 0% |

### Affordability ("What Can I Buy?" tab) — Scenario Matrix
- **2D scenario matrix**: 6×5 grid (down payment % rows × comfort % columns) showing max home price + monthly PITI per cell
- **Down payment rows**: 10%, 15%, 20%, 25%, 30%, 40%
- **Comfort columns**: 20% (Excellent), 25% (Great), 30% (Comfortable), 40% (Stretched), 50% (Heavy)
- **Cell interactions**: Click to select; orange border on selected, green highlight on sweet spot (20% dp × 25-30% comfort), grayed out for infeasible
- **Selected scenario detail card**: Top metrics (Max Price, Cash Needed, Savings After, Buffer), monthly breakdown with stacked bar, comfort gauge, context comparisons, and "Find Best Strategy" CTA
- **Simplified Explore-mode inputs**: Only Location, Gross Income, Savings, Filing Status, Mortgage Rate visible (Home Price and Monthly Rent hidden — set via matrix CTA)
- **Explore-mode user journey**: Enter 4 inputs → see matrix → click cell → see details → click "Find Best Strategy" → optimization results
- **Affordability on Summary tab**: Comfort card between verdict and recommendation on Best Strategy tab

### Tax Accuracy
- `calcFedTax` — exact federal bracket calculation (in `calculations.js`)
- `estEffectiveTaxRate` — exact fed + state + FICA (SS + Medicare + Additional Medicare) + location-aware payroll tax
- `estimatedTakeHome` — single source of truth, derived from `estEffectiveTaxRate`

### UX Improvements
- **Progressive disclosure**: Collapsible detail sections, "Show Full Analysis" toggle, downside risk inside collapsed section
- **URL state persistence**: All inputs serialized to URL params, shareable links, Copy Link button
- **Input grouping**: "Your Finances" visible, "Rates & Assumptions" collapsible, "Advanced Settings" collapsed
- **Clear CTAs**: Every tab has one clear next action
- **Input validation**: Red borders, inline error messages, form validity check
- **Input hints**: Inline help text below each core input explaining what it means
- **Cross-tab navigation**: Contextual links between Best Strategy, Own vs Rent, Sensitivity, and Tax tabs
- **3-way app mode**: Explore (guided affordability journey), Target (focused optimization), Deep (full analysis)

### Enhancements
- **Scenario presets**: Conservative/Balanced/Aggressive one-click configs (include cash-out refi)
- **Sensitivity Analysis tab**: Tornado chart (variable impact on break-even) + 3x3 break-even matrix (appreciation x returns) + interactive "What If?" appreciation slider
- **Chart annotations**: Break-even vertical line + 10/20/30-year milestones
- **Downside risk visualization**: 3 risk scenarios (portfolio crash, home stagnation, rate spike)
- **Editable assumptions**: 9 location-specific constants (prop tax, transfer tax, PMI rate, etc.) with reset — auto-syncs when location changes
- **Opportunity cost metric**: 5th verdict metric showing down payment opportunity cost
- **Shareable reports**: Copy Summary + Share Link buttons on Best Strategy and What Can I Buy? tabs
- **Responsive design**: Global `box-sizing: border-box` reset, 3 breakpoints (900px/600px/400px), 50+ CSS class targets, viewport meta tag, mobile numeric keyboards, horizontal-scrolling tabs, responsive grids/charts/typography, iOS Safari dark input styling
- **Visual polish**: Tab bar styling, active tab glow, card hover transitions

## Tabs (7 total)

| Tab | Label | Render Function | Visibility |
|-----|-------|-----------------|------------|
| `optimize` | Best Strategy | `renderOptimize()` | Target, Deep, Explore (after optimization) |
| `scenarios` | Side-by-Side | `renderScenarios()` | Deep only |
| `holding` | Own vs Rent | `renderHolding()` | Deep only |
| `sensitivity` | Sensitivity | `renderSensitivity()` | Target, Deep |
| `tax` | Taxes | `renderTax()` | Deep only |
| `manual` | Build Your Strategy | `renderManual()` | Deep only |
| `afford` | What Can I Buy? | `renderAffordability()` | Explore, Deep |

## Key Functions & Approximate Lines

### calculations.js (shared module)
| Function | Purpose |
|----------|---------|
| `LOCATIONS` | Config object with sf, fl, nyc, chi — each has property costs, tax functions, deduction rules, display info |
| `SF` | Backward-compat alias for `LOCATIONS.sf` |
| `calcFedTax` | Exact federal tax from brackets |
| `calcCAStateTax` / `getCARate` | CA state tax brackets (1-12.3% + 1% Mental Health Tax) |
| `calcNYStateTax` / `getNYStateRate` | NY state tax brackets (4-10.9%) |
| `calcNYCLocalTax` / `getNYCLocalRate` | NYC local tax brackets (3.08-3.88%) |
| `calcILStateTax` | IL flat 4.95% minus personal exemption |
| `getFedRate` | Federal marginal tax rate lookup |
| `calcMonthly` | Monthly mortgage payment |
| `genAmort` | Amortization schedule generator |
| `calcPMI` | PMI duration and cost estimator |
| `calcTxCosts(price, loan, loc)` | Location-specific transaction costs (transfer tax, mansion tax, closing, commissions) |
| `calcScenario({...params, loc})` | Core model — all costs, deductions, 30-year wealth trajectory, interest tracing |
| `runOptimization({...params, loc})` | Iterates strategy space, scores and ranks |
| `calcAffordabilityCell` | Internal helper — computes one dp% scenario |
| `calcAffordability({...params, loc})` | Closed-form max price given income/savings, accepts `targetTakeHomePct` |
| `calcAffordabilityMatrix({...params, loc})` | 2D grid of dp% × comfort% — returns `{ rows, cols, cells, monthlyTakeHome }` |
| `fmt$` / `fmtPct` / `fmtNum` | Formatting utilities |
| `URL_PARAM_MAP` / `REVERSE_URL_MAP` | URL serialization maps (includes `location: 'loc'`, `appMode: 'am'`, `manualCashOutPct: 'mco'`) |

### HomePurchaseOptimizer.jsx (main component)
| Function | Line | Purpose |
|----------|------|---------|
| `SCENARIO_PRESETS` | ~201 | Conservative/Balanced/Aggressive configs (incl. `manualCashOutPct`) |
| `PresetSelector` | ~259 | Preset selection component |
| `applyPreset` | ~412 | Apply preset settings (incl. cash-out refi) |
| `copyShareLink` | ~583 | Copy shareable URL to clipboard |
| `handleOptimize` | ~612 | Run optimization (accepts optional overrideHomePrice) |
| `manualScenario` | ~640 | Manual strategy calculation memo (cash-out + HELOC mutual exclusivity) |
| `estEffectiveTaxRate` | ~685 | Exact effective tax rate memo (location-aware) |
| `affordability` | ~697 | Affordability calculation memo |
| `affordabilityMatrix` | ~711 | 2D affordability matrix memo |
| `renderNonRecovBreakdown` | ~761 | True Cost breakdown with interest tracing + principal annotation |
| `estimatedTakeHome` | ~865 | Monthly take-home pay memo |
| `copyResultsSummary` | ~870 | Copy formatted strategy summary to clipboard |
| `copyAffordabilitySummary` | ~923 | Copy formatted affordability summary to clipboard |
| `renderWealthImpactSummary` | ~963 | Wealth metrics cards |
| `renderMonthlyCashFlow` | ~1067 | Monthly cash flow breakdown |
| `renderOptimize` | ~1299 | Best Strategy tab |
| `renderManual` | ~2007 | Build Your Strategy tab (cash-out refi, interest tracing, tax detail, equity) |
| `renderHolding` | ~2680 | Own vs Rent tab with Recharts |
| `renderScenarios` | ~3079 | Side-by-Side comparison tab |
| `renderTax` | ~3404 | Taxes tab (location-specific brackets and labels) |
| `renderSensitivity` | ~3804 | Sensitivity Analysis tab |
| `renderAffordability` | ~4351 | What Can I Buy? tab (2D scenario matrix) |

## Key State Variables

### Financial Inputs
`homePrice` (default $1M), `totalSavings` ($200K), `stockPortfolio` ($500K), `grossIncome` ($500K), `monthlyRent` ($5K), `rentGrowth`, `filingStatus`, `mortgageRate`, `marginRate`, `helocRate`, `cashOutRefiRate`, `investmentReturn`, `dividendYield`, `homeAppreciation`, `loanTerm`, `minBuffer` ($0)

### Location
`selectedLocation` (default 'sf') — derived `loc = LOCATIONS[selectedLocation]` used throughout

### Build Your Strategy
`manualDpPct`, `manualMarginPct`, `manualHelocPct`, `manualCashOutPct` (0–100, mutually exclusive with HELOC)

### Affordability
`affMonthlyHOA`, `affMonthlyOtherDebt`, `affSelectedDpPct`, `affTargetComfort` (default 0.30, range 0.20-0.50)

### UX / Mode
`appMode` ('explore' | 'target' | 'deep'), `activePreset`, `showOptimizeDetails`, `showSensitivity`, `showAssumptions`, `validationErrors`, `summaryCopied`, `affordCopied`, `linkCopied`, `whatIfAppreciation`

Derived: `isExploreMode = appMode === 'explore'`, `isTargetMode = appMode === 'target'`, `isDeepMode = appMode === 'deep'`

### Editable Assumptions
`customAssumptions` (object with propTaxRate, transferTax, parcelTax, realtorComm, closeBuy, closeSell, insuranceRate, maintenanceRate, pmiRate) — auto-syncs to location defaults when `selectedLocation` changes

## Architecture Notes
- **Two-file architecture**: `calculations.js` (pure math, no React) + `HomePurchaseOptimizer.jsx` (all UI). Intentionally kept as two files — see "Architecture decision" above.
- **Multi-state pattern**: `LOCATIONS` config object with tax functions as first-class references (`loc.calcStateTax`, `loc.getStateRate`). All calc functions accept `loc` param. UI code never needs to know which state — just calls `loc.calcStateTax(income, filingStatus)`.
- **Variable naming**: All CA-specific variable names renamed to state-generic: `caRate` → `stateRate`, `caDeductibleMortgageInterest` → `stateDeductibleMortgageInterest`, `shouldItemizeCA` → `shouldItemizeState`, etc.
- **Comfort tiers**: 5 tiers (20% Excellent, 25% Great, 30% Comfortable, 40% Stretched, 50% Heavy). Used as matrix columns in `renderAffordability` and inline in `renderOptimize` and copy callbacks.
- **`taxBreakdown` useMemo**: Has duplicate bracket data for display only. Actual computation uses `calcFedTax`/`calcCAStateTax`.
- **URL params**: Hydrated on mount, debounced sync on state changes. Location stored as `loc`, app mode stored as `am`, cash-out as `mco`.
- **Global CSS reset**: `*, *::before, *::after { box-sizing: border-box }` is critical — without it, elements with padding extend beyond their container on mobile. Also sets `max-width: 100vw` on html/body and `overflow-wrap: break-word` on container.
- **Responsive CSS**: `<style>` tag with global resets (iOS Safari dark inputs via `!important`, `color-scheme: dark`, `appearance: none`) + 3 breakpoints (900px tablet, 600px mobile, 400px extra-small) + 50+ `.hpo-*` CSS class targets for `!important` overrides on inline styles. Dark background (`#0c1220`) set on `<html>` and `<body>` in layout.js to prevent iOS white bleed-through during elastic scrolling.
- **CSS class naming**: All custom classes prefixed `.hpo-` — e.g., `.hpo-container`, `.hpo-grid`, `.hpo-panel`, `.hpo-card`, `.hpo-cost-table`, `.hpo-metrics-grid`, `.hpo-three-col`, `.hpo-rent-compare`, `.hpo-matrix-wrapper`, `.hpo-slider-label`, `.hpo-label-amount`, `.hpo-configure-section`, `.hpo-two-col`, `.hpo-tracing-grid`, `.hpo-cashout-explainer`, `.hpo-tax-detail`, `.hpo-equity-breakdown`, `.hpo-strategy-cta`, `.hpo-strategy-btns`, `.hpo-formula-hint`.
- **Hook ordering**: Copy callbacks (`copyResultsSummary`, `copyAffordabilitySummary`) must be declared AFTER `estimatedTakeHome` and `affordability`/`affordabilityMatrix` to avoid TDZ errors.
- **Explore-mode input hiding**: Target Home Price, Monthly Rent, and Run Optimization button are wrapped in `{(isTargetMode || isDeepMode) && (...)}`. In Explore mode, homePrice is set via the matrix CTA's `handleOptimize(overrideHomePrice)`.
- **`handleOptimize` override**: Accepts optional `overrideHomePrice` param to avoid stale-state issue when calling from the affordability matrix CTA (state setter + callback in same render).
- **Affordability matrix**: `calcAffordabilityMatrix` computes 30 cells (6 dp% × 5 comfort%). Internal `calcAffordabilityCell` helper shared with `calcAffordability`. Reuses `.hpo-matrix-wrapper` CSS class from sensitivity matrix for horizontal scroll on mobile.
- **customAssumptions sync**: useEffect on `selectedLocation` updates `customAssumptions` to match new location's defaults.
- **Cash-out refi / HELOC mutual exclusivity**: In `manualScenario` useMemo, cash-out only works with mortgage (`needsMortgage`), HELOC only works without mortgage and without cash-out. `calcScenario` enforces: `actualHELOC = (!needsMortgage && !isCashOutRefi) ? helocAmount : 0`. Slider onChange handlers auto-zero the other.
- **Interest tracing (IRS concept)**: Borrowed money (margin, HELOC, cash-out refi) used for investment allows interest deduction against investment income. Limited by net investment income (dividends + interest). `calcScenario` returns `deductibleMarginInterest`, `deductibleCashOutInterest`, `deductibleHELOCInterest`, `investmentInterestDeduction`, `nonDeductibleCashOutInterest`.

## Key `calcScenario` Return Fields
- `federalMortgageTaxBenefit`, `stateMortgageTaxBenefit`, `investInterestTaxBenefit`, `totalTaxBenefit`
- `deductibleMarginInterest`, `deductibleCashOutInterest`, `deductibleHELOCInterest`
- `investmentInterestDeduction`, `nonDeductibleCashOutInterest`, `totalDeductibleInvestmentIncome`
- `cashOutInterestAnnual`, `totalRefiLoan`, `acquisitionDebt`
- `monthlyPI`, `monthlyPrincipal` (P&I breakdown in `nonRecovBreakdown`)
- `yearlyAnalysis` (30 entries with `equity`, `ownerWealth`, `yearlyPrincipal`, `cumulativePrincipal`)
- `propTax` (annual property tax — NOT `propTaxAnnual`)
- `helocAmount`, `cashOutRefiAmount`, `cashDown`, `txCosts`

## PR History (recent)

| PR | Description |
|----|-------------|
| #16 | fix: global box-sizing and container width — stops content clipping on iPhone |
| #15 | fix: iPhone portrait layout — comprehensive mobile overhaul |
| #14 | fix: comprehensive mobile responsiveness for Build Your Strategy |
| #13 | fix: mobile responsiveness for Build Your Strategy tab |
| #12 | feat: UX polish — explainer, equity analysis, naming fixes |
| #11 | feat: enhance Build Your Strategy with cash-out refi, interest tracing, tax breakdown |
| #10 | feat: replace Quick/Expert toggle with 3-way mode selector |
| #9 | feat: 2D affordability matrix and simplified Quick-mode journey |
| #8 | feat: default 30% comfort, move chips above hero, add 25% tier |
| #7 | feat: add multi-state location toggle (SF, Florida, NYC, Chicago) |

## Build & Run

```bash
cd ~/Documents/Claude-work/home-purchase-optimizer
npm run dev    # dev server
npm run build  # production build
```

Deployed via Vercel (auto-deploys on push to GitHub).

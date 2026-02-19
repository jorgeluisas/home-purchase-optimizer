# Home Purchase Optimizer — Session Context

## What This App Is
A React app for home buyers in major US markets. Compares down payment strategies, models wealth impact, shows tax implications, includes affordability calculator with comfort targeting, sensitivity analysis, and risk visualization. Supports 4 locations: San Francisco (default), Florida, New York City, and Chicago. Built with Next.js + Recharts, inline styles + responsive CSS.

## Current Branch
`main`

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component — all UI rendering (~4,916 lines)
├── calculations.js             # All financial math & utilities (~722 lines)
├── layout.js                   # App layout (viewport meta, dark background, metadata)
└── page.js                     # Entry point (Suspense wrapper)
```

**Architecture decision:** Financial math is extracted to `calculations.js` for testability and reuse. UI rendering stays in a single file intentionally — the component shares 20+ state variables across 7 tabs, making prop-threading across files more error-prone than keeping it inline. Previous extracted UI components (InputPanel, ResultsCards, Charts) were evaluated and found to be stale/incomplete, so they were deleted.

## All Features Implemented

### Core (original)
- **Best Strategy tab**: Optimizer finds best down payment + leverage strategy, shows verdict (Strong Buy/Buy/Close Call/etc.), action plan, wealth impact, cash flow analysis
- **Side-by-Side tab**: Compare custom scenarios head-to-head
- **Build Your Own tab**: Manual strategy builder with editable location-specific assumptions
- **Own vs Rent tab**: Year-by-year wealth comparison with interactive chart
- **Taxes tab**: Federal + state bracket breakdown, SALT deduction analysis (adapts to selected location)

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

### Affordability ("What Can I Buy?" tab)
- **Comfort target selector**: 6 clickable chips in standalone card ABOVE the hero card (20%/25%/30%/40%/50%/Max) — user picks target % of take-home pay, prices recalculate via formula inversion. Default is 30% (Comfortable).
- **Hero card**: Recommends house price with key stats (below comfort chips)
- **Spectrum cards**: 4 leverage options (Play it Safe 50% / Sweet Spot 20% / Stretch 10% / Go Big 5%)
- **Deep dive**: Monthly breakdown, stacked bar, comfort gauge, context comparisons
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
- **Quick/Expert mode**: Quick mode shows only Best Strategy + What Can I Buy?

### Enhancements
- **Scenario presets**: Conservative/Balanced/Aggressive one-click configs
- **Sensitivity Analysis tab**: Tornado chart (variable impact on break-even) + 3x3 break-even matrix (appreciation x returns) + interactive "What If?" appreciation slider
- **Chart annotations**: Break-even vertical line + 10/20/30-year milestones
- **Downside risk visualization**: 3 risk scenarios (portfolio crash, home stagnation, rate spike)
- **Editable assumptions**: 9 location-specific constants (prop tax, transfer tax, PMI rate, etc.) with reset — auto-syncs when location changes
- **Opportunity cost metric**: 5th verdict metric showing down payment opportunity cost
- **Shareable reports**: Copy Summary + Share Link buttons on Best Strategy and What Can I Buy? tabs
- **Responsive design**: Full mobile-friendly CSS with 3 breakpoints (900px/600px/400px), 36 CSS class targets, viewport meta tag, mobile numeric keyboards, horizontal-scrolling tabs, responsive grids/charts/typography, and iOS Safari dark input styling
- **Visual polish**: Tab bar styling, active tab glow, card hover transitions

## Tabs (7 total)

| Tab | Label | Render Function | Visibility |
|-----|-------|-----------------|------------|
| `optimize` | Best Strategy | `renderOptimize()` | Always |
| `scenarios` | Side-by-Side | `renderScenarios()` | Expert only |
| `holding` | Own vs Rent | `renderHolding()` | Expert only |
| `sensitivity` | Sensitivity | `renderSensitivity()` | Expert only |
| `tax` | Taxes | `renderTax()` | Expert only |
| `manual` | Build Your Own | `renderManual()` | Expert only |
| `afford` | What Can I Buy? | `renderAffordability()` | Always |

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
| `calcScenario({...params, loc})` | Core model — all costs, deductions, 30-year wealth trajectory |
| `runOptimization({...params, loc})` | Iterates strategy space, scores and ranks |
| `calcAffordability({...params, loc})` | Closed-form max price given income/savings, accepts `targetTakeHomePct` |
| `fmt$` / `fmtPct` / `fmtNum` | Formatting utilities |
| `URL_PARAM_MAP` / `REVERSE_URL_MAP` | URL serialization maps (includes `location: 'loc'`) |

### HomePurchaseOptimizer.jsx (main component)
| Function | Line | Purpose |
|----------|------|---------|
| `PresetSelector` | ~254 | Conservative/Balanced/Aggressive preset component |
| `copyShareLink` | ~531 | Copy shareable URL to clipboard |
| `estEffectiveTaxRate` | ~626 | Exact effective tax rate memo (location-aware payroll tax) |
| `affordability` | ~636 | Affordability calculation memo |
| `estimatedTakeHome` | ~791 | Monthly take-home pay memo |
| `copyResultsSummary` | ~796 | Copy formatted strategy summary to clipboard |
| `copyAffordabilitySummary` | ~849 | Copy formatted affordability summary to clipboard |
| `renderOptimize` | ~1226 | Best Strategy tab (includes affordability indicator) |
| `renderManual` | ~1883 | Build Your Own tab (with editable assumptions) |
| `renderHolding` | ~2331 | Own vs Rent tab with Recharts |
| `renderScenarios` | ~2727 | Side-by-Side comparison tab |
| `renderTax` | ~3052 | Taxes tab (location-specific brackets and labels) |
| `renderSensitivity` | ~3373 | Sensitivity Analysis tab |
| `renderAffordability` | ~3919 | What Can I Buy? tab |

## Key State Variables

### Financial Inputs
`homePrice` (default $1M), `totalSavings` ($200K), `stockPortfolio` ($500K), `grossIncome` ($500K), `monthlyRent` ($5K), `rentGrowth`, `filingStatus`, `mortgageRate`, `marginRate`, `helocRate`, `cashOutRefiRate`, `investmentReturn`, `dividendYield`, `homeAppreciation`, `loanTerm`, `minBuffer` ($0)

### Location
`selectedLocation` (default 'sf') — derived `loc = LOCATIONS[selectedLocation]` used throughout

### Affordability
`affMonthlyHOA`, `affMonthlyOtherDebt`, `affSelectedDpPct`, `affTargetComfort` (default 0.30, or 0.20-0.50, or null=Max)

### UX / Mode
`isExpertMode`, `activePreset`, `showOptimizeDetails`, `showSensitivity`, `showAssumptions`, `validationErrors`, `summaryCopied`, `affordCopied`, `linkCopied`, `whatIfAppreciation`

### Editable Assumptions
`customAssumptions` (object with propTaxRate, transferTax, parcelTax, realtorComm, closeBuy, closeSell, insuranceRate, maintenanceRate, pmiRate) — auto-syncs to location defaults when `selectedLocation` changes

## Architecture Notes
- **Two-file architecture**: `calculations.js` (pure math, no React) + `HomePurchaseOptimizer.jsx` (all UI). Intentionally kept as two files — see "Architecture decision" above.
- **Multi-state pattern**: `LOCATIONS` config object with tax functions as first-class references (`loc.calcStateTax`, `loc.getStateRate`). All calc functions accept `loc` param. UI code never needs to know which state — just calls `loc.calcStateTax(income, filingStatus)`.
- **Variable naming**: All CA-specific variable names renamed to state-generic: `caRate` → `stateRate`, `caDeductibleMortgageInterest` → `stateDeductibleMortgageInterest`, `shouldItemizeCA` → `shouldItemizeState`, etc.
- **Comfort tiers**: 6 tiers (20% Excellent, 25% Great, 30% Comfortable, 40% Stretched, 50% Heavy, Max DTI Ceiling). Defined inline in `renderAffordability`, `renderOptimize`, and copy callbacks — could extract to shared helper.
- **`taxBreakdown` useMemo**: Has duplicate bracket data for display only. Actual computation uses `calcFedTax`/`calcCAStateTax`.
- **URL params**: Hydrated on mount, debounced sync on state changes. Location stored as `loc` string param.
- **Responsive CSS**: `<style>` tag with global resets (iOS Safari dark inputs via `!important`, `color-scheme: dark`, `appearance: none`) + 3 breakpoints (900px tablet, 600px mobile, 400px extra-small) + 36 CSS class targets for `!important` overrides on inline styles. Dark background (`#0c1220`) set on `<html>` and `<body>` in layout.js to prevent iOS white bleed-through during elastic scrolling.
- **Hook ordering**: Copy callbacks (`copyResultsSummary`, `copyAffordabilitySummary`) must be declared AFTER `estimatedTakeHome` and `affordability` to avoid TDZ errors.
- **customAssumptions sync**: useEffect on `selectedLocation` updates `customAssumptions` to match new location's defaults.

## ROADMAP Status

| Fix | Status | Description |
|-----|--------|-------------|
| Fix 1: Progressive Disclosure | Done | Collapsible sections, show details toggle |
| Fix 2: URL State Persistence | Done | URL params + shareable links + Copy Link |
| Fix 3: Split the Codebase | Done | calculations.js extracted; UI kept inline intentionally |
| Fix 4: Simplify Default Flow | Done | Quick/Expert mode, grouped inputs, input hints |
| Fix 5: Clear CTA Per Tab | Done | Every tab has one clear next action + cross-tab navigation |

## Build & Run

```bash
cd ~/Documents/Claude-work/home-purchase-optimizer
npm run dev    # dev server
npm run build  # production build
```

Deployed via Vercel (auto-deploys on push to GitHub).

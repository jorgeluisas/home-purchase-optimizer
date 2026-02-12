# Home Purchase Optimizer — Session Context

## What This App Is
A React app for San Francisco home buyers. Compares down payment strategies, models wealth impact, shows tax implications, includes affordability calculator with comfort targeting, sensitivity analysis, and risk visualization. Built with Next.js + Recharts, inline styles + responsive CSS.

## Current Branch
`feature/enhancements-sensitivity-presets`

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component (~4,745 lines)
├── calculations.js             # All financial math (~626 lines)
├── InputPanel.jsx              # Sidebar input panel (~278 lines)
├── ResultsCards.jsx            # Result card components (~468 lines)
├── Charts.jsx                  # Chart components (~301 lines)
├── layout.js                   # App layout
└── page.js                     # Entry point (Suspense wrapper)
```

## All Features Implemented

### Core (original)
- **Best Strategy tab**: Optimizer finds best down payment + leverage strategy, shows verdict (Strong Buy/Buy/Close Call/etc.), action plan, wealth impact, cash flow analysis
- **Side-by-Side tab**: Compare custom scenarios head-to-head
- **Build Your Own tab**: Manual strategy builder with editable SF assumptions
- **Own vs Rent tab**: Year-by-year wealth comparison with interactive chart
- **Taxes tab**: Federal + CA bracket breakdown, SALT deduction analysis

### Affordability ("What Can I Buy?" tab)
- **Hero card**: Recommends house price with key stats
- **Comfort target selector**: 6 clickable chips (20%/30%/40%/50%/75%/Max) — user picks target % of take-home pay, prices recalculate via formula inversion
- **Spectrum cards**: 4 leverage options (Play it Safe 50% / Sweet Spot 20% / Stretch 10% / Go Big 5%)
- **Deep dive**: Monthly breakdown, stacked bar, comfort gauge, context comparisons
- **Affordability on Summary tab**: Comfort card between verdict and recommendation on Best Strategy tab

### Tax Accuracy
- `calcFedTax` — exact federal bracket calculation (in `calculations.js`)
- `estEffectiveTaxRate` — exact fed + state + FICA (SS + Medicare + Additional Medicare) + CA SDI
- `estimatedTakeHome` — single source of truth, derived from `estEffectiveTaxRate`

### UX Improvements (from ROADMAP.md)
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
- **Editable assumptions**: 9 SF-specific constants (prop tax, transfer tax, PMI rate, etc.) with reset
- **Opportunity cost metric**: 5th verdict metric showing down payment opportunity cost
- **Shareable reports**: Copy Summary + Share Link buttons on Best Strategy and What Can I Buy? tabs
- **Responsive design**: CSS media queries at 900px and 600px breakpoints for tablet/mobile
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
| `calcFedTax` | Exact federal tax from brackets |
| `calcCAStateTax` | Exact CA state tax from brackets |
| `getFedRate` / `getCARate` | Marginal tax rate lookups |
| `calcMonthly` | Monthly mortgage payment |
| `genAmort` | Amortization schedule generator |
| `calcPMI` | PMI duration and cost estimator |
| `calcTxCosts` | SF-specific transaction costs |
| `calcScenario` | Core model — all costs, deductions, 30-year wealth trajectory |
| `runOptimization` | Iterates strategy space, scores and ranks |
| `calcAffordability` | Closed-form max price given income/savings, accepts `targetTakeHomePct` |
| `fmt$` / `fmtPct` / `fmtNum` | Formatting utilities |
| `SF` | SF-specific constants object |
| `URL_PARAM_MAP` / `REVERSE_URL_MAP` | URL serialization maps |

### HomePurchaseOptimizer.jsx (main component)
| Function | Line | Purpose |
|----------|------|---------|
| `PresetSelector` | ~254 | Conservative/Balanced/Aggressive preset component |
| `copyShareLink` | ~531 | Copy shareable URL to clipboard |
| `estEffectiveTaxRate` | ~624 | Exact effective tax rate memo |
| `affordability` | ~634 | Affordability calculation memo |
| `estimatedTakeHome` | ~789 | Monthly take-home pay memo |
| `copyResultsSummary` | ~794 | Copy formatted strategy summary to clipboard |
| `copyAffordabilitySummary` | ~847 | Copy formatted affordability summary to clipboard |
| `renderOptimize` | ~1224 | Best Strategy tab (includes affordability indicator) |
| `renderManual` | ~1881 | Build Your Own tab (with editable assumptions) |
| `renderHolding` | ~2329 | Own vs Rent tab with Recharts |
| `renderScenarios` | ~2725 | Side-by-Side comparison tab |
| `renderTax` | ~3050 | Taxes tab |
| `renderSensitivity` | ~3371 | Sensitivity Analysis tab |
| `renderAffordability` | ~3917 | What Can I Buy? tab |

## Key State Variables

### Financial Inputs
`homePrice`, `totalSavings`, `stockPortfolio`, `grossIncome`, `monthlyRent`, `rentGrowth`, `filingStatus`, `mortgageRate`, `marginRate`, `helocRate`, `cashOutRefiRate`, `investmentReturn`, `dividendYield`, `homeAppreciation`, `loanTerm`, `minBuffer`

### Affordability
`affMonthlyHOA`, `affMonthlyOtherDebt`, `affSelectedDpPct`, `affTargetComfort` (null=max or 0.20-0.75)

### UX / Mode
`isExpertMode`, `activePreset`, `showOptimizeDetails`, `showSensitivity`, `showAssumptions`, `validationErrors`, `summaryCopied`, `affordCopied`, `linkCopied`, `whatIfAppreciation`

### Editable Assumptions
`customAssumptions` (object with propTaxRate, transferTax, parcelTax, realtorComm, closeBuy, closeSell, insuranceRate, maintenanceRate, pmiRate)

## Architecture Notes
- **Calculations extracted**: All financial math lives in `calculations.js`. Main file imports everything.
- **Comfort tiers**: Defined inline in `renderAffordability`, `renderOptimize`, and copy callbacks — could extract to shared helper.
- **`taxBreakdown` useMemo**: Has duplicate bracket data for display only. Actual computation uses `calcFedTax`/`calcCAStateTax`.
- **URL params**: Hydrated on mount, debounced sync on state changes.
- **Responsive CSS**: `<style>` tag with media queries + className overrides on inline styles. Classes: `hpo-container`, `hpo-grid`, `hpo-title`, `hpo-verdict-metrics`, `hpo-tabs`, `hpo-affordability-indicator`, `hpo-cash-flow-grid`, `hpo-risk-grid`.
- **Hook ordering**: Copy callbacks (`copyResultsSummary`, `copyAffordabilitySummary`) must be declared AFTER `estimatedTakeHome` and `affordability` to avoid TDZ errors.
- **InputPanel.jsx / ResultsCards.jsx / Charts.jsx**: Extracted components exist but are not yet wired into the main component (main file still renders everything inline).

## ROADMAP Status

| Fix | Status | Description |
|-----|--------|-------------|
| Fix 1: Progressive Disclosure | Done | Collapsible sections, show details toggle |
| Fix 2: URL State Persistence | Done | URL params + shareable links + Copy Link |
| Fix 3: Split the Codebase | Partial | calculations.js extracted; InputPanel/ResultsCards/Charts exist but not wired in |
| Fix 4: Simplify Default Flow | Done | Quick/Expert mode, grouped inputs, input hints |
| Fix 5: Clear CTA Per Tab | Done | Every tab has one clear next action + cross-tab navigation |

## Build & Run

```bash
cd ~/Desktop/home-purchase-optimizer
npm run dev    # dev server
npm run build  # production build
```

Deployed via Vercel (auto-deploys on push to GitHub).

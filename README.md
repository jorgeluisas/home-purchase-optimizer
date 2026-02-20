# Home Purchase Optimizer

A financial planning tool for home buyers in major US markets. Analyzes multiple financing strategies including traditional mortgages, margin loans, HELOCs, and cash-out refinancing to find the optimal approach for your situation. Supports San Francisco, Florida, New York City, and Chicago.

## Features

- **Strategy Optimization** — Automatically evaluates dozens of financing combinations and ranks them by long-term wealth outcome
- **Multi-State Support** — Toggle between SF (default), Florida, NYC, and Chicago with location-specific property taxes, state income taxes, transfer taxes, and rules (Prop 13, mansion tax)
- **Own vs. Rent Analysis** — Side-by-side comparison accounting for appreciation, investment returns, tax benefits, and transaction costs
- **Tax-Aware Calculations** — Full federal + state tax brackets (CA, NY+NYC, IL, FL), SALT caps, mortgage interest deduction limits, investment interest deduction rules, and NIIT
- **Affordability Calculator** — 2D scenario matrix (down payment % × comfort %) showing max home price for 30 combinations, with detailed breakdown and direct "Find Best Strategy" CTA
- **Sensitivity Analysis** — Tornado chart showing variable impact on break-even, 3x3 matrix for appreciation vs. returns, interactive "What If?" slider
- **Risk Visualization** — Downside scenarios: portfolio crash, home stagnation, rate spike
- **Scenario Comparison** — Compare up to 4 custom scenarios with detailed breakdowns
- **Shareable Results** — Copy formatted summaries or share links with URL-encoded scenarios (including location)
- **Quick & Expert Modes** — Quick mode for casual users (2 tabs), Expert mode for power users (7 tabs)
- **Fully Mobile Responsive** — 3 CSS breakpoints (900px/600px/400px), viewport meta tag, mobile numeric keyboards, horizontal-scroll tabs, responsive grids and charts, iOS Safari dark input styling

## Tech Stack

- **Next.js 14.2** — React framework
- **React 18.2** — UI components
- **Recharts 2.10** — Data visualization
- **Vercel** — Deployment

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component — all UI rendering (~4,826 lines)
├── calculations.js             # Financial math & utilities (~747 lines)
├── layout.js                   # App layout (viewport meta, dark background, metadata)
└── page.js                     # Entry point
CLAUDE.md                       # AI session context
ROADMAP.md                      # Roadmap & future enhancements
```

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view the optimizer.

## Usage

1. **Select your location** — SF (default), Florida, NYC, or Chicago
2. **Enter your financials** — Income, savings (Quick mode) or all details (Expert mode)
3. **Explore the affordability matrix** — See max home prices across 30 scenarios (6 down payment levels × 5 comfort levels)
4. **Click a scenario** — See detailed breakdown, monthly costs, comfort gauge
5. **Click "Find Best Strategy"** — Optimizer evaluates all viable financing strategies for that price
6. **Review results** — See verdict, break-even year, 10-year advantage, monthly costs, comfort level, and opportunity cost
7. **Explore tabs** — Switch to Expert mode for deeper analysis (Own vs Rent, Sensitivity, Taxes, Side-by-Side, Build Your Own)
8. **Share** — Copy a formatted summary or share a link with your scenario encoded in the URL

### Tabs

| Tab | Purpose | Mode |
|-----|---------|------|
| **Best Strategy** | Auto-find optimal financing strategy with verdict | Always |
| **What Can I Buy?** | 2D affordability matrix (dp% × comfort%) with detail card | Always |
| **Side-by-Side** | Compare up to 4 custom scenarios | Expert |
| **Own vs Rent** | 30-year wealth projection comparison | Expert |
| **Sensitivity** | Tornado chart + break-even matrix + "What If?" slider | Expert |
| **Taxes** | Federal + state bracket breakdown, SALT analysis | Expert |
| **Build Your Own** | Manual strategy builder with editable location assumptions | Expert |

## Supported Locations

| | San Francisco | Florida | New York City | Chicago (IL) |
|---|---|---|---|---|
| Property tax | 1.18% | 0.89% | 1.05% | 2.1% |
| Transfer tax | 0.68% | 0.70% | 1.4% (state+city) | 1.2% (combined) |
| State income tax | CA brackets (1-12.3%) | None | NY (4-10.9%) + NYC (3.08-3.88%) | IL flat 4.95% |
| Special rules | Prop 13 (2% cap), CA Mental Health Tax | — | Mansion tax (1% > $1M) | — |

## Key Calculations

| Function | Location | Description |
|----------|----------|-------------|
| `calcScenario()` | calculations.js | Core model — computes all costs, deductions, and 30-year wealth trajectory |
| `runOptimization()` | calculations.js | Iterates through strategy space, scores and ranks results |
| `calcAffordability()` | calculations.js | Closed-form max price given income and savings constraints |
| `calcAffordabilityMatrix()` | calculations.js | 2D grid of dp% × comfort% (30 cells) for scenario matrix |
| `calcFedTax()` | calculations.js | Full federal bracket calculation |
| `calcCAStateTax()` | calculations.js | CA state tax brackets including Mental Health Tax |
| `calcNYStateTax()` / `calcNYCLocalTax()` | calculations.js | NY state + NYC local tax brackets |
| `calcILStateTax()` | calculations.js | IL flat 4.95% with personal exemption |
| `genAmort()` | calculations.js | Amortization schedule generator |
| `calcPMI()` | calculations.js | PMI duration and cost estimator |
| `calcTxCosts()` | calculations.js | Location-specific transaction costs (transfer tax, mansion tax, closing, commissions) |

## Financing Strategies Evaluated

1. **Traditional** — Cash down payment + mortgage
2. **Margin + Mortgage** — Use margin loan for part of down payment
3. **Cash + HELOC** — Buy outright, then extract equity via HELOC
4. **Cash-Out Refi** — Buy with mortgage, immediately refi to extract cash for investment

## Notes

- Location-specific constants (property tax, transfer tax, state tax functions, Prop 13, mansion tax) are in the `LOCATIONS` config object in `calculations.js`
- `SF` is exported as a backward-compatibility alias for `LOCATIONS.sf`
- Tax calculations assume 2024 brackets (TCJA sunset considerations not included)
- Investment interest deduction limited to actual dividend/interest income, not unrealized gains
- NIIT (3.8%) applied to renter's investment returns for high earners
- Fully mobile responsive with 3 breakpoints (900px tablet, 600px mobile, 400px extra-small), 36 CSS class targets, viewport meta tag, mobile numeric keyboards, and iOS Safari-specific dark input styling with `color-scheme: dark`

## License

Private — not for redistribution.

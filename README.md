# Home Purchase Optimizer

A financial planning tool for San Francisco home purchases. Analyzes multiple financing strategies including traditional mortgages, margin loans, HELOCs, and cash-out refinancing to find the optimal approach for your situation.

## Features

- **Strategy Optimization** — Automatically evaluates dozens of financing combinations and ranks them by long-term wealth outcome
- **Own vs. Rent Analysis** — Side-by-side comparison accounting for appreciation, investment returns, tax benefits, and transaction costs
- **Tax-Aware Calculations** — Full federal/CA tax brackets, SALT caps, mortgage interest deduction limits ($750K fed / $1M CA), investment interest deduction rules, and NIIT
- **Affordability Calculator** — Closed-form DTI analysis across multiple down payment levels with comfort targeting (choose what % of take-home to spend on housing)
- **Sensitivity Analysis** — Tornado chart showing variable impact on break-even, 3x3 matrix for appreciation vs. returns, interactive "What If?" slider
- **Risk Visualization** — Downside scenarios: portfolio crash, home stagnation, rate spike
- **Scenario Comparison** — Compare up to 4 custom scenarios with detailed breakdowns
- **SF-Specific Defaults** — Prop 13, transfer taxes, parcel tax, and local rates baked in
- **Shareable Results** — Copy formatted summaries or share links with URL-encoded scenarios
- **Quick & Expert Modes** — Quick mode for casual users (2 tabs), Expert mode for power users (7 tabs)

## Tech Stack

- **Next.js 14.2** — React framework
- **React 18.2** — UI components
- **Recharts 2.10** — Data visualization
- **Vercel** — Deployment

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component (~4,745 lines)
├── calculations.js             # Financial math & utilities (~626 lines)
├── InputPanel.jsx              # Sidebar input panel component
├── ResultsCards.jsx            # Result card components
├── Charts.jsx                  # Chart components
├── layout.js                   # App layout
└── page.js                     # Entry point
CLAUDE.md                       # AI session context
ROADMAP.md                      # UX roadmap & status
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

1. **Enter your financials** — Home price, savings, stock portfolio, income, current rent
2. **Click "Run Optimization"** — The tool evaluates all viable strategies
3. **Review results** — See verdict, break-even year, 10-year advantage, monthly costs, comfort level, and opportunity cost
4. **Explore tabs** — Switch to Expert mode for deeper analysis (Own vs Rent, Sensitivity, Taxes, Side-by-Side, Build Your Own)
5. **Share** — Copy a formatted summary or share a link with your scenario encoded in the URL

### Tabs

| Tab | Purpose | Mode |
|-----|---------|------|
| **Best Strategy** | Auto-find optimal financing strategy with verdict | Always |
| **What Can I Buy?** | Affordability calculator with comfort targeting | Always |
| **Side-by-Side** | Compare up to 4 custom scenarios | Expert |
| **Own vs Rent** | 30-year wealth projection comparison | Expert |
| **Sensitivity** | Tornado chart + break-even matrix + "What If?" slider | Expert |
| **Taxes** | Federal + CA bracket breakdown, SALT analysis | Expert |
| **Build Your Own** | Manual strategy builder with editable SF assumptions | Expert |

## Key Calculations

| Function | Location | Description |
|----------|----------|-------------|
| `calcScenario()` | calculations.js | Core model — computes all costs, deductions, and 30-year wealth trajectory |
| `runOptimization()` | calculations.js | Iterates through strategy space, scores and ranks results |
| `calcAffordability()` | calculations.js | Closed-form max price given income and savings constraints |
| `calcCAStateTax()` / `calcFedTax()` | calculations.js | Full bracket calculations including CA Mental Health Tax |
| `genAmort()` | calculations.js | Amortization schedule generator |
| `calcPMI()` | calculations.js | PMI duration and cost estimator |
| `calcTxCosts()` | calculations.js | SF-specific transaction costs (transfer tax, closing, commissions) |

## Financing Strategies Evaluated

1. **Traditional** — Cash down payment + mortgage
2. **Margin + Mortgage** — Use margin loan for part of down payment
3. **Cash + HELOC** — Buy outright, then extract equity via HELOC
4. **Cash-Out Refi** — Buy with mortgage, immediately refi to extract cash for investment

## Notes

- All SF-specific constants (Prop 13, transfer tax, parcel tax) are in the `SF` object in `calculations.js`
- Tax calculations assume 2024 brackets (TCJA sunset considerations not included)
- Investment interest deduction limited to actual dividend/interest income, not unrealized gains
- NIIT (3.8%) applied to renter's investment returns for high earners
- Responsive design supports tablet and mobile viewports (breakpoints at 900px and 600px)

## License

Private — not for redistribution.

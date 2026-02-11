# Home Purchase Optimizer 🏠

A sophisticated financial planning tool for San Francisco home purchases. Analyzes multiple financing strategies including traditional mortgages, margin loans, HELOCs, and cash-out refinancing to find the optimal approach for your situation.

## Features

- **Strategy Optimization** — Automatically evaluates dozens of financing combinations and ranks them by long-term wealth outcome
- **Own vs. Rent Analysis** — Side-by-side comparison accounting for appreciation, investment returns, tax benefits, and transaction costs
- **Tax-Aware Calculations** — Handles federal/CA tax brackets, SALT caps, mortgage interest deduction limits ($750K fed / $1M CA), investment interest deduction rules, and NIIT
- **Affordability Calculator** — Closed-form DTI analysis across multiple down payment levels
- **Scenario Comparison** — Compare up to 4 custom scenarios with detailed breakdowns
- **SF-Specific Defaults** — Prop 13, transfer taxes, parcel tax, and local rates baked in

## Tech Stack

- **Next.js 14.2** — React framework
- **React 18.2** — UI components
- **Recharts 2.10** — Data visualization

## Project Structure

```
app/
├── HomePurchaseOptimizer.jsx   # Main component (~3000 lines)
├── layout.js                   # App layout
└── page.js                     # Entry point
next.config.js
package.json
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

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
2. **Set rates** — Mortgage, margin, HELOC, expected investment returns, home appreciation
3. **Click "Optimize"** — The tool evaluates all viable strategies
4. **Review results** — See optimal plan, top 5 alternatives, break-even analysis, and wealth projections

### Tabs

| Tab | Purpose |
|-----|---------|
| **Optimize** | Auto-find best financing strategy |
| **Manual** | Build a custom scenario with specific down payment, margin, HELOC amounts |
| **Affordability** | Calculate max home price at various down payment levels |
| **Own vs Rent** | Detailed comparison with 30-year projections |
| **Compare** | Side-by-side analysis of up to 4 scenarios |

## Key Calculations

| Function | Description |
|----------|-------------|
| `calcScenario()` | Core model — computes all costs, deductions, and 30-year wealth trajectory |
| `runOptimization()` | Iterates through strategy space, scores and ranks results |
| `calcAffordability()` | Closed-form max price given income and savings constraints |
| `calcCAStateTax()` / `calcFedTax()` | Full bracket calculations including CA Mental Health Tax |
| `genAmort()` | Amortization schedule generator |
| `calcPMI()` | PMI duration and cost estimator |
| `calcTxCosts()` | SF-specific transaction costs (transfer tax, closing, commissions) |

## Financing Strategies Evaluated

1. **Traditional** — Cash down payment + mortgage
2. **Margin + Mortgage** — Use margin loan for part of down payment
3. **Cash + HELOC** — Buy outright, then extract equity via HELOC
4. **Cash-Out Refi** — Buy with mortgage, immediately refi to extract cash for investment

## Notes

- All SF-specific constants (Prop 13, transfer tax, parcel tax) are in the `SF` object
- Tax calculations assume 2024 brackets (TCJA sunset considerations not included)
- Investment interest deduction limited to actual dividend/interest income, not unrealized gains
- NIIT (3.8%) applied to renter's investment returns for high earners

## License

Private — not for redistribution.

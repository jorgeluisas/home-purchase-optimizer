# Home Purchase Optimizer — Roadmap

## Completed

All 5 original UX fixes are done. Additionally, 14 iterations of improvements were applied covering educational value, shareability, usability, visual design, code quality, expert mode depth, and mobile responsiveness. Full mobile responsive overhaul completed as a subsequent enhancement. Multi-state location support and accessible defaults added.

### ✅ Fix 1: Progressive Disclosure
Verdict card + 5 key metrics visible by default. Detailed sections (interest deductibility, non-recoverable costs, top strategies, downside risk) collapsed behind "Show Full Analysis" toggle.

### ✅ Fix 2: URL State Persistence
All inputs serialized to URL query params. "Share Link" and "Copy Summary" buttons on Best Strategy and What Can I Buy? tabs. Debounced URL sync on state changes. Location included as `loc` param.

### ✅ Fix 3: Split the Codebase
Financial math extracted to `calculations.js` (~722 lines). UI rendering kept in `HomePurchaseOptimizer.jsx` (~4,916 lines) intentionally — the component shares 20+ state variables across 7 tabs, making prop-threading across files more error-prone than keeping it inline.

### ✅ Fix 4: Simplify Default Flow
Input grouping: "Your Finances" (always visible) / "Rates & Assumptions" (collapsible) / "Advanced Settings" (collapsed). Inline hint text on core inputs. Quick/Expert mode toggle. Smart defaults: home price $1M, savings $200K, portfolio $500K, income $500K, rent $5K, min buffer $0.

### ✅ Fix 5: Clear CTA Per Tab
Every tab has a clear next action. Cross-tab navigation links between Best Strategy, Own vs Rent, Sensitivity, and Tax tabs. Quick-to-Expert mode prompt. "Copy Summary" and "Share Link" on key tabs.

### ✅ Full Mobile Responsive Overhaul
3 CSS breakpoints (900px tablet, 600px mobile, 400px extra-small) with 36 CSS class targets. Viewport meta tag in `layout.js`. Mobile numeric keyboards via `inputMode="decimal"`. Horizontal-scroll tab bar. All grids collapse to appropriate column counts. Chart heights scale down. Typography reduces. CTAs go full-width, share buttons stack. Tornado chart labels stack above bars. Break-even matrix scrolls horizontally. Desktop appearance fully preserved — all overrides via CSS `!important`.

### ✅ iOS Safari Fixes
Force dark input styling with `-webkit-appearance: none !important` and explicit `background-color`/`color`/`opacity` overrides scoped to `.hpo-container`. `color-scheme: dark` on `<html>`. Dark background (`#0c1220`) on both `<html>` and `<body>` to prevent white bleed-through during elastic scrolling. `font-size: 16px` on inputs to prevent iOS auto-zoom. Custom SVG dropdown arrow for `<select>` elements.

### ✅ Multi-State Location Toggle
Location dropdown (SF default, Florida, NYC, Chicago) in "Your Finances" input section. `LOCATIONS` config object in `calculations.js` with per-location property tax rates, transfer taxes, state income tax functions, Prop 13 flags, mansion tax, payroll tax, and deduction rules. All calc functions (`calcTxCosts`, `calcScenario`, `runOptimization`, `calcAffordability`) parametrized with `loc`. New tax functions: `calcNYStateTax`, `calcNYCLocalTax`, `calcILStateTax`. UI adapts dynamically — Prop 13 section (CA only), state-specific bracket tables, conditional labels. `customAssumptions` auto-syncs when location changes. Location persisted in URL.

### ✅ Accessible Defaults & Comfort UX
Lowered defaults from ultra-high-earner to more accessible values ($1M home, $200K savings, $500K portfolio, $500K income, $5K rent, $0 buffer). Comfort target chips moved to standalone card above hero card on "What Can I Buy?" tab. Default comfort set to 30% (Comfortable). 6 tiers: 20% Excellent, 25% Great, 30% Comfortable, 40% Stretched, 50% Heavy, Max DTI Ceiling. Removed 75% (Extreme) tier.

---

## Future Enhancements

### High Priority
- **Unit tests for calculations.js** — Pure functions, no React dependencies, easy to test. Would catch regressions in tax math, affordability formula, optimization logic, and multi-state tax calculations.
- **Swipeable tabs (nice-to-have)** — Touch gesture to swipe between tabs on mobile. Would require a JS library or custom touch handler.
- **Performance optimization** — Lazy-load Expert-only tabs (Side-by-Side, Own vs Rent, Sensitivity, Taxes, Build Your Own). Audit memoization for unnecessary re-renders.

### Medium Priority
- **Save/export to PDF** — Generate a formatted report from the Best Strategy or Affordability results for sharing with partners, financial advisors, or mortgage brokers.
- **Guided onboarding flow** — First-time user walkthrough highlighting key inputs and explaining what each tab does.
- **Extract comfort tier helper** — Comfort level labels/colors are duplicated in 3+ places (renderOptimize, renderAffordability, copyResultsSummary). Could be a shared function.
- **2025 tax bracket updates** — Current brackets are 2024. Update `calcFedTax`, `calcCAStateTax`, `calcNYStateTax`, `calcNYCLocalTax`, `calcILStateTax`, and FICA thresholds when 2025 brackets are finalized.
- **Additional locations** — Add more cities/states (e.g., Austin TX, Seattle WA, Boston MA) following the established `LOCATIONS` config pattern.

### Low Priority
- **API integrations** — Live mortgage rates (Freddie Mac PMMS), Zillow home values, or Redfin market data.
- **localStorage backup** — Save last-used inputs for returning users who don't bookmark the URL.
- **Dark/light theme toggle** — Currently dark-only.
- **Accessibility audit** — Keyboard navigation, screen reader labels, color contrast checks.

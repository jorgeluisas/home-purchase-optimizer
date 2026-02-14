# Home Purchase Optimizer — Roadmap

## Completed

All 5 original UX fixes are done. Additionally, 14 iterations of improvements were applied covering educational value, shareability, usability, visual design, code quality, expert mode depth, and mobile responsiveness.

### ✅ Fix 1: Progressive Disclosure
Verdict card + 5 key metrics visible by default. Detailed sections (interest deductibility, non-recoverable costs, top strategies, downside risk) collapsed behind "Show Full Analysis" toggle.

### ✅ Fix 2: URL State Persistence
All inputs serialized to URL query params. "Share Link" and "Copy Summary" buttons on Best Strategy and What Can I Buy? tabs. Debounced URL sync on state changes.

### ✅ Fix 3: Split the Codebase
Financial math extracted to `calculations.js` (~626 lines). UI rendering kept in `HomePurchaseOptimizer.jsx` intentionally — the component shares 20+ state variables across 7 tabs, making prop-threading across files more error-prone than keeping it inline.

### ✅ Fix 4: Simplify Default Flow
Input grouping: "Your Finances" (always visible) / "Rates & Assumptions" (collapsible) / "Advanced Settings" (collapsed). Inline hint text on core inputs. Quick/Expert mode toggle. Smart defaults for SF buyers.

### ✅ Fix 5: Clear CTA Per Tab
Every tab has a clear next action. Cross-tab navigation links between Best Strategy, Own vs Rent, Sensitivity, and Tax tabs. Quick-to-Expert mode prompt. "Copy Summary" and "Share Link" on key tabs.

---

## Future Enhancements

### High Priority
- **Unit tests for calculations.js** — Pure functions, no React dependencies, easy to test. Would catch regressions in tax math, affordability formula, and optimization logic.
- ~~**Full mobile responsive polish**~~ — **DONE.** 3 breakpoints (900px/600px/400px), viewport meta tag, 36 CSS class targets, responsive grids/charts/typography, horizontal-scroll tabs, mobile numeric keyboards, full-width CTAs, stacked share buttons. Remaining nice-to-have: swipeable tabs (JS).
- **Performance optimization** — Lazy-load Expert-only tabs (Side-by-Side, Own vs Rent, Sensitivity, Taxes, Build Your Own). Audit memoization for unnecessary re-renders.

### Medium Priority
- **Save/export to PDF** — Generate a formatted report from the Best Strategy or Affordability results for sharing with partners, financial advisors, or mortgage brokers.
- **Guided onboarding flow** — First-time user walkthrough highlighting key inputs and explaining what each tab does.
- **Extract comfort tier helper** — Comfort level labels/colors are duplicated in 4+ places (renderOptimize, renderAffordability, copyResultsSummary, copyAffordabilitySummary). Could be a shared function.
- **2025 tax bracket updates** — Current brackets are 2024. Update `calcFedTax`, `calcCAStateTax`, and FICA thresholds when 2025 brackets are finalized.

### Low Priority
- **API integrations** — Live mortgage rates (Freddie Mac PMMS), Zillow home values, or Redfin market data.
- **localStorage backup** — Save last-used inputs for returning users who don't bookmark the URL.
- **Dark/light theme toggle** — Currently dark-only.
- **Accessibility audit** — Keyboard navigation, screen reader labels, color contrast checks.

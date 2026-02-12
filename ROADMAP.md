# Home Purchase Optimizer — UX Roadmap

Priority fixes to transform this from "expert tool" to "tool anyone can use."

---

## ✅ Fix 1: Progressive Disclosure
**Problem:** After clicking Optimize, users are hit with 11 distinct information sections. Cognitive overload.

**Solution:**
- Show verdict card + 5 key metrics by default (break-even, advantage, monthly cost, comfort level, opportunity cost)
- Collapse detailed sections (Interest Deductibility, Non-Recoverable Costs, Top 5 Strategies, Downside Risk)
- "Show Full Analysis" toggle for power users
- Critical info above the fold

**Status:** Done

---

## ✅ Fix 2: URL State Persistence
**Problem:** Can't bookmark, share, or return to a scenario.

**Solution:**
- All key inputs serialized to URL query params (`?hp=2000000&sv=1000000...`)
- On page load, hydrate state from URL
- "Share Link" button copies shareable URL to clipboard
- "Copy Summary" buttons generate formatted plain-text reports
- Debounced URL sync on state changes

**Status:** Done

---

## ⚠️ Fix 3: Split the Codebase
**Problem:** Main component is ~4,745 lines. Hard to maintain and test.

**Solution:**
- ✅ Extract calculation functions to `app/calculations.js` (~626 lines)
- ✅ Extract `InputPanel` component to `app/InputPanel.jsx` (~278 lines)
- ✅ Extract `ResultsCards` to `app/ResultsCards.jsx` (~468 lines)
- ✅ Extract `Charts` to `app/Charts.jsx` (~301 lines)
- 🔲 Wire extracted components into main file (currently still rendering inline)
- 🔲 Extract constants, comfort tiers, and style objects

**Status:** Partial — modules exist but main component still renders everything inline.

---

## ✅ Fix 4: Simplify Default Flow
**Problem:** 14+ input fields visible at once. Overwhelming for first-time users.

**Solution:**
- Input grouping: "Your Finances" (always visible) → "Rates & Assumptions" (collapsible) → "Advanced Settings" (collapsed)
- Inline hint text below each core input explaining what it means
- Quick/Expert mode toggle — Quick shows only Best Strategy + What Can I Buy?
- Smart defaults for 80% of SF buyers
- Combined tax rate displayed as derived info, not editable input

**Status:** Done

---

## ✅ Fix 5: Clear CTA Per Tab
**Problem:** Each tab dumps data but doesn't tell user what to DO.

**Solution:**
- **Best Strategy tab:** Verdict card with clear outcome + "Copy Summary" / "Share Link" + cross-tab navigation to Own vs Rent, Sensitivity, Tax
- **Side-by-Side tab:** Winner highlighted with "Use This Strategy" button
- **Own vs Rent tab:** Clear verdict banner + "← Back to Strategy" button
- **Taxes tab:** Annual tax savings prominently displayed
- **Affordability tab:** "Use This Price" + "Copy Affordability Summary" + "Share Link"
- **Quick → Expert mode:** Contextual "Switch to Expert Mode" prompt when relevant

**Status:** Done

---

## Future Enhancements

### High Priority
- Wire extracted components (InputPanel, ResultsCards, Charts) into main file to complete Fix 3
- Extract comfort tier definitions into shared helper
- Extract style objects into separate module

### Medium Priority
- Full mobile responsive polish (current: basic breakpoints at 900px/600px)
- Save/export to PDF
- Guided onboarding flow for first-time users
- Performance optimization (memoization audit, lazy loading)

### Low Priority
- API integrations (live mortgage rates, Zillow data)
- localStorage backup for returning users
- Dark/light theme toggle
- Unit tests for calculations.js

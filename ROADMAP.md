# Home Purchase Optimizer — UX Roadmap

Priority fixes to transform this from "expert tool" to "tool anyone can use."

---

## ✅ Fix 1: Progressive Disclosure
**Problem:** After clicking Optimize, users are hit with 11 distinct information sections. Cognitive overload → users bail.

**Solution:**
- Show verdict card + 3 key metrics by default
- Collapse all detailed sections (Interest Deductibility, Non-Recoverable Costs, Top 5 Strategies, etc.)
- Add "Show Details" expandables for power users
- Keep the critical info above the fold

**Success Metric:** First-time user can understand their result without scrolling.

---

## 🔲 Fix 2: URL State Persistence
**Problem:** Can't bookmark, share, or return to a scenario. Users lose their work.

**Solution:**
- Serialize key inputs to URL query params (`?homePrice=2000000&savings=1000000...`)
- On page load, hydrate state from URL
- Add "Copy Link" button that copies shareable URL
- Optional: localStorage backup for returning users

**Success Metric:** User can text a link to spouse, spouse sees exact same scenario.

---

## 🔲 Fix 3: Split the Codebase
**Problem:** 3,000 lines in one file. Impossible to maintain, test, or extend.

**Solution:**
- Extract calculation functions to `/lib/calculations.js`
- Extract components: `InputPanel`, `VerdictCard`, `WealthChart`, `StrategyTable`, etc.
- Extract constants to `/lib/constants.js` (SF tax rates, etc.)
- Keep main component as orchestrator only

**Success Metric:** No single file > 500 lines. Can unit test calculations independently.

---

## 🔲 Fix 4: Simplify Default Flow
**Problem:** 14+ input fields visible at once. Dividend yield next to home price. Overwhelming.

**Solution:**
- Group inputs: "Your Finances" (always visible) | "Rates & Assumptions" (collapsed)
- Move advanced inputs behind "Advanced Settings" toggle: dividend yield, rent growth, HELOC rate, cash-out refi rate
- Smart defaults that work for 80% of SF buyers without touching anything
- Show calculated/derived values (combined tax rate) in a subtle "info" style, not as inputs

**Success Metric:** First-time user only sees 5-6 inputs before clicking Optimize.

---

## 🔲 Fix 5: Clear CTA Per Tab
**Problem:** Each tab dumps data but doesn't tell user what to DO with it.

**Solution:**
- **Summary tab:** "Use This Strategy" button that pre-fills Manual tab
- **Compare tab:** "Winner: Scenario B — Use This" button
- **Own vs Rent tab:** Clear verdict banner: "At your numbers, buying wins after year X" with "See What Would Change This" link
- **Taxes tab:** "Your annual tax savings: $X" with "Factor This Into Your Budget" action
- **Affordability tab:** Already has "Use This Price" — good, keep it

**Success Metric:** Every tab has ONE clear next action.

---

## Execution Plan

Work through fixes sequentially. After each:
1. Implement the fix
2. Push to GitHub
3. Verify on Vercel preview
4. Get approval before next fix

---

## Future Enhancements (Post-Roadmap)
- Mobile responsive design
- Save/export to PDF
- Sensitivity analysis (tornado chart)
- Risk visualization (downside scenarios)
- Guided onboarding flow
- API integrations (rates, Zillow, etc.)

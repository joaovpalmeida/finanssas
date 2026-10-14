# Dashboard Period & Transaction Date Fixes Plan

Address three key improvements: default the dashboard period to the most recent transaction's period, replace the "All Time" option with dedicated year filters (grouped by Years and Months), and eliminate timezone date-shifting when editing existing transactions.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed decisions guide this update:

- **Confirmed Decision 1 (Default Period)**: In `Dashboard.tsx`, initialize the active period to the most recent transaction's period (`availableMonths[0]`) instead of falling back to the current calendar month.
- **Confirmed Decision 2 (Year Filtering)**: Replace the "All Time" option in the period selector with dynamic year options extracted from your transactions. The dropdown will be cleanly divided into `<optgroup label="Years">` (e.g. `2026`, `2025`) and `<optgroup label="Months">` (e.g. `October 2026`, `September 2026`).
- **Confirmed Decision 3 (Monthly Budget Behavior)**: As confirmed, monthly budget planning and performance comparisons will only display on specific monthly views (`YYYY-MM`), keeping full-year views clean and focused on annual totals and category breakdowns.
- **Confirmed Decision 4 (Transaction Edit Date Preservation)**:
  - Use local date formatting (`d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()`) when loading `<input type="date">` to prevent UTC offset day shifts.
  - When saving an edited transaction, if the user did not modify the date, preserve the original `date` timestamp string untouched.
  - When a date is changed, construct the timestamp from the local year, month, and day to prevent cross-timezone date hopping.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Immediate Relevant Data**: Opening the dashboard displays your most recently recorded financial activity without having to navigate past an empty current month.
  2. **Annual Financial Analysis**: Selecting a year provides a complete view of annual income, expenses, and savings breakdown.
  3. **Rock-Solid Transaction Editing**: Modifying an amount or description will never inadvertently change the transaction's recorded date.
- **Target Audience**: Users managing historical and current transactions across varying timezones and multi-year records.

---

## 2. User Experience & Visual Design

- **Dashboard Header Dropdown**:
  - The period dropdown presents grouped options:
    - **Years**: Displays all years present in the dataset (descending order). Selecting a year filters transactions from Jan 1 00:00 to Dec 31 23:59:59.
    - **Months**: Displays all fiscal/calendar months present in the dataset (descending order).
- **Dashboard Views**:
  - **Month View**: Displays month stats, charts, and monthly budget comparison.
  - **Year View**: Displays year-to-date totals, savings rate, and category breakdowns. The monthly budget panel is gracefully hidden.
- **Edit Modal**:
  - `<input type="date">` displays the exact calendar date seen in the transaction table.
  - Editing only the amount retains the identical stored date.

---

## 3. Technical Architecture & File Changes

```
┌────────────────────────────────────────────────────────┐
│                   utils/helpers.ts                     │
│ - Update getFiscalDateRange: support 4-digit YYYY      │
│ - Update getMonthYearLabel: format YYYY as 'Year YYYY' │
└──────────────────────────┬─────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
 ┌──────────────────────┐      ┌───────────────────────────┐
 │ components/Dashboard │      │ components/AddTransaction │
 │ - Default: months[0] │      │ - Local date in input     │
 │ - Grouped select:    │      │ - Preserve date on edit   │
 │   Years & Months     │      │ - Prevent timezone drift  │
 │ - Guard month budgets│      └───────────────────────────┘
 └──────────────────────┘
```

### Proposed Execution Steps:

1. **`utils/helpers.ts`**:
   - Add support for 4-digit year strings (`/^\d{4}$/`) in `getFiscalDateRange`: return `{ start: Jan 1, end: Dec 31, label: 'Year YYYY' }`.
   - Update `getMonthYearLabel` to return `dateKey` directly if it is a year.
2. **`components/Dashboard.tsx`**:
   - Change `availableYears` calculation to gather unique years from `transactions`.
   - Update `dateFilter` initial state and initialization effect to select `availableMonths[0]` as the default period.
   - Group the `<select>` dropdown into `<optgroup label="Years">` and `<optgroup label="Months">`.
   - Guard budget performance and Add Budget button with `isMonthlyView` (`/^\d{4}-\d{2}$/.test(dateFilter)`).
3. **`components/AddTransactionModal.tsx`**:
   - Add a `getLocalDateString` helper to format local date components (`YYYY-MM-DD`) for `<input type="date">`.
   - On edit submission, check if `formData.date === getLocalDateString(initialData.date)`: if true, preserve `initialData.date` untouched.
   - If the user modified the date, construct the timestamp from local date parts to prevent timezone offsets.
4. **Verification**:
   - Run `lint_applet` (`tsc --noEmit`).
   - Run `compile_applet` (`npm run build`).
   - Restart dev server and verify.

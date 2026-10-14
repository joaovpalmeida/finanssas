# Category Filter Grouping by Transaction Type

Group categories in the Search page category dropdown by their transaction type using `<optgroup>` elements, with custom ordering and reactive type-filtering.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed decisions guide this update:

- **Confirmed Decision 1 (Group by Transaction Type)**: Group categories under distinct `<optgroup label="...">` sections within the Category `<select>` element, keeping `"All Categories"` as the top un-grouped option.
- **Confirmed Decision 2 (Group Ordering)**: Display groups in the requested priority order: **Expense**, **Income**, **Transfer**, followed by any remaining transaction types. Categories within each group are sorted alphabetically.
- **Confirmed Decision 3 (Type Filter Synchronization)**: When a transaction Type filter (e.g. "Expense") is selected:
  - The Category dropdown only displays categories matching that type.
  - If the previously selected category does not belong to the newly selected type, the category filter is reset to avoid conflicting queries.
  - When "All Types" is active, all category groups are displayed.

---

## 1. Overview & User Experience

- **Search Page Filter Section**:
  - The Category dropdown currently displays a flat, unsorted or semi-sorted list of categories.
  - With this update, users will see clean visual groups:
    ```
    All Categories
    ▼ Expense
        Dining Out
        Groceries
        Rent
    ▼ Income
        Freelance
        Salary
    ▼ Transfer
        Internal Transfer
        Savings
    ```
  - When the user selects "Expense" in the Type dropdown, the Category filter automatically focuses strictly on Expense categories, eliminating visual noise and preventing queries that would yield zero results.

---

## 2. Technical Architecture & File Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│                   components/TransactionSearch.tsx                     │
│                                                                        │
│ - groupedCategories (useMemo):                                         │
│     * Filter categories by filters.type if specified                   │
│     * Group by category.type                                           │
│     * Sort groups: Expense -> Income -> Transfer -> others             │
│     * Sort category names alphabetically within each group             │
│                                                                        │
│ - Category Filter Select:                                              │
│     * Render <option value="">All Categories</option>                  │
│     * Map over ordered groups and render <optgroup label={type}>       │
│                                                                        │
│ - Type Filter Effect:                                                  │
│     * When filters.type changes, if active category is not of that     │
│       type, reset filters.category to ''                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Execution Steps:

1. **`components/TransactionSearch.tsx`**:
   - Define type ordering priority: `const TYPE_ORDER = ['Expense', 'Income', 'Transfer', 'Balance'];`.
   - Implement `groupedCategories` `useMemo`:
     - Filter `categories` by `filters.type` if `filters.type` is set.
     - Group categories by their `type` field (fallback to `'Other'` if missing).
     - Sort categories alphabetically by `name` within each group.
     - Return an ordered array of `[typeName, categoryList]`.
   - Add a `useEffect` on `filters.type`:
     - If `filters.type` is set and `filters.category` is set, check if the selected category belongs to the new type. If not, reset `category` to `''`.
   - Update the Category `<select>` element to render `<optgroup label={type}>` with child `<option>` elements.

2. **Verification**:
   - Run `lint_applet` (`tsc --noEmit`).
   - Run `compile_applet` (`npm run build`).
   - Restart development server.

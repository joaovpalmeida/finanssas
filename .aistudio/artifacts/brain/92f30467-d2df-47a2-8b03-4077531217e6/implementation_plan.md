# Historical-First Category Resolution Plan

Reorder the category resolution pipeline during transaction import so that existing transaction history takes top priority, followed by matching against the categories table, and finally fallback handling.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed to govern the updated import pipeline:

- **Confirmed Decision 1**: **Historical transactions take top priority**. Even if an imported row specifies a category, the system will first attempt to infer the category from existing database transactions matching the transaction description, account, and amount.
- **Confirmed Decision 2**: **Sparkle badge enabled**. Any transaction whose category is resolved via historical transactions will display the sparkle icon (`Sparkles`) in the preview grid with a tooltip indicating it was auto-suggested from history.
- **Confirmed Decision 3**: **Secondary & Fallback tiers**:
  - If no historical match is found, match the imported category name against the `categories` table (trimmed, case-insensitive, matching transaction type `Income` vs `Expense`).
  - If still unmatched and the imported category is blank or `'Uncategorized'`, assign `'Uncategorized'`.
  - If still unmatched and a non-blank category was provided in the file, retain the trimmed original name (creating a new category upon import if needed).

---

## 1. Overview & Core Concept

- **What It Does**: During Excel/CSV import parsing, transactions are categorized through an inverted priority hierarchy:
  1. **Tier 1 (Historical Match First)**: Look up existing database transactions by description, account, amount, and type. If found, apply the historical category and set `isAutoCategorized = true`.
  2. **Tier 2 (Category Table Match)**: If no historical match exists and the row has a category, match against the `categories` table (case-insensitive & trimmed).
  3. **Tier 3 (Fallback)**: If still unmatched, use the raw trimmed category if provided, or default to `'Uncategorized'`.
- **Target Audience**: Users regularly importing bank statements where descriptions repeat and should automatically adopt their established categorization rules.
- **Key Value**: Reduces manual tagging effort by automatically applying past categorization choices across recurring payees, vendors, and account patterns.

---

## 2. User Experience & Visual Design

- **Import Preview Screen**:
  - Transactions matched from existing history display the canonical category name and the sparkle badge (`Sparkles`) with the tooltip *"Auto-suggested from transaction history"*.
  - Transactions matched directly from the categories table or raw input display their category cleanly.
  - Blank entries show `'Uncategorized'`.
  - Users retain the ability to manually override or bulk-rename any category inline before clicking "Import".

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Historical Precedence over File Categories**
  - *Chosen Approach*: Search historical transactions first, even when the incoming file has a category column.
  - *Why*: Bank-exported categories (e.g. "Debit POS Purchase" or "General Merchandise") are often generic or inaccurate compared to the user's custom categories previously assigned to those vendors in Finanssas.
  - *User Control*: The user can still edit any suggested category in the preview grid prior to final import.

- **Decision 2: Multi-Criteria Historical Search Depth**
  - *Chosen Approach*: Retain the existing hierarchical matching in `getHistoricalCategoryLookup`:
    1. Description + Account + Amount + Type
    2. Description + Account + Type
    3. Description + Type
    4. Description fallback
  - *Why*: Ensures the most specific historical match wins, preventing cross-account or cross-amount false positives where context differs.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Imported Row Data                    │
│       (description, account, amount, type, rawCat)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │         Tier 1: Historical Transaction Match         │
 │   historicalLookup.findMatch(desc, acc, amt, type)   │
 └──────────────┬───────────────────────────────┬───────┘
                │ Found                         │ Not Found
                ▼                               ▼
     ┌──────────────────────┐      ┌──────────────────────────────┐
     │ Apply historical     │      │ Tier 2: Category Table Match │
     │ category & set       │      │ Match rawCat in categoryMap  │
     │ isAutoCategorized    │      └────────┬──────────────┬──────┘
     │ (= Sparkle Badge)    │               │ Found        │ Not Found
     └──────────────────────┘               ▼              ▼
                               ┌──────────────────┐  ┌──────────────────┐
                               │ Apply canonical  │  │ Tier 3: Fallback │
                               │ category from DB │  │ isBlank?         │
                               └──────────────────┘  │ -> 'Uncategorized'│
                                                     │ Else -> rawCat   │
                                                     └──────────────────┘
```

### Component & File Changes

1. **`components/FileUpload.tsx`**:
   - In `handleParsePreview`, move the `historicalLookup.findMatch` block before the `categoryMap` lookup.
   - When `histMatch` is found:
     - Set `resolvedCategory = histMatch.name`
     - Set `resolvedCategoryId = histMatch.id`
     - Set `autoCat = true`
   - If no `histMatch` was found:
     - Check `categoryMap` using `${rawCat.toLowerCase()}:${t.type}`
     - If matched: set `resolvedCategory = directMatch.name`, `resolvedCategoryId = directMatch.id`, `autoCat = false`
     - Else: fallback to `'Uncategorized'` if blank, or `rawCat` if non-blank.
2. **Verification**:
   - Run `lint_applet` and `compile_applet`.
   - Verify dev server runs cleanly without regressions.

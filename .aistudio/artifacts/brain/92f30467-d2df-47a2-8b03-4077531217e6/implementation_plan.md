# Historical-First Category Resolution Plan

Reorder the category resolution pipeline during transaction import so that existing transaction history takes top priority, with frequency counting and recency tie-breaking, followed by matching against the categories table, and finally fallback handling.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions govern the import pipeline:

- **Confirmed Decision 1**: **Historical transactions take top priority**. Even if an imported row specifies a category, the system first infers the category from existing database transactions matching the transaction description, account, amount, and type.
- **Confirmed Decision 2**: **Frequency + Recency Tie-Breaker**:
  - When multiple historical categorizations exist for a given pattern, the category used with the **highest frequency (most occurrences)** is selected.
  - If occurrence counts are tied, the **most recent transaction date** breaks the tie.
  - In-memory single-pass aggregation guarantees sub-millisecond performance with instant $O(1)$ lookups during preview.
- **Confirmed Decision 3**: **Sparkle badge enabled**. Any transaction whose category is resolved via historical transactions displays the sparkle icon (`Sparkles`) in the preview grid.
- **Confirmed Decision 4**: **Secondary & Fallback tiers**:
  - If no historical match is found, match the imported category name against the `categories` table (trimmed, case-insensitive, matching transaction type `Income` vs `Expense`).
  - If still unmatched and the imported category is blank or `'Uncategorized'`, assign `'Uncategorized'`.
  - If still unmatched and a non-blank category was provided in the file, retain the trimmed original name.

---

## 1. Overview & Core Concept

- **What It Does**: During Excel/CSV import parsing, transactions are categorized through an intelligent hierarchy:
  1. **Tier 1 (Historical Match First)**: Look up existing database transactions by description, account, amount, and type. Resolve candidates by occurrence count first, then most recent date. If found, apply the historical category and set `isAutoCategorized = true`.
  2. **Tier 2 (Category Table Match)**: If no historical match exists and the row has a category, match against the `categories` table (case-insensitive & trimmed).
  3. **Tier 3 (Fallback)**: If still unmatched, use the raw trimmed category if provided, or default to `'Uncategorized'`.
- **Target Audience**: Users importing bank statements where descriptions repeat and should adopt their most established categorization habits.
- **Key Value**: Reduces manual tagging effort while preventing accidental one-off categorizations from overriding established norms.

---

## 2. Technical Architecture & Tie-Breaking Logic

```
┌────────────────────────────────────────────────────────┐
│                   Imported Row Data                    │
│       (description, account, amount, type, rawCat)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │         Tier 1: Historical Transaction Match         │
 │   1. Candidate Stats: { count, latestTime, name, id }│
 │   2. Winner: MAX(count), tie-break MAX(latestTime)   │
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

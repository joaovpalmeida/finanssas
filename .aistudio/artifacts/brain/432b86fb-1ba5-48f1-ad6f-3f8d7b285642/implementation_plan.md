# Case-Insensitive Category Matching & Multi-Tier Resolution for Transaction Import

Improve the import preview workflow to accurately find and associate the correct category for each transaction through a hierarchical multi-tier resolution process: exact trimmed/lowercase category name matching by type, historical transaction lookup (description/account/amount), and graceful fallback to trimmed original names or 'Uncategorized' when left blank.

> [!IMPORTANT]
> **Revised Logic from User Feedback**:
> - **Tier 1 (Direct Category Table Match)**: Trim and lowercase the imported category name, searching the `categories` table strictly for a category with the same normalized name and transaction type (`Income` vs `Expense`).
> - **Tier 2 (Historical Existing Transactions Match)**: If no category matches Tier 1, search existing transactions in the database using:
>   - *Primary candidate*: Matching `description` (trim + lower), `account` (trim + lower), and `amount/value`.
>   - *Secondary candidate*: Matching `description` and `account`.
>   - *Tertiary candidate*: Matching `description`.
> - **Tier 3 (Fallback)**: If still unmatched:
>   - If the category was left blank/empty or was `'Uncategorized'`, assign `'Uncategorized'`.
>   - If an original category name was provided, retain the trimmed original name (creating a new category upon import if needed).

---

### 1. Overview & Core Concept

When users import financial data (Excel or CSV), categories are often capitalized differently, contain leading/trailing whitespace, or are absent entirely. 

This enhancement implements an intelligent resolution pipeline:
1. **Name Normalization & Matching**: Exact match against the `categories` table (ignoring case and whitespace, preserving type boundaries).
2. **Contextual History Inference**: If the category is missing or not found in the categories table, search the transaction ledger by matching description, account, and amount to discover how identical or similar transactions were categorized in the past.
3. **Blank / Empty Handling**: Blank entries default safely to `'Uncategorized'`, while non-blank unmatched entries preserve their clean trimmed string.
4. **Resilient Persistence**: `insertTransactions` in SQLite enforces normalized category retrieval so duplicate category records are never introduced by subtle spacing or casing variations.

---

### 2. User Experience & Visual Design

- **Preview Screen**:
  - Automatically displays the resolved canonical category name in the preview table.
  - Transactions resolved via historical description/account/amount inference display a subtle "Auto-suggested" indicator (sparkle icon with tooltip indicating match source).
  - Transactions where the original category is blank display clean `'Uncategorized'`.
  - Non-blank unique categories are trimmed and cleanly formatted without leading/trailing whitespace.
- **Inline Editing & Bulk Rename**:
  - The category dropdown and datalist include all unique existing categories and parsed file categories cleanly trimmed and alphabetized.
  - Users can override any resolved category inline before clicking "Import".
- **Import Confirmation**:
  - Automatically associates matched category IDs into the SQLite database.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hierarchical Transaction History Matching**
  - *Chosen Approach*: Check (1) Description + Account + Amount, then (2) Description + Account, then (3) Description.
  - *Why*: A transaction with description "Shell" under "Main Checking" for $50 is most reliably categorized if matched against the same account and similar amount, avoiding false cross-account mismatches.
- **Decision 2: Blank vs Non-Blank Fallback**
  - *Chosen Approach*: Blank cells or empty strings resolve to `'Uncategorized'`. Non-empty original category names that do not match existing categories or historical entries retain their trimmed text so the user can import custom new categories.
  - *Why*: Matches user request directly while preserving user intent when novel categories are introduced in the file.
- **Decision 3: Double-Layer Case-Insensitive Defense**
  - *Chosen Approach*: Preview matching + SQLite insertion query using `LOWER(TRIM(name)) = LOWER(TRIM(?)) AND type = ?`.
  - *Why*: Prevents accidental duplicate categories from ever entering the database.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Excel / CSV Upload                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          parseExcelFile (Raw Extracted Rows)           │
│   Extracts raw date, desc, amount, category string     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          Hierarchical Category Resolution              │
│                                                        │
│  [Step 1: Direct Category Name Match]                  │
│  - Is rawCategory non-blank?                           │
│  - Match categories table where:                       │
│    LOWER(TRIM(cat.name)) == LOWER(TRIM(rawCategory))   │
│    AND cat.type == transaction.type                    │
│    ↳ Found? Apply canonical name & categoryId.         │
│                                                        │
│  [Step 2: Existing Transactions Match]                 │
│  - If Step 1 found no category:                        │
│    Search existing DB transactions for match on:       │
│    a) desc + account + amount                          │
│    b) desc + account                                   │
│    c) desc                                             │
│    ↳ Found? Apply matched category & mark suggested.   │
│                                                        │
│  [Step 3: Fallback]                                    │
│  - If rawCategory is blank or 'Uncategorized':         │
│    ↳ Assign 'Uncategorized'                            │
│  - Else:                                               │
│    ↳ Keep trimmed rawCategory                          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Interactive Preview Grid                  │
│       Inline editing & bulk rename support             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│     insertTransactions in services/db.ts               │
│   Safe lookup: LOWER(TRIM(name)) = LOWER(TRIM(?))      │
│   Links existing category ID or inserts cleanly        │
└────────────────────────────────────────────────────────┘
```

#### Component & State Details:
- **`services/db.ts`**:
  - Add `findCategoryFromExistingTransactions(desc: string, account: string, amount: number, type: string)` helper function that executes a tiered query on `transactions JOIN categories` looking up the most relevant historical category.
  - Ensure `insertTransactions` uses case-insensitive and trimmed category checks before creating any new category.
- **`components/FileUpload.tsx`**:
  - In `handlePreview`:
    - First check category table for exact trimmed/lowercase match with type filter.
    - If no category found, query `findCategoryFromExistingTransactions` (or preloaded indexed lookup map for fast in-memory execution).
    - If still no category found, set `'Uncategorized'` if original was blank/empty, or trimmed original category name if provided.
- **`utils/excelParser.ts`**:
  - Trim category string during row extraction. Blank strings become empty strings so they are cleanly detected as blank.

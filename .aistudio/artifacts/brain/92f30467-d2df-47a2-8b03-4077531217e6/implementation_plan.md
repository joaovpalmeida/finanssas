# GitHub Pages & AI Studio Dual-Environment Compatibility Plan

Configure Vite and build tooling to achieve full dual-environment compatibility across both GitHub Pages (`joaovpalmeida.github.io/finanssas/`) and the AI Studio hosting environment (`/`), while restoring the original `index.html` `<head>` tags (restoring the original `<title>` and removing the added `<meta>` tags).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions incorporate your requested revisions:

- **Confirmed Decision 1**: Configure a universal relative base (`base: './'`) in `vite.config.ts`. This ensures built assets (scripts, styles, and chunks) resolve correctly regardless of whether the site is served from a repository subpath (`/finanssas/`) or root (`/`).
- **Confirmed Decision 2 (Revision)**: Restore original `index.html` tags:
  - Restore `<title>Finan$$as - Smart Personal Finance</title>`.
  - Remove all newly added `<meta>` tags (`description`, `og:title`, and `og:description`), keeping only the original `charset` and `viewport` tags.
- **Confirmed Decision 3**: Retain all TypeScript fixes (`BudgetType` & `MonthlyBudget` imports in `services/db.ts`), `tsconfig.json`, and clean package configuration so that the existing GitHub Actions workflow (`static.yml`) runs and deploys smoothly without compilation failures.

---

## 1. Overview & Core Concept

- **What It Does**: Enables Finanssas to build and execute identically in both deployment environments:
  - **GitHub Pages**: Served under the subfolder path `https://joaovpalmeida.github.io/finanssas/`
  - **AI Studio**: Served from the root path `https://ais-dev-...run.app/`
- **Target Audience**: Existing users accessing the GitHub Pages live deployment as well as developers previewing and editing the app in AI Studio.
- **Key Value**: Prevents blank screens and 404 asset errors when pushing updates to the repository, while strictly preserving your original HTML structure and branding.

---

## 2. User Experience & Deployment Flow

- **Deployment Flow**:
  1. Changes are pushed to GitHub (`main` branch).
  2. GitHub Actions (`.github/workflows/static.yml`) triggers `npm install` and `npm run build`.
  3. Vite compiles the application with `./assets/...` relative asset paths into `dist/`.
  4. GitHub Pages deploys `dist/` to `https://joaovpalmeida.github.io/finanssas/`.
  5. The browser successfully loads all scripts and styles relative to the `/finanssas/` path.
- **App Experience**: The original document title `Finan$$as - Smart Personal Finance` is displayed in the browser tab. The head metadata matches the original repository state.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Universal Relative Base (`./`) vs. Hardcoded Subpath (`/finanssas/`)**
  - *Chosen Approach*: `base: './'` in `vite.config.ts`.
  - *Why*: Relative paths work seamlessly across any hosting URL—whether root domain, repository subpath, or custom domain—without requiring build environment variables or separate config files.
  - *Alternatives Considered*: Hardcoding `base: "/finanssas"` breaks preview in AI Studio; environment-dependent base (`GITHUB_ACTIONS ? '/finanssas/' : '/'`) adds unnecessary CI coupling.

- **Decision 2: Original HTML Head Restoration**
  - *Chosen Approach*: Restore `<title>Finan$$as - Smart Personal Finance</title>` and remove the added `<meta>` tags.
  - *Why*: Directly honors user request and restores the original HTML head configuration.

- **Decision 3: Preserving TypeScript and Package Fixes**
  - *Chosen Approach*: Keep the added imports (`BudgetType`, `MonthlyBudget`) in `services/db.ts` and the `tsconfig.json` configuration.
  - *Why*: Resolves actual compilation errors that would otherwise break `npm run build` during CI runs.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   GitHub Repository                    │
│                 (joaovpalmeida/finanssas)              │
└──────────────────────────┬─────────────────────────────┘
                           │ git push main
                           ▼
┌────────────────────────────────────────────────────────┐
│          GitHub Actions (.github/workflows/static.yml) │
│          - npm install                                 │
│          - npm run build (Vite with base: './')        │
└──────────────────────────┬─────────────────────────────┘
                           │ outputs dist/
            ┌──────────────┴──────────────┐
            ▼                             ▼
 ┌──────────────────────┐      ┌──────────────────────┐
 │    GitHub Pages      │      │      AI Studio       │
 │   (/finanssas/)      │      │         (/)          │
 │                      │      │                      │
 │ - index.html         │      │ - index.html         │
 │   (Original Head)    │      │   (Original Head)    │
 │ - ./assets/*.js      │      │ - ./assets/*.js      │
 │ - ./assets/*.css     │      │ - ./assets/*.css     │
 │                      │      │                      │
 │  ✓ 200 OK (Relative) │      │  ✓ 200 OK (Relative) │
 └──────────────────────┘      └──────────────────────┘
```

### Component & File Mapping

1. **`vite.config.ts`**:
   - Set `base: './'` to enforce relative paths across all asset emissions and dynamic chunk imports.
   - Retain `server: { host: '0.0.0.0', port: 3000, allowedHosts: true }` for AI Studio dev server support.
2. **`index.html`**:
   - Restore `<title>Finan$$as - Smart Personal Finance</title>`.
   - Remove `<meta name="description">`, `<meta property="og:title">`, and `<meta property="og:description">`.
   - Ensure module script reference remains compatible with relative resolution (`/index.tsx` for Vite dev server, transformed to `./assets/...` during build).
3. **Verification**:
   - Run `npm run build` and inspect `dist/index.html` to confirm asset links use `./assets/...`, the original title is present, and extra meta tags are removed.
   - Run `compile_applet` to confirm build succeeds.

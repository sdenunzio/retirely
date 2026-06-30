# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Retirely** (retirely.ca) — a free, client-side Canadian retirement scenario calculator. No backend, no sign-up: all state lives in React and `localStorage`. It models RRSP / TFSA / non-registered / LIRA accounts, CPP/OAS timing, RRIF minimums, DB pensions, GIS, provincial tax for all 10 provinces, Monte Carlo, FIRE, home downsizing, and rental-property cash flow.

## Commands

```bash
npm install        # install deps (also the per-workspace DevSwarm setup script;
                   #   its "prepare" step wires up the git pre-push hook)
npm run dev        # Vite dev server (defaults to port 5173; honours $PORT)
npm run build      # production build to dist/
npm run preview    # serve the built dist/

npm test           # run the Vitest suite once (CI / pre-push)
npm run test:watch # Vitest in watch mode for local dev
npx vitest run src/lib/engine.test.js   # run a single test file
npx vitest -t "OAS clawback"            # run tests matching a name

npm run lint       # ESLint (errors fail; warnings are tolerated)
npm run lint:fix   # ESLint with --fix
```

The dev/preview port reads `process.env.PORT` (see `vite.config.js`), which DevSwarm sets per workspace — keep that wiring intact so parallel workspaces don't collide.

## Quality gates & review workflow

Tests, lint, and review run at three points — keep all three green:

1. **After writing code (local review):** run the `/code-review` skill on the working diff before proposing a PR. This is an agent step, not installed tooling.
2. **Before pushing (enforced):** a `pre-push` git hook (`.githooks/pre-push`, enabled via `core.hooksPath`, set automatically by `npm install`'s `prepare` script) runs `npm run lint && npm test` and **blocks the push if either fails**. The hook lives in a committed `.githooks/` dir rather than `.git/hooks` so it works inside DevSwarm git worktrees. Emergency bypass: `git push --no-verify`.
3. **On the PR (CI):** `.github/workflows/ci.yml` runs lint + tests + build on every pull request and push to `main`/`master`.

### Testing notes

- **Vitest** (config lives in the `test` block of `vite.config.js`); jsdom environment, globals enabled, setup in `src/test/setup.js` (jest-dom matchers + auto-cleanup).
- Tests are colocated as `*.test.js` / `*.test.jsx` next to their subject.
- **Highest-value targets are the pure engines** (`src/lib/engine.test.js`, `propertyEngine.test.js`) — tax, RRIF/LIF, CPP/OAS timing, accumulation, FIRE, IRR, mortgage math. Component tests are render/interaction **smoke tests** (`@testing-library/react` + `user-event`), not exhaustive.

### Lint notes

- **ESLint flat config** (`eslint.config.js`): `js` + `react` + `react-hooks` + `react-refresh` recommended sets. The codebase predates the linter, so noisy stylistic rules (`prop-types`, unescaped entities, unused vars) are **warnings**; real-bug rules (`no-undef`, `rules-of-hooks`) stay **errors**. Don't promote warnings to errors wholesale — that would make the gate fail on legacy code. Prefix intentionally-unused vars/args with `_`.

## Architecture

Three independent single-page tools, routed by `HashRouter` in `src/main.jsx` (hash routing because the app deploys as static files):

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `src/App.jsx` | Main retirement scenario calculator |
| `/speculator` | `src/pages/SpeculatorPage.jsx` | Rental-property / real-estate speculation analyzer |
| `/estate` | `src/pages/EstatePage.jsx` | Estate planner (provincial probate fees, etc.) |

`AppSwitcher` toggles between them. They share the `src/lib` engines but have separate state, persistence keys, and scenario hooks.

### The calculation core (`src/lib/`)

All financial math is **pure functions** in two engine modules — no React, no side effects. This is where domain logic lives; UI components only render their output.

- **`engine.js`** — the retirement engine. Key exports: `growToRetirement`/`growToRetirementYearly` (accumulation), `runScenario` → `simulatePerson` (year-by-year drawdown simulation), `buildScenarios` (the strategy definitions), `runMonteCarlo`, `calcFIRE`, `solveWorkBackwards`, plus the tax/benefit primitives `approxTax`, `oasClawback`, `rrifMinimum`, `lifMaximum`, `calcProvSupplement`. Embedded constants: `PROVINCE_TAX` and `FED_BRACKETS` (2024 rates), `PROV_SUPPLEMENTS` (2025).
- **`propertyEngine.js`** — mortgage/IRR/cash-flow math for the property tools: `analyseProperty`, `analysePropertyMulti`, `monthlyPayment`, `mortgageBalance`, `calcIRR`. Uses Canadian semi-annual mortgage compounding (`canadianMonthlyRate`).

### Strategies are data, not code

`buildScenarios()` returns an array of strategy objects (`standard`, `early`, `delay`, `gis`, `equalise`). Each carries CPP/OAS start ages, a `withdrawOrder` (e.g. `['nr','rrsp','tfsa']`), flags like `gis`/`equalise`/`couplesOnly`, and rich `fullExplanation` prose shown in the UI. `runScenario` interprets these fields; **to add or change a strategy, edit the data object here** rather than branching in the simulation loop.

### State flow (main calculator)

`useCalculator` (`src/hooks/useCalculator.js`) is the hub. It owns three state slices — `person`, `spouse`, `shared` (defaults defined at the top of the file) — plus `propertyState`. `results` is a `useMemo` that fires the whole engine pipeline (accumulation → `buildScenarios` → `runScenario` per strategy → `calcFIRE`) only when `hasRun` is true; `calculate()` flips that flag. Couple mode (`shared.coupleMode`) threads a parallel spouse simulation through everything, including spousal-RRSP attribution and income equalisation.

`App.jsx` is mostly presentation: a sidebar `InputPanel`, a tabbed main area (`MAIN_TABS`), and modals. Each tab component receives `results` + the relevant state slices as props — **prop drilling, no global store/context** for calculator data.

### Persistence

Auto-saved to `localStorage` (debounced 800ms in `usePersistence.js`). Each feature uses its own versioned key — when adding storage, follow the `retirement_lab_*_v1` convention and register the key in `App.jsx`'s `handleFullReset` so a full reset clears it:

- `retirement_lab_v1` — main calculator snapshot
- `retirement_lab_scenarios_v1` — saved/named scenarios (`useScenarios`)
- `retirement_lab_speculator_v1` — property speculator (`useSpeculatorScenarios`)
- `retirement_lab_onboarded_v1` — first-visit wizard flag
- `retirement_lab_theme` — dark/light (`useTheme`)

### Conventions

- **CSS Modules** everywhere: every component has a co-located `*.module.css`; import as `styles` and use `styles.className`.
- Currency/percent formatting helpers (`fmt`, `fmtK`, `fmtM`, `pct`, `fmtC`) are exported from the engines — reuse them, they use `en-CA` locale.
- Exports (PDF/Excel) live in `useExcelExport.js` / `usePdfExport.js` and use `jspdf` + `html2canvas` + `xlsx`.
- Tax tables, benefit thresholds, and contribution-room numbers are hard-coded by year. When updating rates, they're centralized in `engine.js` — search for the year comments (`2024`, `2025`).
- This is **illustrative, not financial advice** — the disclaimer is load-bearing product copy, not boilerplate to remove.

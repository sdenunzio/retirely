# Retirely marketing site — design spec

**Date:** 2026-07-02
**Status:** Approved

## Goal

Turn Retirely from an app-at-the-root into a **true website**: a marketing Home
page, an Articles/tips hub, and the retirement calculator as one sub-part of the
site. Visitors land on Home → browse guides → use the calculator. Use the real
Retirely brand mark (not the stale `RetirePlan.CA` logo asset).

## Decisions (locked)

- **Logo:** Retirely icon (the app's beaker/bar-chart inline SVG, matching
  `TopBar`'s `LogoMark`) + a "Retirely" wordmark, as a shared brand component.
  The stale `public/logo.svg` / `logo.png` ("RetirePlan.CA") are NOT used.
- **App URL:** calculator moves to `/calculator`; `/speculator` and `/estate`
  stay. Home (marketing) takes `/`.
- **Articles:** authored as Markdown files, prerendered to static HTML.

## URL map

| URL | Type | Notes |
|-----|------|-------|
| `/` | static | Home (marketing) — overwrites the built SPA `index.html` |
| `/articles` | static | Articles hub (newest-first) |
| `/articles/<slug>` | static | One article, from `content/articles/<slug>.md` |
| `/rrsp-calculator` … (19) | static | Existing SEO topic pages, re-skinned with real logo |
| `/calculator` | SPA shell | Retirement app (moved from `/`) |
| `/speculator`, `/estate` | SPA shell | Other two tools |
| `/sitemap.xml`, `/robots.txt` | generated | Include Home, `/calculator`, `/articles`, every article |

Serving is unchanged in mechanism: flat `.html` files + the existing `.htaccess`
clean-URL rewrite (real file → `<path>.html` → SPA fallback to `index.html`).

## Components

### `src/site/brand.js` (shared chrome)
- `LOGO_SVG` — the Retirely beaker/bar-chart mark (string SVG, visually identical
  to `TopBar` `LogoMark`) + wordmark.
- `siteHeader(activeNav)` — sticky header: logo→`/`, nav (Home · Calculators ·
  Articles · **Launch app**→`/calculator`).
- `siteFooter()` — brand, footer nav, disclaimer, copyright.
- `PAGE_CSS` — shared stylesheet (dark-navy `#0D1B2A` + teal `#1FCFB0/#0F9E75`,
  DM Sans). Light content pages; dark hero on Home.
- **`src/seo/render.js` is refactored to consume these** so the 19 topic pages
  get the correct logo + consistent chrome (removes the `/logo.svg` `<img>`).

### `src/site/home.js`
`renderHome({ articles })` → static Home: dark hero (brand, headline, subhead
"free · no sign-up · all 10 provinces", CTA→`/calculator`, secondary→`/articles`)
→ features grid → how-it-works (3 steps) → popular-calculators grid (links to
topic pages) → latest articles (3–4 cards) → FAQ → CTA band → footer.
Schema: `WebSite` + `Organization` + `FAQPage`.

### `src/site/articles.js`
- `loadArticles(dir)` (Node/fs) — reads `content/articles/*.md`, parses
  frontmatter (`gray-matter`) + body (`marked`), returns article objects sorted
  by date desc. Validates required frontmatter.
- `renderArticle(article)` (pure) — header, breadcrumb, H1, byline (date · read
  time · tags), rendered body, related-calculator CTA, related articles, optional
  FAQ. Schema: `Article` + `BreadcrumbList` + optional `FAQPage`.
- `renderArticlesHub(articles)` (pure) — H1, intro, newest-first cards. Schema:
  `CollectionPage` + `BreadcrumbList`.

Frontmatter: `title, description, date (YYYY-MM-DD), tags[], faqs?[], related?[]
(article slugs), calculator?({ slug, label, tab })`.

### Starter articles (5, Markdown)
Editorial angles that complement — not duplicate — the calculator topic pages:
1. How much do you need to retire in Canada?
2. The order to draw down your accounts in retirement
3. Sequence-of-returns risk: why the first five years matter
4. The bridging strategy: living off savings to delay CPP to 70
5. Seven ways to cut your tax bill in retirement

Each links into the relevant calculator via the `calculator` frontmatter CTA.

### Build generator (`scripts/generate-seo-pages.mjs`, extended)
Order after `vite build`:
1. Build app-route shells → `calculator.html`, `speculator.html`, `estate.html`
   (from the built `index.html`, via `buildAppShell`).
2. Overwrite `dist/index.html` with `renderHome()`.
3. Render topic pages (existing).
4. Load Markdown, render `/articles` hub + each `/articles/<slug>`.
5. Regenerate `sitemap.xml` + `robots.txt`.

### App wiring
- `main.jsx`: routes `/calculator`→`App`, `/speculator`, `/estate`; redirect `/`
  → `/calculator` defensively (SPA only boots on those shells anyway).
- `AppSwitcher`: paths → `/calculator`, `/speculator`, `/estate`; logo/brand
  links to `/` (home).
- `App.jsx` full-reset + `usePageMeta` canonicals updated to `/calculator`.
- All topic-page CTAs `/?tab=` → `/calculator?tab=`.

## Dependencies
- `marked` (Markdown→HTML), `gray-matter` (frontmatter) as devDependencies.

## Testing
- `src/site/*.test.js`: frontmatter validation, article slug/date/required
  fields, hub sort order, renderer output (H1, schema types, canonical, CTA).
- Extend `src/seo/content.test.js` for the `/calculator` CTA change + sitemap
  coverage of Home/articles.
- Keep lint clean (0 errors) and all tests green (pre-push gate).

## Out of scope (YAGNI)
- No CMS, comments, search, pagination, tag-filter pages, or author profiles.
- No RSS (can add later if wanted).
- No visual redesign of the calculator app itself beyond the logo-links-home tweak.

## Verification
- `npm run build` succeeds; `npm run serve:static` serves the whole site.
- Re-run the no-JS crawler: Home, `/articles`, each article, `/calculator`,
  topic pages all 200 with correct canonicals + rich content.
- Headless check: `/calculator` boots the app; Home + an article render on-brand
  with the correct Retirely logo.

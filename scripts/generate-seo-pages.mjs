#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Post-build static-site generator.
//
// Runs after `vite build`. Turns the built SPA into a full website:
//   • the marketing Home page          → dist/index.html
//   • the Articles hub + each article   → dist/articles.html, dist/articles/*.html
//   • one SEO topic page per intent     → dist/<slug>.html (topic + province)
//   • SPA shells for the app routes      → dist/calculator.html, speculator.html …
//   • sitemap.xml + robots.txt
//
// Everything is pre-rendered to fully-crawlable HTML so crawlers and AI answer
// engines get the complete picture without executing JavaScript.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PAGES, APP_ROUTES, SITE, sitemapUrls } from '../src/seo/content.js'
import { renderPage, buildAppShell, renderNotFound } from '../src/seo/render.js'
import { renderHome } from '../src/site/home.js'
import { loadArticles, renderArticle, renderArticlesHub } from '../src/site/articles.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')
const ARTICLES_DIR = join(ROOT, 'content', 'articles')

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `vite build` before generating SEO pages.')
  process.exit(1)
}

async function writePage(slug, html) {
  // Flat files so clean URLs are served with NO redirect via an .htaccess
  // rewrite ("/rrsp-calculator" → "rrsp-calculator.html"). This avoids the
  // directory-index 301-to-trailing-slash behaviour that would otherwise
  // create a canonical mismatch.
  //   "rrsp-calculator"            → dist/rrsp-calculator.html
  //   "ontario/retirement-…"       → dist/ontario/retirement-….html
  const outFile = join(DIST, `${slug}.html`)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, html, 'utf8')
}

function sitemapXml(articles) {
  const urls = sitemapUrls(articles)
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function robotsTxt() {
  return `# Retirely — retirely.ca
User-agent: *
Allow: /
Disallow: /src/
Disallow: /.git/

Sitemap: ${SITE.domain}/sitemap.xml
`
}

async function main() {
  // 1) SPA shells for the app routes — derived from the built index.html BEFORE
  //    we overwrite it with the Home page, so they keep the hashed bundle refs.
  const spaShell = await readFile(join(DIST, 'index.html'), 'utf8')
  for (const route of APP_ROUTES) {
    await writePage(route.path, buildAppShell(spaShell, route))
  }

  // 2) SEO topic pages (per-calculator, comparisons, per-province).
  for (const page of PAGES) {
    await writePage(page.slug, renderPage(page))
  }

  // 3) Articles (Markdown → static hub + pages).
  const articles = await loadArticles(ARTICLES_DIR)
  const bySlug = Object.fromEntries(articles.map((a) => [a.slug, a]))
  await writePage('articles', renderArticlesHub(articles))
  for (const a of articles) {
    await writePage(`articles/${a.slug}`, renderArticle(a, bySlug))
  }

  // 4) Marketing Home — overwrites the SPA entry at dist/index.html.
  await writeFile(join(DIST, 'index.html'), renderHome({ articles }), 'utf8')

  // 5) sitemap + robots (include every article). 404 is intentionally NOT in
  //    the sitemap — it's a noindex error page served via ErrorDocument.
  await writeFile(join(DIST, 'sitemap.xml'), sitemapXml(articles), 'utf8')
  await writeFile(join(DIST, 'robots.txt'), robotsTxt(), 'utf8')

  // 6) Custom 404 page (served with a true 404 status by .htaccess ErrorDocument).
  await writeFile(join(DIST, '404.html'), renderNotFound(), 'utf8')

  const total = APP_ROUTES.length + PAGES.length + 1 + articles.length + 1 // +hub +home
  console.log(
    `✓ Built ${total} static pages: Home + ${APP_ROUTES.length} app shells + ` +
      `${PAGES.length} topic pages + Articles hub + ${articles.length} articles. ` +
      `sitemap.xml (${sitemapUrls(articles).length} URLs) + robots.txt`,
  )
}

main().catch((err) => {
  console.error('✗ SEO generation failed:', err)
  process.exit(1)
})

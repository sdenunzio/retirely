// ─────────────────────────────────────────────────────────────────────────────
// Shared brand chrome for every static page (Home, Articles, topic pages).
//
// Uses the REAL Retirely mark — the beaker/bar-chart icon from the app's
// TopBar `LogoMark`, paired with a "Retirely" wordmark — NOT the stale
// public/logo.svg ("RetirePlan.CA"). Pure, browser-free string builders.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_URL = '/calculator'

// The Retirely icon. `id` namespaces the gradients so multiple marks can appear
// on one page (e.g. header + hero) without clashing gradient definitions.
export function logoMark(id = 'rl', size = 30) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="border-radius:${Math.round(size * 0.3)}px;flex-shrink:0">
  <defs>
    <linearGradient id="${id}Bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0D1B2A"/><stop offset="100%" stop-color="#0F2E3F"/></linearGradient>
    <linearGradient id="${id}Teal" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1FCFB0"/><stop offset="100%" stop-color="#0F9E75"/></linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#${id}Bg)"/>
  <rect width="64" height="64" rx="14" fill="none" stroke="rgba(31,207,176,0.22)" stroke-width="1.5"/>
  <line x1="10" y1="52" x2="54" y2="52" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="10" y1="52" x2="10" y2="10" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-linecap="round"/>
  <rect x="14" y="38" width="9" height="14" rx="2" fill="rgba(31,207,176,0.25)"/>
  <rect x="27" y="28" width="9" height="24" rx="2" fill="rgba(31,207,176,0.45)"/>
  <rect x="40" y="16" width="9" height="36" rx="2" fill="url(#${id}Teal)"/>
  <polyline points="18.5,36 31.5,26 44.5,14" fill="none" stroke="#1FCFB0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="44.5" cy="14" r="3.2" fill="#1FCFB0"/>
  <circle cx="44.5" cy="14" r="1.4" fill="#fff"/>
</svg>`
}

// Brand lockup: icon + wordmark, linking home. `tone` = 'dark' for the navy hero
// (light text) or 'light' for the white header (dark text).
export function brandLockup({ id = 'rl', size = 30, tone = 'light', href = '/' } = {}) {
  const wm = tone === 'dark' ? 'wordmark wordmark-dark' : 'wordmark'
  return `<a class="brand" href="${href}" aria-label="Retirely home">${logoMark(id, size)}<span class="${wm}">Retirely</span></a>`
}

const NAV = [
  { label: 'Home', href: '/', key: 'home' },
  { label: 'Calculators', href: '/canadian-retirement-calculator', key: 'calculators' },
  { label: 'Articles', href: '/articles', key: 'articles' },
]

export function siteHeader(active = '') {
  const links = NAV.map(
    (n) =>
      `<a href="${n.href}"${n.key === active ? ' aria-current="page" class="active"' : ''}>${n.label}</a>`,
  ).join('')
  return `<header class="site-header">
    ${brandLockup({ id: 'hdr', size: 30 })}
    <nav class="top-nav" aria-label="Primary">
      ${links}
      <a class="nav-cta" href="${APP_URL}">Launch app</a>
    </nav>
  </header>`
}

export function siteFooter() {
  return `<footer class="site-footer">
    <div class="foot-brand">${brandLockup({ id: 'ftr', size: 26, tone: 'dark' })}</div>
    <p class="foot-tag">Free Canadian retirement scenario calculator. Illustrative only — not financial, tax or investment advice.</p>
    <nav class="foot-nav" aria-label="Footer">
      <a href="/">Home</a>
      <a href="/canadian-retirement-calculator">Calculators</a>
      <a href="/articles">Articles</a>
      <a href="${APP_URL}">Retirement calculator</a>
      <a href="/speculator">Rental property</a>
      <a href="/estate">Estate planner</a>
    </nav>
    <p class="foot-copy">© 2024–2026 Retirely (retirely.ca). All rights reserved.</p>
  </footer>`
}

// Google Fonts + preconnect, shared by every static page's <head>.
export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />`

// Shared stylesheet — dark-navy + teal brand, DM Sans. Content pages are light;
// the Home hero and footer are dark.
export const PAGE_CSS = `
:root{--navy:#0D1B2A;--navy2:#0F2E3F;--ink:#1a2733;--muted:#5b6b7a;--teal:#12b3a3;--teal-d:#0b7d72;--teal-br:#1FCFB0;--line:#e3e8ee;--bg:#f7f9fb;--card:#fff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--teal-d);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%}
/* Header */
.site-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem 1.5rem;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.brand{display:inline-flex;align-items:center;gap:.55rem}
.brand:hover{text-decoration:none}
.wordmark{font-weight:700;font-size:1.25rem;letter-spacing:-.02em;color:var(--navy)}
.wordmark-dark{color:#fff}
.top-nav{display:flex;gap:1.3rem;flex-wrap:wrap;align-items:center}
.top-nav a{color:#42525f;font-size:.94rem;font-weight:500}
.top-nav a.active{color:var(--navy)}
.top-nav a:hover{color:var(--navy);text-decoration:none}
.top-nav .nav-cta{background:var(--teal);color:#fff;padding:.5rem .95rem;border-radius:9px}
.top-nav .nav-cta:hover{background:#0ea192}
/* Generic content page */
.page{max-width:800px;margin:0 auto;padding:1.5rem 1.25rem 3rem}
.crumbs{font-size:.85rem;color:var(--muted);margin:.5rem 0 1.25rem}
.crumbs .sep{margin:0 .45rem;color:#aab6c2}
h1{font-size:2.1rem;line-height:1.15;letter-spacing:-.02em;margin:.2rem 0 .6rem;color:var(--navy)}
h2{font-size:1.4rem;letter-spacing:-.01em;margin:2.2rem 0 .6rem;color:var(--navy)}
h3{font-size:1.08rem;margin:1.2rem 0 .3rem;color:var(--ink)}
.lead{font-size:1.18rem;color:#33424f;margin:.4rem 0 1.4rem}
p{margin:.6rem 0}
ul,ol{padding-left:1.2rem}
li{margin:.3rem 0}
.muted{color:var(--muted);font-size:.9rem}
blockquote{margin:1.2rem 0;padding:.4rem 0 .4rem 1rem;border-left:3px solid var(--teal-br);color:#33424f}
code{background:#eef3f7;padding:.1rem .35rem;border-radius:5px;font-family:'DM Mono',monospace;font-size:.9em}
/* Tables */
.tbl{margin:1.1rem 0;overflow-x:auto}
.tbl figcaption{font-size:.85rem;color:var(--muted);margin-bottom:.4rem}
table{border-collapse:collapse;width:100%;font-size:.95rem;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:.55rem .8rem;text-align:left;border-bottom:1px solid var(--line)}
th{background:#eef3f7;font-weight:600;color:var(--navy)}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:#fafcfd}
/* CTA */
.cta{background:linear-gradient(135deg,#0D1B2A,#132b3f);color:#fff;border-radius:14px;padding:1.4rem;text-align:center;margin:1.6rem 0}
.cta-btn{display:inline-block;background:var(--teal);color:#fff;font-weight:600;font-size:1.05rem;padding:.8rem 1.5rem;border-radius:10px}
.cta-btn:hover{background:#12b3a3;text-decoration:none}
.cta-note{color:#b9c6d2;font-size:.86rem;margin:.7rem 0 0}
/* Clusters / related */
.cluster{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem}
.cluster li{margin:0}
.cluster a{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;font-weight:500}
.cluster a:hover{border-color:var(--teal);text-decoration:none}
.faq{margin-top:2.4rem}
.faq-item{border-top:1px solid var(--line);padding-top:.4rem;margin-top:1rem}
.faq-item h3{margin-top:.4rem}
.related{margin-top:2.6rem;border-top:1px solid var(--line);padding-top:1rem}
.related-grid{display:flex;flex-wrap:wrap;gap:.5rem}
.related-grid a{background:#eef3f7;border-radius:20px;padding:.4rem .9rem;font-size:.9rem;font-weight:500}
.related-grid a:hover{background:#e0eaf0;text-decoration:none}
/* Footer */
.site-footer{background:var(--navy);color:#aab6c2;padding:2.4rem 1.25rem;text-align:center;font-size:.9rem}
.site-footer .foot-brand{display:flex;justify-content:center;margin-bottom:.6rem}
.foot-tag{max-width:520px;margin:.3rem auto}
.foot-nav{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:.9rem 0}
.foot-nav a{color:#cdd8e3}
.foot-copy{font-size:.8rem;color:#7c8b99;margin-top:.6rem}
/* ── Home ── */
.hero{background:radial-gradient(1200px 500px at 70% -10%,rgba(31,207,176,0.16),transparent),linear-gradient(160deg,#0D1B2A,#0F2E3F);color:#fff;padding:4rem 1.25rem 4.5rem}
.hero-inner{max-width:900px;margin:0 auto;text-align:center}
.hero .badge{display:inline-block;background:rgba(31,207,176,0.14);border:1px solid rgba(31,207,176,0.35);color:#8ff0df;font-size:.82rem;font-weight:500;padding:.3rem .8rem;border-radius:20px;margin-bottom:1.2rem}
.hero h1{color:#fff;font-size:2.9rem;margin:.3rem 0 .8rem}
.hero p.sub{font-size:1.28rem;color:#cdd8e3;max-width:680px;margin:0 auto 1.8rem}
.hero-cta{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap}
.btn-primary{display:inline-block;background:var(--teal);color:#fff;font-weight:600;font-size:1.08rem;padding:.85rem 1.7rem;border-radius:11px}
.btn-primary:hover{background:#14c2b0;text-decoration:none}
.btn-ghost{display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.25);color:#fff;font-weight:600;font-size:1.08rem;padding:.85rem 1.7rem;border-radius:11px}
.btn-ghost:hover{background:rgba(255,255,255,0.12);text-decoration:none}
.hero .trust{color:#8494a3;font-size:.85rem;margin-top:1.4rem}
.section{max-width:1000px;margin:0 auto;padding:3rem 1.25rem}
.section h2{text-align:center;font-size:1.8rem;margin:0 0 .4rem}
.section .section-sub{text-align:center;color:var(--muted);max-width:620px;margin:0 auto 2rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.feature{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:1.3rem}
.feature h3{margin:.1rem 0 .3rem;color:var(--navy)}
.feature p{margin:0;color:#4a5865;font-size:.95rem}
.feature .ico{font-size:1.4rem}
.steps{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));counter-reset:step}
.step{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:1.3rem;position:relative}
.step h3{margin:.5rem 0 .3rem;color:var(--navy)}
.step .n{width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--navy);color:var(--teal-br);font-weight:700}
.calc-grid{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.calc-card{display:block;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:.85rem 1rem;font-weight:500;color:var(--navy)}
.calc-card:hover{border-color:var(--teal);text-decoration:none;box-shadow:0 4px 14px rgba(13,27,42,.06)}
.calc-card span{display:block;color:var(--muted);font-size:.85rem;font-weight:400;margin-top:.15rem}
.band{background:linear-gradient(135deg,#0D1B2A,#123247);color:#fff;text-align:center;padding:3rem 1.25rem}
.band h2{color:#fff;font-size:1.8rem;margin:0 0 .5rem}
.band p{color:#cdd8e3;margin:0 0 1.4rem}
/* Article cards */
.card-grid{display:grid;gap:1.1rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.art-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:1.2rem;color:inherit}
.art-card:hover{border-color:var(--teal);text-decoration:none;box-shadow:0 6px 18px rgba(13,27,42,.07)}
.art-card .meta{font-size:.8rem;color:var(--muted);margin-bottom:.4rem}
.art-card h3{margin:.1rem 0 .4rem;color:var(--navy);font-size:1.12rem}
.art-card p{margin:0;color:#4a5865;font-size:.93rem;flex:1}
.art-card .tag{display:inline-block;margin-top:.7rem;background:#eef3f7;color:var(--teal-d);font-size:.78rem;font-weight:500;padding:.2rem .6rem;border-radius:12px}
/* Article body */
.article{max-width:720px}
.byline{color:var(--muted);font-size:.9rem;margin:.2rem 0 1.4rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.byline .dot{color:#c3ccd4}
.article-body h2{font-size:1.5rem}
.article-body h3{font-size:1.18rem}
.article-body img{border-radius:10px}
@media(max-width:600px){.hero h1{font-size:2.1rem}.hero p.sub{font-size:1.08rem}h1{font-size:1.7rem}.site-header{flex-wrap:wrap}.top-nav{gap:.9rem}}
`

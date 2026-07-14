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
    <nav class="foot-legal" aria-label="Legal">
      <a href="/privacy">Privacy</a>
      <span class="foot-sep">·</span>
      <a href="/terms">Terms &amp; Disclaimer</a>
    </nav>
    <p class="foot-copy">© 2024–2026 Retirely (retirely.ca). All rights reserved.</p>
  </footer>`
}

// Self-hosted fonts (DM Sans + DM Mono, latin subset) — NO third-party request.
// The woff2 files live in public/fonts/ (downloaded by scripts/fetch-fonts.mjs)
// and are copied to dist/ by Vite. This @font-face block is embedded in PAGE_CSS
// below so every static page renders the brand type with zero external calls.
export const FONT_FACE = `@font-face{font-family:'DM Sans';font-style:italic;font-weight:300;font-display:swap;src:url(/fonts/dm-sans-300-italic.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:300;font-display:swap;src:url(/fonts/dm-sans-300.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/dm-sans-400.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/dm-sans-500.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/dm-sans-600.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/dm-sans-700.woff2) format('woff2')}
@font-face{font-family:'DM Mono';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/dm-mono-400.woff2) format('woff2')}
@font-face{font-family:'DM Mono';font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/dm-mono-500.woff2) format('woff2')}`

// Preload the primary body weight so first paint isn't blocked. Same-origin, so
// no crossorigin/preconnect needed. Injected into every static page's <head>.
export const FONT_LINKS = `<link rel="preload" href="/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin />`

// Shared stylesheet — dark-navy + teal brand, DM Sans (shared with the app, so
// identity-preserved). Content pages are light; the Home hero, footer and CTA
// bands are dark. No emoji icons, no repeated card grids — sections vary their
// layout so the page reads as designed, not templated.
export const PAGE_CSS = `
${FONT_FACE}
:root{
  --navy:#0D1B2A;--navy2:#0F2E3F;--ink:#16232f;--body:#37485a;--muted:#556472;
  --teal:#12b3a3;--teal-d:#0b7d72;--teal-br:#1FCFB0;--teal-ink:#06231d;
  --line:#e4e9ef;--line2:#eef2f6;--bg:#f6f8fa;--card:#fff;
  --sp:clamp(3.5rem,7vw,6rem);
  --shadow:0 1px 2px rgba(13,27,42,.04),0 8px 28px rgba(13,27,42,.06);
  --z-header:20;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--body);background:var(--bg);line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--teal-d);text-decoration:none;transition:color .18s ease}
a:hover{color:var(--navy)}
img{max-width:100%}
::selection{background:rgba(31,207,176,.28)}
:focus-visible{outline:2px solid var(--teal-d);outline-offset:2px;border-radius:4px}
.wrap{max-width:1080px;margin:0 auto;padding-inline:clamp(1.15rem,4vw,2rem)}
/* Header */
.site-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem clamp(1.15rem,4vw,2rem);background:rgba(255,255,255,.9);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:var(--z-header)}
.brand{display:inline-flex;align-items:center;gap:.55rem}
.brand:hover{color:inherit}
.wordmark{font-weight:700;font-size:1.24rem;letter-spacing:-.02em;color:var(--navy)}
.wordmark-dark{color:#fff}
.top-nav{display:flex;gap:clamp(1rem,2.5vw,1.5rem);flex-wrap:wrap;align-items:center}
.top-nav a{color:#48576a;font-size:.94rem;font-weight:500}
.top-nav a.active{color:var(--navy)}
.top-nav a:hover{color:var(--navy)}
.top-nav .nav-cta{background:var(--teal-br);color:var(--teal-ink);font-weight:600;padding:.5rem 1rem;border-radius:10px;transition:background .18s ease,transform .18s ease}
.top-nav .nav-cta:hover{background:#19c2a6;color:var(--teal-ink)}
/* Generic content page */
.page{max-width:760px;margin:0 auto;padding:1.75rem clamp(1.15rem,4vw,1.5rem) 4rem}
.crumbs{font-size:.85rem;color:var(--muted);margin:.5rem 0 1.5rem}
.crumbs a{color:var(--muted)}
.crumbs a:hover{color:var(--navy)}
.crumbs .sep{margin:0 .45rem;color:#aeb9c4}
h1{font-size:clamp(2rem,4.5vw,2.6rem);line-height:1.12;letter-spacing:-.025em;margin:.2rem 0 .7rem;color:var(--navy);text-wrap:balance}
h2{font-size:clamp(1.4rem,2.6vw,1.65rem);line-height:1.2;letter-spacing:-.02em;margin:2.4rem 0 .7rem;color:var(--navy);text-wrap:balance}
h3{font-size:1.1rem;letter-spacing:-.01em;margin:1.4rem 0 .35rem;color:var(--ink)}
.lead{font-size:clamp(1.1rem,1.9vw,1.25rem);line-height:1.55;color:var(--ink);margin:.5rem 0 1.6rem}
p{margin:.7rem 0;max-width:68ch}
ul,ol{padding-left:1.2rem}
li{margin:.35rem 0}
.muted{color:var(--muted);font-size:.9rem}
blockquote{margin:1.4rem 0;padding:.2rem 0 .2rem 1.1rem;border-left:2px solid var(--teal);color:var(--ink);font-style:italic}
code{background:var(--line2);padding:.12rem .38rem;border-radius:5px;font-family:'DM Mono',monospace;font-size:.88em;color:var(--navy2)}
/* Tables */
.tbl{margin:1.4rem 0;overflow-x:auto}
.tbl figcaption{font-size:.85rem;color:var(--muted);margin-bottom:.5rem}
table{border-collapse:collapse;width:100%;font-size:.95rem;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{padding:.6rem .85rem;text-align:left;border-bottom:1px solid var(--line)}
th{background:var(--line2);font-weight:600;color:var(--navy)}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:#fafcfd}
/* Inline CTA (articles + topic pages) */
.cta{background:linear-gradient(150deg,var(--navy),#12314a);border:1px solid rgba(31,207,176,.18);color:#fff;border-radius:16px;padding:1.6rem;text-align:center;margin:2rem 0}
.cta-btn{display:inline-block;background:var(--teal-br);color:var(--teal-ink);font-weight:600;font-size:1.02rem;padding:.8rem 1.5rem;border-radius:11px;transition:background .18s ease,transform .18s ease}
.cta-btn:hover{background:#19c2a6;color:var(--teal-ink);transform:translateY(-1px)}
.cta-note{color:#a8b8c6;font-size:.86rem;margin:.8rem auto 0}
/* Clusters / related */
.cluster{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem}
.cluster li{margin:0}
.cluster a{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;font-weight:500;color:var(--navy);transition:border-color .18s ease,box-shadow .18s ease}
.cluster a:hover{border-color:var(--teal);box-shadow:var(--shadow)}
.faq{margin-top:2.8rem}
.faq-item{border-top:1px solid var(--line);padding-top:.9rem;margin-top:1.1rem}
.faq-item h3{margin:0 0 .2rem;color:var(--navy)}
.faq-item p{margin:.2rem 0 0}
.related{margin-top:3rem;border-top:1px solid var(--line);padding-top:1.2rem}
.related h2{margin-top:0}
.related-grid{display:flex;flex-wrap:wrap;gap:.5rem}
.related-grid a{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:.5rem .9rem;font-size:.92rem;font-weight:500;color:var(--navy);transition:border-color .18s ease,color .18s ease}
.related-grid a:hover{border-color:var(--teal);color:var(--teal-d)}
/* Footer */
.site-footer{background:var(--navy);color:#9fb0bf;padding:3rem 1.25rem;text-align:center;font-size:.9rem}
.site-footer .foot-brand{display:flex;justify-content:center;margin-bottom:.7rem}
.foot-tag{max-width:520px;margin:.3rem auto;line-height:1.6}
.foot-nav{display:flex;gap:1.1rem;justify-content:center;flex-wrap:wrap;margin:1.1rem 0}
.foot-nav a{color:#cdd8e3}
.foot-nav a:hover{color:#fff}
.foot-legal{display:flex;gap:.6rem;justify-content:center;align-items:center;flex-wrap:wrap;margin:.9rem 0 .2rem;font-size:.85rem}
.foot-legal a{color:#9fb0bf}
.foot-legal a:hover{color:#fff}
.foot-sep{color:#5c6b7a}
.foot-copy{font-size:.8rem;color:#748393;margin-top:.7rem}
/* ── Home ── */
.hero{position:relative;overflow:hidden;background:radial-gradient(900px 460px at 78% -20%,rgba(31,207,176,.2),transparent 60%),radial-gradient(700px 500px at 8% 120%,rgba(31,207,176,.09),transparent 55%),linear-gradient(165deg,#0c1a29,#0f2c3d);color:#fff;padding:clamp(3.5rem,7vw,6rem) 0 clamp(4rem,8vw,6.5rem)}
.hero-inner{max-width:820px;margin:0 auto;text-align:center;position:relative}
.hero .badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(31,207,176,.12);border:1px solid rgba(31,207,176,.32);color:#9df0e2;font-size:.82rem;font-weight:500;padding:.35rem .85rem;border-radius:100px;margin-bottom:1.4rem}
.hero .badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--teal-br);box-shadow:0 0 0 3px rgba(31,207,176,.25)}
.hero h1{color:#fff;font-size:clamp(2.3rem,5.4vw,3.6rem);line-height:1.06;letter-spacing:-.03em;margin:.2rem 0 1rem}
.hero p.sub{font-size:clamp(1.08rem,2vw,1.3rem);line-height:1.6;color:#c6d3de;max-width:600px;margin:0 auto 2rem}
.hero-cta{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap}
.btn-primary{display:inline-block;background:var(--teal-br);color:var(--teal-ink);font-weight:600;font-size:1.05rem;padding:.9rem 1.7rem;border-radius:12px;box-shadow:0 8px 24px rgba(31,207,176,.24);transition:background .18s ease,transform .18s ease,box-shadow .18s ease}
.btn-primary:hover{background:#19c2a6;color:var(--teal-ink);transform:translateY(-2px);box-shadow:0 12px 30px rgba(31,207,176,.3)}
.btn-ghost{display:inline-block;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.28);color:#fff;font-weight:500;font-size:1.05rem;padding:.9rem 1.6rem;border-radius:12px;transition:background .18s ease,border-color .18s ease}
.btn-ghost:hover{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.5);color:#fff}
.hero .trust{color:#8397a6;font-size:.85rem;margin-top:1.6rem}
/* Trust strip under hero */
.marks{border-bottom:1px solid var(--line);background:#fff}
.marks-row{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem clamp(1.5rem,4vw,2.75rem);padding:1.1rem 0;font-size:.9rem;color:var(--body)}
.marks-row .m{display:inline-flex;align-items:center;gap:.5rem;font-weight:500}
.marks-row .m svg{color:var(--teal-d);flex-shrink:0}
/* Section scaffolding */
.section{padding:var(--sp) 0}
.section-head{max-width:640px;margin:0 0 2.4rem}
.section-head.center{margin-inline:auto;text-align:center}
.section-head h2{margin:0 0 .5rem}
.section-head p{color:var(--body);font-size:1.05rem;margin:0}
/* Features — icon + text rows, NO card chrome */
.features{display:grid;gap:2rem clamp(2rem,5vw,3.5rem);grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}
.feat{display:flex;gap:1rem;align-items:flex-start}
.feat .ico{flex-shrink:0;width:42px;height:42px;display:grid;place-items:center;border-radius:11px;background:linear-gradient(150deg,rgba(18,179,163,.12),rgba(31,207,176,.06));color:var(--teal-d)}
.feat .ico svg{width:22px;height:22px}
.feat h3{margin:.1rem 0 .3rem;color:var(--navy);font-size:1.08rem}
.feat p{margin:0;color:var(--body);font-size:.96rem;line-height:1.55}
/* How it works — connected numbered flow, no boxes */
.flow{position:relative;display:grid;gap:2rem clamp(2rem,5vw,3rem);grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.stepf{position:relative}
.stepf .n{width:2.4rem;height:2.4rem;display:grid;place-items:center;border-radius:50%;background:var(--navy);color:var(--teal-br);font-weight:700;font-size:1.02rem;margin-bottom:.9rem;position:relative;z-index:1}
.stepf h3{margin:0 0 .3rem;color:var(--navy);font-size:1.1rem}
.stepf p{margin:0;color:var(--body);font-size:.96rem}
@media(min-width:760px){.flow .stepf:not(:last-child)::after{content:"";position:absolute;top:1.2rem;left:calc(2.4rem + .6rem);right:calc(-1 * clamp(2rem,5vw,3rem) + .6rem);height:2px;background:linear-gradient(90deg,var(--line),var(--line) 60%,transparent);z-index:0}}
/* Popular calculators — link list, hairline separated */
.linklist{border-top:1px solid var(--line);columns:2;column-gap:clamp(1.5rem,5vw,3.5rem)}
.linklist a{display:block;break-inside:avoid;border-bottom:1px solid var(--line);padding:.95rem .2rem;color:var(--navy);font-weight:600;transition:color .18s ease,padding .18s ease}
.linklist a span{display:block;color:var(--muted);font-size:.88rem;font-weight:400;margin-top:.1rem}
.linklist a:hover{color:var(--teal-d);padding-left:.35rem}
.linklist a::after{content:"→";float:right;color:var(--teal-d);opacity:0;transition:opacity .18s ease;font-weight:400}
.linklist a:hover::after{opacity:1}
.more-link{margin-top:1.6rem;font-weight:600}
/* Dark CTA band */
.band{background:radial-gradient(700px 320px at 80% -30%,rgba(31,207,176,.16),transparent),linear-gradient(150deg,#0c1a29,#123247);color:#fff;text-align:center;padding:var(--sp) 1.25rem}
.band h2{color:#fff;font-size:clamp(1.6rem,3.2vw,2.1rem);margin:0 0 .6rem}
.band p{color:#c6d3de;margin:0 auto 1.6rem;max-width:520px}
/* Article cards (Home preview + hub) */
.card-grid{display:grid;gap:1.4rem;grid-template-columns:repeat(auto-fill,minmax(290px,1fr))}
.art-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem;color:inherit;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
.art-card:hover{border-color:rgba(18,179,163,.5);box-shadow:var(--shadow);transform:translateY(-3px)}
.art-card .meta{font-size:.8rem;color:var(--muted);margin-bottom:.6rem;letter-spacing:.01em}
.art-card h3{margin:0 0 .5rem;color:var(--navy);font-size:1.18rem;line-height:1.25}
.art-card p{margin:0;color:var(--body);font-size:.94rem;flex:1}
.art-card .tag{align-self:flex-start;margin-top:1rem;background:var(--line2);color:var(--teal-d);font-size:.76rem;font-weight:600;letter-spacing:.02em;padding:.25rem .65rem;border-radius:100px}
/* Article body */
.article{max-width:700px}
.byline{color:var(--muted);font-size:.9rem;margin:.3rem 0 1.8rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.byline .dot{color:#c3ccd4}
.byline .tag{background:var(--line2);color:var(--teal-d);font-size:.76rem;font-weight:600;padding:.15rem .55rem;border-radius:100px}
.article-body{font-size:1.06rem;color:var(--ink);line-height:1.75}
.article-body>p{max-width:none}
.article-body h2{font-size:1.5rem;margin-top:2.4rem}
.article-body h3{font-size:1.2rem}
.article-body a{text-decoration:underline;text-underline-offset:2px;text-decoration-color:rgba(11,125,114,.4)}
.article-body a:hover{text-decoration-color:var(--teal-d)}
.article-body img{border-radius:12px}
.article-body strong{color:var(--navy)}
@media (prefers-reduced-motion:reduce){*{transition:none !important;scroll-behavior:auto}}
@media(max-width:640px){.linklist{columns:1}.section-head{margin-bottom:1.8rem}.hero-cta{flex-direction:column;align-items:stretch}.hero-cta a{text-align:center}}
`

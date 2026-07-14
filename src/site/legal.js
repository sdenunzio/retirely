// ─────────────────────────────────────────────────────────────────────────────
// Legal pages — Privacy Policy + Terms & Disclaimer.
//
// Static, prerendered to dist/privacy.html and dist/terms.html. Pure string
// builders (browser-free), imported by the build script and the test suite.
//
// The copy is deliberately honest and specific to how Retirely actually works:
// no accounts, no server, no cookies, no analytics, no third-party calls. All
// state lives in the visitor's own browser (localStorage). If that ever changes
// (e.g. advertising is switched on — see src/components/AdSlot.jsx), these pages
// MUST be revised and, where required, a consent mechanism added.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE, esc } from '../seo/content.js'
import { siteHeader, siteFooter, PAGE_CSS, FONT_LINKS, APP_URL } from './brand.js'

// Where visitors can reach a human about privacy / legal questions. Update this
// if you set up a dedicated retirely.ca inbox.
export const CONTACT_EMAIL = 'hello@retirely.ca'

// Last substantive revision. Bump when the copy changes.
const EFFECTIVE = 'July 14, 2026'

const p = (s) => `<p>${s}</p>`

// ── Privacy Policy content ───────────────────────────────────────────────────
const PRIVACY = {
  slug: 'privacy',
  title: 'Privacy Policy — Retirely',
  description:
    'Retirely collects no personal information, uses no cookies, and runs entirely in your browser. Here is exactly what that means for your data.',
  h1: 'Privacy Policy',
  sections: [
    {
      h2: 'The short version',
      html:
        p(
          `Retirely is a free retirement calculator that runs entirely in your web browser. ` +
            `We do not ask you to sign up, we do not collect your name or email, we do not use ` +
            `cookies or tracking, and none of the figures you enter are ever sent to us or anyone else. ` +
            `There is genuinely very little to this policy — because there is very little data.`,
        ),
    },
    {
      h2: 'Information we collect',
      html:
        p(`We do not collect personal information. Specifically:`) +
        `<ul>
          <li><strong>No account or sign-up.</strong> There is no login, so we never receive a name, email address, or password.</li>
          <li><strong>No cookies.</strong> Retirely does not set cookies and does not use any advertising or analytics cookies.</li>
          <li><strong>No analytics or tracking.</strong> We do not run Google Analytics or any similar third-party tracking on the site.</li>
          <li><strong>No third-party requests.</strong> Fonts and all other assets are served from our own domain, so simply visiting the site does not hand your IP address or browsing to an outside service.</li>
        </ul>`,
    },
    {
      h2: 'The numbers you enter stay on your device',
      html:
        p(
          `When you use the calculator, the details you type — ages, savings balances, ` +
            `contributions, spending, and so on — are saved only in your own browser using a ` +
            `feature called <em>local storage</em>. This is what lets your scenario still be there ` +
            `when you come back later.`,
        ) +
        p(
          `That information lives on your device. It is never transmitted to Retirely, never stored ` +
            `on a server, and cannot be seen by us. If you clear your browser's site data, or use ` +
            `your browser's private/incognito mode, it is gone.`,
        ),
    },
    {
      h2: 'How to clear your saved data',
      html:
        p(
          `You are always in full control of the data on your device. To remove it, use the ` +
            `<strong>Reset</strong> option inside the calculator, or clear the site data for retirely.ca ` +
            `in your browser settings. Either one wipes every saved scenario and preference.`,
        ),
    },
    {
      h2: 'Server logs',
      html: p(
        `Like almost every website, our hosting provider may keep standard technical server logs ` +
          `(for example, the IP address making a request and the page requested) for security and ` +
          `to keep the site running. We do not use these logs to build profiles of visitors, and we ` +
          `do not combine them with anything you enter into the calculator.`,
      ),
    },
    {
      h2: 'Children',
      html: p(
        `Retirely is a general-audience financial planning tool intended for adults. It is not ` +
          `directed at children, and because we collect no personal information, we do not knowingly ` +
          `collect anything from anyone, including children.`,
      ),
    },
    {
      h2: 'Changes to this policy',
      html: p(
        `If we ever add a feature that changes how data is handled — for example advertising, which ` +
          `would introduce third-party cookies — we will update this page first and, where the law ` +
          `requires it, ask for your consent before that feature runs. Check back here for the latest version.`,
      ),
    },
    {
      h2: 'Contact',
      html: p(
        `Questions about privacy? Email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`,
      ),
    },
  ],
}

// ── Terms & Disclaimer content ───────────────────────────────────────────────
const TERMS = {
  slug: 'terms',
  title: 'Terms of Use & Disclaimer — Retirely',
  description:
    'Retirely is a free, illustrative retirement planning tool — not financial, tax, or investment advice. The terms of use and important disclaimers are here.',
  h1: 'Terms of Use & Disclaimer',
  sections: [
    {
      h2: 'Not financial advice',
      html:
        p(
          `<strong>Retirely is an educational and illustrative tool, not financial, investment, tax, ` +
            `legal, or accounting advice.</strong> It does not account for your full personal ` +
            `circumstances and is not a substitute for a qualified professional.`,
        ) +
        p(
          `Before making any retirement, investment, or tax decision, consult a licensed advisor such ` +
            `as a Certified Financial Planner (CFP) or a tax professional who can review your specific situation.`,
        ),
    },
    {
      h2: 'About the projections',
      html:
        p(
          `The calculator produces estimates based on the assumptions you enter and on simplified ` +
            `models of Canadian tax and benefit rules. Real outcomes will differ. In particular:`,
        ) +
        `<ul>
          <li>Tax brackets, benefit thresholds, and contribution limits are hard-coded by year and may not reflect the most current rates.</li>
          <li>Investment returns are assumptions, not predictions — markets are uncertain, and Monte Carlo results illustrate a range of possibilities, not a guarantee.</li>
          <li>CPP, OAS, GIS, RRIF, and provincial rules are modelled in a simplified way and may not capture every rule or your personal entitlement.</li>
        </ul>` +
        p(
          `Treat every figure as a starting point for a conversation, not a promise of a future result.`,
        ),
    },
    {
      h2: 'Use of the site',
      html:
        p(
          `Retirely is provided free of charge for your personal, non-commercial use. You agree to use ` +
            `it lawfully and not to attempt to disrupt, misuse, or reverse-engineer the service in a way ` +
            `that harms the site or other users.`,
        ),
    },
    {
      h2: 'No warranty',
      html: p(
        `The site is provided "as is" and "as available", without warranties of any kind, whether ` +
          `express or implied, including accuracy, fitness for a particular purpose, or uninterrupted ` +
          `availability. We do not warrant that the calculations are error-free or current.`,
      ),
    },
    {
      h2: 'Limitation of liability',
      html: p(
        `To the fullest extent permitted by law, Retirely and its operator are not liable for any loss ` +
          `or damage arising from your use of, or reliance on, the site or its output — including any ` +
          `financial decision made on the basis of a projection. You use the tool at your own risk.`,
      ),
    },
    {
      h2: 'Third-party links',
      html: p(
        `Some pages link to external websites (for example, government or reference sources) for your ` +
          `convenience. We are not responsible for the content, accuracy, or privacy practices of those sites.`,
      ),
    },
    {
      h2: 'Governing law',
      html: p(
        `These terms are governed by the laws of the province in which the site operator resides and the ` +
          `federal laws of Canada applicable therein, without regard to conflict-of-laws principles.`,
      ),
    },
    {
      h2: 'Changes to these terms',
      html: p(
        `We may update these terms from time to time. Continued use of the site after a change means you ` +
          `accept the revised terms. The effective date below shows the latest revision.`,
      ),
    },
    {
      h2: 'Contact',
      html: p(
        `Questions about these terms? Email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`,
      ),
    },
  ],
}

export const LEGAL_PAGES = [PRIVACY, TERMS]
export const LEGAL_BY_SLUG = Object.fromEntries(LEGAL_PAGES.map((pg) => [pg.slug, pg]))

// ── Renderer ─────────────────────────────────────────────────────────────────
function schema(page) {
  const canonical = `${SITE.domain}/${page.slug}`
  const graph = [
    {
      '@type': 'WebPage',
      '@id': canonical + '#page',
      name: page.h1,
      url: canonical,
      description: page.description,
      inLanguage: SITE.locale,
      isPartOf: { '@type': 'WebSite', url: `${SITE.domain}/`, name: SITE.name },
      publisher: { '@type': 'Organization', name: SITE.name, url: `${SITE.domain}/` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.domain}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: canonical },
      ],
    },
  ]
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">${json}</script>`
}

function sectionsHtml(page) {
  return page.sections
    .map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`)
    .join('\n')
}

export function renderLegalPage(page) {
  const canonical = `${SITE.domain}/${page.slug}`
  return `<!doctype html>
<html lang="en-CA">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="${SITE.name}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:locale" content="en_CA" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#0D1B2A" />
    ${FONT_LINKS}
    <style>${PAGE_CSS}</style>
    ${schema(page)}
  </head>
  <body>
    ${siteHeader()}

    <main class="page">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="sep">›</span><span aria-current="page">${esc(page.h1)}</span>
      </nav>
      <article>
        <h1>${esc(page.h1)}</h1>
        <p class="muted">Last updated: ${EFFECTIVE}</p>
        ${sectionsHtml(page)}
        <p class="muted" style="margin-top:2.5rem">Retirely is a free, illustrative Canadian retirement planning tool. Nothing here is financial advice. <a href="${APP_URL}">Open the calculator →</a></p>
      </article>
    </main>

    ${siteFooter()}
  </body>
</html>`
}

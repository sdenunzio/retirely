// ─────────────────────────────────────────────────────────────────────────────
// SEO content model + static-HTML renderers for Retirely.
//
// This module is deliberately **browser-free and side-effect-free** so it can be
// imported by:
//   • the Node build script  (scripts/generate-seo-pages.mjs)  → writes dist/**
//   • the Vitest suite        (src/seo/content.test.js)
//
// The winning pattern in this space (per competitor research) is a *topic cluster*
// of dedicated, content-rich, crawlable pages — one URL per search intent — each
// pairing a real rate/threshold table with a visible FAQ and rich schema. These
// pages are pre-rendered to fully-formed HTML at build time so crawlers (and AI
// answer engines) get the complete picture without executing any JavaScript.
// ─────────────────────────────────────────────────────────────────────────────

import { PROVINCE_TAX, rrifMinimum } from '../lib/engine.js'

export const SITE = {
  name: 'Retirely',
  domain: 'https://retirely.ca',
  appUrl: 'https://retirely.ca/',
  twitter: '@retirely',
  logo: 'https://retirely.ca/logo.png',
  ogImage: 'https://retirely.ca/og-image.png',
  locale: 'en-CA',
  // Figures below are display constants surfaced on-page. Keep in sync with the
  // engine when rates change (see CLAUDE.md — rates are centralised in engine.js).
  benefits: {
    year: 2025,
    cppMax65: 1433.0,       // CPP maximum at 65 (2025, $/mo)
    cppReduction60: 0.36,   // −0.6%/mo × 60 = −36% at age 60
    cppIncrease70: 0.42,    // +0.7%/mo × 60 = +42% at age 70
    oas65: 727.67,          // OAS 65–74 (2025, $/mo)
    oas75: 800.44,          // OAS 75+ (2025, $/mo)
    oasClawbackThreshold: 90997, // net-income recovery threshold used by the engine (2024)
    rrspConvertAge: 71,     // RRSP → RRIF conversion deadline
  },
}

const B = SITE.benefits
const money = (n) => '$' + Math.round(n).toLocaleString('en-CA')
const money2 = (n) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Shared, engine-derived tables (single source of truth) ──────────────────

/** RRIF minimum-withdrawal % by age, derived from the live engine. */
export function rrifRateTable() {
  const rows = []
  for (let age = 71; age <= 95; age++) {
    const pct = rrifMinimum(1, age) * 100 // rrifMinimum(1,age) === the rate itself
    rows.push({ age, pct: Math.round(pct * 100) / 100 })
  }
  return rows
}

/** CPP monthly estimate at a given start age relative to the age-65 maximum. */
function cppAt(age) {
  if (age < 65) return B.cppMax65 * (1 - B.cppReduction60 * ((65 - age) / 5))
  if (age > 65) return B.cppMax65 * (1 + B.cppIncrease70 * ((age - 65) / 5))
  return B.cppMax65
}

export function cppTimingTable() {
  return [60, 65, 70].map((age) => ({
    age,
    monthly: cppAt(age),
    annual: cppAt(age) * 12,
    delta:
      age === 65
        ? 'baseline'
        : age < 65
          ? `−${Math.round(B.cppReduction60 * 100)}% vs 65`
          : `+${Math.round(B.cppIncrease70 * 100)}% vs 65`,
  }))
}

/** Marginal provincial bracket rows for a province code, from the engine. */
export function provinceBracketTable(code) {
  const prov = PROVINCE_TAX[code]
  if (!prov) return []
  const rows = []
  let lower = 0
  for (const [width, rate] of prov.brackets) {
    const upper = width === Infinity ? Infinity : lower + width
    rows.push({
      lower,
      upper,
      rate: Math.round(rate * 10000) / 100,
    })
    lower = upper
  }
  return rows
}

// ── HTML escaping ────────────────────────────────────────────────────────────
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Reusable content blocks (return HTML strings) ───────────────────────────
function tableBlock(caption, headers, rows) {
  const thead = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')
  const tbody = rows
    .map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>')
    .join('')
  return `<figure class="tbl"><figcaption>${esc(caption)}</figcaption>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></figure>`
}

export function rrifTableHtml() {
  const rows = rrifRateTable().map((r) => [String(r.age), r.pct.toFixed(2) + '%'])
  return tableBlock(
    `RRIF minimum withdrawal factors by age (CRA schedule, applied by Retirely)`,
    ['Age (Jan 1)', 'Minimum withdrawal'],
    rows,
  )
}

export function cppTimingTableHtml() {
  const rows = cppTimingTable().map((r) => [
    String(r.age),
    money2(r.monthly),
    money(r.annual),
    r.delta,
  ])
  return tableBlock(
    `Estimated maximum CPP by start age (${B.year})`,
    ['Start age', 'Monthly', 'Annual', 'vs age 65'],
    rows,
  )
}

export function provinceTableHtml(code) {
  const prov = PROVINCE_TAX[code]
  const rows = provinceBracketTable(code).map((r) => [
    r.upper === Infinity
      ? `over ${money(r.lower)}`
      : `${money(r.lower)} – ${money(r.upper)}`,
    r.rate.toFixed(2) + '%',
  ])
  return tableBlock(
    `${prov.name} provincial income-tax brackets (basic personal amount ${money(prov.basic)})`,
    ['Taxable income', 'Provincial rate'],
    rows,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC PAGES  — one object per search intent.
//   slug        canonical path (no leading/trailing slash)
//   title       <title> / OG title
//   description meta description (also the snippet-optimised lead answer)
//   h1          on-page H1
//   lead        40–55 word snippet-optimised opening paragraph
//   sections    [{ h2, html }]  — body content (may embed tables via *Html())
//   faqs        [{ q, a }]      — rendered visibly AND as FAQPage schema
//   howTo       optional { name, steps:[{name,text}] } → HowTo schema
//   related     slugs for the internal-link cluster
//   ctaTab      app tab to deep-link the CTA to (?tab=…)
// ─────────────────────────────────────────────────────────────────────────────

const topics = [
  {
    slug: 'canadian-retirement-calculator',
    title: 'Canadian Retirement Calculator — Free, All Provinces | Retirely',
    description:
      'Free Canadian retirement calculator, no sign-up. Model RRSP, TFSA, RRIF, CPP, OAS and pensions side by side, compare CPP timing and after-tax income in all 10 provinces.',
    h1: 'Free Canadian Retirement Calculator',
    lead: 'Retirely is a free, no-sign-up Canadian retirement calculator. Model RRSP, TFSA, RRIF, CPP, OAS, GIS and defined-benefit pensions side by side, compare strategies, and see your after-tax retirement income in every province — all in one place, entirely in your browser.',
    isHub: true,
    sections: [
      {
        h2: 'One tool for the whole Canadian retirement picture',
        html: `<p>Most Canadian retirement calculators cover a single slice — one account, one benefit, one province. Retirely models the full picture at once: registered and non-registered accounts, government benefits, pensions, tax in all ten provinces, and longevity risk. Everything runs client-side, so your numbers never leave your device and there is nothing to sign up for.</p>
<ul>
<li><strong>Accounts:</strong> RRSP, TFSA, non-registered, LIRA/LIF, with automatic RRIF conversion at age ${B.rrspConvertAge}.</li>
<li><strong>Benefits:</strong> CPP and OAS at any start age, GIS, and provincial senior supplements.</li>
<li><strong>Strategy comparison:</strong> standard, early, delayed-CPP, GIS-maximising and income-equalisation plans side by side.</li>
<li><strong>Couples:</strong> pension income splitting and income equalisation for two partners.</li>
<li><strong>Risk:</strong> Monte Carlo simulation and a FIRE-number calculator.</li>
</ul>`,
      },
      {
        h2: 'Explore each calculator',
        html: `<p>Retirely bundles a family of focused calculators. Jump straight to the topic you need:</p>`,
        // related-cluster links injected by renderer
        clusterLinks: true,
      },
    ],
    faqs: [
      {
        q: 'Is Retirely really free?',
        a: 'Yes — Retirely is completely free with no sign-up, no account and no paywall. It runs entirely in your browser and is an illustrative scenario tool, not financial advice.',
      },
      {
        q: 'What is the best retirement calculator for Canada?',
        a: 'The best Canadian retirement calculator is the one that models your whole picture — accounts, CPP/OAS timing, pensions and provincial tax together. Retirely does this for all 10 provinces, supports couples and income splitting, and is free with no sign-up, which the bank and government tools generally are not.',
      },
      {
        q: 'How long will $500,000 last in retirement in Canada?',
        a: 'It depends on your spending, other income (CPP, OAS, pensions), investment returns and tax. As a rough guide, a 4% withdrawal rate on $500,000 is about $20,000/year before tax, on top of government benefits. Retirely models the exact drawdown, RRIF minimums and tax year by year so you can see how long your money lasts.',
      },
      {
        q: 'Does Retirely work for all provinces?',
        a: 'Yes. Retirely includes 2024–2025 federal and provincial tax brackets for all 10 provinces, plus province-specific senior supplements, so your after-tax retirement income reflects where you actually live.',
      },
    ],
    related: [
      'rrsp-calculator',
      'tfsa-calculator',
      'cpp-calculator',
      'oas-clawback-calculator',
      'rrif-minimum-withdrawal-calculator',
      'when-to-take-cpp',
      'rrsp-vs-tfsa',
      'fire-calculator-canada',
    ],
    ctaTab: 'scenarios',
  },

  {
    slug: 'rrsp-calculator',
    title: 'Free RRSP Calculator (Canada) — Growth, Drawdown & RRIF | Retirely',
    description:
      'Free RRSP calculator for Canada. Project RRSP growth, model the mandatory RRIF conversion at 71, and estimate the tax on every withdrawal. No sign-up, all provinces.',
    h1: 'RRSP Calculator',
    lead: 'This free RRSP calculator projects your RRSP growth to retirement, then models the drawdown — including the mandatory conversion to a RRIF at age 71, minimum withdrawals, and the tax you pay in your province — so you can see your real after-tax RRSP income at every age.',
    sections: [
      {
        h2: 'How the RRSP calculator works',
        html: `<p>Retirely grows your RRSP at your chosen rate of return and monthly contribution up to your retirement age, then simulates the withdrawal phase year by year. At age ${B.rrspConvertAge} your RRSP must convert to a RRIF, after which the government sets a <em>minimum</em> you must withdraw (and be taxed on) each year.</p>`,
      },
      {
        h2: 'RRSP-to-RRIF minimum withdrawals',
        html: `<p>Once your RRSP becomes a RRIF, minimum withdrawals start at ${rrifRateTable()[0].pct.toFixed(2)}% of the balance at age 71 and climb to 20% by age 95. Retirely applies this exact CRA schedule automatically:</p>${rrifTableHtml()}`,
      },
      {
        h2: 'RRSP vs TFSA',
        html: `<p>RRSP contributions are deducted from income now and taxed on withdrawal; TFSA contributions are after-tax and withdrawn tax-free. Which wins depends on your marginal rate today versus in retirement. See the dedicated <a href="/rrsp-vs-tfsa">RRSP vs TFSA comparison</a>.</p>`,
      },
    ],
    faqs: [
      {
        q: 'At what age must I convert my RRSP to a RRIF?',
        a: 'You must convert your RRSP to a RRIF (or annuity) by December 31 of the year you turn 71. From the following year you must withdraw at least the RRIF minimum, which is fully taxable.',
      },
      {
        q: 'How is an RRSP withdrawal taxed?',
        a: 'RRSP and RRIF withdrawals are taxed as ordinary income at your combined federal and provincial marginal rate in the year you withdraw. Retirely estimates this tax for your province automatically.',
      },
      {
        q: 'Can I contribute to an RRSP after 71?',
        a: 'No — you cannot hold or contribute to your own RRSP after the end of the year you turn 71. You can still contribute to a spousal RRSP if your spouse is 71 or younger and you have contribution room.',
      },
    ],
    howTo: {
      name: 'How to project your RRSP with Retirely',
      steps: [
        { name: 'Enter your RRSP balance and contributions', text: 'Add your current RRSP balance, monthly contribution and expected rate of return.' },
        { name: 'Set your retirement age', text: 'Choose when you plan to stop working so the tool knows when drawdown begins.' },
        { name: 'Review the RRIF drawdown', text: 'See the year-by-year RRIF minimums from age 71 and the estimated tax in your province.' },
      ],
    },
    related: ['tfsa-calculator', 'rrif-minimum-withdrawal-calculator', 'rrsp-vs-tfsa', 'canadian-retirement-calculator'],
    ctaTab: 'accumulation',
  },

  {
    slug: 'tfsa-calculator',
    title: 'Free TFSA Calculator (Canada) — Tax-Free Growth & Withdrawals | Retirely',
    description:
      'Free TFSA calculator for Canada. Project tax-free growth, model retirement withdrawals, and optimise whether to tap your TFSA before your RRSP. No sign-up, all provinces.',
    h1: 'TFSA Calculator',
    lead: 'This free TFSA calculator projects your Tax-Free Savings Account growth and models tax-free withdrawals in retirement. Because TFSA withdrawals are not taxable and do not count toward OAS clawback, the order in which you tap it matters — Retirely optimises that for you.',
    sections: [
      {
        h2: 'Why the TFSA is powerful in retirement',
        html: `<p>TFSA withdrawals are completely tax-free and — crucially — they do not count as income for OAS clawback or GIS. That makes the TFSA a flexible tool for smoothing taxable income and staying under benefit-clawback thresholds. Retirely models your TFSA alongside your RRSP/RRIF and chooses a withdrawal order for each strategy.</p>`,
      },
      {
        h2: 'TFSA and OAS clawback',
        html: `<p>OAS is clawed back at 15¢ on every dollar of net income above the ${money(B.oasClawbackThreshold)} threshold. Drawing from your TFSA instead of your RRIF can keep net income below that line — see the <a href="/oas-clawback-calculator">OAS clawback calculator</a>.</p>`,
      },
    ],
    faqs: [
      {
        q: 'Are TFSA withdrawals taxable?',
        a: 'No. TFSA withdrawals are completely tax-free and do not count as income, so they do not affect your tax bracket, OAS clawback or GIS eligibility.',
      },
      {
        q: 'Should I withdraw from my TFSA or RRSP first in retirement?',
        a: 'It depends on your tax bracket and benefits. Drawing taxable RRSP/RRIF income earlier can reduce future mandatory RRIF minimums, while TFSA withdrawals keep taxable income low. Retirely compares withdrawal orders side by side so you can see which leaves more after tax.',
      },
    ],
    related: ['rrsp-calculator', 'rrsp-vs-tfsa', 'oas-clawback-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'accumulation',
  },

  {
    slug: 'cpp-calculator',
    title: 'CPP Calculator (Canada) — Compare Taking CPP at 60, 65 or 70 | Retirely',
    description:
      'Free CPP calculator. Compare taking CPP at 60, 65 or 70 — the 36% early reduction, the 42% deferral boost and the breakeven age — side by side. No sign-up.',
    h1: 'CPP Calculator',
    lead: 'This free CPP calculator compares taking the Canada Pension Plan at 60, 65 or 70. Starting at 60 cuts your CPP by 36% for life; deferring to 70 raises it by 42%. Retirely shows each option’s monthly and lifetime income next to your other retirement income and tax.',
    sections: [
      {
        h2: 'CPP by start age',
        html: `<p>CPP is reduced by 0.6% for each month you take it before 65 (−36% at 60) and increased by 0.7% for each month you defer past 65 (+42% at 70). Based on the ${B.year} maximum:</p>${cppTimingTableHtml()}<p class="muted">Figures assume the maximum CPP; your amount depends on your contribution history.</p>`,
      },
      {
        h2: 'When does deferring pay off?',
        html: `<p>The breakeven age for deferring CPP to 70 versus starting at 65 is typically around 74–76. If you expect to live past that — and can bridge the gap with RRSP/TFSA income — deferral usually wins. See <a href="/when-to-take-cpp">when to take CPP</a> for the full comparison.</p>`,
      },
    ],
    faqs: [
      {
        q: 'Is it better to collect CPP at 60 or 65?',
        a: 'Taking CPP at 60 gives you money sooner but permanently reduces it by 36% versus 65. If you need the income, are in poorer health, or have little other savings, 60 can make sense. If you expect a long life and can cover the gap from other savings, waiting to 65 or 70 usually yields more lifetime income.',
      },
      {
        q: 'How much is CPP at 70?',
        a: `Deferring CPP to 70 increases it by 42% versus age 65. On the ${B.year} maximum of ${money2(B.cppMax65)}/month at 65, that is roughly ${money2(cppAt(70))}/month at 70. Your actual amount depends on your contribution history.`,
      },
      {
        q: 'Do you have to take CPP at 70?',
        a: 'There is no benefit to deferring CPP past 70 — the 0.7%/month increase stops at 70, so you should start it by then at the latest.',
      },
    ],
    related: ['when-to-take-cpp', 'oas-clawback-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'scenarios',
  },

  {
    slug: 'when-to-take-cpp',
    title: 'When to Take CPP — 60 vs 65 vs 70 Compared | Retirely',
    description:
      'Should you take CPP at 60, 65 or 70? Compare the 36% early cut, the 42% deferral boost and the ~74–76 breakeven age with your own numbers. Free, no sign-up.',
    h1: 'When to Take CPP: 60 vs 65 vs 70',
    lead: 'Deciding when to take CPP comes down to health, other income and how long you expect to live. Taking it at 60 reduces it 36% for life; waiting to 70 raises it 42%. The breakeven versus 65 is usually age 74–76 — this free calculator shows the trade-off with your own numbers.',
    sections: [
      {
        h2: 'The trade-off in one table',
        html: cppTimingTableHtml(),
      },
      {
        h2: 'Factors that should decide it',
        html: `<ul>
<li><strong>Health & longevity:</strong> the longer you expect to live, the more deferral pays.</li>
<li><strong>Other income:</strong> RRSP/TFSA savings can bridge the gap so you can defer CPP.</li>
<li><strong>Taxes & clawback:</strong> higher CPP later can push income toward the ${money(B.oasClawbackThreshold)} OAS clawback line.</li>
<li><strong>Peace of mind:</strong> a larger, inflation-indexed CPP at 70 is valuable longevity insurance.</li>
</ul>`,
      },
    ],
    faqs: [
      {
        q: 'What is the breakeven age for delaying CPP?',
        a: 'Compared with starting at 65, deferring CPP to 70 typically breaks even around age 74–76. If you live past that, you come out ahead by waiting; if not, taking it earlier gives more total dollars.',
      },
      {
        q: 'Can I take CPP and still work?',
        a: 'Yes. You can receive CPP while working. Before 65, if you keep contributing you earn the Post-Retirement Benefit, which adds to your pension.',
      },
    ],
    related: ['cpp-calculator', 'oas-clawback-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'scenarios',
  },

  {
    slug: 'rrif-minimum-withdrawal-calculator',
    title: 'RRIF Minimum Withdrawal Calculator & Rate Table (Canada) | Retirely',
    description:
      'RRIF minimum withdrawal calculator with the full CRA rate table by age — from 5.28% at 71 to 20% at 95 — plus the tax each withdrawal triggers. Free, no sign-up.',
    h1: 'RRIF Minimum Withdrawal Calculator',
    lead: `Your RRSP must convert to a RRIF by age ${B.rrspConvertAge}, after which you must withdraw a government-set minimum every year — starting at ${rrifRateTable()[0].pct.toFixed(2)}% at 71 and rising to 20% by 95. This free calculator applies the exact CRA schedule and estimates the tax on each withdrawal.`,
    sections: [
      {
        h2: 'RRIF minimum withdrawal rate table',
        html: `<p>The RRIF minimum is a percentage of your January-1 balance, set by age. Retirely applies this schedule automatically in every scenario:</p>${rrifTableHtml()}`,
      },
      {
        h2: 'How RRIF minimums affect your tax',
        html: `<p>Every RRIF withdrawal is fully taxable as income, and mandatory minimums can push you into a higher bracket or past the ${money(B.oasClawbackThreshold)} OAS clawback threshold. Retirely models this so you can plan withdrawals — or early RRSP meltdowns — to smooth the tax hit.</p>`,
      },
    ],
    faqs: [
      {
        q: 'What is the RRIF minimum withdrawal at 71?',
        a: `The RRIF minimum at age 71 is ${rrifRateTable()[0].pct.toFixed(2)}% of the account balance on January 1. On a $500,000 RRIF that is about ${money(500000 * rrifRateTable()[0].pct / 100)} for the year, fully taxable.`,
      },
      {
        q: 'How do I calculate my RRIF minimum withdrawal?',
        a: 'Multiply your RRIF balance on January 1 by the CRA minimum factor for your age (for example 5.28% at 71). Retirely does this automatically for every year and shows the resulting tax.',
      },
      {
        q: 'Can I withdraw more than the RRIF minimum?',
        a: 'Yes. The minimum is a floor, not a cap — you can withdraw more, though amounts above the minimum may have withholding tax deducted at source.',
      },
    ],
    related: ['rrsp-calculator', 'oas-clawback-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'scenarios',
  },

  {
    slug: 'oas-clawback-calculator',
    title: 'OAS Clawback Calculator (Canada) — Recovery Tax Threshold | Retirely',
    description:
      'Free OAS clawback calculator. See how much Old Age Security the recovery tax takes above the income threshold, and how TFSA and pension splitting reduce it. No sign-up.',
    h1: 'OAS Clawback Calculator',
    lead: `Old Age Security is clawed back at 15¢ per dollar of net income above ${money(B.oasClawbackThreshold)}, and fully eliminated at higher incomes. This free calculator shows your expected clawback and how strategies like TFSA withdrawals and pension income splitting can keep more of your OAS.`,
    sections: [
      {
        h2: 'How the OAS recovery tax works',
        html: `<p>For each dollar of net income above the ${money(B.oasClawbackThreshold)} threshold, you repay 15¢ of OAS. Because the clawback is based on <em>net</em> income, tax-free TFSA withdrawals and income splitting with a lower-income spouse can meaningfully reduce it. Retirely models the clawback in every year of every scenario.</p>`,
      },
      {
        h2: 'Ways to reduce OAS clawback',
        html: `<ul>
<li>Draw tax-free <a href="/tfsa-calculator">TFSA</a> income instead of RRIF income near the threshold.</li>
<li>Split eligible pension income with a lower-income spouse.</li>
<li>Consider an early RRSP meltdown before 65 to shrink future RRIF minimums.</li>
<li>Time <a href="/cpp-calculator">CPP</a> and OAS starts to smooth taxable income.</li>
</ul>`,
      },
    ],
    faqs: [
      {
        q: 'At what income does OAS clawback start?',
        a: `The OAS recovery tax begins once net income exceeds about ${money(B.oasClawbackThreshold)} (the threshold used by Retirely). Above that, 15¢ of OAS is repaid per dollar of income until it is fully clawed back.`,
      },
      {
        q: 'How can I avoid the OAS clawback?',
        a: 'Keep net income below the threshold by drawing tax-free TFSA income, splitting pension income with a spouse, melting down your RRSP before 65, and timing CPP/OAS. Retirely tests these strategies and shows the OAS you keep in each.',
      },
    ],
    related: ['tfsa-calculator', 'rrif-minimum-withdrawal-calculator', 'cpp-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'tax',
  },

  {
    slug: 'rrsp-vs-tfsa',
    title: 'RRSP vs TFSA — Which Should You Use? (Canada) | Retirely',
    description:
      'RRSP vs TFSA for Canadians: an upfront deduction with taxable withdrawals vs after-tax with tax-free withdrawals. See which wins for your marginal rate. Free, no sign-up.',
    h1: 'RRSP vs TFSA',
    lead: 'RRSP vs TFSA comes down to your tax rate now versus in retirement. RRSP contributions are deducted today and taxed on withdrawal; TFSA contributions are after-tax and withdrawn tax-free. If your rate is higher now, the RRSP usually wins; if lower now, the TFSA often does.',
    sections: [
      {
        h2: 'Side-by-side',
        html: tableBlock('RRSP vs TFSA at a glance', ['Feature', 'RRSP', 'TFSA'], [
          ['Contribution', 'Tax-deductible', 'After-tax'],
          ['Withdrawal', 'Fully taxable', 'Tax-free'],
          ['Affects OAS/GIS', 'Yes (counts as income)', 'No'],
          ['Contribution room after withdrawal', 'Lost (except HBP/LLP)', 'Restored next year'],
          ['Mandatory withdrawals', `Yes — RRIF from ${B.rrspConvertAge}`, 'Never'],
        ]),
      },
      {
        h2: 'The rule of thumb',
        html: `<p>Use the RRSP when your marginal tax rate today is higher than you expect in retirement; use the TFSA when it is lower, or when you want flexibility and to protect OAS/GIS. Many Canadians benefit from both. Retirely models the two together and picks a withdrawal order that minimises lifetime tax.</p>`,
      },
    ],
    faqs: [
      {
        q: 'Should I max my RRSP or TFSA first?',
        a: 'If your income (and marginal rate) is high, prioritise the RRSP for the deduction; if your income is modest or you value flexibility and protecting benefits, prioritise the TFSA. High earners often do both.',
      },
      {
        q: 'Does an RRSP or TFSA affect government benefits?',
        a: 'RRSP/RRIF withdrawals count as income and can trigger OAS clawback or reduce GIS. TFSA withdrawals do not count as income, so they do not affect these benefits.',
      },
    ],
    related: ['rrsp-calculator', 'tfsa-calculator', 'oas-clawback-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'accumulation',
  },

  {
    slug: 'fire-calculator-canada',
    title: 'FIRE Calculator Canada — Your FIRE Number & Retirement Date | Retirely',
    description:
      'Free FIRE calculator for Canada. Find your FIRE number from your spending and safe withdrawal rate, factoring in CPP and OAS. Coast, Lean and Fat FIRE. No sign-up.',
    h1: 'FIRE Calculator (Canada)',
    lead: 'This free Canadian FIRE calculator finds your FIRE number — the portfolio you need to retire early — from your annual spending and a safe withdrawal rate, then factors in CPP and OAS to show the age you can realistically stop working. Model Coast, Lean and Fat FIRE for your own numbers.',
    sections: [
      {
        h2: 'How your FIRE number is calculated',
        html: `<p>The classic rule uses a 4% safe withdrawal rate: your FIRE number is annual spending × 25. Spending $50,000/year implies roughly $1.25M — but Canadian CPP and OAS reduce what your portfolio must cover, often substantially. Retirely folds those benefits in so your target is realistic, not inflated.</p>`,
      },
      {
        h2: 'Coast, Lean and Fat FIRE',
        html: `<ul>
<li><strong>Coast FIRE:</strong> you have enough invested that growth alone reaches your number by retirement, without new contributions.</li>
<li><strong>Lean FIRE:</strong> a smaller number supporting modest spending.</li>
<li><strong>Fat FIRE:</strong> a larger number supporting a comfortable, higher-spending retirement.</li>
</ul>`,
      },
    ],
    faqs: [
      {
        q: 'What is my FIRE number?',
        a: 'Your FIRE number is the invested amount that lets you live off withdrawals indefinitely — typically annual spending divided by your safe withdrawal rate (4% → ×25). In Canada, CPP and OAS lower the amount your own portfolio must provide.',
      },
      {
        q: 'Does CPP and OAS change my FIRE number?',
        a: 'Yes, significantly. Because CPP and OAS provide guaranteed, inflation-indexed income from your 60s, your portfolio only has to cover the gap. Retirely subtracts expected benefits so your FIRE target reflects Canadian reality.',
      },
    ],
    related: ['rrsp-calculator', 'tfsa-calculator', 'canadian-retirement-calculator'],
    ctaTab: 'fire',
  },
]

// ── Programmatic per-province retirement pages ──────────────────────────────
const PROVINCE_ORDER = ['ON', 'BC', 'AB', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL']
const provinceSlug = (code) =>
  PROVINCE_TAX[code].name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: Québec → Quebec
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function provinceTopic(code) {
  const prov = PROVINCE_TAX[code]
  const slug = `${provinceSlug(code)}/retirement-calculator`
  return {
    slug,
    title: `${prov.name} Retirement Calculator — Tax & Benefits | Retirely`,
    description: `Free ${prov.name} retirement calculator — RRSP, TFSA, CPP, OAS and RRIF modelled with the province’s own tax brackets. After-tax income, no sign-up.`,
    h1: `${prov.name} Retirement Calculator`,
    lead: `This free retirement calculator uses ${prov.name}’s own income-tax brackets and senior supplements to estimate your after-tax retirement income. Model RRSP, TFSA, RRIF, CPP and OAS together and see exactly what your plan looks like as a ${prov.name} resident.`,
    sections: [
      {
        h2: `${prov.name} income-tax brackets`,
        html: `<p>Your province sets its own tax rates on top of federal tax. Retirely applies ${prov.name}’s brackets to every dollar of retirement income:</p>${provinceTableHtml(code)}<p class="muted">Provincial brackets shown are the values applied by the Retirely engine and are updated periodically. Federal tax and credits apply on top.</p>`,
      },
      {
        h2: `Retirement income in ${prov.name}`,
        html: `<p>Beyond tax, Retirely models CPP and OAS timing, GIS, RRIF minimums and — where applicable — ${prov.name}’s senior supplement, so your projection reflects living in ${prov.name} specifically rather than a national average.</p>`,
      },
    ],
    faqs: [
      {
        q: `How is retirement income taxed in ${prov.name}?`,
        a: `Retirement income in ${prov.name} is taxed at combined federal and ${prov.name} provincial rates. RRSP/RRIF and most pension income is fully taxable, TFSA withdrawals are tax-free, and OAS may be clawed back above ${money(B.oasClawbackThreshold)} of net income. Retirely estimates all of this for ${prov.name}.`,
      },
      {
        q: `Does Retirely include ${prov.name} senior benefits?`,
        a: `Retirely models federal CPP, OAS and GIS for every province and includes several provincial senior supplements. It applies ${prov.name}’s tax brackets so your after-tax income is province-accurate.`,
      },
    ],
    related: ['canadian-retirement-calculator', 'rrsp-calculator', 'cpp-calculator', 'oas-clawback-calculator'],
    ctaTab: 'tax',
    province: code,
  }
}

export const PAGES = [...topics, ...PROVINCE_ORDER.map(provinceTopic)]

// ── Interactive app routes (React-rendered) ─────────────────────────────────
// These boot the SPA, but we pre-render a route-specific shell so a non-JS
// crawler still gets the correct canonical, title, description and a crawlable
// content summary instead of the generic homepage fallback.
export const APP_ROUTES = [
  {
    path: 'calculator',
    title: 'Retirement Calculator App (Canada) — RRSP, TFSA, CPP, OAS | Retirely',
    description:
      'Launch the free Retirely retirement calculator. Model RRSP, TFSA, RRIF, CPP, OAS and pensions side by side across strategies, with tax for all 10 provinces, couples and Monte Carlo. No sign-up.',
    h1: 'Retirement Calculator',
    hero: `<p>Model your full Canadian retirement in one place: RRSP, TFSA, non-registered and LIRA/LIF accounts, CPP and OAS at any start age, GIS, defined-benefit pensions, and after-tax income across all 10 provinces. Compare standard, early, delayed-CPP and income-splitting strategies side by side, run a Monte Carlo simulation, and see your plan year by year to your life expectancy.</p>
<p>New here? Start with the <a href="/canadian-retirement-calculator">guide to the calculator</a> or browse the <a href="/articles">retirement articles</a>.</p>`,
  },
  {
    path: 'speculator',
    title: 'Rental Property Investment Calculator (Canada) — Cash Flow & IRR | Retirely',
    description:
      'Free Canadian rental & commercial property analyzer. Model mortgage payments, cash flow, cap rate and IRR across multiple properties and units. No sign-up.',
    h1: 'Rental Property Investment Calculator',
    hero: `<p>Analyze Canadian rental and commercial real estate. Model mortgage payments with Canadian semi-annual compounding, monthly cash flow, capitalization (cap) rate, and internal rate of return (IRR) across multiple properties and units at once. Compare buying versus renting, factor in vacancy, maintenance reserves and common-area maintenance (CAM), and see whether a property adds to or drains your retirement plan.</p>
<p>Explore Retirely's other free calculators: <a href="/canadian-retirement-calculator">Canadian retirement calculator</a>, <a href="/fire-calculator-canada">FIRE calculator</a>, and <a href="/estate">estate planner</a>.</p>`,
  },
  {
    path: 'estate',
    title: 'Estate Planning Calculator (Canada) — Probate Fees by Province | Retirely',
    description:
      'Free Canadian estate planner. Estimate provincial probate fees, model your estate and build an executor checklist across all provinces. No sign-up.',
    h1: 'Estate Planning Calculator',
    hero: `<p>Estimate provincial probate (estate administration) fees, model your estate value, and build an executor checklist. Probate rules and fee schedules differ sharply by province — from Alberta's flat maximum to percentage-based fees in Ontario and British Columbia — and Retirely covers all of them so you can see the real cost of settling an estate where you live and plan to reduce it.</p>
<p>Explore Retirely's other free calculators: <a href="/canadian-retirement-calculator">Canadian retirement calculator</a>, <a href="/rrif-minimum-withdrawal-calculator">RRIF minimum withdrawals</a>, and <a href="/speculator">rental property analyzer</a>.</p>`,
  },
]

/** Map slug → page object. */
export const PAGE_BY_SLUG = Object.fromEntries(PAGES.map((p) => [p.slug, p]))

/**
 * All indexable URLs: Home, the app routes, topic pages, plus the Articles hub
 * and any article slugs passed in (articles come from Markdown at build time).
 */
export function sitemapUrls(articles = []) {
  const lastmod = '2026-07-02'
  const urls = [
    { loc: `${SITE.domain}/`, priority: '1.0', lastmod },
    { loc: `${SITE.domain}/calculator`, priority: '0.9', lastmod },
    { loc: `${SITE.domain}/speculator`, priority: '0.7', lastmod },
    { loc: `${SITE.domain}/estate`, priority: '0.7', lastmod },
    { loc: `${SITE.domain}/articles`, priority: '0.8', lastmod },
  ]
  for (const p of PAGES) {
    urls.push({
      loc: `${SITE.domain}/${p.slug}`,
      priority: p.isHub ? '0.9' : p.province ? '0.6' : '0.8',
      lastmod,
    })
  }
  for (const a of articles) {
    urls.push({ loc: `${SITE.domain}/articles/${a.slug}`, priority: '0.7', lastmod: a.date || lastmod })
  }
  return urls
}

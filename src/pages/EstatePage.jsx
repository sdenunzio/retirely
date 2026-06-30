import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import styles from './EstatePage.module.css'

// ─── Province probate fee calculator ─────────────────────────────────────────
const PROBATE_RULES = {
  ON: { name: 'Ontario',    calc: v => v <= 50000 ? 0 : (v - 50000) * 0.015 + 250, label: '0 on first $50k, 1.5% above', note: 'Called Estate Administration Tax' },
  BC: { name: 'BC',         calc: v => v <= 25000 ? 0 : v <= 50000 ? (v-25000)*0.006 : 150 + (v-50000)*0.014, label: '0.6% $25k–$50k, 1.4% above', note: 'Probate fee' },
  AB: { name: 'Alberta',    calc: v => Math.min(v <= 10000 ? 35 : v <= 25000 ? 135 : v <= 125000 ? 275 : 400, 525), label: 'Flat fee, max $525', note: 'Most executor-friendly province' },
  QC: { name: 'Quebec',     calc: v => 0, label: 'No probate for notarial wills', note: 'Notarial wills bypass probate entirely in Quebec' },
  MB: { name: 'Manitoba',   calc: v => v <= 10000 ? 70 : 70 + (v - 10000) * 0.007, label: '$70 + 0.7% above $10k', note: '' },
  SK: { name: 'Saskatchewan', calc: v => v * 0.007, label: '0.7% of estate', note: '' },
  NS: { name: 'Nova Scotia', calc: v => v <= 10000 ? 85.60 : v <= 25000 ? 215.20 : v <= 50000 ? 358.15 : v <= 100000 ? 1002.65 : 1002.65 + (v-100000)*0.016, label: 'Tiered + 1.6% above $100k', note: 'Highest fees in Canada' },
  NB: { name: 'New Brunswick', calc: v => v * 0.005, label: '0.5% of estate', note: '' },
  PE: { name: 'PEI',        calc: v => v <= 10000 ? 50 : v <= 25000 ? 100 : v <= 50000 ? 200 : v <= 100000 ? 400 : 400 + (v-100000)*0.004, label: 'Tiered flat fees', note: '' },
  NL: { name: 'Newfoundland', calc: v => v <= 1000 ? 60 : 60 + (v-1000)*0.006, label: '$60 + 0.6% above $1k', note: '' },
}

const fmtC = n => '$' + Math.round(n).toLocaleString('en-CA')
const fmtK = n => Math.abs(n) >= 1_000_000 ? '$' + (n/1_000_000).toFixed(1) + 'M' : '$' + Math.round(n/1000) + 'k'

// ─── Executor checklist tasks ─────────────────────────────────────────────────
const CHECKLIST_TASKS = [
  {
    id: 't1', phase: 'immediate',
    label: 'Locate the original will and confirm you are named executor',
    detail: 'The original signed will is the governing document. Look in safe deposit boxes, home filing cabinets, and the deceased\'s lawyer\'s office. If no will is found, the estate is intestate — provincial rules determine distribution and a court appoints an administrator. A photocopy has no legal standing.',
    tips: [
      'Check if the will was registered with a provincial wills registry',
      'If multiple wills exist, the most recent valid one governs — consult an estate lawyer',
      'In Quebec, notarial wills are kept by the notary and located through the Chambre des notaires',
      'You can renounce being executor — but do it early and in writing before taking any action',
    ],
    links: [
      { label: 'What to do when someone dies — Canada.ca', url: 'https://www.canada.ca/en/financial-consumer-agency/services/estate-planning/what-happens-no-will.html' },
      { label: 'Role of an estate trustee — Ontario', url: 'https://www.ontario.ca/page/role-estate-trustee' },
      { label: 'Steps to Justice — Wills & Estates', url: 'https://stepstojustice.ca/legal-topic/wills-estates-powers-of-attorney/' },
    ],
    forms: [],
  },
  {
    id: 't2', phase: 'immediate',
    label: 'Obtain multiple certified copies of the death certificate',
    detail: 'Order at least 10 original certified copies from the provincial vital statistics office where the death occurred. Every bank, brokerage, insurer, and government agency requires their own — photocopies are not accepted. The funeral home can often help initiate the order.',
    tips: [
      'Order 10–15 copies upfront — it is far cheaper than reordering later',
      'Allow 2–4 weeks for delivery; expedited options are available in most provinces',
      'A "proof of death" from the funeral home is NOT the same as an official death certificate',
      'Keep several copies for your own records throughout the estate administration',
    ],
    links: [
      { label: 'Ontario — Order a death certificate', url: 'https://www.ontario.ca/page/order-death-certificate' },
      { label: 'BC Vital Statistics Agency', url: 'https://www2.gov.bc.ca/gov/content/life-events/death/death-certificates' },
      { label: 'Alberta — Get a death certificate', url: 'https://www.alberta.ca/get-death-certificate' },
      { label: 'Quebec — Registre de l\'état civil', url: 'https://www.etatcivil.gouv.qc.ca/en/death.html' },
    ],
    forms: [],
  },
  {
    id: 't3', phase: 'immediate',
    label: 'Secure and inventory all physical assets',
    detail: 'You have a legal duty to protect estate assets immediately upon accepting the role. Change locks on any property. Photograph and document all valuables. Notify home insurers — vacant properties require a special rider. You are personally liable as executor if assets are damaged, lost, or stolen during administration.',
    tips: [
      'Create a written log with photos and estimated values — even rough notes protect you legally',
      'Do not throw away anything until you have reviewed it — letters and documents may matter',
      'Secure vehicles: document their location and keep the keys safe',
      'Contact the home insurer immediately — standard policies may be void once a home is vacant',
      'Consider a bonded storage facility for high-value jewellery, art, or collectibles',
    ],
    links: [
      { label: 'Executor duties overview — LSO', url: 'https://lso.ca/public-resources/finding-a-lawyer-or-paralegal/your-guide-to-the-legal-process/estate-law' },
      { label: 'Executor liability explained — CLEO', url: 'https://stepstojustice.ca/legal-topic/wills-estates-powers-of-attorney/' },
    ],
    forms: [],
  },
  {
    id: 't4', phase: 'immediate',
    label: 'Notify Service Canada — stop CPP and OAS payments',
    detail: 'CPP and OAS payments must stop the month after death. Any payments received after the date of death must be returned — they become an estate debt. Call Service Canada promptly with the deceased\'s SIN and date of death. Banks typically claw back direct-deposit overpayments automatically once notified.',
    tips: [
      'Call 1-800-277-9914 (Service Canada) — available weekdays',
      'Note the name of the agent you spoke with and the reference number',
      'Surviving spouse\'s benefits are separate — confirm these continue on the same call',
      'Request information on the CPP Survivor\'s Pension for the surviving spouse if applicable',
    ],
    links: [
      { label: 'Service Canada — Notify of a death', url: 'https://www.canada.ca/en/employment-social-development/services/sin/notify-death.html' },
      { label: 'CPP Survivor\'s Pension', url: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-survivor-pension.html' },
      { label: 'OAS — When a recipient dies', url: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-death-benefit.html' },
    ],
    forms: [
      { label: 'ISP1200 — CPP Death Benefit Application', url: 'https://www.canada.ca/content/dam/esdc-edsc/documents/services/forms/isp1200.pdf' },
    ],
  },
  {
    id: 't5', phase: 'immediate',
    label: 'Apply for the CPP Death Benefit ($2,500)',
    detail: 'A one-time taxable lump-sum of $2,500 paid to the estate or the person who paid funeral expenses. It must be applied for — it is not paid automatically. Apply within 60 days for fastest processing. The benefit is taxable income and must be reported on the estate\'s T3 return.',
    tips: [
      'Apply as soon as possible — processing takes 6–12 weeks',
      'If the surviving spouse paid funeral costs, they can apply in their own name',
      'The deceased must have contributed to CPP for at least one year to be eligible',
      'This benefit is taxable — include it in estate income reporting',
    ],
    links: [
      { label: 'CPP Death Benefit — Canada.ca', url: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-death-benefit.html' },
    ],
    forms: [
      { label: 'ISP1200 — CPP Death Benefit Application', url: 'https://www.canada.ca/content/dam/esdc-edsc/documents/services/forms/isp1200.pdf' },
    ],
  },
  {
    id: 't6', phase: 'immediate',
    label: 'Notify the deceased\'s employer (if applicable)',
    detail: 'Contact HR promptly to claim outstanding pay, accrued vacation, group life insurance, health and dental benefits, and any workplace pension. Group life insurance claims typically have deadlines of 30–90 days and are often 2–4x annual salary — easy to miss but very valuable.',
    tips: [
      'Ask specifically about group life insurance — it is commonly overlooked',
      'Request a Record of Employment and a letter confirming last day and salary (needed for CRA)',
      'Workplace pension survivor benefits may be separate from group insurance — ask about both',
      'Any owed pay including unused vacation belongs to the estate',
    ],
    links: [
      { label: 'Group insurance claims — CLHIA', url: 'https://www.clhia.ca/web/CLHIA_LP4W_LND_Webstation.nsf/page/D513D78DC5D3580D8525797A005B8EDA' },
    ],
    forms: [],
  },
  {
    id: 't7', phase: 'month1',
    label: 'Open a dedicated estate bank account',
    detail: 'All estate money — incoming and outgoing — must flow through one dedicated estate account. This keeps estate funds completely separate from your personal finances and creates the audit trail required for your final accounting to beneficiaries. Most major Canadian banks offer estate accounts.',
    tips: [
      'Bring: original will, your government ID, death certificate, and probate certificate if obtained',
      'Account is titled "Estate of [Name]" with you as trustee',
      'Some banks open estate accounts without probate for smaller estates — worth asking',
      'You are entitled to charge the estate for reasonable executor time and out-of-pocket expenses',
      'Keep every single receipt — you must account to beneficiaries for every dollar',
    ],
    links: [
      { label: 'Executor compensation in Canada — overview', url: 'https://www.legalwills.ca/blog/executor-compensation-canada/' },
      { label: 'Estate accounting — Ontario Bar Association', url: 'https://www.oba.org/JUST/Wills/Starting_Point.aspx' },
    ],
    forms: [],
  },
  {
    id: 't8', phase: 'month1',
    label: 'Apply for probate (if required)',
    detail: 'Probate confirms the will is valid and authorizes you to act. In Ontario it is called a "Certificate of Appointment of Estate Trustee." Most financial institutions require it for accounts over ~$50k and for transferring real property. Quebec notarial wills never require probate. Alberta has a simple flat-fee process; Nova Scotia is the most expensive province.',
    tips: [
      'Not all estates need probate — named-beneficiary accounts and joint assets bypass it entirely',
      'In Ontario, pay the Estate Administration Tax (1.5% over $50k) when filing',
      'Allow 4–8 weeks for processing; Ontario Superior Court can take longer',
      'Errors in the probate application cause significant delays — consider an estate lawyer',
      'Keep the original probate certificate safe — institutions will want to see it',
    ],
    links: [
      { label: 'Ontario — Apply for probate (Certificate of Appointment)', url: 'https://www.ontario.ca/page/apply-certificate-appointment-estate-trustee' },
      { label: 'BC Probate guide', url: 'https://www2.gov.bc.ca/gov/content/justice/courthouse-services/documents-forms-records/probate-estate' },
      { label: 'Alberta — Probate and administration', url: 'https://www.alberta.ca/probate-and-administration.aspx' },
      { label: 'Canada.ca — Probate overview', url: 'https://www.canada.ca/en/financial-consumer-agency/services/estate-planning/after-death.html' },
    ],
    forms: [
      { label: 'Ontario Form 74A — Application for Certificate of Appointment', url: 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/' },
    ],
  },
  {
    id: 't9', phase: 'month1',
    label: 'Notify all financial institutions',
    detail: 'Contact every bank, brokerage, insurer, and pension plan. Bring a certified death certificate and copy of the will (or probate certificate for larger accounts). Ask explicitly about beneficiary designations on each account — these are paid directly to the named person and bypass the will and the estate entirely.',
    tips: [
      'Review 12 months of bank and credit card statements to identify all accounts',
      'Ask each institution for a "date of death value statement" — required for tax and accounting',
      'Named beneficiary accounts (RRSP, TFSA, RRIF, insurance) pay out directly — you don\'t control them',
      'Some institutions will freeze accounts until probate — get this in writing',
      'Request all statements and correspondence be sent to you going forward',
    ],
    links: [
      { label: 'CDIC — Deceased depositor guide', url: 'https://www.cdic.ca/your-deposit-protection/protecting-your-deposits/situations-that-affect-your-deposit-protection/death-of-a-depositor/' },
      { label: 'FSRA — Insurance claims after a death', url: 'https://www.fsrao.ca/consumers/auto-and-home-insurance/after-car-accident/making-claim' },
    ],
    forms: [],
  },
  {
    id: 't10', phase: 'month1',
    label: 'Cancel credit cards, subscriptions, and recurring payments',
    detail: 'Prevent ongoing charges that become estate debts. Cancel all credit cards, streaming services, memberships, and automatic payments. Check for balance protection insurance on credit cards — it may pay off the balance on death. You are NOT personally liable for the deceased\'s debts simply by being executor.',
    tips: [
      'Check each credit card for balance protection insurance — it can eliminate the balance entirely',
      'Keep one payment method active for estate expenses (the estate account debit card)',
      'Common subscriptions to cancel: Netflix, Amazon, Apple, Adobe, newspapers, gym memberships',
      'Preserve all statements for the final tax return',
      'Contact Canada Revenue Agency separately — do not cancel any pre-authorized tax payments until you know the status',
    ],
    links: [
      { label: 'Executor liability for debts — CLEO', url: 'https://stepstojustice.ca/questions/wills-and-estates/am-i-responsible-pay-debts-my-family-member-who-just-died/' },
    ],
    forms: [],
  },
  {
    id: 't11', phase: 'month1',
    label: 'Redirect mail to yourself or a trusted address',
    detail: 'Critical financial documents, CRA notices, insurance renewals, T-slips, and legal correspondence will continue to arrive. File a Canada Post mail forwarding request for at least 12 months. Also redirect digital accounts where you have access.',
    tips: [
      'Canada Post mail forwarding costs approximately $83/year for an individual',
      'Tax slips (T3, T4, T5, T4A) arrive January–March — essential for the final return',
      'Forward email if you have credentials — watch for electronic bills and statements',
      'Update the address with all known financial institutions directly as well',
    ],
    links: [
      { label: 'Canada Post — Mail forwarding service', url: 'https://www.canadapost-postescanada.ca/cpc/en/personal/receiving/mail-forwarding.page' },
    ],
    forms: [],
  },
  {
    id: 't12', phase: 'month1',
    label: 'Notify CRA of the death',
    detail: 'Notify CRA so they stop issuing benefits (GST/HST credit, Canada Child Benefit) and can begin processing for the final return. You as legal representative are responsible for filing. You can also register as the deceased\'s legal representative online via CRA My Account.',
    tips: [
      'Call CRA at 1-800-959-8281 — have the SIN and date of death ready',
      'Request a list of all CRA accounts — there may be GST/HST business accounts to close',
      'Register as legal representative to get full online access to the deceased\'s CRA account',
      'Stop any pre-authorized payments carefully — confirm first whether taxes are still owed',
    ],
    links: [
      { label: 'CRA — What to do when someone dies', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/what-to-do-death-taxpayer.html' },
      { label: 'CRA — Checklist for legal representatives', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4011/preparing-returns-deceased-persons.html' },
    ],
    forms: [
      { label: 'T1013 — Authorizing or Cancelling a Representative', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t1013.html' },
    ],
  },
  {
    id: 't13', phase: 'month3',
    label: 'Compile a full asset and liability inventory',
    detail: 'Create a complete list of all assets with fair market value at date of death, and all liabilities. This document forms the estate accounting that beneficiaries are legally entitled to receive. Use the Asset Inventory tab in this app to track and classify everything.',
    tips: [
      'Get formal valuations — not estimates — for real estate, businesses, and significant investments',
      'Include digital assets: cryptocurrency, PayPal, online savings accounts, domain names',
      'Include potential refunds: tax refunds, utility deposits, unused prepaid services',
      'Liabilities include: mortgages, car loans, credit cards, personal loans, taxes owing, funeral costs',
      'The inventory must reflect values at the date of death specifically — not current values',
    ],
    links: [
      { label: 'CRA — T4011 Preparing returns for deceased persons', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4011/preparing-returns-deceased-persons.html' },
      { label: 'Estate inventory guide — Willful', url: 'https://getwillful.com/blog/estate-inventory/' },
    ],
    forms: [],
  },
  {
    id: 't14', phase: 'month3',
    label: 'Advertise for creditors',
    detail: 'Several provinces require or strongly recommend placing a notice to creditors before distributing the estate. This protects the executor from personal liability if an unknown creditor appears after distribution. Wait at least 30–60 days after publishing before distributing.',
    tips: [
      'Ontario: not strictly required by statute but strongly recommended for executor protection',
      'BC: creditors must be given reasonable time to make claims before any distribution',
      'Quebec: the Civil Code requires the liquidator to give notice of the administration',
      'Keep a copy of the published notice permanently in your estate records',
      'Even if not legally required in your province, publishing notice is good practice',
    ],
    links: [
      { label: 'Ontario Gazette — Publish a public notice', url: 'https://www.ontario.ca/page/ontario-gazette' },
      { label: 'BC Estate Administration Act', url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/09013_01' },
    ],
    forms: [],
  },
  {
    id: 't15', phase: 'month3',
    label: 'Arrange appraisals for real estate, vehicles, and valuables',
    detail: 'Professional appraisals establish fair market value at the date of death for tax (deemed disposition), probate calculations, and equitable distribution to beneficiaries. Retroactive appraisals can be done months after death — appraisers do this regularly.',
    tips: [
      'Real estate: hire a certified appraiser (AACI designation) for a retrospective date-of-death appraisal',
      'Vehicles: Canadian Black Book or a dealer appraisal works for CRA',
      'Jewellery, art, and collectibles: use a certified specialist appraiser — values may surprise you',
      'Keep all appraisal reports permanently — CRA may request them years later',
      'If multiple beneficiaries are involved, independent appraisals prevent disputes',
    ],
    links: [
      { label: 'Appraisal Institute of Canada — Find an appraiser', url: 'https://www.aicanada.ca/find-an-appraiser/' },
      { label: 'Canadian Personal Property Appraisers Group', url: 'https://www.cppag.com' },
    ],
    forms: [],
  },
  {
    id: 't16', phase: 'month3',
    label: 'Transfer or liquidate investment accounts',
    detail: 'Non-registered accounts trigger deemed disposition at death — capital gains go on the final T1. RRSP/RRIF can be rolled to a surviving spouse tax-free. Named beneficiary accounts are handled directly by the institution and bypass the estate. Locate any cryptocurrency immediately — wallets without private keys are permanently lost.',
    tips: [
      'Request a "date of death" statement from each brokerage showing cost base and market value',
      'Non-registered capital gains go on the final T1 — 50% of the gain is taxable income',
      'RRSP spousal rollover: open a spousal RRSP first, then transfer — use CRA Form T2019',
      'Ask the brokerage about in-kind transfer if a beneficiary wants to hold the investments',
      'Cryptocurrency: locate all wallets and private keys immediately — these may be permanently inaccessible otherwise',
    ],
    links: [
      { label: 'CRA — RRSP/RRIF/TFSA on death', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-happens-rrsp-rrif-tfsa-holder-dies.html' },
      { label: 'CRA — Capital gains guide', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4037/capital-gains.html' },
    ],
    forms: [
      { label: 'T2019 — Death of an RRSP Annuitant / Spousal or Common-law Partner RRSP', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2019.html' },
    ],
  },
  {
    id: 't17', phase: 'tax',
    label: "File the deceased's final T1 tax return",
    detail: 'The final T1 covers January 1 to the date of death. RRSP and RRIF balances not rolled to a spouse are fully included as income — often triggering the largest tax bill of the deceased\'s lifetime. Due April 30 of the following year or 6 months after death, whichever is later.',
    tips: [
      'Collect all T4, T4A, T3, T5 slips — request them from each employer, bank, and investment firm',
      'The principal residence exemption eliminates capital gains on the family home',
      'RRSP/RRIF collapse can be deferred if transferred to a surviving spouse (Form T2019)',
      'Charitable donations in the will generate donation credits on the final return',
      'Strongly recommend hiring a CPA experienced with deceased taxpayer returns — the stakes are high',
    ],
    links: [
      { label: 'CRA — Preparing returns for deceased persons (T4011)', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4011/preparing-returns-deceased-persons.html' },
      { label: 'CRA — What to do when someone dies (tax guide)', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/what-to-do-death-taxpayer.html' },
    ],
    forms: [
      { label: 'T1 General — Income Tax and Benefit Return', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package.html' },
      { label: 'Schedule 3 — Capital Gains (or Losses)', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package.html' },
    ],
  },
  {
    id: 't18', phase: 'tax',
    label: 'Consider filing optional returns',
    detail: 'Up to three additional returns may be filed for the year of death, splitting income across returns and each getting their own basic personal amount. The "rights and things" return covers amounts owed to the deceased but not yet received: uncashed cheques, employment income earned but unpaid, accrued bond interest.',
    tips: [
      'Each optional return gets its own basic personal amount (~$15,000) — potentially saving thousands in tax',
      'Rights and things commonly include: uncashed dividends, final paycheque, accrued bond interest',
      'Optional returns must be filed by the same deadline as the final T1',
      'A CPA familiar with estates is essential here — the multi-return strategy is complex',
    ],
    links: [
      { label: 'CRA — Optional returns on death', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4011/preparing-returns-deceased-persons.html' },
    ],
    forms: [],
  },
  {
    id: 't19', phase: 'tax',
    label: 'Obtain a CRA Clearance Certificate',
    detail: 'The Clearance Certificate confirms all income taxes for the deceased and the estate have been assessed and paid. Without it, you as executor are personally liable for any tax debt discovered later — even after distributing the estate. This is the single most critical step before final distribution.',
    tips: [
      'Apply only after all returns have been assessed (not just filed) and balances paid',
      'Allow 4–6 months for CRA to process and issue the certificate',
      'Apply separately for the final T1 and for T3 estate trust returns',
      'Keep a copy permanently — you may need it years later',
      'Do NOT distribute the estate before receiving this certificate',
    ],
    links: [
      { label: 'CRA — Clearance Certificate', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/what-to-do-death-taxpayer/clearance-certificate.html' },
    ],
    forms: [
      { label: 'TX19 — Asking for a Clearance Certificate', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/tx19.html' },
    ],
  },
  {
    id: 't20', phase: 'tax',
    label: 'File T3 Trust return (if estate earns income)',
    detail: 'If the estate earns any income during administration — bank interest, investment gains, rental income — a T3 Estate Trust return must be filed for each year of administration. Even a small amount of interest in the estate bank account triggers the requirement. Testamentary trusts created by the will get graduated tax rates for 36 months.',
    tips: [
      'The T3 return is due 90 days after the estate\'s year-end (December 31)',
      'Testamentary trusts get graduated tax rates for the first 36 months — a significant tax saving',
      'Beneficiaries receive T3 slips showing their share of estate income to report on their own returns',
      'Even a small amount of bank interest triggers a T3 filing requirement',
    ],
    links: [
      { label: 'CRA — Guide T4013 T3 Trust Guide', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4013.html' },
    ],
    forms: [
      { label: 'T3RET — T3 Trust Income Tax and Information Return', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t3ret.html' },
    ],
  },
  {
    id: 't21', phase: 'tax',
    label: 'Distribute assets to beneficiaries and obtain receipts',
    detail: 'Only distribute after receiving the CRA Clearance Certificate. Pay specific bequests first, then the residual estate per the will. Get a signed receipt and release from each beneficiary confirming they received their share and have no further claims. Minors\' inheritances may need to be held in trust.',
    tips: [
      'A signed release from all beneficiaries provides legal protection for you as executor',
      'Pay specific gifts (named items) first, then divide the residual estate',
      'Keep detailed records: who received what, when, and the market value at distribution',
      'Foreign beneficiaries may trigger non-resident withholding tax — consult a tax advisor',
      'If a beneficiary cannot be located, consult a lawyer before distributing their share',
    ],
    links: [
      { label: 'Executor discharge — Steps to Justice', url: 'https://stepstojustice.ca/questions/wills-and-estates/when-can-an-estate-trustee-be-discharged/' },
      { label: 'LegalWills — Executor resources', url: 'https://www.legalwills.ca/blog/executor-duties-responsibilities/' },
    ],
    forms: [],
  },
  {
    id: 't22', phase: 'tax',
    label: 'Prepare final estate accounting for beneficiaries',
    detail: 'A formal accounting of all assets received, income earned during administration, expenses paid (funeral, legal, accounting, executor compensation), and all distributions made. Beneficiaries are legally entitled to this document. It formally closes your role as executor once everyone signs off.',
    tips: [
      'Keep all estate records for at least 6 years after closing — CRA can reassess',
      'Format: opening inventory → income received → expenses paid → distributions → closing nil balance',
      'Have a lawyer review before presenting if there is any risk of dispute among beneficiaries',
      'Executor compensation in Ontario: ~2.5% of capital receipts + 2.5% of capital disbursements',
      'Once all beneficiaries sign the accounting, your duties as executor are complete',
    ],
    links: [
      { label: 'Passing of accounts — Ontario Courts', url: 'https://www.ontario.ca/page/passing-accounts-estate' },
      { label: 'Estate accounting guide — CLEO', url: 'https://stepstojustice.ca/legal-topic/wills-estates-powers-of-attorney/' },
    ],
    forms: [],
  },
]

const PHASES = [
  { id: 'immediate', label: 'Immediate', sub: 'Days 1–7', color: '#E24B4A' },
  { id: 'month1',    label: 'First month', sub: 'Weeks 2–4', color: '#F5A623' },
  { id: 'month3',    label: 'Within 3 months', sub: 'Months 1–3', color: '#378ADD' },
  { id: 'tax',       label: 'Tax & distribution', sub: 'Months 3–18', color: '#1FCFB0' },
]

const LS_KEY = 'retirely_estate_v1'

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {}
}

// ─── Entry screen ─────────────────────────────────────────────────────────────
function EntryScreen({ onStart }) {
  const [mode, setMode] = useState('mine')
  const [submode, setSubmode] = useState(null)
  const [who, setWho] = useState(null)

  const ready = mode === 'mine' || (submode && who)

  return (
    <div className={styles.entryWrap}>
      <div className={styles.entryCard}>
        <div className={styles.entryEyebrow}>Estate Planner · Beta</div>
        <h1 className={styles.entryHeading}>Whose estate are you planning?</h1>
        <p className={styles.entrySub}>This helps us set the right context — whether you're planning ahead for yourself or helping manage someone else's estate.</p>

        <div className={styles.modeCards}>
          {/* My own */}
          <button
            className={`${styles.modeCard} ${mode === 'mine' ? styles.modeCardActive : ''}`}
            onClick={() => { setMode('mine'); setSubmode(null); setWho(null) }}
          >
            <div className={`${styles.modeIcon} ${styles.modeIconTeal}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles.modeText}>
              <div className={styles.modeTitle}>My own estate</div>
              <div className={styles.modeDesc}>Plan ahead — see what your estate looks like today, estimate taxes and probate fees, and create a guide for your executor.</div>
            </div>
            <span className={styles.modeBadge}>Imports from Retirely</span>
          </button>

          {/* Someone else */}
          <button
            className={`${styles.modeCard} ${mode === 'other' ? styles.modeCardActive : ''}`}
            onClick={() => setMode('other')}
          >
            <div className={`${styles.modeIcon} ${styles.modeIconBlue}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className={styles.modeText}>
              <div className={styles.modeTitle}>Someone else's estate</div>
              <div className={styles.modeDesc}>Helping a parent, spouse, or family member — whether planning ahead together or actively administering an estate after a death.</div>
            </div>
          </button>

          {mode === 'other' && (
            <div className={styles.subChoice}>
              {[
                { id: 'planning', title: 'Planning ahead', hint: 'The person is still alive — helping them organise and understand their estate' },
                { id: 'active',   title: 'Active administration', hint: 'The person has passed — I\'m the executor managing the estate now' },
              ].map(opt => (
                <label key={opt.id} className={`${styles.subOpt} ${submode === opt.id ? styles.subOptOn : ''}`}>
                  <input type="radio" name="submode" checked={submode === opt.id}
                    onChange={() => setSubmode(opt.id)} />
                  <div>
                    <div className={styles.subOptTitle}>{opt.title}</div>
                    <div className={styles.subOptHint}>{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {mode === 'other' && submode && (
          <div className={styles.whoRow}>
            <div className={styles.whoLabel}>Who is this for?</div>
            <div className={styles.whoChips}>
              {['Parent', 'Spouse / partner', 'Sibling', 'Grandparent', 'Other'].map(w => (
                <button key={w}
                  className={`${styles.chip} ${who === w ? styles.chipOn : ''}`}
                  onClick={() => setWho(w)}
                >{w}</button>
              ))}
            </div>
          </div>
        )}

        <button
          className={`${styles.continueBtn} ${ready ? styles.continueBtnReady : ''}`}
          onClick={() => ready && onStart({ mode, submode, who })}
        >
          Continue →
        </button>
        <p className={styles.entryNote}>All data stays on your device — nothing is sent or stored externally</p>
      </div>
    </div>
  )
}

// ─── Asset inventory ──────────────────────────────────────────────────────────
const ASSET_TYPES = [
  { id: 'rrsp',      label: 'RRSP / RRIF',          probate: false, note: 'Bypasses probate if beneficiary named. Collapses to income on final return unless rolled to spouse.' },
  { id: 'tfsa',      label: 'TFSA',                  probate: false, note: 'Tax-free if successor holder (spouse) named. Otherwise joins estate.' },
  { id: 'nr',        label: 'Non-registered',         probate: true,  note: 'Subject to probate. Deemed disposition triggers capital gains at death.' },
  { id: 'realty',    label: 'Real estate',            probate: true,  note: 'Principal residence: gains exempt. Other property: capital gains apply. Joint tenancy passes to survivor.' },
  { id: 'life',      label: 'Life insurance',         probate: false, note: 'Bypasses probate if beneficiary named. Tax-free to beneficiary.' },
  { id: 'pension',   label: 'DB pension',             probate: false, note: 'Typically ends at death (or survivor benefit continues at reduced %). Check your plan.' },
  { id: 'lira',      label: 'LIRA / LIF',            probate: false, note: 'Can be rolled to surviving spouse\'s RRSP or RRIF if designated beneficiary.' },
  { id: 'business',  label: 'Business interest',      probate: true,  note: 'Complex. Lifetime capital gains exemption may apply. Requires professional valuation.' },
  { id: 'vehicle',   label: 'Vehicles',               probate: true,  note: 'Part of the estate. Value at date of death.' },
  { id: 'other',     label: 'Other assets',           probate: true,  note: 'Jewellery, art, collectibles, etc.' },
]

function AssetInventory({ assets, setAssets, province }) {
  const [expanded, setExpanded] = useState(null)
  const probate = PROBATE_RULES[province] || PROBATE_RULES.ON
  const probateSubject = assets.reduce((sum, a) => {
    const type = ASSET_TYPES.find(t => t.id === a.type)
    return sum + (type?.probate ? (a.value || 0) : 0)
  }, 0)
  const totalGross = assets.reduce((s, a) => s + (a.value || 0), 0)
  const totalLiab  = assets.reduce((s, a) => s + (a.liability || 0), 0)
  const netEstate  = totalGross - totalLiab
  const probateFee = probate.calc(probateSubject)

  const addAsset = () => setAssets(prev => [...prev, { id: Date.now(), type: 'nr', label: '', value: 0, liability: 0, beneficiary: '' }])
  const updateAsset = (id, k, v) => setAssets(prev => prev.map(a => a.id === id ? { ...a, [k]: v } : a))
  const removeAsset = id => setAssets(prev => prev.filter(a => a.id !== id))

  // For number inputs: store raw string while typing, parse to number on blur
  const handleValueChange = (id, k, raw) => {
    // Store as number immediately — remove commas, parse float
    const parsed = parseFloat(raw.replace(/,/g, '')) 
    updateAsset(id, k, isNaN(parsed) ? 0 : parsed)
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Asset inventory</h2>
          <p className={styles.sectionSub}>List all assets and liabilities. We'll classify which are subject to probate.</p>
        </div>
        <button className={styles.addBtn} onClick={addAsset}>+ Add asset</button>
      </div>

      {/* Summary KPIs */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}><div className={styles.kpiLabel}>Gross estate</div><div className={styles.kpiVal}>{fmtK(totalGross)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>Liabilities</div><div className={`${styles.kpiVal} ${styles.kpiRed}`}>−{fmtK(totalLiab)}</div></div>
        <div className={`${styles.kpi} ${styles.kpiAccent}`}><div className={styles.kpiLabel}>Net estate</div><div className={styles.kpiVal}>{fmtK(netEstate)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>Probate subject</div><div className={styles.kpiVal}>{fmtK(probateSubject)}</div></div>
        <div className={`${styles.kpi} ${styles.kpiWarn}`}><div className={styles.kpiLabel}>Est. probate fee ({province})</div><div className={styles.kpiVal}>{fmtC(probateFee)}</div><div className={styles.kpiNote}>{probate.label}</div></div>
      </div>

      {/* Asset rows */}
      <div className={styles.assetList}>
        {assets.length === 0 && (
          <div className={styles.emptyAssets}>No assets added yet — click "Add asset" to start</div>
        )}
        {assets.map(a => {
          const type = ASSET_TYPES.find(t => t.id === a.type) || ASSET_TYPES[2]
          return (
            <div key={a.id} className={styles.assetRow}>
              <div className={styles.assetMain}>
                {/* Top row: type selector + probate pill + expand/remove */}
                <div className={styles.assetTopRow}>
                  <select className={styles.assetType} value={a.type}
                    onChange={e => updateAsset(a.id, 'type', e.target.value)}>
                    {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <div className={`${styles.probatePill} ${type.probate ? styles.probatePillYes : styles.probatePillNo}`}>
                    {type.probate ? '⚖ Probate' : '✓ Bypasses probate'}
                  </div>
                  <div className={styles.assetActions}>
                    <button className={styles.assetExpand}
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      title={expanded === a.id ? 'Collapse' : 'Add liability / beneficiary'}>
                      {expanded === a.id ? '▲' : '▼ more'}
                    </button>
                    <button className={styles.assetRemove} onClick={() => removeAsset(a.id)} title="Remove">✕</button>
                  </div>
                </div>
                {/* Bottom row: description + value */}
                <div className={styles.assetBottomRow}>
                  <input className={styles.assetLabel} placeholder="Description (e.g. TD RRSP, 123 Main St)"
                    value={a.label} onChange={e => updateAsset(a.id, 'label', e.target.value)} />
                  <div className={styles.assetValWrap}>
                    <span className={styles.assetDollar}>$</span>
                    <input
                      className={styles.assetVal}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={a.value === 0 ? '' : a.value}
                      onChange={e => handleValueChange(a.id, 'value', e.target.value)}
                      onBlur={e => { if (e.target.value === '') updateAsset(a.id, 'value', 0) }}
                    />
                  </div>
                </div>
              </div>
              {expanded === a.id && (
                <div className={styles.assetDetail}>
                  <div className={styles.assetDetailGrid}>
                    <label className={styles.assetDetailLabel}>
                      Liability / mortgage
                      <div className={styles.assetValWrap}>
                        <span className={styles.assetDollar}>$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={styles.assetVal}
                          placeholder="0"
                          value={a.liability === 0 ? '' : a.liability}
                          onChange={e => handleValueChange(a.id, 'liability', e.target.value)}
                          onBlur={e => { if (e.target.value === '') updateAsset(a.id, 'liability', 0) }}
                        />
                      </div>
                    </label>
                    <label className={styles.assetDetailLabel}>
                      Beneficiary designation
                      <input className={styles.assetLabel} placeholder="e.g. Spouse, Estate, John Smith"
                        value={a.beneficiary || ''} onChange={e => updateAsset(a.id, 'beneficiary', e.target.value)} />
                    </label>
                  </div>
                  <div className={styles.assetNote}>{type.note}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Executor checklist ───────────────────────────────────────────────────────
function ExecutorChecklist({ done, setDone, isActive, deathDate }) {
  const [selected, setSelected] = useState(CHECKLIST_TASKS[0].id)

  const toggle = id => setDone(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const total     = CHECKLIST_TASKS.length
  const completed = CHECKLIST_TASKS.filter(t => done.includes(t.id)).length
  const pct       = Math.round(completed / total * 100)

  const task      = CHECKLIST_TASKS.find(t => t.id === selected) || CHECKLIST_TASKS[0]
  const isDone    = done.includes(task.id)
  const phase     = PHASES.find(p => p.id === task.phase)

  return (
    <div className={styles.checklistWrap}>

      {/* ── Left pane: task list ── */}
      <div className={styles.checklistLeft}>
        <div className={styles.checklistLeftHead}>
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarFill} style={{ width: pct + '%' }} />
          </div>
          <span className={styles.checklistProgress}>{completed}/{total} complete</span>
        </div>

        {PHASES.map(ph => {
          const tasks    = CHECKLIST_TASKS.filter(t => t.phase === ph.id)
          const phaseDone = tasks.filter(t => done.includes(t.id)).length
          return (
            <div key={ph.id} className={styles.phaseGroup}>
              <div className={styles.phaseHeader}>
                <span className={styles.phaseDot} style={{ background: ph.color }} />
                <span className={styles.phaseLabel}>{ph.label}</span>
                <span className={styles.phaseSub}>{ph.sub}</span>
                <span className={styles.phaseCount}>{phaseDone}/{tasks.length}</span>
              </div>
              {tasks.map(t => (
                <button
                  key={t.id}
                  className={`${styles.taskRow} ${selected === t.id ? styles.taskRowActive : ''} ${done.includes(t.id) ? styles.taskRowDone : ''}`}
                  onClick={() => setSelected(t.id)}
                >
                  <span className={`${styles.taskRowCheck} ${done.includes(t.id) ? styles.taskRowCheckDone : ''}`}>
                    {done.includes(t.id) && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className={styles.taskRowLabel}>{t.label}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* ── Right pane: task detail ── */}
      <div className={styles.checklistRight}>
        {/* Phase badge + title */}
        <div className={styles.taskDetailHead}>
          <span className={styles.taskDetailPhase} style={{ color: phase?.color, borderColor: phase?.color + '55', background: phase?.color + '18' }}>
            {phase?.label} · {phase?.sub}
          </span>
          <h3 className={styles.taskDetailTitle}>{task.label}</h3>
        </div>

        {/* Description */}
        <p className={styles.taskDetailBody}>{task.detail}</p>

        {/* Tips */}
        {task.tips?.length > 0 && (
          <div className={styles.taskSection}>
            <div className={styles.taskSectionTitle}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Tips
            </div>
            <ul className={styles.tipList}>
              {task.tips.map((tip, i) => (
                <li key={i} className={styles.tipItem}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Forms */}
        {task.forms?.length > 0 && (
          <div className={styles.taskSection}>
            <div className={styles.taskSectionTitle}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Forms &amp; documents
            </div>
            <div className={styles.linkList}>
              {task.forms.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className={`${styles.linkItem} ${styles.linkItemForm}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  </svg>
                  {f.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {task.links?.length > 0 && (
          <div className={styles.taskSection}>
            <div className={styles.taskSectionTitle}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Resources &amp; links
            </div>
            <div className={styles.linkList}>
              {task.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Complete button — pinned to bottom */}
        <div className={styles.taskCompleteWrap}>
          <button
            className={`${styles.taskCompleteBtn} ${isDone ? styles.taskCompleteBtnDone : ''}`}
            onClick={() => toggle(task.id)}
          >
            {isDone ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Completed — click to undo
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                Mark as complete
              </>
            )}
          </button>
          <span className={styles.taskNav}>
            {CHECKLIST_TASKS.findIndex(t => t.id === selected) > 0 && (
              <button className={styles.taskNavBtn} onClick={() => {
                const idx = CHECKLIST_TASKS.findIndex(t => t.id === selected)
                setSelected(CHECKLIST_TASKS[idx - 1].id)
              }}>← Prev</button>
            )}
            {CHECKLIST_TASKS.findIndex(t => t.id === selected) < CHECKLIST_TASKS.length - 1 && (
              <button className={styles.taskNavBtn} onClick={() => {
                const idx = CHECKLIST_TASKS.findIndex(t => t.id === selected)
                if (!isDone) toggle(task.id)
                setSelected(CHECKLIST_TASKS[idx + 1].id)
              }}>Mark complete &amp; next →</button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Tax impact ───────────────────────────────────────────────────────────────
function TaxImpact({ assets, province, hasSpouse }) {
  const rrsp   = assets.filter(a => a.type === 'rrsp').reduce((s,a) => s + (a.value||0), 0)
  const nr     = assets.filter(a => a.type === 'nr').reduce((s,a) => s + (a.value||0), 0)
  const nrCost = nr * 0.5  // assume 50% cost basis as rough estimate
  const capitalGain = Math.max(0, nr - nrCost)

  // Approximate marginal rate for final return (rough — actual depends on all income)
  const marginalRate = 0.46  // top combined ON rate as worst case
  const rrspTax = hasSpouse ? 0 : rrsp * marginalRate
  const cgTax   = hasSpouse ? 0 : capitalGain * 0.5 * marginalRate
  const totalTax = rrspTax + cgTax

  const probate = PROBATE_RULES[province] || PROBATE_RULES.ON
  const probateSubject = assets.filter(a => {
    const t = ASSET_TYPES.find(x => x.id === a.type)
    return t?.probate
  }).reduce((s,a) => s + (a.value||0), 0)
  const probateFee = probate.calc(probateSubject)

  const totalCost = totalTax + probateFee

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Tax &amp; cost impact</h2>
      <p className={styles.sectionSub}>Estimates based on your asset inventory. These are illustrative — consult a CPA for accurate figures.</p>

      {assets.length === 0 && (
        <div className={styles.emptyAssets} style={{marginBottom: '1rem'}}>
          Add assets in the Asset Inventory tab first — this tab calculates from those values.
        </div>
      )}

      {hasSpouse && (
        <div className={styles.spousalNote}>
          <strong>Spousal rollover applies.</strong> Most assets can transfer to a surviving spouse on a tax-deferred basis — RRSP/RRIF rolls into the spouse's plan, capital property transfers at cost. Tax is deferred until the surviving spouse sells or dies.
        </div>
      )}

      <div className={styles.taxRows}>
        <div className={styles.taxRow}>
          <div className={styles.taxLabel}>
            <span>RRSP / RRIF collapse</span>
            <span className={styles.taxNote}>{hasSpouse ? 'Deferred via spousal rollover' : `${fmtK(rrsp)} × ~${Math.round(marginalRate*100)}% marginal rate`}</span>
          </div>
          <span className={`${styles.taxVal} ${hasSpouse ? styles.taxGood : styles.taxBad}`}>
            {hasSpouse ? 'Deferred' : `−${fmtK(rrspTax)}`}
          </span>
        </div>
        <div className={styles.taxRow}>
          <div className={styles.taxLabel}>
            <span>Capital gains (non-reg)</span>
            <span className={styles.taxNote}>{hasSpouse ? 'Deferred via spousal rollover' : `50% of ~${fmtK(capitalGain)} gain`}</span>
          </div>
          <span className={`${styles.taxVal} ${hasSpouse ? styles.taxGood : styles.taxBad}`}>
            {hasSpouse ? 'Deferred' : `−${fmtK(cgTax)}`}
          </span>
        </div>
        <div className={styles.taxRow}>
          <div className={styles.taxLabel}>
            <span>Probate fees ({province})</span>
            <span className={styles.taxNote}>{probate.label}</span>
          </div>
          <span className={`${styles.taxVal} ${styles.taxBad}`}>−{fmtC(probateFee)}</span>
        </div>
        {probate.note && <div className={styles.taxProvinceNote}>{probate.note}</div>}
        <div className={`${styles.taxRow} ${styles.taxTotal}`}>
          <span>Estimated total estate cost</span>
          <span className={styles.taxVal}>−{fmtK(totalCost)}</span>
        </div>
      </div>

      <div className={styles.taxTips}>
        <div className={styles.taxTipsTitle}>Ways to reduce estate costs</div>
        <div className={styles.taxTip}>
          <span className={styles.taxTipIcon}>👤</span>
          <span><strong>Name beneficiaries</strong> on all RRSP, TFSA, RRIF, and life insurance — bypasses probate entirely and speeds up distribution.</span>
        </div>
        <div className={styles.taxTip}>
          <span className={styles.taxTipIcon}>🏠</span>
          <span><strong>Joint tenancy</strong> on real estate means the property passes to the surviving joint tenant without probate.</span>
        </div>
        <div className={styles.taxTip}>
          <span className={styles.taxTipIcon}>💰</span>
          <span><strong>TFSA successor holder</strong> — name your spouse as successor holder (not just beneficiary) so the TFSA continues tax-free without affecting their own room.</span>
        </div>
        <div className={styles.taxTip}>
          <span className={styles.taxTipIcon}>📋</span>
          <span><strong>Testamentary trusts</strong> created in a will can split income among beneficiaries, reducing tax in years after death.</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function EstatePage() {
  const saved = loadState()
  const [started, setStarted]   = useState(!!saved?.context)
  const [context, setContext]   = useState(saved?.context || null)
  const [province, setProvince] = useState(saved?.province || 'ON')
  const [hasSpouse, setHasSpouse] = useState(saved?.hasSpouse || false)
  const [deathDate, setDeathDate] = useState(saved?.deathDate || '')
  const [assets, setAssets]     = useState(saved?.assets || [])
  const [done, setDone]         = useState(saved?.done || [])
  const [activeTab, setActiveTab] = useState('checklist')

  // Persist state
  useEffect(() => {
    if (started) saveState({ context, province, hasSpouse, deathDate, assets, done })
  }, [context, province, hasSpouse, deathDate, assets, done, started])

  const handleStart = ctx => {
    setContext(ctx)
    setStarted(true)
  }

  const handleReset = () => {
    if (confirm('Clear all estate planning data and start over?')) {
      localStorage.removeItem(LS_KEY)
      setStarted(false); setContext(null); setAssets([]); setDone([])
    }
  }

  if (!started) return <EntryScreen onStart={handleStart} />

  const isActive = context?.submode === 'active'
  const isMine   = context?.mode === 'mine'
  const whoLabel = isMine ? 'Your estate' : `${context?.who}'s estate`

  const TABS = [
    { id: 'checklist', label: 'Executor checklist' },
    { id: 'inventory', label: 'Asset inventory' },
    { id: 'tax',       label: 'Tax & costs' },
  ]

  const completedTasks = CHECKLIST_TASKS.filter(t => done.includes(t.id)).length

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link to="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retirely
          </Link>
          <div className={styles.topDivider} />
          <div className={styles.topTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Estate Planner — {whoLabel}
          </div>
          {isActive && <span className={styles.activeBadge}>Active administration</span>}
          {!isActive && <span className={styles.planningBadge}>Planning ahead</span>}
        </div>
        <div className={styles.topRight}>
          {isActive && (
            <label className={styles.deathDateField}>
              <span className={styles.deathDateLabel}>Date of death</span>
              <input type="date" className={styles.deathDateInput}
                value={deathDate} onChange={e => setDeathDate(e.target.value)} />
            </label>
          )}
          <label className={styles.provinceField}>
            <span className={styles.provinceLabel}>Province</span>
            <select className={styles.provinceSelect} value={province}
              onChange={e => setProvince(e.target.value)}>
              {Object.entries(PROBATE_RULES).map(([k,v]) => (
                <option key={k} value={k}>{k} — {v.name}</option>
              ))}
            </select>
          </label>
          <label className={styles.spouseToggle}>
            <input type="checkbox" checked={hasSpouse}
              onChange={e => setHasSpouse(e.target.checked)} />
            Surviving spouse
          </label>
          <button className={styles.resetBtn} onClick={handleReset}>↺ Start over</button>
        </div>
      </header>

      {/* Progress strip */}
      <div className={styles.progressStrip}>
        <div className={styles.progressFill}
          style={{ width: Math.round(completedTasks / CHECKLIST_TASKS.length * 100) + '%' }} />
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div className={styles.tabSpacer} />
        <span className={styles.progressLabel}>
          {completedTasks}/{CHECKLIST_TASKS.length} tasks · {Math.round(completedTasks/CHECKLIST_TASKS.length*100)}% complete
        </span>
      </div>

      {/* Content */}
      <main className={`${styles.main} ${activeTab === 'checklist' ? styles.mainFull : ''}`}>
        {activeTab === 'checklist' && (
          <ExecutorChecklist done={done} setDone={setDone} isActive={isActive} deathDate={deathDate} />
        )}
        {activeTab === 'inventory' && (
          <AssetInventory assets={assets} setAssets={setAssets} province={province} />
        )}
        {activeTab === 'tax' && (
          <TaxImpact assets={assets} province={province} hasSpouse={hasSpouse} />
        )}
      </main>

      {/* Disclaimer */}
      <footer className={styles.footer}>
        This tool is for informational purposes only — not legal or tax advice. Estate administration involves complex legal obligations that vary by province. Consult an estate lawyer and CPA.
      </footer>
    </div>
  )
}

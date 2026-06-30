import React from 'react'
import { FIRE_SWR_OPTIONS, fmt, fmtM } from '../lib/engine.js'
import { Icon } from './Icon.jsx'
import styles from './FireTab.module.css'

function ProgressRing({ pct, color }) {
  const r = 54, circ = 2 * Math.PI * r
  const fill = circ - (pct / 100) * circ
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--gray-10)" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round" transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--navy)" fontFamily="var(--font-mono)">{pct}%</text>
      <text x="65" y="78" textAnchor="middle" fontSize="11" fill="var(--gray-40)" fontFamily="var(--font-sans)">to FIRE</text>
    </svg>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.accent : ''}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

export function FireTab({ fire, shared, person, setShField }) {
  if (!fire) return null

  const { fireNumber, leanFireNumber, fireAge, coastAge, progress, govAtFire, monthsToFire } = fire
  const currentSwr = shared.fireSwr
  const fireAgeRounded = fireAge ? fireAge.toFixed(1) : null
  const coastAgeRounded = coastAge ? coastAge.toFixed(1) : null
  const yearsToFire = fireAge ? (fireAge - person.currentAge).toFixed(1) : null
  const yearsToCoast = coastAge ? Math.max(0, coastAge - person.currentAge).toFixed(1) : null

  const alreadyFired = progress >= 100
  const totalAssets = (person.rrsp + person.tfsa + person.nonReg)

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>FIRE calculator</h2>
          <p className={styles.subtitle}>Financial Independence, Retire Early</p>
        </div>
        <div className={styles.swrPicker}>
          <span className={styles.swrLabel}>Safe withdrawal rate</span>
          <div className={styles.swrOptions}>
            {FIRE_SWR_OPTIONS.map(opt => (
              <button key={opt.rate}
                className={`${styles.swrBtn} ${currentSwr === opt.rate ? styles.swrActive : ''}`}
                onClick={() => setShField('fireSwr', opt.rate)}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className={styles.swrDesc}>{FIRE_SWR_OPTIONS.find(o => o.rate === currentSwr)?.desc}</p>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.body}>

        {/* Progress ring + headline numbers */}
        <div className={styles.ringSection}>
          <ProgressRing pct={Math.min(progress, 100)} color={alreadyFired ? '#1D9E75' : '#378ADD'} />
          <div className={styles.ringStats}>
            <div className={styles.fireNumberLabel}>Your FIRE number</div>
            <div className={styles.fireNumberValue}>{fmtM(fireNumber)}</div>
            <div className={styles.fireNumberSub}>at {(currentSwr * 100).toFixed(1)}% SWR · {fmt(fireNumber * currentSwr)}/yr</div>
            {alreadyFired ? (
              <div className={styles.firedBadge}> You've reached FIRE!</div>
            ) : (
              <div className={styles.gap}>
                <span className={styles.gapLabel}>Gap remaining</span>
                <span className={styles.gapValue}>{fmtM(Math.max(0, fireNumber - totalAssets))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className={styles.statsGrid}>
          <StatCard
            label="FIRE target age"
            value={fireAgeRounded ?? '—'}
            sub={yearsToFire ? `${yearsToFire} yrs from now` : 'Already there!'}
            accent={alreadyFired}
          />
          <StatCard
            label="Coast FIRE age"
            value={coastAgeRounded ?? '—'}
            sub={yearsToCoast ? `Stop contributing in ${yearsToCoast} yrs` : 'You can coast now'}
          />
          <StatCard
            label="Lean FIRE number"
            value={fmtM(leanFireNumber)}
            sub="With CPP + OAS offsetting"
          />
          <StatCard
            label="Gov income at FIRE"
            value={fmt(govAtFire)}
            sub="CPP + OAS (adjusted)"
          />
        </div>

        {/* Explanation section */}
        <div className={styles.explainer}>
          <div className={styles.explainerGrid}>
            <div className={styles.explainerCard}>
              <div className={styles.explainerIcon}></div>
              <div className={styles.explainerTitle}>Full FIRE</div>
              <div className={styles.explainerBody}>
                Portfolio alone funds 100% of your spending. FIRE number is{' '}
                <strong>{fmtM(fireNumber)}</strong> — your spending of{' '}
                <strong>{fmt(shared.annualSpending)}/yr</strong> divided by the {(currentSwr * 100).toFixed(1)}% SWR.
                Government benefits are a bonus cushion.
              </div>
            </div>
            <div className={styles.explainerCard}>
              <div className={styles.explainerIcon}></div>
              <div className={styles.explainerTitle}>Lean FIRE</div>
              <div className={styles.explainerBody}>
                Portfolio covers only what CPP + OAS won't. Reduced target of{' '}
                <strong>{fmtM(leanFireNumber)}</strong> assumes government benefits of{' '}
                <strong>{fmt(govAtFire)}/yr</strong> offset your spending.
                Riskier if benefits change.
              </div>
            </div>
            <div className={styles.explainerCard}>
              <div className={styles.explainerIcon}></div>
              <div className={styles.explainerTitle}>Coast FIRE</div>
              <div className={styles.explainerBody}>
                The point at which you can stop contributing entirely and let compounding
                carry you to FIRE by retirement. Target coast age:{' '}
                <strong>{coastAgeRounded ?? 'N/A'}</strong>. After coasting, you can
                work part-time, reduce stress, or pursue passion projects.
              </div>
            </div>
          </div>
        </div>

        {/* Canadian FIRE nuances */}
        <div className={styles.noteBox}>
          <div className={styles.noteTitle}>Canadian FIRE nuances</div>
          <div className={styles.noteGrid}>
            <div>
              <strong>CPP impact of early retirement</strong><br/>
              Retiring at 45 vs 60 can reduce CPP by 30–40% due to fewer years of maximum contributions.
              Your CPP estimate should account for the years you stop contributing.
            </div>
            <div>
              <strong>The bridge period</strong><br/>
              OAS isn't available until 65, and early CPP reduces it permanently. Early retirees
              face a 15–25 year bridge where the portfolio carries everything.
            </div>
            <div>
              <strong>RRIF conversion at 71</strong><br/>
              RRSP must convert to RRIF at 71. Minimum withdrawals (5.28%–20%) are mandatory
              and taxable — this calculator models them automatically in the scenarios tab.
            </div>
            <div>
              <strong>SWR for long retirements</strong><br/>
              The 4% rule covers ~30 years. If retiring at 45, use 3–3.5% to account for a
              50-year horizon and sequence-of-returns risk.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

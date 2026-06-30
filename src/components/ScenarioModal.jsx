import React, { useEffect } from 'react'
import { Icon, IconBox } from './Icon.jsx'
import styles from './ScenarioModal.module.css'

export function ScenarioModal({ scenario, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape — must run on every render (before any early return) to
  // keep hook order stable per the rules of hooks.
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const ex = scenario?.fullExplanation
  if (!scenario || !ex) return null

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header} style={{ '--accent': scenario.color }}>
          <div className={styles.headerLeft}>
            <span className={styles.colorDot} style={{ background: scenario.color }} />
            <div>
              <div className={styles.title}>{scenario.label}</div>
              <div className={styles.subtitle}>Strategy explanation</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <Section icon="drawdown" title="Overview" text={ex.overview} />
          <Section icon="government" title="CPP & OAS" text={ex.cppOas} />
          <Section icon="💸" title="Withdrawal order" text={ex.withdrawalOrder} />
          <Section icon="ages" title="RRIF at 71" text={ex.rrif} />
          <Section icon="🧾" title="Tax profile" text={ex.taxProfile} />

          <div className={styles.twoCol}>
            <div className={styles.suitedCard}>
              <div className={styles.cardIcon}>✅</div>
              <div className={styles.cardTitle}>Best suited for</div>
              <p className={styles.cardText}>{ex.suitedFor}</p>
            </div>
            <div className={styles.tradeCard}>
              <IconBox name="comparison" size={16} tone="teal" />
              <div className={styles.cardTitle}>Trade-offs</div>
              <p className={styles.cardText}>{ex.tradeoffs}</p>
            </div>
          </div>

          <p className={styles.disclaimer}>
            This explanation uses simplified assumptions. Actual outcomes depend on your specific income, tax situation, province, health, and market returns. Consult a qualified financial planner before making retirement decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, text }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}><span>{icon}</span> {title}</div>
      <p className={styles.sectionText}>{text}</p>
    </div>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import styles from './TopBar.module.css'
import { Icon } from './Icon.jsx'
import { AppSwitcher } from './AppSwitcher.jsx'

// ─── Retirely logo mark ───────────────────────────────────────────────────────
function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ borderRadius: 10, flexShrink: 0 }}>
      <defs>
        <linearGradient id="rlBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D1B2A"/>
          <stop offset="100%" stopColor="#0F2E3F"/>
        </linearGradient>
        <linearGradient id="rlTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1FCFB0"/>
          <stop offset="100%" stopColor="#0F9E75"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#rlBg)"/>
      <rect width="64" height="64" rx="14" fill="none" stroke="rgba(31,207,176,0.22)" strokeWidth="1.5"/>
      <line x1="10" y1="52" x2="54" y2="52" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10" y1="52" x2="10" y2="10" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="14" y="38" width="9" height="14" rx="2" fill="rgba(31,207,176,0.25)"/>
      <rect x="27" y="28" width="9" height="24" rx="2" fill="rgba(31,207,176,0.45)"/>
      <rect x="40" y="16" width="9" height="36" rx="2" fill="url(#rlTeal)"/>
      <polyline points="18.5,36 31.5,26 44.5,14" fill="none" stroke="#1FCFB0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="44.5" cy="14" r="3.2" fill="#1FCFB0"/>
      <circle cx="44.5" cy="14" r="1.4" fill="#fff"/>
    </svg>
  )
}

function fmtTime(date) {
  if (!date) return null
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)   return `${diffHrs}h ago`
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function TopBar({ mobileOpen, setMobileOpen, persistence, onExport, hasResults, theme, onToggleTheme, onScenarios, scenarioCount, activeScenario, onFullReset }) {
  const { save, load, clearSaved, lastSaved, hasSaved, saveStatus } = persistence
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const statusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'  ? 'Saved ✓'
    : saveStatus === 'error'  ? 'Save failed'
    : lastSaved ? `Auto-saved ${fmtTime(lastSaved)}`
    : 'Unsaved'

  const statusTone = saveStatus === 'saved'  ? 'good'
    : saveStatus === 'error'  ? 'bad'
    : 'muted'

  return (
    <>
    <header className={styles.bar}>
      {/* Left: app switcher + logo */}
      <div className={styles.left}>
        <AppSwitcher />
        {/* Brand links to the marketing home (static site, outside the SPA) */}
        <a className={styles.logoGroup} href="/" title="Retirely home" style={{ textDecoration: 'none' }}>
          <LogoMark />
          <div className={styles.brand}>
            <div className={styles.brandTop}>
              <span className={styles.title}>Retirely</span>
              <span className={styles.beta}>BETA</span>
            </div>
            <span className={styles.sub}>Retirement Scenarios</span>
          </div>
        </a>
      </div>

      {/* Right: controls */}
      <div className={styles.right}>

        <span className={`${styles.saveStatus} ${styles['status_' + statusTone]}`}>
          {statusLabel}
        </span>

        {activeScenario && (
          <span className={styles.activeScenarioPill} title={`Loaded: ${activeScenario.name}`}>
            <Icon name="check" size={10} />
            <span className={styles.activeScenarioName}>{activeScenario.name}</span>
          </span>
        )}

        <button className={styles.saveBtn} onClick={() => onScenarios('save')} title="Save current plan">
          <Icon name="save" size={13} style={{marginRight:4}}/>Save
        </button>

        <button className={styles.loadBtn} onClick={() => onScenarios('load')} title="Load a saved plan">
          <Icon name="load" size={13} style={{marginRight:4}}/>Load
          {scenarioCount > 0 && <span className={styles.scenariosBadge}>{scenarioCount}</span>}
        </button>

        <div className={styles.divider} />

        {hasResults && (
          <>
            <button className={styles.exportBtn} onClick={onExport} title="Export PDF report">
              <Icon name="export" size={13} style={{marginRight:4}}/>Export
            </button>
            <div className={styles.divider} />
          </>
        )}

        <button
          className={styles.resetAllBtn}
          onClick={() => setShowResetConfirm(true)}
          title="Clear all data and start fresh"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.35"/>
          </svg>
          <span className={styles.resetAllLabel}>Reset</span>
        </button>

        <button className={styles.themeBtn} onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
          {theme === 'dark' ? <Icon name='sun' size={16} /> : <Icon name='moon' size={16} />}
        </button>

        <div className={styles.profileSlot}>
          <div className={styles.profilePlaceholder} title="Sign in (coming soon)">
            <Icon name="profile" size={17} />
          </div>
        </div>

        <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(o => !o)} aria-label="Toggle inputs">
          {mobileOpen ? <Icon name='close' size={17}/> : <Icon name='menu' size={17}/>}
        </button>

        {/* Mobile: "Enter details" CTA — primary action on small screens */}
        <button
          className={`${styles.mobileDetailsBtn} ${mobileOpen ? styles.mobileDetailsBtnOpen : ''}`}
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen
            ? <><Icon name="close" size={13}/> Close</>
            : <><Icon name="profile" size={13}/> Your details</>
          }
        </button>
      </div>
    </header>

      {showResetConfirm && createPortal(
        <div className={styles.resetBackdrop} onClick={e => { if (e.target === e.currentTarget) setShowResetConfirm(false) }}>
          <div className={styles.resetModal}>
            <div className={styles.resetIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 className={styles.resetTitle}>Clear all data?</h2>
            <p className={styles.resetBody}>
              This will permanently delete all your saved inputs, scenarios, and calculation history.
              The app will restart as if you've never visited. <strong>This cannot be undone.</strong>
            </p>
            <p className={styles.resetBodySub}>Your theme preference will be kept.</p>
            <div className={styles.resetActions}>
              <button className={styles.resetCancelBtn} onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className={styles.resetConfirmBtn} onClick={() => { setShowResetConfirm(false); onFullReset() }}>
                Yes, clear everything
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

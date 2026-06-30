import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon.jsx'
import styles from './ScenariosModal.module.css'

const fmt = n => '$' + Math.round(n).toLocaleString('en-CA')

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function ScenariosModal({
  onClose,
  scenarios,
  onSave, onSaveAsNew, onLoad, onDelete, onRename,
  maxScenarios,
  initialMode = 'save',
  activeId, activeScenario,
  person, spouse, shared, propertyState,
}) {
  const [saveName, setSaveName]       = useState('')
  const [saved, setSaved]             = useState(false)
  const [quickSaved, setQuickSaved]   = useState(false)
  const [renamingId, setRenamingId]   = useState(null)
  const [renameVal, setRenameVal]     = useState('')
  const [confirmId, setConfirmId]     = useState(null)

  // Auto-focus name input when opened in save mode
  const nameInputRef = React.useRef(null)
  React.useEffect(() => {
    if (initialMode === 'save') setTimeout(() => nameInputRef.current?.focus(), 80)
  }, [initialMode])

  const QUICK_SAVE_NAME = '⚡ Quick save'
  const handleQuickSave = () => {
    // Replace any existing quick save
    const existing = scenarios.find(s => s.name === QUICK_SAVE_NAME)
    if (existing) onDelete(existing.id)
    onSave(QUICK_SAVE_NAME, { person, spouse, shared, propertyState })
    setQuickSaved(true)
    setTimeout(() => setQuickSaved(false), 2500)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    onSaveAsNew ? onSaveAsNew(saveName, { person, spouse, shared, propertyState })
                : onSave(saveName, { person, spouse, shared, propertyState })
    setSaveName('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleUpdate = () => {
    onSave('', { person, spouse, shared, propertyState })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLoad = (id) => {
    onLoad(id)
    onClose()
  }

  const startRename = (s) => {
    setRenamingId(s.id)
    setRenameVal(s.name)
  }

  const commitRename = (id) => {
    if (renameVal.trim()) onRename(id, renameVal.trim())
    setRenamingId(null)
  }


  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  const canSave = scenarios.length < maxScenarios

  const _modal = (
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Icon name="save" size={16} style={{ color: 'var(--teal)' }} />
            <div>
              <div className={styles.title}>Saved scenarios</div>
              <div className={styles.sub}>Save up to {maxScenarios} named plans — load any to restore all inputs</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className={styles.body}>

          {/* Save current */}
          <div className={styles.saveSection}>
            <div className={styles.saveLabel}>Save current plan as</div>
            <div className={styles.saveRow}>
              <input
                className={styles.nameInput}
                type="text"
                placeholder={`e.g. "Retire at 62 — conservative"`}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                maxLength={50}
                ref={nameInputRef}
              />
              <button
                className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
                onClick={handleSave}
                disabled={!saveName.trim() || !canSave}
              >
                {saved
                  ? <><Icon name="check" size={13} /> Saved!</>
                  : <><Icon name="save" size={13} /> Save</>
                }
              </button>
            </div>
            {/* Active scenario — update in place */}
            {activeScenario && (
              <div className={styles.activeScenarioRow}>
                <div className={styles.activeScenarioInfo}>
                  <span className={styles.activeLabel}>Active:</span>
                  <span className={styles.activeName}>{activeScenario.name}</span>
                </div>
                <button
                  className={`${styles.updateBtn} ${saved ? styles.saveBtnDone : ''}`}
                  onClick={handleUpdate}
                >
                  {saved ? <><Icon name="check" size={12} /> Updated!</> : <><Icon name="save" size={12} /> Update</>}
                </button>
              </div>
            )}

          {/* Quick save — no name needed */}
            <div className={styles.quickSaveRow}>
              <button
                className={`${styles.quickSaveBtn} ${quickSaved ? styles.quickSaveDone : ''}`}
                onClick={handleQuickSave}
                title="Save as 'Quick save' — overwrites any previous quick save"
              >
                {quickSaved
                  ? <><Icon name="check" size={12} /> Quick saved!</>
                  : <><Icon name="fire" size={12} /> Quick save — return later</>
                }
              </button>
              <span className={styles.quickSaveHint}>
                Saves instantly as "{QUICK_SAVE_NAME}" — overwrites previous quick save
              </span>
            </div>

            {!canSave && (
              <div className={styles.limitNote}>
                Maximum {maxScenarios} scenarios reached — delete one to save a new plan.
              </div>
            )}
          </div>

          {/* Saved list */}
          {scenarios.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="save" size={28} style={{ color: 'var(--text-muted)', opacity: .4 }} />
              <div className={styles.emptyTitle}>No saved scenarios yet</div>
              <div className={styles.emptyDesc}>Name your current inputs above and save them. You can save different retirement strategies and switch between them instantly.</div>
            </div>
          ) : (
            <div className={styles.list}>
              {scenarios.map(s => (
                <div key={s.id} className={`${styles.scenarioCard} ${s.name === QUICK_SAVE_NAME ? styles.quickSaveCard : ''}`}>
                  <div className={styles.cardMain}>

                    {/* Name / rename */}
                    <div className={styles.cardName}>
                      {renamingId === s.id ? (
                        <input
                          className={styles.renameInput}
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={() => commitRename(s.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRename(s.id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          autoFocus
                          maxLength={50}
                        />
                      ) : (
                        <span className={styles.nameText}>{s.name}</span>
                      )}
                    </div>

                    {/* Description + time */}
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDesc}>{s.description}</span>
                      <span className={styles.cardTime}>{timeAgo(s.savedAt)}</span>
                    </div>

                    {/* Key numbers */}
                    <div className={styles.cardStats}>
                      <span>Retire {s.person?.retirementAge}</span>
                      <span className={styles.statDot}>·</span>
                      <span>{fmt(s.shared?.annualSpending ?? 0)}/yr</span>
                      {s.shared?.coupleMode && <><span className={styles.statDot}>·</span><span>Couple</span></>}
                      {s.person?.dbPensionEnabled && <><span className={styles.statDot}>·</span><span>DB pension</span></>}
                      {s.propertyState && !s.propertyState._wizard && <><span className={styles.statDot}>·</span><span>Property</span></>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.loadBtn}
                      onClick={() => handleLoad(s.id)}
                      title="Load this scenario"
                    >
                      <Icon name="load" size={12} /> Load
                    </button>
                    <button
                      className={styles.renameBtn}
                      onClick={() => startRename(s)}
                      title="Rename"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {confirmId === s.id ? (
                      <>
                        <button className={styles.confirmBtn} onClick={() => { onDelete(s.id); setConfirmId(null) }}>
                          Delete?
                        </button>
                        <button className={styles.cancelConfirm} onClick={() => setConfirmId(null)}>
                          <Icon name="close" size={11} />
                        </button>
                      </>
                    ) : (
                      <button className={styles.deleteBtn} onClick={() => setConfirmId(s.id)} title="Delete">
                        <Icon name="close" size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footNote}>
            {scenarios.length}/{maxScenarios} scenarios · Local browser storage only
          </span>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
  return createPortal(_modal, document.body)
}

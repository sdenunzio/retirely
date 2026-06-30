import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/Icon.jsx'
import styles from '../components/ScenariosModal.module.css'   // reuse same styles

const fmtC = n => '$' + Math.round(n ?? 0).toLocaleString('en-CA')

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function SpeculatorScenariosModal({
  onClose, scenarios, maxScenarios,
  onSave, onSaveAsNew, onLoad, onDelete, onRename,
  activeId, activeScenario, initialMode = 'save',
  properties,
}) {
  const [saveName, setSaveName]     = useState('')
  const [saved, setSaved]           = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal]   = useState('')
  const [confirmId, setConfirmId]   = useState(null)
  const nameRef = useRef(null)

  useEffect(() => {
    if (initialMode === 'save') setTimeout(() => nameRef.current?.focus(), 80)
  }, [initialMode])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const QUICK = '⚡ Quick save'

  const handleUpdate = () => {
    onSave('', properties)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    onSaveAsNew(saveName, properties)
    setSaveName('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleQuickSave = () => {
    const ex = scenarios.find(s => s.name === QUICK)
    if (ex) onDelete(ex.id)
    onSaveAsNew(QUICK, properties)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLoad = (id) => { onLoad(id); onClose() }

  const commitRename = (id) => {
    if (renameVal.trim()) onRename(id, renameVal.trim())
    setRenamingId(null)
  }

  const canSave = scenarios.length < maxScenarios
  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Icon name="save" size={16} style={{ color: 'var(--teal)' }} />
            <div>
              <div className={styles.title}>Speculator comparisons</div>
              <div className={styles.sub}>Save up to {maxScenarios} named property comparisons</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><Icon name="close" size={14} /></button>
        </div>

        <div className={styles.body}>

          {/* Active — update in place */}
          {activeScenario && (
            <div className={styles.activeScenarioRow}>
              <div className={styles.activeScenarioInfo}>
                <span className={styles.activeLabel}>Active:</span>
                <span className={styles.activeName}>{activeScenario.name}</span>
              </div>
              <button className={`${styles.updateBtn} ${saved ? styles.saveBtnDone : ''}`} onClick={handleUpdate}>
                {saved ? <><Icon name="check" size={12} /> Updated!</> : <><Icon name="save" size={12} /> Update</>}
              </button>
            </div>
          )}

          {/* Save as new */}
          <div className={styles.saveSection}>
            <div className={styles.saveLabel}>Save current comparison as</div>
            <div className={styles.saveRow}>
              <input ref={nameRef} className={styles.nameInput} type="text"
                placeholder={`e.g. "Downtown retail options"`}
                value={saveName} onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                maxLength={50} />
              <button className={`${styles.saveBtn} ${saved && !activeScenario ? styles.saveBtnDone : ''}`}
                onClick={handleSave} disabled={!saveName.trim() || !canSave}>
                {saved && !activeScenario ? <><Icon name="check" size={13} /> Saved!</> : <><Icon name="save" size={13} /> Save</>}
              </button>
            </div>

            <div className={styles.quickSaveRow}>
              <button className={styles.quickSaveBtn} onClick={handleQuickSave}>
                <Icon name="fire" size={12} /> Quick save — return later
              </button>
              <span className={styles.quickSaveHint}>Overwrites previous quick save</span>
            </div>

            {!canSave && <div className={styles.limitNote}>Maximum {maxScenarios} saved — delete one to save more.</div>}
          </div>

          {/* Saved list */}
          {scenarios.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="save" size={28} style={{ color: 'var(--text-muted)', opacity: .4 }} />
              <div className={styles.emptyTitle}>No saved comparisons yet</div>
              <div className={styles.emptyDesc}>Name your current property comparison and save it. Load any saved comparison instantly.</div>
            </div>
          ) : (
            <div className={styles.list}>
              {scenarios.map(s => (
                <div key={s.id} className={`${styles.scenarioCard} ${s.name === QUICK ? styles.quickSaveCard : ''} ${s.id === activeId ? styles.scenarioCardActive : ''}`}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardName}>
                      {renamingId === s.id ? (
                        <input className={styles.renameInput} value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={() => commitRename(s.id)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(s.id); if (e.key === 'Escape') setRenamingId(null) }}
                          autoFocus maxLength={50} />
                      ) : (
                        <span className={styles.nameText}>{s.name}</span>
                      )}
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDesc}>{s.description}</span>
                      <span className={styles.cardTime}>{timeAgo(s.savedAt)}</span>
                    </div>
                    <div className={styles.cardStats}>
                      {s.properties?.length} propert{s.properties?.length === 1 ? 'y' : 'ies'}
                      {s.properties?.map(p => (
                        <><span className={styles.statDot}>·</span><span key={p.id}>{p.name}</span></>
                      ))}
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.loadBtn} onClick={() => handleLoad(s.id)}>
                      <Icon name="load" size={12} /> Load
                    </button>
                    <button className={styles.renameBtn} onClick={() => { setRenamingId(s.id); setRenameVal(s.name) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {confirmId === s.id ? (
                      <>
                        <button className={styles.confirmBtn} onClick={() => { onDelete(s.id); setConfirmId(null) }}>Delete?</button>
                        <button className={styles.cancelConfirm} onClick={() => setConfirmId(null)}><Icon name="close" size={11} /></button>
                      </>
                    ) : (
                      <button className={styles.deleteBtn} onClick={() => setConfirmId(s.id)}><Icon name="close" size={12} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footNote}>{scenarios.length}/{maxScenarios} comparisons · Local browser storage only</span>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

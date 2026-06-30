import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePdfExport } from '../hooks/usePdfExport.js'
import { useExcelExport } from '../hooks/useExcelExport.js'
import { Icon, IconBox } from './Icon.jsx'
import styles from './ExportModal.module.css'

const SECTION_OPTIONS = [
  { id: 'inputs',     label: 'Input Summary',     desc: 'All profile, asset, and assumption inputs', defaultOn: true },
  { id: 'scenarios',  label: 'Scenarios',          desc: 'All 4 strategy cards with key metrics',     defaultOn: true },
  { id: 'fire',       label: 'FIRE Analysis',      desc: 'FIRE number, Coast FIRE, and progress',     defaultOn: false },
  { id: 'tax',        label: 'Tax Breakdown',      desc: 'Provincial tax comparison table',           defaultOn: true },
  { id: 'property',   label: 'Property Summary',   desc: 'Commercial property metrics and year-by-year', defaultOn: false },
  { id: 'residence',  label: 'Residence Summary',  desc: 'Primary home, downsize, reverse mortgage', defaultOn: false },
]

export function ExportModal({ onClose, person, spouse, shared, results, propertyState }) {
  const { exportPdf }   = usePdfExport()
  const { exportExcel } = useExcelExport()

  const [sections, setSections] = useState(() =>
    Object.fromEntries(SECTION_OPTIONS.map(s => [s.id, s.defaultOn]))
  )
  const [exportingPdf,   setExportingPdf]   = useState(false)
  const [exportingXlsx,  setExportingXlsx]  = useState(false)
  const [donePdf,        setDonePdf]        = useState(false)
  const [doneXlsx,       setDoneXlsx]       = useState(false)

  const toggle = id => setSections(prev => ({ ...prev, [id]: !prev[id] }))
  const anySelected = Object.values(sections).some(Boolean)
  const payload = { sections, person, spouse, shared, results, propertyState }

  const handlePdf = async () => {
    setExportingPdf(true)
    try {
      await exportPdf(payload)
      setDonePdf(true)
      setTimeout(() => setDonePdf(false), 2500)
    } catch (e) { console.error('PDF error:', e) }
    finally { setExportingPdf(false) }
  }

  const handleExcel = () => {
    setExportingXlsx(true)
    try {
      exportExcel(payload)
      setDoneXlsx(true)
      setTimeout(() => setDoneXlsx(false), 2500)
    } catch (e) { console.error('Excel error:', e) }
    finally { setExportingXlsx(false) }
  }


  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  const _modal = (
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true" aria-label="Export">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <IconBox name="export" size={18} tone="teal" />
            <div>
              <div className={styles.title}>Export report</div>
              <div className={styles.subtitle}>Choose format and sections to include</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Format selector */}
        <div className={styles.formatRow}>
          <div className={styles.formatLabel}>Format</div>
          <div className={styles.formats}>
            <div className={styles.formatCard}>
              <IconBox name="pdf" size={16} tone="teal" />
              <div className={styles.formatName}>PDF</div>
              <div className={styles.formatDesc}>Branded report with cover page, charts, and tables</div>
            </div>
            <div className={styles.formatCard}>
              <IconBox name="excel" size={16} tone="teal" />
              <div className={styles.formatName}>Excel</div>
              <div className={styles.formatDesc}>Multi-tab workbook with raw data for your own analysis</div>
            </div>
          </div>
        </div>

        {/* Section toggles */}
        <div className={styles.body}>
          <div className={styles.sectionHeading}>Sections to include</div>

          <div className={styles.options}>
            {SECTION_OPTIONS.map(opt => {
              const disabled = opt.id === 'property' && (!propertyState || propertyState._wizard)
              const disabledReason = disabled ? 'No property added' : null
              return (
                <label
                  key={opt.id}
                  className={`${styles.optionRow} ${sections[opt.id] && !disabled ? styles.optionOn : ''} ${disabled ? styles.optionDisabled : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={sections[opt.id] && !disabled}
                    onChange={() => !disabled && toggle(opt.id)}
                    disabled={disabled}
                    className={styles.checkbox}
                  />
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>{opt.label}</span>
                    <span className={styles.optionDesc}>{disabledReason || opt.desc}</span>
                  </div>
                  {sections[opt.id] && !disabled && <span className={styles.onBadge}>✓</span>}
                </label>
              )
            })}
          </div>

          <div className={styles.note}>
            PDF: includes a cover page and disclaimer footer. Excel: one sheet per section, all values are numeric for further analysis.
          </div>
        </div>

        {/* Footer — two export buttons */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <div className={styles.exportBtns}>
            <button
              className={`${styles.xlsxBtn} ${doneXlsx ? styles.exportDone : ''}`}
              onClick={handleExcel}
              disabled={!anySelected || exportingXlsx}
              title="Download .xlsx workbook"
            >
              {doneXlsx ? '✓ Downloaded!' : exportingXlsx ? 'Generating…' : '↓ Excel (.xlsx)'}
            </button>
            <button
              className={`${styles.pdfBtn} ${donePdf ? styles.exportDone : ''}`}
              onClick={handlePdf}
              disabled={!anySelected || exportingPdf}
              title="Download PDF report"
            >
              {donePdf ? '✓ Downloaded!' : exportingPdf ? 'Generating…' : '↓ PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
  return createPortal(_modal, document.body)
}

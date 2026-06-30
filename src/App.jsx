import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InputPanel }        from './components/InputPanel.jsx'
import { SummaryBar }        from './components/SummaryBar.jsx'
import { ScenarioCards }     from './components/ScenarioCards.jsx'
import { DrawdownTable }     from './components/DrawdownTable.jsx'
import { Icon } from './components/Icon.jsx'
import { ComparisonTable }   from './components/ComparisonTable.jsx'
import { Charts }            from './components/Charts.jsx'
import { TaxBreakdown }      from './components/TaxBreakdown.jsx'
import { FireTab }           from './components/FireTab.jsx'
import { MonteCarloChart }   from './components/MonteCarloChart.jsx'
import { EmptyState }        from './components/EmptyState.jsx'
import { AccumulationTab }   from './components/AccumulationTab.jsx'
import { DisclaimerBanner }  from './components/DisclaimerBanner.jsx'
import { WorkBackwards }      from './components/WorkBackwards.jsx'
import { PropertyTab }        from './components/PropertyTab.jsx'
import { ResidenceTab }       from './components/ResidenceTab.jsx'
import { useCalculator }     from './hooks/useCalculator.js'
import styles from './App.module.css'
import { TopBar } from './components/TopBar.jsx'
import { AdSlot, RightAdPanel, ADS_ENABLED } from './components/AdSlot.jsx'
import { ExportModal }    from './components/ExportModal.jsx'
import { SnapshotPanel }          from './components/SnapshotModal.jsx'
import { PropertySpeculatorModal } from './components/PropertySpeculatorModal.jsx'
import { OnboardingWizard, useFirstVisit, TermsModal } from './components/OnboardingWizard.jsx'
import { useTheme }     from './hooks/useTheme.js'
import { useScenarios }  from './hooks/useScenarios.js'
import { ScenariosModal } from './components/ScenariosModal.jsx'

const MAIN_TABS = [
  { id: 'scenarios',   icon: 'scenarios',  label: 'Scenarios' },
  { id: 'accumulation', icon: 'assets',     label: 'Accumulation' },
  { id: 'fire',        icon: 'fire',       label: 'FIRE' },
  { id: 'montecarlo',  icon: 'montecarlo', label: 'Monte Carlo' },
  { id: 'tax',         icon: 'tax',        label: 'Tax' },
  { id: 'workback',    icon: 'workback',   label: 'Work backwards' },
  { id: 'property',    icon: 'property',   label: 'Property' },
  { id: 'residence',   icon: 'residence',  label: 'Residence' },
]

export default function App() {
  const {
    person, spouse, shared,
    setPerson, setSpouse, setShared,
    setPField, setSField, setShField,
    results, calculate, reset,
    mcResults, mcRunning, runMC,
    propertyState, setPropertyState,
    persistence,
  } = useCalculator()

  const setPropertyField = (k, v) => setPropertyState(prev => prev ? { ...prev, [k]: v } : prev)

  const { theme, toggle: toggleTheme } = useTheme()
  const scenariosHook = useScenarios()
  const [scenariosMode, setScenariosMode] = useState(null)  // null | 'save' | 'load'
  const [searchParams, setSearchParams] = useSearchParams()
  const { isFirstVisit, dismiss } = useFirstVisit()
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [activeTab, setActiveTab]     = useState('scenarios')
  const [showExport, setShowExport]     = useState(false)
  const [snapshotCollapsed, setSnapshotCollapsed] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [scenarioSubTab, setScenarioSubTab] = useState('cards')
  const [drawdownScenarioIdx, setDrawdownScenarioIdx] = useState(0)

  const sharedWithSetters = {
    ...shared,
    setMcStdDev:   v => setShField('mcStdDev', v),
    setMcSimCount: v => setShField('mcSimCount', v),
  }

  const handleWizardFinish = (shouldCalculate = true) => {
    dismiss()
    if (shouldCalculate) {
      calculate()
    } else {
      // Advanced mode on mobile — open the input sidebar so they see the inputs
      setMobileOpen(true)
    }
  }

  const handleReset = () => {
    reset()
    setActiveTab('scenarios')
    setMobileOpen(false)
    scenariosHook.clearActive()
    setSearchParams({})
  }

  const handleFullReset = () => {
    // Clear all app data from localStorage — keep theme preference
    const keysToRemove = [
      'retirement_lab_v1',
      'retirement_lab_scenarios_v1',
      'retirement_lab_onboarded_v1',
      'retirement_lab_speculator_v1',
      'retirement_lab_speculator_draft_v1',
      'retireplan_disclaimer_collapsed',
    ]
    keysToRemove.forEach(k => { try { localStorage.removeItem(k) } catch {} })
    // Hard reload to / — triggers fresh first-visit wizard
    window.location.href = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + '#/'
    window.location.reload()
  }

  // On mount: if ?scenario=id in URL, auto-load that scenario
  useEffect(() => {
    const id = searchParams.get('scenario')
    if (id) {
      const loaded = scenariosHook.loadFromUrl(id, { setPerson, setSpouse, setShared, setPropertyState })
      if (loaded) setTimeout(() => calculate(), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // run once on mount only

  // When activeId changes, sync to URL
  // Listen for footer "Terms of use" button events
  useEffect(() => {
    const handler = () => setShowTermsModal(true)
    window.addEventListener('retirely:showTerms', handler)
    return () => window.removeEventListener('retirely:showTerms', handler)
  }, [])

  useEffect(() => {
    const id = scenariosHook.activeId
    if (id) {
      setSearchParams({ scenario: id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [scenariosHook.activeId])

  return (
    <div className={styles.root}>
      {/* Full-width top bar */}
      <TopBar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        persistence={persistence}
        onExport={() => setShowExport(true)}
        hasResults={!!results}
        onScenarios={(mode) => setScenariosMode(mode || 'save')}
        scenarioCount={scenariosHook.scenarios.length}
        activeScenario={scenariosHook.activeScenario}
        theme={theme}
        onToggleTheme={toggleTheme}
        onFullReset={handleFullReset}
      />

      {/* Body: sidebar + main side by side */}
      <div className={styles.body}>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <InputPanel
          person={person} spouse={spouse} shared={shared}
          setPField={setPField} setSField={setSField} setShField={setShField}
          onCalculate={() => { calculate(); setMobileOpen(false) }}
          onReset={handleReset}
        />
      </div>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.content}>
          <DisclaimerBanner />

          {/* Mobile: prompt to open input panel if not open and no results */}
          {!mobileOpen && !results && (
            <div className={styles.mobileSetupPrompt}>
              <div className={styles.mobileSetupIcon}>
                <Icon name="profile" size={22} />
              </div>
              <div className={styles.mobileSetupText}>
                <strong>Get started</strong>
                <span>Enter your details to generate your retirement scenarios</span>
              </div>
              <button
                className={styles.mobileSetupBtn}
                onClick={() => setMobileOpen(true)}
              >
                Enter details →
              </button>
            </div>
          )}

          {/* Mobile: nudge to open sidebar if results exist but sidebar is closed */}
          {!mobileOpen && results && (
            <div className={styles.mobileSidebarNudge} onClick={() => setMobileOpen(true)}>
              <Icon name="profile" size={13} />
              <span>Tap to edit your details · recalculate anytime</span>
              <Icon name="chevronRight" size={12} />
            </div>
          )}

          {!results ? (
            <EmptyState onCalculate={calculate} onOpenInputs={() => setMobileOpen(true)} />
          ) : (
            <>
              <SummaryBar results={results} shared={shared} person={person} spouse={spouse} propertyState={propertyState} setShField={setShField} onRecalculate={calculate} />
              <AdSlot />

              <div className={styles.tabBar}>
                {MAIN_TABS.map(t => (
                  <button key={t.id}
                    className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    <Icon name={t.icon} size={14} style={{ flexShrink: 0, marginRight: 4 }} />
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'scenarios' && (
                <>
                  {/* Scenario sub-tabs — compact pill row */}
                  <div className={styles.scenarioPills}>
                    {[
                      { id: 'cards',      icon: 'cards',      label: 'Strategies' },
                      { id: 'drawdown',   icon: 'drawdown',   label: 'Drawdown' },
                      { id: 'charts',     icon: 'charts',     label: 'Charts' },
                      { id: 'comparison', icon: 'comparison', label: 'Compare' },
                    ].map(t => (
                      <button key={t.id}
                        className={`${styles.scenarioPill} ${scenarioSubTab === t.id ? styles.scenarioPillActive : ''}`}
                        onClick={() => setScenarioSubTab(t.id)}
                      >
                        <Icon name={t.icon} size={12} />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {scenarioSubTab === 'cards' && (
                    <ScenarioCards
                      scenarios={results.scenarios} shared={shared} person={person} results={results}
                      onViewDrawdown={idx => { setDrawdownScenarioIdx(idx); setScenarioSubTab('drawdown') }}
                    />
                  )}
                  {scenarioSubTab === 'drawdown' && (
                    <DrawdownTable
                      scenarios={results.scenarios}
                      shared={shared}
                      person={person}
                      results={results}
                      propertyState={propertyState}
                      initialScenario={drawdownScenarioIdx}
                    />
                  )}
                  {scenarioSubTab === 'charts' && (
                    <Charts scenarios={results.scenarios} shared={shared} person={person} spouse={spouse} propertyState={propertyState} />
                  )}
                  {scenarioSubTab === 'comparison' && (
                    <ComparisonTable scenarios={results.scenarios} shared={shared} person={person} results={results} />
                  )}
                </>
              )}

              {activeTab === 'accumulation' && (
                <AccumulationTab results={results} person={person} spouse={spouse} shared={shared} />
              )}

              {activeTab === 'fire' && (
                <FireTab fire={results.fire} shared={shared} person={person} setShField={setShField} />
              )}

              {activeTab === 'montecarlo' && (
                <MonteCarloChart
                  mcResults={mcResults}
                  shared={sharedWithSetters}
                  person={person}
                  onRun={runMC}
                  mcRunning={mcRunning}
                />
              )}

              {activeTab === 'tax' && (
                <TaxBreakdown shared={shared} results={results} />
              )}

              {activeTab === 'workback' && (
                <WorkBackwards person={person} spouse={spouse} shared={shared} />
              )}

              {activeTab === 'property' && (
                <PropertyTab person={person} spouse={spouse} shared={shared} setPField={setPField} setSField={setSField}
                  propertyState={propertyState} setPropertyState={setPropertyState} setPropertyField={setPropertyField} />
              )}

              {activeTab === 'residence' && (
                <ResidenceTab shared={shared} setShField={setShField} person={person} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Right ad rail — only renders when ADS_ENABLED=true */}
      <RightAdPanel />

      {/* Persistent snapshot panel */}
      {results && (
        <div className={`${styles.snapshotPanel} ${snapshotCollapsed ? styles.snapshotCollapsed : ''}`}>
          <button
            className={styles.snapshotCollapseBtn}
            onClick={() => setSnapshotCollapsed(c => !c)}
            title={snapshotCollapsed ? 'Expand snapshot' : 'Collapse snapshot'}
          >
            <Icon name={snapshotCollapsed ? 'chevronLeft' : 'chevronRight'} size={14} />
            {snapshotCollapsed && <span className={styles.snapshotCollapsedLabel}>Snapshot</span>}
          </button>
          {!snapshotCollapsed && (
            <SnapshotPanel
              results={results}
              person={person}
              spouse={spouse}
              shared={shared}
              propertyState={propertyState}
            />
          )}
        </div>
      )}

      </div>{/* /body */}
      {isFirstVisit && (
        <OnboardingWizard
          person={person} spouse={spouse} shared={shared}
          setPField={setPField} setSField={setSField} setShField={setShField}
          onFinish={handleWizardFinish}
        />
      )}

      {scenariosMode && (
        <ScenariosModal
          onClose={() => setScenariosMode(null)}
          initialMode={scenariosMode}
          scenarios={scenariosHook.scenarios}
          onSave={(name, data) => scenariosHook.saveScenario(name, data)}
          onSaveAsNew={(name, data) => scenariosHook.saveAsNew(name, data)}
          onLoad={(id) => {
            scenariosHook.loadScenario(id, { setPerson, setSpouse, setShared, setPropertyState })
            setTimeout(() => calculate(), 0)
          }}
          activeId={scenariosHook.activeId}
          activeScenario={scenariosHook.activeScenario}
          onDelete={scenariosHook.deleteScenario}
          onRename={scenariosHook.renameScenario}
          maxScenarios={scenariosHook.maxScenarios}
          person={person} spouse={spouse} shared={shared} propertyState={propertyState}
        />
      )}

{showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          person={person}
          spouse={spouse}
          shared={shared}
          results={results}
          propertyState={propertyState}
        />
      )}
      {/* Persistent disclaimer footer — Option B */}
      <footer className={styles.footer}>
        <div className={styles.footerDisclaimer}>
          <span className={styles.footerDisclaimerIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <span className={styles.footerDisclaimerText}>
            <strong>Not financial advice.</strong> Retirely provides illustrative projections only. Consult a qualified CFP or CPA before making any financial decisions.
          </span>
          <button className={styles.footerTermsBtn} onClick={() => {
            const evt = new CustomEvent('retirely:showTerms')
            window.dispatchEvent(evt)
          }}>
            Terms of use
          </button>
        </div>
        <div className={styles.footerMeta}>
          <span>© {new Date().getFullYear()} <a href="https://retirely.ca" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>retirely.ca</a></span>
          <span className={styles.footerDot}>·</span>
          <span className={styles.betaNote}>Beta · calculations subject to change</span>
        </div>
      </footer>
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}
    </div>
  )
}

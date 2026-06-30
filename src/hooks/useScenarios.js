import { useState, useCallback, useEffect } from 'react'

const SCENARIOS_KEY = 'retirement_lab_scenarios_v1'
const MAX_SCENARIOS = 8

export function useScenarios() {
  const [scenarios, setScenarios] = useState(() => {
    try {
      const raw = localStorage.getItem(SCENARIOS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  // Which scenario is currently "active" (was loaded or just saved)
  const [activeId, setActiveId] = useState(null)

  const persist = useCallback((list) => {
    setScenarios(list)
    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(list)) } catch {}
  }, [])

  const describe = (person, spouse, shared) => {
    const parts = []
    parts.push(`Retire ${person.retirementAge}`)
    parts.push(`Spend $${Math.round(shared.annualSpending / 1000)}k/yr`)
    if (shared.coupleMode) parts.push('Couple')
    if (person.dbPensionEnabled) parts.push('DB pension')
    return parts.join(' · ')
  }

  // Save as brand-new scenario — always creates a new entry
  const saveNew = useCallback((name, { person, spouse, shared, propertyState }) => {
    const entry = {
      id:          crypto.randomUUID(),
      name:        name.trim() || `Plan ${new Date().toLocaleDateString('en-CA')}`,
      description: describe(person, spouse, shared),
      savedAt:     new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      person, spouse, shared, propertyState,
    }
    const updated = [entry, ...scenarios].slice(0, MAX_SCENARIOS)
    persist(updated)
    setActiveId(entry.id)
    return entry
  }, [scenarios, persist])

  // Update an existing scenario in place
  const updateScenario = useCallback((id, { person, spouse, shared, propertyState }) => {
    const updated = scenarios.map(s => s.id !== id ? s : {
      ...s,
      description: describe(person, spouse, shared),
      updatedAt:   new Date().toISOString(),
      person, spouse, shared, propertyState,
    })
    persist(updated)
    return updated.find(s => s.id === id)
  }, [scenarios, persist])

  // Save: if activeId exists and matches a saved scenario → update; otherwise → create new
  const saveScenario = useCallback((name, data) => {
    if (activeId && scenarios.find(s => s.id === activeId)) {
      return updateScenario(activeId, data)
    }
    return saveNew(name, data)
  }, [activeId, scenarios, saveNew, updateScenario])

  // Explicitly save as new (ignores activeId)
  const saveAsNew = useCallback((name, data) => saveNew(name, data), [saveNew])

  // Load a scenario — sets activeId and pushes to URL
  const loadScenario = useCallback((id, { setPerson, setSpouse, setShared, setPropertyState }) => {
    const found = scenarios.find(s => s.id === id)
    if (!found) return false
    if (found.person)   setPerson(found.person)
    if (found.spouse)   setSpouse(found.spouse)
    if (found.shared)   setShared(found.shared)
    setPropertyState(found.propertyState ?? null)
    setActiveId(id)
    return found
  }, [scenarios])

  // Load from URL on mount (called by App with the URL id)
  const loadFromUrl = useCallback((id, setters) => {
    if (!id || !scenarios.length) return false
    const found = scenarios.find(s => s.id === id)
    if (!found) return false
    return loadScenario(id, setters)
  }, [scenarios, loadScenario])

  const deleteScenario = useCallback((id) => {
    persist(scenarios.filter(s => s.id !== id))
    if (activeId === id) setActiveId(null)
  }, [scenarios, persist, activeId])

  const renameScenario = useCallback((id, name) => {
    persist(scenarios.map(s => s.id === id ? { ...s, name } : s))
  }, [scenarios, persist])

  const clearActive = useCallback(() => setActiveId(null), [])

  const activeScenario = scenarios.find(s => s.id === activeId) ?? null

  return {
    scenarios, activeId, activeScenario,
    saveScenario, saveAsNew, updateScenario,
    loadScenario, loadFromUrl,
    deleteScenario, renameScenario,
    clearActive,
    maxScenarios: MAX_SCENARIOS,
  }
}

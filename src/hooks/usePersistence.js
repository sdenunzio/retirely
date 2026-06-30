import { useEffect, useRef, useCallback, useState } from 'react'

const STORAGE_KEY  = 'retirement_lab_v1'
const DEBOUNCE_MS  = 800

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Basic schema check — must have person and shared at minimum
    if (!parsed?.person || !parsed?.shared) return null
    return parsed
  } catch {
    return null
  }
}

export function usePersistence({ person, spouse, shared, propertyState, setPerson, setSpouse, setShared, setPropertyState }) {
  const [lastSaved, setLastSaved] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      return parsed?.savedAt ? new Date(parsed.savedAt) : null
    } catch { return null }
  })
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const debounceRef = useRef(null)
  const isFirstRender = useRef(true)

  // Build the snapshot
  const buildSnapshot = useCallback(() => ({
    person,
    spouse,
    shared,
    propertyState,
    savedAt: new Date().toISOString(),
    version: 1,
  }), [person, spouse, shared, propertyState])

  // Manual save
  const save = useCallback(() => {
    try {
      setSaveStatus('saving')
      const snapshot = buildSnapshot()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      const ts = new Date(snapshot.savedAt)
      setLastSaved(ts)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [buildSnapshot])

  // Auto-save on state change (debounced)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        const snapshot = buildSnapshot()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
        setLastSaved(new Date(snapshot.savedAt))
      } catch { /* silent */ }
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [person, spouse, shared, propertyState, buildSnapshot])

  // Load from storage
  const load = useCallback(() => {
    const saved = loadSaved()
    if (!saved) return false
    if (saved.person)        setPerson(saved.person)
    if (saved.spouse)        setSpouse(saved.spouse)
    if (saved.shared)        setShared(saved.shared)
    setPropertyState(saved.propertyState ?? null)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
    return true
  }, [setPerson, setSpouse, setShared, setPropertyState])

  // Clear saved data
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setLastSaved(null)
      setSaveStatus('idle')
    } catch { /* silent */ }
  }, [])

  const hasSaved = lastSaved !== null

  return { save, load, clearSaved, lastSaved, hasSaved, saveStatus }
}

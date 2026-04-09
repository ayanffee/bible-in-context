import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'bible-search-history'
const MAX_ENTRIES = 200

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {}
}

export function useSearchHistory() {
  const [history, setHistory] = useState(() => load())

  useEffect(() => {
    save(history)
  }, [history])

  const addToHistory = useCallback((entry) => {
    setHistory(prev => {
      const newEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...entry,
        askedAt: new Date().toISOString(),
      }
      // Most recent first, cap at MAX_ENTRIES
      return [newEntry, ...prev].slice(0, MAX_ENTRIES)
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return { history, addToHistory, clearHistory }
}

import { useState, useEffect } from 'react'
import { fetchChapter } from '../services/api.js'

export function useBibleChapter(bookId, chapter, translation = 'kjv') {
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!bookId || !chapter) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setVerses([])

    fetchChapter(bookId, chapter, translation)
      .then(data => {
        if (!cancelled) setVerses(data.verses)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [bookId, chapter, translation])

  return { verses, loading, error }
}

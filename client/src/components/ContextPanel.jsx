import { useEffect, useState } from 'react'
import { streamContext } from '../services/api.js'

export default function ContextPanel({ bookId, bookName, chapter, verse, text, contextCache, onCacheUpdate }) {
  const cacheKey = `${bookId}:${chapter}:${verse}`
  const cached = contextCache.get(cacheKey)

  const [context, setContext] = useState(cached?.context || null)
  const [terms, setTerms] = useState(cached?.terms || [])
  const [rawStream, setRawStream] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (contextCache.has(cacheKey)) {
      const c = contextCache.get(cacheKey)
      setContext(c.context)
      setTerms(c.terms || [])
      setStreaming(false)
      return
    }

    let cancelled = false
    setStreaming(true)
    setContext(null)
    setTerms([])
    setRawStream('')
    setError(null)

    let accumulated = ''

    streamContext(
      { bookId, bookName, chapter, verse, text },
      (chunk) => {
        if (cancelled) return
        accumulated += chunk
        // Show the context portion while streaming (before KEY TERMS section)
        const contextPart = accumulated.split(/KEY TERMS:/i)[0]
          .replace(/^CONTEXT:\s*/i, '')
          .trim()
        setRawStream(contextPart)
      }
    )
      .then(data => {
        if (!cancelled) {
          setContext(data.context)
          setTerms(data.terms || [])
          setRawStream('')
          setStreaming(false)
          onCacheUpdate(cacheKey, { context: data.context, terms: data.terms || [] })
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setStreaming(false)
        }
      })

    return () => { cancelled = true }
  }, [cacheKey, onCacheUpdate])

  const displayContext = context || rawStream

  return (
    <div className="context-panel">
      <div className="context-label">
        <span>📜</span> Historical &amp; Cultural Context
      </div>

      {error && (
        <div className="context-error">⚠️ {error}</div>
      )}

      {displayContext && (
        <p className="context-text">
          {displayContext}
          {streaming && <span className="cursor-blink">▌</span>}
        </p>
      )}

      {!displayContext && !error && streaming && (
        <p className="context-text">
          <span className="cursor-blink">▌</span>
        </p>
      )}

      {/* Key Terms — shown after streaming completes */}
      {!streaming && terms.length > 0 && (
        <div className="terms-section">
          <div className="terms-label">🔍 Key Terms</div>
          <div className="terms-grid">
            {terms.map(({ term, definition }) => (
              <div key={term} className="term-card">
                <span className="term-name">{term}</span>
                <span className="term-definition">{definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

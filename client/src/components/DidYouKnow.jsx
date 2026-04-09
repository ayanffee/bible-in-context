import { useState, useCallback, useEffect, useRef } from 'react'

function FactCard({ fact, index, visible }) {
  return (
    <div
      className={`dyk-card ${visible ? 'dyk-card-visible' : ''}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="dyk-card-title">{fact.title}</div>
      <div className="dyk-card-fact">{fact.fact}</div>
    </div>
  )
}

export default function DidYouKnow({ recentTopics = [] }) {
  const [facts, setFacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [visibleCards, setVisibleCards] = useState([])
  const abortRef = useRef(null)
  const hasLoaded = useRef(false)

  const fetchFacts = useCallback(async () => {
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFacts([])
    setVisibleCards([])
    setLoading(true)

    const topics = recentTopics.slice(0, 5).join(',')
    const url = `/api/didyouknow/stream${topics ? `?topics=${encodeURIComponent(topics)}` : ''}`

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to fetch facts')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              setLoading(false)
            } else if (data.fact) {
              setFacts(prev => {
                const next = [...prev, data.fact]
                // Trigger visibility after a tiny delay for animation
                setTimeout(() => {
                  setVisibleCards(v => [...v, next.length - 1])
                }, 50)
                return next
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setLoading(false)
      }
    }
  }, [recentTopics])

  // Load once on mount
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      fetchFacts()
    }
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="dyk-section">
      <div className="dyk-header">
        <div className="dyk-title-row">
          <h2 className="dyk-title">✨ Did You Know?</h2>
          <button
            className="dyk-refresh-btn"
            onClick={fetchFacts}
            disabled={loading}
            title="Generate new facts"
          >
            {loading ? <span className="dyk-spinner" /> : '↻ Refresh'}
          </button>
        </div>
        <p className="dyk-subtitle">
          {recentTopics.length > 0
            ? `Fascinating facts connected to your recent study`
            : `Surprising biblical facts for modern readers`}
        </p>
      </div>

      <div className="dyk-cards">
        {loading && facts.length === 0 && (
          <div className="dyk-loading">
            <span className="dyk-spinner" />
            <span>Discovering fascinating facts…</span>
          </div>
        )}

        {facts.map((fact, i) => (
          <FactCard
            key={i}
            fact={fact}
            index={i}
            visible={visibleCards.includes(i)}
          />
        ))}

        {/* Placeholder skeletons while loading */}
        {loading && facts.length < 3 && (
          Array.from({ length: 3 - facts.length }).map((_, i) => (
            <div key={`skeleton-${i}`} className="dyk-card dyk-card-skeleton">
              <div className="dyk-skeleton-title" />
              <div className="dyk-skeleton-line" />
              <div className="dyk-skeleton-line short" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'

export default function SelectionPopup({
  selection, position, verseText, bookName, chapter, verse, onClose, addToHistory
}) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const popupRef = useRef(null)
  const savedToHistoryRef = useRef(false)

  // Stream the explanation as soon as the popup opens
  useEffect(() => {
    if (!selection) return
    let cancelled = false
    savedToHistoryRef.current = false

    setLoading(true)
    setExplanation('')
    setError(null)

    const params = new URLSearchParams({ selection, verseText, bookName, chapter, verse })

    fetch(`/api/explain/stream?${params}`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to get explanation')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

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
              if (data.chunk && !cancelled) {
                fullText += data.chunk
                setExplanation(prev => prev + data.chunk)
              }
              if (data.done && !cancelled) {
                setLoading(false)
                // Save to history once, when done
                if (!savedToHistoryRef.current && addToHistory) {
                  savedToHistoryRef.current = true
                  addToHistory({
                    selection,
                    explanation: data.full || fullText,
                    bookName,
                    chapter,
                    verse,
                    verseText,
                  })
                }
              }
            } catch {}
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError('Could not explain this. Try again.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [selection, addToHistory])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Smart positioning — keep popup on screen
  const style = {
    position: 'fixed',
    top: Math.min(position.y + 12, window.innerHeight - 260),
    left: Math.min(Math.max(position.x - 140, 12), window.innerWidth - 320),
    zIndex: 1000,
  }

  return (
    <div className="selection-popup" ref={popupRef} style={style}>
      <div className="selection-popup-header">
        <span className="selection-pill">✦ "{selection}"</span>
        <button className="selection-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="selection-body">
        {error && <p className="selection-error">{error}</p>}
        {(explanation || loading) && (
          <p className="selection-explanation">
            {explanation}
            {loading && <span className="cursor-blink">▌</span>}
          </p>
        )}
      </div>
    </div>
  )
}

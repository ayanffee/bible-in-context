import { useState, useRef, useEffect, useCallback } from 'react'

const SUGGESTED = [
  'Who were the Pharisees?',
  'What does "grace" mean in the Bible?',
  'Where was Jesus born and why?',
  'What is the significance of the number 40?',
  'Who wrote the book of John?',
]

export default function ChatPanel({ open, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '📖 Ask me anything about the Bible — a verse, a character, history, theology, or what a passage means.',
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text) => {
    const question = text?.trim() || input.trim()
    if (!question || streaming) return

    setInput('')
    const userMsg = { role: 'user', content: question }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const controller = new AbortController()
      abortRef.current = controller

      // Build the messages array for the API (exclude the welcome message for API calls)
      const apiMessages = updatedMessages
        .filter((_, i) => i > 0 || updatedMessages[0].role !== 'assistant') // skip system welcome
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      })

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
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              fullText += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: fullText, streaming: true }
                return copy
              })
            }
          } catch {}
        }
      }

      // Finalize — remove streaming flag
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: fullText, streaming: false }
        return copy
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            streaming: false,
          }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: '📖 Chat cleared! Ask me anything about the Bible.',
    }])
  }

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="chat-overlay" onClick={onClose} />}

      <div className={`chat-panel ${open ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-icon">📖</span>
            <div>
              <div className="chat-title">Ask</div>
              <div className="chat-subtitle">Bible questions · AI powered</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-clear-btn" onClick={clearChat} title="Clear chat">🗑</button>
            <button className="chat-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && <span className="chat-avatar">📖</span>}
              <div className="chat-bubble-text">
                {msg.content}
                {msg.streaming && <span className="chat-cursor">▌</span>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions — only show when fresh */}
        {messages.length <= 1 && (
          <div className="chat-suggestions">
            {SUGGESTED.map(s => (
              <button key={s} className="chat-suggestion-btn" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask a Bible question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
          >
            {streaming ? <span className="chat-spin">⟳</span> : '➤'}
          </button>
        </div>
      </div>
    </>
  )
}

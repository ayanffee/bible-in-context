import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { BIBLE_BOOKS } from '../utils/bibleBooks.js'

// Book name -> book object lookup (lowercase keys)
const BOOK_MAP = {}
BIBLE_BOOKS.forEach(b => { BOOK_MAP[b.name.toLowerCase()] = b })
BOOK_MAP['psalm'] = BOOK_MAP['psalms']
BOOK_MAP['song of songs'] = BOOK_MAP['song of solomon']

// Matches: optional "1/2/3 " prefix, one-or-two capitalised words, chapter, optional :verse
const VERSE_RE = /\b([1-3]\s+)?([A-Z][a-z]+(?:\s+(?:of\s+)?[A-Z][a-z]+)?)\s+(\d+)(?::(\d+)(?:-\d+)?)?/g

function injectVerseLinks(text, onNavigate) {
  const parts = []
  let last = 0
  VERSE_RE.lastIndex = 0
  let m
  while ((m = VERSE_RE.exec(text)) !== null) {
    const [full, prefix, word, ch] = m
    const key = ((prefix ? prefix.trim() + ' ' : '') + word).toLowerCase()
    const book = BOOK_MAP[key]
    if (!book) continue
    if (m.index > last) parts.push(text.slice(last, m.index))
    const bookId = book.id
    const chapter = +ch
    parts.push(
      <button key={m.index} className="verse-ref-link" onClick={() => onNavigate(bookId, chapter)}>
        {full}
      </button>
    )
    last = m.index + full.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

function processChildren(children, onNavigate) {
  if (typeof children === 'string') return injectVerseLinks(children, onNavigate)
  if (!Array.isArray(children)) return children
  return children.flatMap((c, i) => {
    if (typeof c !== 'string') return [c]
    const result = injectVerseLinks(c, onNavigate)
    if (typeof result === 'string') return [result]
    return result.map((part, j) =>
      typeof part === 'string' ? <span key={`${i}-${j}`}>{part}</span> : part
    )
  })
}

const SUGGESTED = [
  'Who were the Pharisees?',
  'What does "grace" mean in the Bible?',
  'Where was Jesus born and why?',
  'What is the significance of the number 40?',
  'Who wrote the book of John?',
]

export default function ChatPanel({ open, onClose, onNavigate }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '📖 Ask me anything about the Bible — a verse, a character, history, theology, or what a passage means.',
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const mdComponents = useMemo(() => {
    if (!onNavigate) return {}
    const wrap = children => processChildren(children, onNavigate)
    return {
      p:      ({ children }) => <p>{wrap(children)}</p>,
      li:     ({ children }) => <li>{wrap(children)}</li>,
      strong: ({ children }) => <strong>{wrap(children)}</strong>,
      em:     ({ children }) => <em>{wrap(children)}</em>,
    }
  }, [onNavigate])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async (text) => {
    const question = text?.trim() || input.trim()
    if (!question || streaming) return

    setInput('')
    const userMsg = { role: 'user', content: question }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const apiMessages = updatedMessages
        .filter((_, i) => i > 0 || updatedMessages[0].role !== 'assistant')
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

      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: fullText, streaming: false }
        return copy
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', streaming: false }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: '📖 Chat cleared! Ask me anything about the Bible.' }])
  }

  return (
    <>
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

        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && <span className="chat-avatar">📖</span>}
              <div className="chat-bubble-text">
                <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className="chat-cursor">▌</span>}
              </div>
            </div>
          ))}
        </div>

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

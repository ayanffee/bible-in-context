import { useState, useEffect, useRef } from 'react'

export default function CommentsDrawer({ bookmark, currentUser, onAddComment, onClose }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/social/comments/${bookmark.id}`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load comments (${r.status})`)
        return r.json()
      })
      .then(data => { setComments(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [bookmark.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!text.trim() || !currentUser) return
    setPosting(true)
    try {
      const comment = await onAddComment(bookmark.id, text.trim())
      setComments(prev => [...prev, comment])
      setText('')
    } finally {
      setPosting(false)
    }
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="comments-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="comments-drawer">
        <div className="comments-header">
          <div className="comments-verse-ref">
            {bookmark.bookName} {bookmark.chapter}:{bookmark.verse}
          </div>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>

        <div className="comments-verse-text">"{bookmark.text}"</div>

        {bookmark.note && (
          <div className="comments-note">
            <span className="comments-note-author">{bookmark.displayName}</span>: {bookmark.note}
          </div>
        )}

        <div className="comments-list">
          {loading && <p className="comments-loading">Loading comments…</p>}
          {error && <p className="comments-loading" style={{ color: 'var(--accent)' }}>⚠️ {error}</p>}
          {!loading && !error && comments.length === 0 && (
            <p className="comments-empty">No comments yet. Be the first! 💬</p>
          )}
          {comments.map(c => (
            <div key={c?.id ?? Math.random()} className={`comment ${c?.userId === currentUser?.id ? 'own' : ''}`}>
              <div className="comment-avatar">{c?.avatar || '✝️'}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-name">{c?.displayName || 'Unknown'}</span>
                  <span className="comment-time">{formatTime(c?.createdAt)}</span>
                </div>
                <p className="comment-text">{c?.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {currentUser ? (
          <form className="comment-form" onSubmit={handlePost}>
            <div className="comment-form-avatar">{currentUser.avatar}</div>
            <input
              className="comment-input"
              placeholder="Add a comment…"
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={500}
            />
            <button className="comment-submit" type="submit" disabled={posting || !text.trim()}>
              {posting ? '…' : '↑'}
            </button>
          </form>
        ) : (
          <p className="comments-login-hint">Create a profile to comment</p>
        )}
      </div>
    </div>
  )
}

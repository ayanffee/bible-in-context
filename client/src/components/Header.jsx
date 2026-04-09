import { useState, useRef, useEffect } from 'react'
import { BIBLE_BOOKS, getChapterCount } from '../utils/bibleBooks.js'

const TRANSLATIONS = [
  { id: 'kjv', label: 'KJV' },
  { id: 'web', label: 'WEB' },
  { id: 'darby', label: 'Darby' },
  { id: 'bbe', label: 'BBE' },
]

export default function Header({
  bookId, chapter, translation = 'kjv',
  onBookChange, onChapterChange, onTranslationChange,
  theme, onThemeToggle, onSidebarToggle,
  user, onShowSetup, onLogout, pendingCount = 0,
  onChatToggle, chatOpen
}) {
  const chapterCount = getChapterCount(bookId)
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)

  // Fix 1: dropdown state for the user avatar button
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const handleLogout = () => {
    setUserMenuOpen(false)
    onLogout()
  }

  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="sidebar-toggle-btn"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
          title="Bookmarks, History &amp; Friends"
        >
          ☰
          {pendingCount > 0 && (
            <span className="header-pending-badge">{pendingCount}</span>
          )}
        </button>

        <div className="header-brand">
          <span className="header-title">Bible in Context</span>
          <span className="header-subtitle">Historical &amp; Cultural Annotations</span>
        </div>

        <div className="header-controls">
          <div className="selector-group">
            <select value={bookId} onChange={e => onBookChange(e.target.value)} aria-label="Select book">
              {BIBLE_BOOKS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select value={chapter} onChange={e => onChapterChange(Number(e.target.value))} aria-label="Select chapter">
              {chapters.map(c => (
                <option key={c} value={c}>Ch. {c}</option>
              ))}
            </select>
            {/* Fix 9: translation selector */}
            <select
              value={translation}
              onChange={e => onTranslationChange(e.target.value)}
              aria-label="Select translation"
              title="Bible translation"
            >
              {TRANSLATIONS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Fix 1: user avatar with logout dropdown */}
          <div className="user-menu-wrap" ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="user-btn"
              onClick={user ? () => setUserMenuOpen(o => !o) : onShowSetup}
              title={user ? `@${user.username}` : 'Create profile'}
              aria-label={user ? `Profile: ${user.displayName}` : 'Create profile'}
              aria-haspopup={user ? 'menu' : undefined}
              aria-expanded={user ? userMenuOpen : undefined}
            >
              {user ? (
                <span className="user-avatar-btn">{user.avatar}</span>
              ) : (
                <span className="user-login-btn">👤</span>
              )}
            </button>

            {user && userMenuOpen && (
              <div className="user-dropdown" role="menu">
                <div className="user-dropdown-name">{user.displayName}</div>
                <div className="user-dropdown-username">@{user.username}</div>
                <hr className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item"
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); onShowSetup() }}
                >
                  Edit profile
                </button>
                <button
                  className="user-dropdown-item user-dropdown-logout"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          <button
            className={`chat-toggle-btn ${chatOpen ? 'active' : ''}`}
            onClick={onChatToggle}
            aria-label="Biblical assistant chat"
            title="Ask a Bible question"
          >
            💬
          </button>

          <button
            className="theme-toggle"
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  )
}

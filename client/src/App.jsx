import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Header from './components/Header.jsx'
import VerseList from './components/VerseList.jsx'
import SidePanel from './components/SidePanel.jsx'
import DidYouKnow from './components/DidYouKnow.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import UserSetup from './components/UserSetup.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import { useBibleChapter } from './hooks/useBibleChapter.js'
import { useTheme } from './hooks/useTheme.js'
import { useBookmarks } from './hooks/useBookmarks.js'
import { useSearchHistory } from './hooks/useSearchHistory.js'
import { useUser } from './hooks/useUser.js'
import { useSocial } from './hooks/useSocial.js'
import { getBook } from './utils/bibleBooks.js'

const SETUP_DISMISSED_KEY = 'bible-setup-dismissed'

// Fix 7: persist verse context cache across page refreshes using sessionStorage
function loadContextCache() {
  try {
    const raw = sessionStorage.getItem('verse-context-cache')
    return raw ? new Map(Object.entries(JSON.parse(raw))) : new Map()
  } catch {
    return new Map()
  }
}

export default function App() {
  const [bookId, setBookId] = useState('JHN')
  const [chapter, setChapter] = useState(3)
  const [expandedVerse, setExpandedVerse] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  // Fix 9: translation state
  const [translation, setTranslation] = useState('kjv')
  const contextCacheRef = useRef(loadContextCache())

  const { theme, toggle: toggleTheme } = useTheme()
  // Fix 9: pass translation to the hook
  const { verses, loading, error } = useBibleChapter(bookId, chapter, translation)
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks()
  const { history, addToHistory, clearHistory } = useSearchHistory()
  // Fix 1: destructure logout
  const { user, createUser, logout } = useUser()
  const social = useSocial(user?.id)

  const bookInfo = getBook(bookId)

  // Show setup on first visit
  useEffect(() => {
    const dismissed = localStorage.getItem(SETUP_DISMISSED_KEY)
    if (!user && !dismissed) {
      const t = setTimeout(() => setShowSetup(true), 600)
      return () => clearTimeout(t)
    }
  }, [user])

  const handleSetupComplete = async (username, displayName, avatar) => {
    if (!username) {
      localStorage.setItem(SETUP_DISMISSED_KEY, '1')
      setShowSetup(false)
      return
    }
    await createUser(username, displayName, avatar)
    setShowSetup(false)
  }

  const recentTopics = useMemo(() => {
    const seen = new Set()
    const topics = []
    for (const entry of history) {
      if (!seen.has(entry.selection) && topics.length < 5) {
        seen.add(entry.selection)
        topics.push(entry.selection)
      }
    }
    return topics
  }, [history])

  const handleBookChange = useCallback((newBookId) => {
    setBookId(newBookId)
    setChapter(1)
    setExpandedVerse(null)
  }, [])

  const handleChapterChange = useCallback((newChapter) => {
    setChapter(newChapter)
    setExpandedVerse(null)
  }, [])

  const handleToggleVerse = useCallback((verse) => {
    setExpandedVerse(prev => prev === verse ? null : verse)
  }, [])

  // Fix 7: save updated context to sessionStorage so it survives page refresh
  const handleCacheUpdate = useCallback((key, context) => {
    contextCacheRef.current.set(key, context)
    try {
      sessionStorage.setItem(
        'verse-context-cache',
        JSON.stringify(Object.fromEntries(contextCacheRef.current))
      )
    } catch {}
  }, [])

  // Fix 2: accept verse param so bookmark navigation expands the correct verse
  const handleNavigate = useCallback((navBookId, navChapter, navVerse) => {
    setBookId(navBookId)
    setChapter(navChapter)
    setExpandedVerse(navVerse ?? null)
  }, [])

  const handleShareBookmark = useCallback(async (bmData) => {
    if (!user) { setShowSetup(true); return }
    try { await social.shareBookmark(bmData) }
    catch (e) { console.warn('Share failed:', e.message) }
  }, [user, social])

  // Fix 1: handle logout — also clear session cache
  const handleLogout = useCallback(() => {
    logout()
    sessionStorage.removeItem('verse-context-cache')
    contextCacheRef.current = new Map()
  }, [logout])

  // Fix 10: prev / next chapter helpers
  const handlePrevChapter = useCallback(() => {
    if (chapter > 1) handleChapterChange(chapter - 1)
  }, [chapter, handleChapterChange])

  const handleNextChapter = useCallback(() => {
    if (bookInfo && chapter < bookInfo.chapters) handleChapterChange(chapter + 1)
  }, [chapter, bookInfo, handleChapterChange])

  return (
    <div className="app-wrapper">
      <Header
        bookId={bookId}
        chapter={chapter}
        translation={translation}
        onBookChange={handleBookChange}
        onChapterChange={handleChapterChange}
        onTranslationChange={setTranslation}
        theme={theme}
        onThemeToggle={toggleTheme}
        onSidebarToggle={() => setSidebarOpen(o => !o)}
        onChatToggle={() => setChatOpen(o => !o)}
        chatOpen={chatOpen}
        user={user}
        onShowSetup={() => setShowSetup(true)}
        onLogout={handleLogout}
        pendingCount={social.pendingRequests.length}
      />

      <SidePanel
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        bookmarks={bookmarks}
        history={history}
        onClearHistory={clearHistory}
        onNavigate={handleNavigate}
        currentUser={user}
        socialFeed={social.feed}
        friends={social.friends}
        pendingRequests={social.pendingRequests}
        sentRequests={social.sentRequests}
        socialLoading={social.loading}
        onSendFriendRequest={social.sendFriendRequest}
        onAcceptFriendRequest={social.acceptFriendRequest}
        onRemoveFriend={social.removeFriend}
        onDeleteSharedBookmark={social.deleteSharedBookmark}
        onAddComment={social.addComment}
      />

      <div className="bible-ask-layout">
        <main className="main-content">
          <DidYouKnow recentTopics={recentTopics} />

          {!loading && !error && verses.length > 0 && (
            <>
              <div className="chapter-header">
                <div className="chapter-book-name">{bookInfo?.name}</div>
                <h1 className="chapter-title">Chapter {chapter}</h1>
                <p className="chapter-hint">
                  <span className="hint-icon">👆</span>
                  Tap any verse to reveal historical context · Highlight any word for instant AI explanation
                </p>
                {/* Fix 10: prev / next chapter navigation */}
                <div className="chapter-nav">
                  <button
                    className="chapter-nav-btn"
                    onClick={handlePrevChapter}
                    disabled={chapter <= 1}
                    aria-label="Previous chapter"
                  >
                    ← Prev
                  </button>
                  <button
                    className="chapter-nav-btn"
                    onClick={handleNextChapter}
                    disabled={!bookInfo || chapter >= bookInfo.chapters}
                    aria-label="Next chapter"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <VerseList
                bookId={bookId}
                bookName={bookInfo?.name}
                chapter={chapter}
                verses={verses}
                expandedVerse={expandedVerse}
                onToggle={handleToggleVerse}
                contextCache={contextCacheRef.current}
                onCacheUpdate={handleCacheUpdate}
                isBookmarked={isBookmarked}
                onAddBookmark={addBookmark}
                onRemoveBookmark={removeBookmark}
                addToHistory={addToHistory}
                currentUser={user}
                onShareBookmark={handleShareBookmark}
              />

              {/* Fix 10: bottom prev/next for easy chapter flipping after reading */}
              <div className="chapter-nav chapter-nav-bottom">
                <button
                  className="chapter-nav-btn"
                  onClick={handlePrevChapter}
                  disabled={chapter <= 1}
                  aria-label="Previous chapter"
                >
                  ← Prev Chapter
                </button>
                <button
                  className="chapter-nav-btn"
                  onClick={handleNextChapter}
                  disabled={!bookInfo || chapter >= bookInfo.chapters}
                  aria-label="Next chapter"
                >
                  Next Chapter →
                </button>
              </div>
            </>
          )}

          {loading && (
            <div className="state-container">
              <div className="spinner" />
              <p className="state-title">Loading {bookInfo?.name} {chapter}…</p>
              <p className="state-message">Fetching from Scripture</p>
            </div>
          )}

          {error && (
            <div className="state-container">
              <p className="state-title">Could not load chapter</p>
              <p className="state-message error">{error}</p>
            </div>
          )}
        </main>

        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onNavigate={handleNavigate} />
      </div>

      <MusicPlayer />

      {showSetup && <UserSetup onComplete={handleSetupComplete} />}
    </div>
  )
}

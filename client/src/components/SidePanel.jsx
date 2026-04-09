import { useState, useCallback } from 'react'
import SocialFeed from './SocialFeed.jsx'

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function groupByCategory(bookmarks) {
  const groups = {}
  for (const bm of bookmarks) {
    const cat = bm.category || 'Uncategorized'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(bm)
  }
  return groups
}

export default function SidePanel({
  open, onClose,
  bookmarks, history, onClearHistory, onNavigate,
  // social props
  currentUser, socialFeed, friends, pendingRequests, sentRequests, socialLoading,
  onSendFriendRequest, onAcceptFriendRequest, onRemoveFriend,
  onDeleteSharedBookmark, onAddComment,
}) {
  const [activeTab, setActiveTab] = useState('bookmarks')
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)

  const handleNavigate = useCallback((bookId, chapter, verse) => {
    onNavigate(bookId, chapter, verse)
    onClose()
  }, [onNavigate, onClose])

  const toggleHistory = useCallback((id) => {
    setExpandedHistoryId(prev => prev === id ? null : id)
  }, [])

  const grouped = groupByCategory(bookmarks)

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidepanel-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className={`sidepanel ${open ? 'open' : ''}`} aria-label="Side panel">
        <div className="sidepanel-header">
          <div className="sidepanel-tabs">
            <button className={`sidepanel-tab ${activeTab === 'bookmarks' ? 'active' : ''}`} onClick={() => setActiveTab('bookmarks')}>
              📌 Bookmarks
            </button>
            <button className={`sidepanel-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              🕐 History
            </button>
            <button className={`sidepanel-tab ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>
              👥 Friends
              {pendingRequests?.length > 0 && <span className="social-badge">{pendingRequests.length}</span>}
            </button>
          </div>
          <button className="sidepanel-close" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>

        <div className="sidepanel-body">
          {/* BOOKMARKS TAB */}
          {activeTab === 'bookmarks' && (
            <div className="sidepanel-section">
              {bookmarks.length === 0 ? (
                <div className="sidepanel-empty">
                  <span className="sidepanel-empty-icon">🔖</span>
                  <p>No bookmarks yet.</p>
                  <p className="sidepanel-empty-hint">
                    Tap the tag icon on any verse to save it.
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="bookmark-group">
                    <div className="bookmark-group-title">{category}</div>
                    {items.map(bm => (
                      <button
                        key={bm.id}
                        className="bookmark-item"
                        onClick={() => handleNavigate(bm.bookId, bm.chapter, bm.verse)}
                      >
                        <div className="bookmark-item-ref">
                          {bm.bookName} {bm.chapter}:{bm.verse}
                        </div>
                        <div className="bookmark-item-text">
                          {bm.text?.slice(0, 80)}{bm.text?.length > 80 ? '…' : ''}
                        </div>
                        <div className="bookmark-item-date">{formatDate(bm.createdAt)}</div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="sidepanel-section">
              {history.length === 0 ? (
                <div className="sidepanel-empty">
                  <span className="sidepanel-empty-icon">🕐</span>
                  <p>No search history yet.</p>
                  <p className="sidepanel-empty-hint">
                    Highlight text in any verse to get AI explanations.
                  </p>
                </div>
              ) : (
                <>
                  <div className="history-header-row">
                    <span className="history-count">{history.length} searches</span>
                    <button className="history-clear-btn" onClick={onClearHistory}>
                      Clear all
                    </button>
                  </div>
                  {history.map(entry => (
                    <div key={entry.id} className="history-item">
                      <button
                        className="history-item-header"
                        onClick={() => toggleHistory(entry.id)}
                      >
                        <div className="history-item-left">
                          <span className="history-phrase">"{entry.selection}"</span>
                          <span className="history-ref">
                            {entry.bookName} {entry.chapter}:{entry.verse}
                          </span>
                        </div>
                        <span className="history-chevron">
                          {expandedHistoryId === entry.id ? '▲' : '▼'}
                        </span>
                      </button>
                      <div className="history-date">{formatDate(entry.askedAt)}</div>

                      {expandedHistoryId === entry.id && (
                        <div className="history-explanation">
                          <div className="history-verse-text">
                            <em>{entry.verseText?.slice(0, 120)}{entry.verseText?.length > 120 ? '…' : ''}</em>
                          </div>
                          <p className="history-full-explanation">{entry.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {/* SOCIAL TAB */}
          {activeTab === 'social' && (
            <SocialFeed
              feed={socialFeed}
              friends={friends}
              pendingRequests={pendingRequests}
              sentRequests={sentRequests}
              currentUser={currentUser}
              loading={socialLoading}
              onSendFriendRequest={onSendFriendRequest}
              onAcceptFriendRequest={onAcceptFriendRequest}
              onRemoveFriend={onRemoveFriend}
              onDeleteBookmark={onDeleteSharedBookmark}
              onAddComment={onAddComment}
              onNavigate={(bookId, chapter, verse) => { onNavigate(bookId, chapter, verse); onClose() }}
            />
          )}
        </div>
      </aside>
    </>
  )
}

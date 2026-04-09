import { useState } from 'react'
import CommentsDrawer from './CommentsDrawer.jsx'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SocialFeed({
  feed, friends, pendingRequests, sentRequests,
  currentUser, loading,
  onSendFriendRequest, onAcceptFriendRequest, onRemoveFriend,
  onDeleteBookmark, onAddComment, onNavigate
}) {
  const [tab, setTab] = useState('feed') // 'feed' | 'friends'
  const [addUsername, setAddUsername] = useState('')
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)
  const [openComments, setOpenComments] = useState(null)

  const handleAddFriend = async (e) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)
    try {
      await onSendFriendRequest(addUsername.trim())
      setAddSuccess(`Friend request sent to @${addUsername}!`)
      setAddUsername('')
    } catch (err) {
      setAddError(err.message)
    }
  }

  return (
    <div className="social-feed">
      <div className="social-tabs">
        <button className={`social-tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          📰 Feed
        </button>
        <button className={`social-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
          👥 Friends
          {pendingRequests.length > 0 && (
            <span className="social-badge">{pendingRequests.length}</span>
          )}
        </button>
      </div>

      {/* ── FEED TAB ── */}
      {tab === 'feed' && (
        <div className="social-feed-list">
          {!currentUser && (
            <div className="social-empty">
              <span>🌍</span>
              <p>Create a profile to see friends' bookmarks and share your own discoveries</p>
            </div>
          )}

          {currentUser && loading && (
            <div className="social-loading"><div className="spinner" /> Loading feed…</div>
          )}

          {currentUser && !loading && feed.length === 0 && (
            <div className="social-empty">
              <span>📌</span>
              <p>No shared bookmarks yet. Add friends and share verses!</p>
            </div>
          )}

          {feed.map(bookmark => (
            <div key={bookmark.id} className="feed-card">
              <div className="feed-card-header">
                <span className="feed-avatar">{bookmark.avatar || '✝️'}</span>
                <div className="feed-meta">
                  <span className="feed-name">{bookmark.displayName}</span>
                  <span className="feed-time">{timeAgo(bookmark.createdAt)}</span>
                </div>
                {bookmark.userId === currentUser?.id && (
                  <button
                    className="feed-delete"
                    onClick={() => onDeleteBookmark(bookmark.id)}
                    title="Remove shared bookmark"
                  >✕</button>
                )}
              </div>

              <div
                className="feed-verse"
                onClick={() => onNavigate(bookmark.bookId, bookmark.chapter, bookmark.verse)}
              >
                <div className="feed-verse-ref">
                  {bookmark.bookName} {bookmark.chapter}:{bookmark.verse}
                  {bookmark.category && <span className="feed-category">{bookmark.category}</span>}
                </div>
                <p className="feed-verse-text">"{bookmark.text}"</p>
              </div>

              {bookmark.note && (
                <p className="feed-note">{bookmark.note}</p>
              )}

              <button
                className="feed-comments-btn"
                onClick={() => setOpenComments(bookmark)}
              >
                💬 {bookmark.commentCount > 0 ? `${bookmark.commentCount} comment${bookmark.commentCount > 1 ? 's' : ''}` : 'Comment'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── FRIENDS TAB ── */}
      {tab === 'friends' && (
        <div className="friends-panel">
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="friends-section">
              <div className="friends-section-title">Friend Requests</div>
              {pendingRequests.map(req => (
                <div key={req.id} className="friend-row">
                  <span className="friend-avatar">{req.fromUser?.avatar || '✝️'}</span>
                  <div className="friend-info">
                    <span className="friend-name">{req.fromUser?.displayName}</span>
                    <span className="friend-username">@{req.fromUser?.username}</span>
                  </div>
                  <button className="friend-accept" onClick={() => onAcceptFriendRequest(req.id)}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add friend */}
          <div className="friends-section">
            <div className="friends-section-title">Add a Friend</div>
            <form className="add-friend-form" onSubmit={handleAddFriend}>
              <input
                className="add-friend-input"
                placeholder="Enter username…"
                value={addUsername}
                onChange={e => setAddUsername(e.target.value)}
              />
              <button className="add-friend-btn" type="submit">Send</button>
            </form>
            {addError && <p className="add-friend-error">⚠️ {addError}</p>}
            {addSuccess && <p className="add-friend-success">✅ {addSuccess}</p>}
          </div>

          {/* Friends list */}
          <div className="friends-section">
            <div className="friends-section-title">
              Your Friends ({friends.length})
            </div>
            {friends.length === 0 && sentRequests.length === 0 && (
              <p className="friends-empty">No friends yet — add someone above!</p>
            )}
            {friends.map(f => (
              <div key={f.id} className="friend-row">
                <span className="friend-avatar">{f.user?.avatar || '✝️'}</span>
                <div className="friend-info">
                  <span className="friend-name">{f.user?.displayName}</span>
                  <span className="friend-username">@{f.user?.username}</span>
                </div>
                <button className="friend-remove" onClick={() => onRemoveFriend(f.id)} title="Remove friend">
                  ✕
                </button>
              </div>
            ))}
            {sentRequests.map(s => (
              <div key={s.id} className="friend-row pending">
                <span className="friend-avatar">{s.toUser?.avatar || '✝️'}</span>
                <div className="friend-info">
                  <span className="friend-name">{s.toUser?.displayName}</span>
                  <span className="friend-username">@{s.toUser?.username}</span>
                </div>
                <span className="friend-pending-tag">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {openComments && (
        <CommentsDrawer
          bookmark={openComments}
          currentUser={currentUser}
          onAddComment={onAddComment}
          onClose={() => setOpenComments(null)}
        />
      )}
    </div>
  )
}

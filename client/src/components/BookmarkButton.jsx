import { useState, useRef, useEffect, useCallback } from 'react'

const DEFAULT_CATEGORIES = ['Favorites', 'Prayer', 'Study', 'Memorize']

export default function BookmarkButton({
  bookId, bookName, chapter, verse, text,
  isBookmarked, onAdd, onRemove, onShare
}) {
  const [showPopover, setShowPopover] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const popoverRef = useRef(null)
  const buttonRef = useRef(null)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (isBookmarked) {
      onRemove(bookId, chapter, verse)
    } else {
      setShowPopover(prev => !prev)
    }
  }, [isBookmarked, onRemove, bookId, chapter, verse])

  const handleCategorySelect = useCallback((category) => {
    onAdd(bookId, bookName, chapter, verse, text, category)
    // Also share with friends if handler provided
    if (onShare) onShare({ bookId, bookName, chapter, verse, text, category })
    setShowPopover(false)
    setCustomCategory('')
  }, [onAdd, onShare, bookId, bookName, chapter, verse, text])

  const handleCustomSubmit = useCallback((e) => {
    e.preventDefault()
    const cat = customCategory.trim()
    if (cat) {
      handleCategorySelect(cat)
    }
  }, [customCategory, handleCategorySelect])

  // Close on outside click
  useEffect(() => {
    if (!showPopover) return
    function handler(e) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopover])

  return (
    <div className="bookmark-wrapper" onClick={e => e.stopPropagation()}>
      <button
        ref={buttonRef}
        className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
        onClick={handleClick}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this verse'}
      >
        {isBookmarked ? '🔖' : '🏷️'}
      </button>

      {showPopover && (
        <div className="bookmark-popover" ref={popoverRef}>
          <div className="bookmark-popover-title">Save to category</div>
          <div className="bookmark-categories">
            {DEFAULT_CATEGORIES.map(cat => (
              <button
                key={cat}
                className="bookmark-cat-btn"
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <form className="bookmark-custom-form" onSubmit={handleCustomSubmit}>
            <input
              className="bookmark-custom-input"
              type="text"
              placeholder="Or type a custom category…"
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              autoFocus
            />
            <button type="submit" className="bookmark-custom-save">Save</button>
          </form>
          {onShare && (
            <p className="bookmark-share-hint">🌍 Saves &amp; shares with friends</p>
          )}
        </div>
      )}
    </div>
  )
}

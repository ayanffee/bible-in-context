import { useState, useCallback } from 'react'
import ContextPanel from './ContextPanel.jsx'
import SelectionPopup from './SelectionPopup.jsx'
import BookmarkButton from './BookmarkButton.jsx'

export default function VerseCard({
  bookId, bookName, chapter, verse, text,
  expanded, onToggle, contextCache, onCacheUpdate,
  isBookmarked, onAddBookmark, onRemoveBookmark,
  addToHistory, onShareBookmark,
}) {
  const [popup, setPopup] = useState(null) // { selection, position }

  const handleMouseUp = useCallback((e) => {
    // Don't fire if they clicked the expand arrow or bookmark button
    if (
      e.target.classList.contains('verse-expand-icon') ||
      e.target.closest('.bookmark-wrapper')
    ) return

    const selection = window.getSelection()
    const selected = selection?.toString().trim()

    if (!selected || selected.length < 2) {
      return // too short — ignore
    }

    // Get position of the selection for popup placement
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setPopup({
      selection: selected,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      }
    })

    // Prevent the click from also toggling expand
    e.stopPropagation()
  }, [])

  const handleRowClick = useCallback((e) => {
    // Only toggle if there's no active text selection and not clicking bookmark
    if (e.target.closest('.bookmark-wrapper')) return
    const selected = window.getSelection()?.toString().trim()
    if (!selected) onToggle()
  }, [onToggle])

  const closePopup = useCallback(() => {
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  return (
    <div className={`verse-card ${expanded ? 'expanded' : ''}`}>
      <div
        className="verse-row"
        onClick={handleRowClick}
        onMouseUp={handleMouseUp}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={e => {
          if (e.target.closest('.bookmark-wrapper')) return
          if (e.key === 'Enter' || e.key === ' ') onToggle()
        }}
      >
        <span className="verse-num">{verse}</span>
        <span className="verse-text selectable">{text}</span>
        <BookmarkButton
          bookId={bookId}
          bookName={bookName}
          chapter={chapter}
          verse={verse}
          text={text}
          isBookmarked={isBookmarked}
          onAdd={onAddBookmark}
          onRemove={onRemoveBookmark}
          onShare={onShareBookmark}
        />
        <span className="verse-expand-icon" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <ContextPanel
          bookId={bookId}
          bookName={bookName}
          chapter={chapter}
          verse={verse}
          text={text}
          contextCache={contextCache}
          onCacheUpdate={onCacheUpdate}
        />
      )}

      {popup && (
        <SelectionPopup
          selection={popup.selection}
          position={popup.position}
          verseText={text}
          bookName={bookName}
          chapter={chapter}
          verse={verse}
          onClose={closePopup}
          addToHistory={addToHistory}
        />
      )}
    </div>
  )
}

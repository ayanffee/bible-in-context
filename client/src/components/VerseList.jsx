import VerseCard from './VerseCard.jsx'

export default function VerseList({
  bookId, bookName, chapter, verses,
  expandedVerse, onToggle, contextCache, onCacheUpdate,
  isBookmarked, onAddBookmark, onRemoveBookmark,
  addToHistory, onShareBookmark,
}) {
  return (
    <div className="verse-list">
      {verses.map(({ verse, text }) => (
        <VerseCard
          key={verse}
          bookId={bookId}
          bookName={bookName}
          chapter={chapter}
          verse={verse}
          text={text}
          expanded={expandedVerse === verse}
          onToggle={() => onToggle(verse)}
          contextCache={contextCache}
          onCacheUpdate={onCacheUpdate}
          isBookmarked={isBookmarked(bookId, chapter, verse)}
          onAddBookmark={onAddBookmark}
          onRemoveBookmark={onRemoveBookmark}
          addToHistory={addToHistory}
          onShareBookmark={onShareBookmark}
        />
      ))}
    </div>
  )
}

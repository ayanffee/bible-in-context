import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'bible-bookmarks'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(bookmarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  } catch {}
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(() => load())

  // Persist on every change
  useEffect(() => {
    save(bookmarks)
  }, [bookmarks])

  const addBookmark = useCallback((bookId, bookName, chapter, verse, text, category = 'Favorites') => {
    setBookmarks(prev => {
      // Avoid duplicates
      const exists = prev.some(
        b => b.bookId === bookId && b.chapter === chapter && b.verse === verse
      )
      if (exists) return prev
      const entry = {
        id: `${bookId}-${chapter}-${verse}-${Date.now()}`,
        bookId,
        bookName,
        chapter,
        verse,
        text,
        category,
        createdAt: new Date().toISOString(),
      }
      return [...prev, entry]
    })
  }, [])

  const removeBookmark = useCallback((bookId, chapter, verse) => {
    setBookmarks(prev =>
      prev.filter(
        b => !(b.bookId === bookId && b.chapter === chapter && b.verse === verse)
      )
    )
  }, [])

  const isBookmarked = useCallback(
    (bookId, chapter, verse) =>
      bookmarks.some(
        b => b.bookId === bookId && b.chapter === chapter && b.verse === verse
      ),
    [bookmarks]
  )

  const categories = [...new Set(bookmarks.map(b => b.category))]

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, categories }
}

export async function fetchChapter(bookId, chapter, translation = 'kjv') {
  const res = await fetch(`/api/bible/${bookId}/${chapter}?translation=${translation}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to load ${bookId} ${chapter}`)
  }
  return res.json()
}

// Streaming — calls onChunk(partialContext) as text arrives, resolves with { context, terms }
export async function streamContext({ bookId, bookName, chapter, verse, text }, onChunk) {
  const params = new URLSearchParams({ bookId, bookName, chapter, verse, text })
  const res = await fetch(`/api/context/stream?${params}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to load context')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))

        if (data.chunk) {
          const raw = data.chunk
          onChunk(raw, 'chunk')
        }

        if (data.done) {
          return {
            context: data.context,
            terms: data.terms || [],
            cached: data.cached || false
          }
        }
      } catch {}
    }
  }

  return { context: '', terms: [] }
}

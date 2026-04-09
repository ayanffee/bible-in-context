import { useState, useEffect, useCallback } from 'react'

function authHeaders(userId) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userId}`,
  }
}

export function useSocial(userId) {
  const [feed, setFeed] = useState([])
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFriends = useCallback(async () => {
    if (!userId) return
    const res = await fetch(`/api/social/friends/${userId}`)
    if (!res.ok) return
    const data = await res.json()
    setFriends(data.friends || [])
    setPendingRequests(data.pendingRequests || [])
    setSentRequests(data.sentRequests || [])
  }, [userId])

  const fetchFeed = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const res = await fetch(`/api/social/feed/${userId}`)
    if (res.ok) setFeed(await res.json())
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchFriends()
      fetchFeed()
    }
  }, [userId])

  const sendFriendRequest = async (toUsername) => {
    const res = await fetch('/api/social/friends', {
      method: 'POST',
      headers: authHeaders(userId),
      body: JSON.stringify({ toUsername })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to send request')
    }
    await fetchFriends()
    return res.json()
  }

  const acceptFriendRequest = async (friendshipId) => {
    await fetch(`/api/social/friends/${friendshipId}/accept`, {
      method: 'PUT',
      headers: authHeaders(userId),
    })
    await fetchFriends()
    await fetchFeed()
  }

  const removeFriend = async (friendshipId) => {
    await fetch(`/api/social/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: authHeaders(userId),
    })
    await fetchFriends()
    await fetchFeed()
  }

  const shareBookmark = async ({ bookId, bookName, chapter, verse, text, category, note }) => {
    const res = await fetch('/api/social/bookmarks', {
      method: 'POST',
      headers: authHeaders(userId),
      body: JSON.stringify({ bookId, bookName, chapter, verse, text, category, note })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to share')
    }
    const bookmark = await res.json()
    setFeed(prev => [bookmark, ...prev])
    return bookmark
  }

  const deleteSharedBookmark = async (bookmarkId) => {
    await fetch(`/api/social/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
      headers: authHeaders(userId),
    })
    setFeed(prev => prev.filter(b => b.id !== bookmarkId))
  }

  const addComment = async (bookmarkId, content) => {
    const res = await fetch('/api/social/comments', {
      method: 'POST',
      headers: authHeaders(userId),
      body: JSON.stringify({ bookmarkId, content })
    })
    if (!res.ok) throw new Error('Failed to post comment')
    const comment = await res.json()
    setFeed(prev => prev.map(b =>
      b.id === bookmarkId
        ? { ...b, commentCount: (b.commentCount || 0) + 1 }
        : b
    ))
    return comment
  }

  return {
    feed, friends, pendingRequests, sentRequests, loading,
    sendFriendRequest, acceptFriendRequest, removeFriend,
    shareBookmark, deleteSharedBookmark, addComment,
    refresh: () => { fetchFriends(); fetchFeed() }
  }
}

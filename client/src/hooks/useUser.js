import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bible-user'

export function useUser() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })

  const createUser = async (username, displayName, avatar) => {
    const res = await fetch('/api/social/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, avatar })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create account')
    }
    const newUser = await res.json()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return { user, createUser, logout }
}

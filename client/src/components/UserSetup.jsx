import { useState } from 'react'

const AVATARS = ['✝️','📖','🙏','🕊️','⭐','🌿','🔥','💫','🌊','🫶']

export default function UserSetup({ onComplete }) {
  const [step, setStep] = useState('intro') // 'intro' | 'form'
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('✝️')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onComplete(username, displayName, avatar)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="setup-overlay">
        <div className="setup-modal">
          <div className="setup-icon">📖</div>
          <h2 className="setup-title">Welcome to Bible in Context</h2>
          <p className="setup-subtitle">
            Read, study, and explore Scripture with historical context — and share discoveries with friends.
          </p>
          <div className="setup-actions">
            <button className="setup-btn-primary" onClick={() => setStep('form')}>
              Create your profile
            </button>
            <button className="setup-btn-ghost" onClick={() => onComplete(null)}>
              Continue without account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <button className="setup-back" onClick={() => setStep('intro')}>← Back</button>
        <h2 className="setup-title">Create your profile</h2>
        <p className="setup-subtitle">Your username lets friends find and connect with you.</p>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-avatar-row">
            {AVATARS.map(a => (
              <button
                key={a} type="button"
                className={`avatar-option ${avatar === a ? 'selected' : ''}`}
                onClick={() => setAvatar(a)}
              >{a}</button>
            ))}
          </div>

          <label className="setup-label">
            Display Name
            <input
              className="setup-input"
              type="text"
              placeholder="e.g. Sarah M."
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
              required
            />
          </label>

          <label className="setup-label">
            Username
            <input
              className="setup-input"
              type="text"
              placeholder="e.g. sarah_m (letters, numbers, underscore)"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              minLength={3}
              maxLength={30}
              required
            />
          </label>

          {error && <p className="setup-error">⚠️ {error}</p>}

          <button className="setup-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Get started →'}
          </button>
        </form>
      </div>
    </div>
  )
}

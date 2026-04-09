import { useState, useCallback, useRef, useEffect } from 'react'

const PRESETS = [
  { label: '🙏 Worship', query: 'worship songs 2024' },
  { label: '✝️ Hymns', query: 'classic hymns' },
  { label: '☮️ Peaceful', query: 'christian instrumental piano' },
  { label: '🎺 Gospel', query: 'gospel music' },
]

// Load YouTube IFrame API once
let ytApiLoaded = false
function loadYTApi() {
  if (ytApiLoaded || document.getElementById('yt-api-script')) return
  ytApiLoaded = true
  const tag = document.createElement('script')
  tag.id = 'yt-api-script'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

export default function MusicPlayer() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('music-volume')
    return saved !== null ? Number(saved) : 80
  })

  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
  const progressIntervalRef = useRef(null)
  const resultsRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize hidden YouTube player
  useEffect(() => {
    loadYTApi()
  }, [])

  const destroyPlayer = useCallback(() => {
    clearInterval(progressIntervalRef.current)
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const startProgressTracker = useCallback((ytPlayer) => {
    clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      try {
        const t = ytPlayer.getCurrentTime() || 0
        const d = ytPlayer.getDuration() || 0
        setCurrentTime(t)
        setDuration(d)
      } catch {}
    }, 500)
  }, [])

  const playVideo = useCallback((track) => {
    setCurrentTrack(track)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setShowResults(false)
    destroyPlayer()

    const tryInit = () => {
      if (!window.YT?.Player) {
        setTimeout(tryInit, 300)
        return
      }
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        width: '2',
        height: '2',
        videoId: track.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady(e) {
            e.target.setVolume(volume)
            e.target.playVideo()
          },
          onStateChange(e) {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) {
              setIsPlaying(true)
              startProgressTracker(e.target)
            } else if (e.data === 2) {
              setIsPlaying(false)
              clearInterval(progressIntervalRef.current)
            } else if (e.data === 0) {
              setIsPlaying(false)
              setCurrentTime(0)
              clearInterval(progressIntervalRef.current)
            }
          }
        }
      })
    }
    tryInit()
  }, [destroyPlayer, startProgressTracker, volume])

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return
    try {
      if (isPlaying) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    } catch {}
  }, [isPlaying])

  const handleSeek = useCallback((e) => {
    if (!playerRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekTo = pct * duration
    playerRef.current.seekTo(seekTo, true)
    setCurrentTime(seekTo)
  }, [duration])

  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value)
    setVolume(v)
    localStorage.setItem('music-volume', v)
    if (playerRef.current) {
      try { playerRef.current.setVolume(v) } catch {}
    }
  }, [])

  const handleStop = useCallback(() => {
    destroyPlayer()
    setCurrentTrack(null)
    setQuery('')
    setResults([])
    setSearchError(null)
  }, [destroyPlayer])

  const search = useCallback(async (q) => {
    const trimmed = q?.trim()
    if (!trimmed) return
    setLoading(true)
    setSearchError(null)
    setResults([])
    setShowResults(false)
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      if (!data.results?.length) throw new Error('No results found')
      setResults(data.results)
      setShowResults(true)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showResults) return
    const handler = (e) => {
      if (
        resultsRef.current && !resultsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.closest('.music-search-wrap').contains(e.target)
      ) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showResults])

  // Cleanup on unmount
  useEffect(() => () => destroyPlayer(), [destroyPlayer])

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="music-player">
      {/* Hidden YouTube player node */}
      <div
        ref={playerContainerRef}
        style={{ position: 'absolute', left: '-9999px', top: 0, width: 2, height: 2, overflow: 'hidden', pointerEvents: 'none' }}
      />

      <div className="music-player-bar">
        <span className="music-icon">🎵</span>

        <div className="music-search-wrap">
          <input
            ref={inputRef}
            className="music-search-input"
            type="text"
            placeholder="Search any song or artist…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') search(query)
              if (e.key === 'Escape') setShowResults(false)
            }}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          <button
            className="music-search-btn"
            onClick={() => search(query)}
            disabled={!query.trim() || loading}
          >
            {loading ? <span className="music-spin">⟳</span> : '🔍'}
          </button>

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="music-results" ref={resultsRef}>
              {results.map(track => (
                <button
                  key={track.videoId}
                  className={`music-result-item ${currentTrack?.videoId === track.videoId ? 'active' : ''}`}
                  onClick={() => playVideo(track)}
                >
                  <img className="music-result-thumb" src={track.thumbnail} alt="" loading="lazy" />
                  <div className="music-result-info">
                    <div className="music-result-title">{track.title}</div>
                    <div className="music-result-meta">{track.channel} · {track.duration}</div>
                  </div>
                  {currentTrack?.videoId === track.videoId && isPlaying && (
                    <span className="music-playing-dot">▶</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="music-presets">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="music-preset-btn"
              onClick={() => { setQuery(p.query); search(p.query) }}
              disabled={loading}
            >{p.label}</button>
          ))}
        </div>

        {currentTrack && (
          <button className="music-stop-btn" onClick={handleStop} title="Stop">✕</button>
        )}
      </div>

      {searchError && <div className="music-error">⚠️ {searchError}</div>}

      {/* Now playing bar */}
      {currentTrack && (
        <div className="music-now-playing-bar">
          <img className="music-np-thumb" src={currentTrack.thumbnail} alt="" />
          <div className="music-np-info">
            <div className="music-np-title">{currentTrack.title}</div>
            <div className="music-np-artist">{currentTrack.channel}</div>
          </div>

          <button className="music-play-pause-btn" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="music-progress-wrap">
            <span className="music-time">{fmtTime(currentTime)}</span>
            <div className="music-progress-track" onClick={handleSeek}>
              <div className="music-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="music-time">{fmtTime(duration)}</span>
          </div>

          <div className="music-volume-wrap">
            🔊
            <input
              type="range"
              min="0" max="100"
              value={volume}
              onChange={handleVolume}
              className="music-volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  )
}

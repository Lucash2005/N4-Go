/**
 * Continuous playlist player for Neural MP3 clips.
 * Uses a single HTMLAudioElement + Media Session so iOS can keep
 * playing after the screen locks (Web Speech cannot do this).
 * Do not import tts.js here (tts imports stopPlaylist from this file).
 */

let audio = null
let playlist = []
let cursor = 0
let playing = false
let loop = true
let rate = 1
let listeners = new Set()
let gapTimer = null
let failStreak = 0

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'auto'
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  audio.addEventListener('ended', () => {
    failStreak = 0
    advance()
  })
  audio.addEventListener('error', () => {
    failStreak += 1
    if (failStreak > Math.max(3, playlist.length)) {
      playing = false
      emit()
      return
    }
    // Skip broken clip and continue (important for lock-screen sessions)
    advance()
  })
  return audio
}

function emit() {
  const track = playlist[cursor] || null
  const snapshot = {
    playing,
    loop,
    index: cursor,
    total: playlist.length,
    track,
  }
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* ignore subscriber errors */
    }
  })
  updateMediaSession(track)
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return
  try {
    if (!track) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'N4 Go',
      artist: track.subtitle || '單字循環播放',
      album: 'N4 Go 聽力',
      artwork: [
        { src: `${import.meta.env.BASE_URL || './'}pwa-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${import.meta.env.BASE_URL || './'}pwa-512.png`, sizes: '512x512', type: 'image/png' },
      ],
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch {
    /* Media Session optional */
  }
}

function bindMediaActions() {
  if (!('mediaSession' in navigator)) return
  const actions = {
    play: () => resume(),
    pause: () => pause(),
    previoustrack: () => previous(),
    nexttrack: () => next(),
    stop: () => stop(),
  }
  for (const [action, handler] of Object.entries(actions)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      /* unsupported action */
    }
  }
}

function clearGap() {
  if (gapTimer) {
    clearTimeout(gapTimer)
    gapTimer = null
  }
}

function playCurrent() {
  clearGap()
  const track = playlist[cursor]
  if (!track?.url) {
    advance()
    return
  }
  const el = ensureAudio()
  el.playbackRate = rate
  // Always set src — iOS is happier reloading the element between tracks
  el.src = track.url
  playing = true
  emit()
  const p = el.play()
  if (p?.catch) {
    p.catch(() => {
      // Try next track instead of dying the whole session
      advance()
    })
  }
}

function advance() {
  if (!playlist.length) {
    playing = false
    emit()
    return
  }
  const nextIndex = cursor + 1
  if (nextIndex >= playlist.length) {
    if (!loop) {
      playing = false
      cursor = 0
      emit()
      return
    }
    cursor = 0
  } else {
    cursor = nextIndex
  }
  // Tiny gap via ended→play; avoid setTimeout (unreliable when screen locked)
  playCurrent()
}

/**
 * @param {Array<{ id?: string, url: string, title: string, subtitle?: string, cardId?: string, kind?: string }>} tracks
 * @param {{ loop?: boolean, rate?: number, startIndex?: number }} [options]
 */
export function startPlaylist(tracks, options = {}) {
  stop()
  playlist = (tracks || []).filter((t) => t?.url)
  if (!playlist.length) return false
  loop = options.loop !== false
  rate = typeof options.rate === 'number' ? Math.min(1.25, Math.max(0.7, options.rate)) : 1
  cursor = Math.min(options.startIndex || 0, playlist.length - 1)
  failStreak = 0
  bindMediaActions()
  playCurrent()
  return true
}

export function pause() {
  clearGap()
  const el = ensureAudio()
  el.pause()
  playing = false
  emit()
}

export function resume() {
  if (!playlist.length) return
  const el = ensureAudio()
  playing = true
  emit()
  el.play()?.catch?.(() => {
    playing = false
    emit()
  })
}

export function stop() {
  clearGap()
  playing = false
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load?.()
  }
  cursor = 0
  playlist = []
  emit()
}

/** Alias used by TTS module to avoid naming clashes */
export function stopPlaylist() {
  stop()
}

export function next() {
  if (!playlist.length) return
  cursor = (cursor + 1) % playlist.length
  playCurrent()
}

export function previous() {
  if (!playlist.length) return
  cursor = (cursor - 1 + playlist.length) % playlist.length
  playCurrent()
}

export function isPlaylistPlaying() {
  return playing
}

export function getPlaylistState() {
  return {
    playing,
    loop,
    index: cursor,
    total: playlist.length,
    track: playlist[cursor] || null,
  }
}

export function subscribePlaylist(fn) {
  listeners.add(fn)
  fn(getPlaylistState())
  return () => listeners.delete(fn)
}

/** Build word→example tracks for a card list (Neural MP3 only). */
export function buildCardTracks(cards, { includeExample = true } = {}) {
  const base = import.meta.env.BASE_URL || './'
  const tracks = []
  for (const card of cards || []) {
    if (!card?.id) continue
    tracks.push({
      id: `${card.id}-word`,
      cardId: card.id,
      kind: 'word',
      url: `${base}audio/${card.id}-word.mp3`,
      title: card.word,
      subtitle: card.reading ? `${card.reading} · 單字` : '單字',
    })
    if (includeExample && card.example) {
      tracks.push({
        id: `${card.id}-example`,
        cardId: card.id,
        kind: 'example',
        url: `${base}audio/${card.id}-example.mp3`,
        title: card.word,
        subtitle: '例句',
      })
    }
  }
  return tracks
}

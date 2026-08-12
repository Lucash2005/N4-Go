/**
 * Continuous playlist player for Neural MP3 clips + optional speech tracks.
 * Uses a single HTMLAudioElement + Media Session so iOS can keep
 * playing after the screen locks (speech tracks may pause when locked).
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
let activeUtterance = null

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
    advance()
  })
  return audio
}

function cancelSpeech() {
  activeUtterance = null
  try {
    window.speechSynthesis?.cancel?.()
  } catch {
    /* ignore */
  }
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

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  if (!voices.length) return null
  const langBase = String(lang || '').split('-')[0].toLowerCase()
  const exact = voices.find((v) => v.lang?.toLowerCase() === String(lang || '').toLowerCase())
  if (exact) return exact
  return voices.find((v) => v.lang?.toLowerCase().startsWith(langBase)) || null
}

function playSpeechTrack(track) {
  cancelSpeech()
  if (!window.speechSynthesis || !track.text) {
    advance()
    return
  }
  const utterance = new SpeechSynthesisUtterance(track.text)
  utterance.lang = track.lang || 'zh-TW'
  utterance.rate = Math.min(1.1, Math.max(0.75, rate * 0.95))
  const voice = pickVoice(utterance.lang)
  if (voice) utterance.voice = voice
  activeUtterance = utterance
  playing = true
  emit()

  utterance.onend = () => {
    if (activeUtterance !== utterance) return
    activeUtterance = null
    failStreak = 0
    advance()
  }
  utterance.onerror = () => {
    if (activeUtterance !== utterance) return
    activeUtterance = null
    failStreak += 1
    if (failStreak > Math.max(3, playlist.length)) {
      playing = false
      emit()
      return
    }
    advance()
  }
  window.speechSynthesis.speak(utterance)
}

function playCurrent() {
  clearGap()
  cancelSpeech()
  const track = playlist[cursor]
  if (!track) {
    playing = false
    emit()
    return
  }

  // Speech track (中文解釋等)
  if (track.text && !track.url) {
    playSpeechTrack(track)
    return
  }

  if (!track.url) {
    advance()
    return
  }

  const el = ensureAudio()
  el.playbackRate = rate
  el.src = track.url
  playing = true
  emit()
  const p = el.play()
  if (p?.catch) {
    p.catch(() => {
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
  playCurrent()
}

/**
 * @param {Array<{ id?: string, url?: string, text?: string, lang?: string, title: string, subtitle?: string, cardId?: string, kind?: string }>} tracks
 * @param {{ loop?: boolean, rate?: number, startIndex?: number }} [options]
 */
export function startPlaylist(tracks, options = {}) {
  stop()
  playlist = (tracks || []).filter((t) => t?.url || t?.text)
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
  cancelSpeech()
  const el = ensureAudio()
  el.pause()
  playing = false
  emit()
}

export function resume() {
  if (!playlist.length) return
  const track = playlist[cursor]
  if (track?.text && !track.url) {
    playSpeechTrack(track)
    return
  }
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
  cancelSpeech()
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
  cancelSpeech()
  if (audio) audio.pause()
  cursor = (cursor + 1) % playlist.length
  playCurrent()
}

export function previous() {
  if (!playlist.length) return
  cancelSpeech()
  if (audio) audio.pause()
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

/**
 * Build playlist tracks for cards.
 * Japanese + Chinese use prebuilt Neural MP3s (lock-screen friendly).
 * @param {object[]} cards
 * @param {{
 *   playWord?: boolean,
 *   playExample?: boolean,
 *   playMeaning?: boolean,
 *   playExampleMeaning?: boolean,
 * }} [options]
 */
export function buildCardTracks(cards, options = {}) {
  const {
    playWord = true,
    playExample = true,
    playMeaning = false,
    playExampleMeaning = false,
  } = options
  const base = import.meta.env.BASE_URL || './'
  const tracks = []

  for (const card of cards || []) {
    if (!card?.id) continue

    if (playWord) {
      tracks.push({
        id: `${card.id}-word`,
        cardId: card.id,
        kind: 'word',
        url: `${base}audio/${card.id}-word.mp3`,
        title: card.word,
        subtitle: card.reading ? `${card.reading} · 單字` : '單字',
      })
    }

    if (playMeaning && card.meaning) {
      tracks.push({
        id: `${card.id}-meaning`,
        cardId: card.id,
        kind: 'meaning',
        url: `${base}audio/${card.id}-meaning.mp3`,
        title: card.word,
        subtitle: '詞義解釋',
      })
    }

    if (playExample && card.example) {
      tracks.push({
        id: `${card.id}-example`,
        cardId: card.id,
        kind: 'example',
        url: `${base}audio/${card.id}-example.mp3`,
        title: card.word,
        subtitle: '例句',
      })
    }

    if (playExampleMeaning && card.exampleMeaning) {
      tracks.push({
        id: `${card.id}-example-meaning`,
        cardId: card.id,
        kind: 'exampleMeaning',
        url: `${base}audio/${card.id}-example-meaning.mp3`,
        title: card.word,
        subtitle: '例句解釋',
      })
    }
  }

  return tracks
}

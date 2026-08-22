import { stopPlaylist } from './playlistPlayer'
import { AUDIO_CACHE_VERSION } from '../data/config'
import { speechTextForCard as buildSpeechText } from './speechText'

let preferredVoice = null
let audioEl = null
let objectUrl = null

const VOICE_PREFERENCE = [
  /kyoko/i,
  /otoya/i,
  /google.*(日本|japanese)|日本語.*google/i,
  /microsoft.*(haruka|ichiro|ayumi|nanami)/i,
  /siri.*japanese|japanese.*siri/i,
  /^ja[-_]?JP/i,
]

function scoreVoice(voice) {
  const label = `${voice.name} ${voice.lang}`
  if (!/^ja/i.test(voice.lang) && !/japan/i.test(label)) return -1
  const pref = VOICE_PREFERENCE.findIndex((re) => re.test(label))
  let score = pref === -1 ? 10 : pref
  if (voice.localService) score -= 0.5
  return score
}

export function listJapaneseVoices() {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  return voices
    .filter((v) => scoreVoice(v) >= 0)
    .sort((a, b) => scoreVoice(a) - scoreVoice(b))
}

function pickJapaneseVoice(preferredName) {
  const voices = listJapaneseVoices()
  if (!voices.length) {
    preferredVoice = null
    return null
  }
  if (preferredName) {
    const named = voices.find((v) => v.name === preferredName)
    if (named) {
      preferredVoice = named
      return named
    }
  }
  preferredVoice = voices[0]
  return preferredVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickJapaneseVoice()
  window.speechSynthesis.addEventListener('voiceschanged', () => pickJapaneseVoice())
}

function stopAudio() {
  if (audioEl) {
    audioEl.pause()
    audioEl.removeAttribute('src')
    audioEl.load?.()
    audioEl = null
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  window.speechSynthesis?.cancel?.()
}

/** Prefer speaking kana/reading for clearer Japanese TTS */
export function speechTextForCard(card, { flipped = false } = {}) {
  return buildSpeechText(card, { flipped })
}

export function audioClipForCard(card, { flipped = false } = {}) {
  if (!card?.id) return null
  const kind = flipped ? 'example' : 'word'
  // Vite base is './' — resolve relative to site root
  const base = import.meta.env.BASE_URL || './'
  return `${base}audio/${card.id}-${kind}.mp3?v=${AUDIO_CACHE_VERSION}`
}

function speakWithWebSpeech(text, options = {}) {
  if (!window.speechSynthesis) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = options.rate ?? 0.88
  utterance.pitch = options.pitch ?? 1.05
  utterance.volume = 1
  const voice = pickJapaneseVoice(options.voiceName) || preferredVoice
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}

function playUrl(url, onFail) {
  stopAudio()
  audioEl = new Audio(url)
  audioEl.preload = 'auto'
  const fail = () => {
    audioEl?.removeEventListener?.('error', fail)
    onFail?.()
  }
  audioEl.addEventListener('error', fail)
  const playPromise = audioEl.play()
  if (playPromise?.catch) {
    playPromise.catch(() => fail())
  }
}

/**
 * Speak Japanese:
 * - natural: Neural MP3 clips (Nanami) when available — clearly different from system voice
 * - system: device speechSynthesis only
 */
export function speakJapanese(text, options = {}) {
  if (typeof window === 'undefined') return Promise.resolve({ engine: 'none' })

  // Single-clip speak should not fight the loop player
  try {
    stopPlaylist()
  } catch {
    /* playlist module optional during init */
  }

  const cleaned = String(text || '').trim()
  const clipUrl = options.clipUrl
  const onEngine = options.onEngine

  stopAudio()

  if (options.engine === 'system') {
    if (cleaned) speakWithWebSpeech(cleaned, options)
    onEngine?.('system')
    return Promise.resolve({ engine: 'system' })
  }

  // Prefer prebuilt Neural clip — text is fallback only when the clip fails
  if (clipUrl) {
    return new Promise((resolve) => {
      let settled = false
      const done = (engine) => {
        if (settled) return
        settled = true
        onEngine?.(engine)
        resolve({ engine })
      }

      stopAudio()
      audioEl = new Audio(clipUrl)
      audioEl.preload = 'auto'
      if (typeof options.rate === 'number') {
        audioEl.playbackRate = Math.min(1.25, Math.max(0.7, options.rate / 0.88))
      }

      const fallbackToSystem = () => {
        if (settled) return
        if (cleaned) speakWithWebSpeech(cleaned, options)
        done('system')
      }

      audioEl.addEventListener('playing', () => done('neural'), { once: true })
      audioEl.addEventListener('error', fallbackToSystem, { once: true })
      audioEl.play().catch(fallbackToSystem)
    })
  }

  if (cleaned) {
    speakWithWebSpeech(cleaned, options)
    onEngine?.('system')
    return Promise.resolve({ engine: 'system' })
  }

  onEngine?.('none')
  return Promise.resolve({ engine: 'none' })
}

export function stopSpeaking() {
  stopAudio()
  try {
    stopPlaylist()
  } catch {
    /* ignore */
  }
}

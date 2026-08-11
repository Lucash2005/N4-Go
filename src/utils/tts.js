let preferredVoice = null
let audioEl = null

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
  // Prefer local / premium sounding voices when available
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
    audioEl.src = ''
    audioEl = null
  }
  window.speechSynthesis?.cancel?.()
}

/** Prefer speaking kana/reading for clearer Japanese TTS */
export function speechTextForCard(card, { flipped = false } = {}) {
  if (!card) return ''
  if (flipped) {
    // Prefer example; if it looks hard, still OK — sentence context helps TTS
    return card.example || card.reading || card.word
  }
  // Front: use hiragana/katakana reading when available (much clearer than kanji)
  if (card.reading && card.reading !== card.word) return card.reading
  return card.word
}

function googleTtsUrl(text) {
  const q = encodeURIComponent(text.slice(0, 180))
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${q}`
}

function speakWithWebSpeech(text, options = {}) {
  if (!window.speechSynthesis) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  // Slightly slower + natural pitch reads more human on mobile voices
  utterance.rate = options.rate ?? 0.88
  utterance.pitch = options.pitch ?? 1.05
  utterance.volume = 1
  const voice = pickJapaneseVoice(options.voiceName) || preferredVoice
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}

/**
 * Speak Japanese with a more natural pipeline:
 * 1) Google Translate TTS audio (often closer to human)
 * 2) Fall back to best available system Japanese voice
 */
export function speakJapanese(text, options = {}) {
  if (!text || typeof window === 'undefined') return
  const cleaned = String(text).trim()
  if (!cleaned) return

  stopAudio()

  // Web Speech only mode (user preference / offline)
  if (options.engine === 'system') {
    speakWithWebSpeech(cleaned, options)
    return
  }

  try {
    audioEl = new Audio(googleTtsUrl(cleaned))
    audioEl.preload = 'auto'
    const playPromise = audioEl.play()
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {
        speakWithWebSpeech(cleaned, options)
      })
    }
    audioEl.onerror = () => speakWithWebSpeech(cleaned, options)
  } catch {
    speakWithWebSpeech(cleaned, options)
  }
}

export function stopSpeaking() {
  stopAudio()
}

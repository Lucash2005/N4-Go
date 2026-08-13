export function speakEnglish(text, { rate = 0.95 } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const cleaned = String(text || '').trim()
  if (!cleaned) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(cleaned)
  u.lang = 'en-US'
  u.rate = rate
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find((v) => /en-US/i.test(v.lang) && /neural|natural|samantha|aria|jenny/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang))
  if (preferred) u.voice = preferred
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel?.()
}

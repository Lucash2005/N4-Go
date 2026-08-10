let preferredVoice = null

function pickJapaneseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  preferredVoice =
    voices.find((v) => v.lang === 'ja-JP') ||
    voices.find((v) => v.lang?.startsWith('ja')) ||
    null
  return preferredVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickJapaneseVoice()
  window.speechSynthesis.addEventListener('voiceschanged', pickJapaneseVoice)
}

export function speakJapanese(text) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  const voice = preferredVoice || pickJapaneseVoice()
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

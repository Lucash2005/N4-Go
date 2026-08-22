/**
 * Normalize card reading / surface for TTS.
 * Avoid speaking meta labels like「（終わり）」「（感）」or slash alternatives twice.
 */
export function readingForSpeech(reading = '', word = '') {
  let text = String(reading || '').trim()
  if (!text) return String(word || '').trim()

  // Meta placeholders: （感）（副）（終わり）など
  if (/^[（(]/.test(text) || /[）)]$/.test(text)) {
    return String(word || '').trim() || text.replace(/[（）()]/g, '')
  }

  // Broken fragments like「（1000」
  if (/[（(]/.test(text) && !/[）)]/.test(text)) {
    return String(word || '').trim() || text.replace(/[（(]/g, '')
  }

  // Prefer the first reading when alternatives are listed
  if (text.includes('/') || text.includes('／')) {
    text = text.split(/[/／]/)[0].trim()
  }

  return text || String(word || '').trim()
}

export function speechTextForCard(card, { flipped = false } = {}) {
  if (!card) return ''
  if (card.type === 'form') {
    const drill = card.formDrill
    if (flipped) return drill?.answerReading || card.meaning || card.word
    return drill?.reading || card.reading || card.word
  }
  if (flipped) return card.example || readingForSpeech(card.reading, card.word) || card.word
  return readingForSpeech(card.reading, card.word) || card.word
}

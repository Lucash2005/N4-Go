/**
 * Runtime helpers for kanji ↔ kana practice on flashcards.
 * Prefers card.kanji when present (sense-checked at build time).
 */

const KANJI_RE = /[\u4e00-\u9fff々〆ヵヶ]/

export function hasKanji(text = '') {
  return KANJI_RE.test(String(text || ''))
}

export function isKatakanaOnly(text = '') {
  return /^[\u30a0-\u30ffー]+$/.test(String(text || '').trim())
}

/** @returns {{ kanji: string, kana: string }} */
export function scriptFormsForCard(card = {}) {
  const word = String(card?.word || '').trim()
  const reading = String(card?.reading || '').trim() || word
  const kana = reading
  if (card?.kanji && hasKanji(card.kanji)) {
    return { kanji: String(card.kanji).trim(), kana }
  }
  if (hasKanji(word)) return { kanji: word, kana }
  return { kanji: '', kana }
}

/**
 * Front prompt text for writing practice.
 * @param {'auto'|'kanji'|'kana'} mode
 */
export function frontPromptForCard(card, mode = 'auto') {
  const { kanji, kana } = scriptFormsForCard(card)
  if (mode === 'kana' && kana) return kana
  if (mode === 'kanji' && kanji) return kanji
  return card?.word || kana || ''
}

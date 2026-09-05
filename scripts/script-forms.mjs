/**
 * Sense-safe kanji ↔ kana helpers for vocab cards.
 * Never assign kanji from reading alone (homophones like うかがう/窺う vs 伺う).
 * Prefer: headword kanji → override.kanji → extract from this card's exampleFurigana.
 */

const KANJI_RE = /[\u4e00-\u9fff々〆ヵヶ]/
const KATAKANA_RE = /^[\u30a0-\u30ffー]+$/

/** Parse exampleFurigana into segments: { surface, reading? } */
export function parseFuriganaSegments(annotated = '') {
  const s = String(annotated || '')
  const out = []
  const re = /([\u4e00-\u9fff々〆ヵヶ]+)\(([^\)]+)\)|([\u4e00-\u9fff々〆ヵヶ]+)\[([^\]]+)\]|([^[\u4e00-\u9fff々〆ヵヶ\[]+|[\u4e00-\u9fff々〆ヵヶ]+)/gu
  // Support both 漢字[よみ] and leftover plain text
  const re2 = /([\u4e00-\u9fff々〆ヵヶ]+)\[([^\]]+)\]|([\u4e00-\u9fff々〆ヵヶ]+)|([^\u4e00-\u9fff々〆ヵヶ\[]+)/gu
  let m
  while ((m = re2.exec(s))) {
    if (m[1] && m[2] != null) out.push({ surface: m[1], reading: m[2] })
    else if (m[3]) out.push({ surface: m[3], reading: '' })
    else if (m[4]) out.push({ surface: m[4], reading: m[4] })
  }
  return out
}

/**
 * If the headword reading appears as annotated kanji + okurigana in the example,
 * rebuild the kanji writing (e.g. 伺[うかが]う → 伺う for うかがう).
 */
function stripNonKana(text = '') {
  return String(text || '').replace(/[^\u3040-\u309f\u30a0-\u30ffー]/g, '')
}

export function extractKanjiFromExampleFurigana(exampleFurigana = '', reading = '', word = '') {
  const kana = stripNonKana(reading || word || '')
  if (!kana || KANJI_RE.test(word) || KATAKANA_RE.test(word)) return ''

  const segs = parseFuriganaSegments(exampleFurigana)
  if (!segs.length) return ''

  for (let i = 0; i < segs.length; i += 1) {
    let readingAcc = ''
    let surfaceAcc = ''
    let sawKanji = false
    for (let j = i; j < segs.length; j += 1) {
      const seg = segs[j]
      const raw = seg.reading || (KANJI_RE.test(seg.surface) ? '' : seg.surface)
      const r = stripNonKana(raw)
      // Skip pure punctuation/latin segments between words
      if (!r && !KANJI_RE.test(seg.surface)) {
        if (sawKanji && readingAcc === kana) return surfaceAcc
        if (sawKanji) break
        continue
      }
      if (!r && KANJI_RE.test(seg.surface)) break
      readingAcc += r
      // Only keep kana/kanji in reconstructed writing (drop trailing 。！ etc.)
      surfaceAcc += String(seg.surface).replace(/[。．.！!？?\s]/g, '')
      if (KANJI_RE.test(seg.surface)) sawKanji = true
      if (readingAcc === kana && sawKanji) return surfaceAcc
      if (readingAcc.length > kana.length) break
    }
  }
  return ''
}

export function hasKanji(text = '') {
  return KANJI_RE.test(text)
}

export function isKatakanaOnly(text = '') {
  return KATAKANA_RE.test(String(text || '').trim())
}

/**
 * Resolve display forms for a card.
 * @returns {{ kanji: string, kana: string }}
 */
export function resolveScriptForms(card = {}, overrideKanji = '') {
  const word = String(card.word || '').trim()
  const reading = String(card.reading || '').trim() || word
  const kana = reading

  if (overrideKanji && hasKanji(overrideKanji)) {
    return { kanji: overrideKanji, kana }
  }
  if (card.kanji && hasKanji(card.kanji)) {
    return { kanji: String(card.kanji).trim(), kana }
  }
  if (hasKanji(word)) {
    return { kanji: word, kana }
  }
  // Kana headword: only trust this card's own annotated example (sense-safe).
  const fromEx = extractKanjiFromExampleFurigana(
    card.exampleFurigana || '',
    reading,
    word,
  )
  if (fromEx) return { kanji: fromEx, kana }
  return { kanji: '', kana }
}

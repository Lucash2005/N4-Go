/** Gloss is primarily Chinese (not an English Jisho dump). */
export function isChineseGloss(text = '') {
  if (!text?.trim()) return false
  if (!/[\u4e00-\u9fff]/.test(text)) return false
  const ascii = [...text].filter((ch) => ch.charCodeAt(0) < 128).length
  return ascii / text.length < 0.35
}

/** Split gloss into short display lines (max parts, trim length). */
export function compactGlossLines(text = '', maxParts = 2, maxChars = 28) {
  if (!text?.trim()) return []
  const parts = text
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.slice(0, maxParts).map((p) => (p.length > maxChars ? `${p.slice(0, maxChars)}…` : p))
}

/** First N Chinese gloss lines from card senses for compact display. */
export function compactSenseGlosses(senses = [], max = 2) {
  const lines = []
  for (const sense of senses) {
    if (!isChineseGloss(sense.meaning)) continue
    for (const line of compactGlossLines(sense.meaning, 3, 32)) {
      if (lines.length >= max) return lines
      if (!lines.includes(line)) lines.push(line)
    }
  }
  return lines
}

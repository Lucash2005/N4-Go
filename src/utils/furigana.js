/**
 * Parse annotated Japanese like:
 *   来月[らいげつ]、日本[にほん]へ旅行[りょこう]します。
 * into segments for ruby rendering. Only kanji groups get readings.
 */
export function parseFurigana(annotated = '') {
  if (!annotated) return []
  const segments = []
  const re = /([\u4e00-\u9fff々〆ヵヶ]+(?:々)?)\[([^\]]+)\]|([^[\u4e00-\u9fff]+|[\u4e00-\u9fff々〆ヵヶ]+(?!\[))/gu
  let match
  while ((match = re.exec(annotated)) !== null) {
    if (match[1] && match[2]) {
      segments.push({ text: match[1], reading: match[2] })
    } else if (match[3]) {
      segments.push({ text: match[3] })
    }
  }
  // Fallback: if nothing parsed, show raw text
  if (!segments.length && annotated) {
    segments.push({ text: annotated })
  }
  return segments
}

export function stripFurigana(annotated = '') {
  return annotated.replace(/\[([^\]]+)\]/g, '')
}

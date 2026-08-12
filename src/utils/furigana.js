/**
 * Parse annotated Japanese like:
 *   来月[らいげつ]、日本[にほん]へ旅行[りょこう]します。
 *   二つ[ふたつ]の写真[しゃしん]を比[くら]べてください。
 * into segments for ruby rendering.
 */
export function parseFurigana(annotated = '') {
  if (!annotated) return []

  const segments = []
  let index = 0

  while (index < annotated.length) {
    const bracketStart = annotated.indexOf('[', index)
    if (bracketStart === -1) {
      segments.push({ text: annotated.slice(index) })
      break
    }

    const bracketEnd = annotated.indexOf(']', bracketStart)
    if (bracketEnd === -1) {
      segments.push({ text: annotated.slice(index) })
      break
    }

    const surfaceStart = findSurfaceStart(annotated, bracketStart, index)
    if (surfaceStart > index) {
      segments.push({ text: annotated.slice(index, surfaceStart) })
    }

    segments.push({
      text: annotated.slice(surfaceStart, bracketStart),
      reading: annotated.slice(bracketStart + 1, bracketEnd),
    })

    index = bracketEnd + 1
  }

  if (!segments.length && annotated) {
    segments.push({ text: annotated })
  }

  return segments
}

/** @param {string} text @param {number} bracketIndex @param {number} minIndex */
function findSurfaceStart(text, bracketIndex, minIndex) {
  let pos = bracketIndex - 1
  if (pos < minIndex) return bracketIndex

  while (pos >= minIndex && isKana(text[pos])) {
    pos -= 1
  }

  while (pos >= minIndex && isKanji(text[pos])) {
    pos -= 1
  }

  if (pos >= minIndex && isKana(text[pos]) && isHonorificPrefix(text, pos)) {
    while (pos >= minIndex && isKana(text[pos])) {
      pos -= 1
    }
  }

  return pos + 1
}

function isHonorificPrefix(text, index) {
  return /^[おご御]/.test(text[index])
}

function isKanji(char) {
  return /[\u4e00-\u9fff々〆ヵヶ]/.test(char)
}

function isKana(char) {
  return /[\u3040-\u309f\u30a0-\u30ff]/.test(char)
}

export function stripFurigana(annotated = '') {
  return annotated.replace(/\[([^\]]+)\]/g, '')
}

/** Japanese pronunciation helpers: normalize + compare speech-to-text. */

const KATA_TO_HIRA_OFFSET = 0x3041 - 0x30a1

export function toHiragana(text = '') {
  return String(text)
    .normalize('NFKC')
    .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + KATA_TO_HIRA_OFFSET))
    .replace(/[ー・\s'".,!?。、！？]/g, '')
    .toLowerCase()
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export function scorePronunciation(heard, card) {
  const got = toHiragana(heard)
  if (!got) return { ok: false, level: 'none', score: 0, heard: '' }

  const targets = [card.reading, card.word, card.reading?.replace(/する$/, '')]
    .filter(Boolean)
    .map(toHiragana)

  let best = 0
  for (const t of targets) {
    if (!t) continue
    if (got === t || got.includes(t) || t.includes(got)) {
      best = 100
      break
    }
    const dist = levenshtein(got, t)
    const sim = Math.round((1 - dist / Math.max(t.length, got.length)) * 100)
    if (sim > best) best = sim
  }

  let level = 'far'
  if (best >= 88) level = 'good'
  else if (best >= 65) level = 'close'

  return { ok: level === 'good', level, score: best, heard: got }
}

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * Short Chinese grammar gloss under flashcard examples.
 * Heuristic (no parser): particles, connectives, polite endings, headword role.
 */

const ENDING_HINTS = [
  [/ないでください[。．]?$/, '〜ないでください＝請不要…'],
  [/てください[。．]?$/, '〜てください＝請…（依頼）'],
  [/なければなりません[。．]?$/, '〜なければならない＝必須'],
  [/なくてもいいです[。．]?$/, '〜なくてもいい＝不必'],
  [/ています[。．]?$/, '〜ている＝進行／狀態（丁寧）'],
  [/ていました[。．]?$/, '〜ていた＝過去進行／狀態（丁寧）'],
  [/てきました[。．]?$/, '〜てくる＝靠近／變化到現在（丁寧過去）'],
  [/てきます[。．]?$/, '〜てくる＝靠近／變化到現在'],
  [/ていきました[。．]?$/, '〜ていく＝離開／持續下去（丁寧過去）'],
  [/ていきます[。．]?$/, '〜ていく＝離開／持續下去'],
  [/ました[。．]?$/, '丁寧過去（〜ました）'],
  [/ません[。．]?$/, '丁寧否定（〜ません）'],
  [/ます[。．]?$/, '丁寧現在／未來（〜ます）'],
  [/でした[。．]?$/, '丁寧過去断定（〜でした）'],
  [/じゃないです[。．]?$/, '丁寧否定断定'],
  [/です[。．]?$/, '丁寧断定（〜です）'],
  [/だ[。．]?$/, '普通形断定（〜だ）'],
]

const CONNECTIVE_HINTS = [
  [/だから/, 'だから＝所以（接續詞）'],
  [/ですから/, 'ですから＝所以（丁寧）'],
  [/しかし|でも|けれど/, '逆接（但是）'],
  [/そして|それから/, '添加／然後'],
  [/すると/, 'すると＝於是'],
]

const SIGNAL_HINTS = [
  [/たら[、，]/, '〜たら＝條件／之後'],
  [/ので[、，]/, 'ので＝因為（較柔）'],
  [/のに[、，]/, 'のに＝卻／明明'],
  [/から[、，。．]/, 'から＝原因／起點'],
  [/について/, 'について＝關於…'],
  [/として/, 'として＝作為…'],
  [/ながら/, 'ながら＝一邊…一邊'],
]

function uniqueKeepOrder(items) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

function resolveHeadwordHit(example, card) {
  if (!example || !card) return null
  const candidates = [card.word, card.kanji, card.reading].filter(Boolean)
  for (const w of candidates) {
    const i = example.indexOf(w)
    if (i >= 0) return { index: i, surface: w }
  }
  // Common conjugation stubs for reported / N4 verbs
  const stubs = []
  if (card.kanji === '構う' || card.word === 'かまう') stubs.push('構わ', 'かまわ', '構い', 'かまい')
  if (card.word === 'すっと') stubs.push('すっと')
  if (card.word === 'お祝い' || card.kanji === 'お祝い') stubs.push('お祝い', 'おいわい')
  for (const w of stubs) {
    const i = example.indexOf(w)
    if (i >= 0) return { index: i, surface: w }
  }
  return null
}

function headwordRole(example, card) {
  const hit = resolveHeadwordHit(example, card)
  if (!hit) return ''
  const { index: i, surface } = hit
  const label = card.word || surface
  const before = example.slice(Math.max(0, i - 2), i)
  const after = example.slice(i + surface.length, i + surface.length + 4)

  if (label === 'だから' || surface === 'だから') return '「だから」連接前後句（所以）'
  if (/を\s*$/.test(before) || after.startsWith('を')) return `「${label}」為動作對象（を）`
  if (/が\s*$/.test(before)) return `「${label}」為主語／對象（が）`
  if (/は\s*$/.test(before)) return `「${label}」為主題（は）`
  if (/に\s*$/.test(before)) return `「${label}」為目標／時間點（に）`
  if (/で\s*$/.test(before)) return `「${label}」為場所／手段（で）`
  if (/の\s*$/.test(before) || after.startsWith('の')) return `「${label}」修飾／所屬（の）`
  if (after.startsWith('ない') || after.startsWith('なか')) return `「${label}」否定形（〜ない）`
  if (after.startsWith('する') || after.startsWith('し')) return `「${label}」＋する（サ變）`
  if (/です|だ|でした/.test(after)) return `「${label}」作述語`
  return `本句使用「${label}」`
}

/**
 * @param {string} example
 * @param {{ word?: string, reading?: string, kanji?: string, exampleAnalysis?: string } | null} card
 * @returns {string}
 */
export function briefExampleGrammar(example, card = null) {
  if (card?.exampleAnalysis) return String(card.exampleAnalysis).trim()
  const text = String(example || '').trim()
  if (!text || /例句準備中/.test(text)) return ''

  const bits = []
  const role = headwordRole(text, card)
  if (role) bits.push(role)

  for (const [re, hint] of CONNECTIVE_HINTS) {
    if (re.test(text)) bits.push(hint)
  }
  for (const [re, hint] of ENDING_HINTS) {
    if (re.test(text)) {
      bits.push(hint)
      break
    }
  }
  for (const [re, hint] of SIGNAL_HINTS) {
    if (bits.length >= 4) break
    if (re.test(text)) bits.push(hint)
  }

  return uniqueKeepOrder(bits).slice(0, 4).join(' · ')
}

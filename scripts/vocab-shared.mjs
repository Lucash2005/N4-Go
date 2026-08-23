import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export const TARGET_VOCAB = 1500

export function makeKey(word = '', reading = '') {
  const w = (word || '').trim()
  const r = (reading || '').trim() || w
  return `${w}\0${r}`
}

export function isKana(text = '') {
  return /^[\u3040-\u309f\u30a0-\u30ffー・]+$/.test(text.trim())
}

export function isMostlyAscii(text = '') {
  if (!text) return false
  const ascii = [...text].filter((ch) => ch.charCodeAt(0) < 128).length
  return ascii / text.length > 0.55
}

export function isExampleValidForCard(example = '', word = '', reading = '') {
  if (!example) return false
  if (isTrivialExample(example, word, reading)) return false

  // 常見假名 ↔ 漢字（例句常用漢字形）
  const kanaKanji = {
    しょうゆ: ['醤油', 'しょうゆ'],
    はく: ['履', 'はく', '靴', 'ズボン', 'パンツ'],
    あびる: ['浴び', 'あび', 'シャワー'],
    かっこう: ['格好', 'かっこ'],
    かまう: ['構', '構う', '構っ'],
    ねだん: ['値段', 'ねだん'],
    とこや: ['床屋', 'とこや'],
    うかがう: ['伺', 'うかが'],
    しかる: ['叱'],
    たて: ['たて', '縦'],
    いただく: ['頂', 'いただ'],
    ごらんになる: ['ごらん', '御覧'],
    より: ['より'],
    ほう: ['ほう', '方'],
    すく: ['空', '空く', '空い'],
    もうす: ['申', '申し'],
    わかす: ['沸', '沸か'],
  }
  const keys = [
    word,
    ...String(word || '').split(/[/／、,，]/),
    ...(String(reading || '').split(/[/／]/)),
  ]
    .map((k) => k.trim())
    .filter(Boolean)
  for (const key of keys) {
    const alts = kanaKanji[key]
    if (alts?.some((k) => example.includes(k))) return true
  }

  // Only when headword itself is short kana (ちゃん ≠ ちゃんと)
  if (word && isKana(word) && word.length <= 3) {
    if (hasShortKanaMatch(example, word)) return true
    for (const part of String(reading || '').split(/[/／]/)) {
      const r = part.trim()
      if (r && hasShortKanaMatch(example, r)) return true
    }
    if (word.length <= 2) return false
  }

  if (reading && example.includes(reading)) return true

  // Alternate readings (じゃ/じゃあ)
  for (const part of String(reading || '').split(/[/／]/)) {
    const r = part.trim()
    if (r && example.includes(r)) return true
  }

  if (word && example.includes(word)) {
    // 短漢字如「足」嵌在「満足」等複合詞且讀音不在例句 → 不匹配
    if (
      word.length <= 2 &&
      /[\u4e00-\u9fff]/.test(word) &&
      reading &&
      !example.includes(reading)
    ) {
      if (hasStandaloneKanjiUse(example, word)) return true
      // 允許複合詞尾：夕御飯、電話番号
      const idx = example.indexOf(word)
      const after = example[idx + word.length]
      if (idx >= 0 && (!after || !/[\u4e00-\u9fff]/.test(after))) return true
      return false
    }
    return true
  }

  return containsWordOrReading(example, word, reading)
}

/** Example is only the headword (e.g. 近い。 / 旅行。) — not a real sentence. */
export function isTrivialExample(example = '', word = '', reading = '') {
  const plain = String(example)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[。．.！!？?\s]/g, '')
    .trim()
  if (!plain) return true
  if (word && plain === word) {
    // Allow set phrases used as full examples (こんにちは。／すみません。)
    if (/^(こんにちは|すみません|ありがとう|おはよう|こんばんは|さようなら)$/.test(word)) {
      return false
    }
    return true
  }
  if (reading && plain === reading) return true
  return false
}

/**
 * Short kana match that is not a prefix of a longer kana word.
 * さくらちゃんは → OK；ちゃんと → reject for ちゃん.
 */
function hasShortKanaMatch(example = '', token = '') {
  if (!token || !example.includes(token)) return false
  const grammarAfter =
    /^(は|が|を|に|で|も|へ|や|か|ね|よ|な|の|から|まで|より|です|だ|でした|ます|ました|、|。|！|？|$)/
  let idx = 0
  while ((idx = example.indexOf(token, idx)) !== -1) {
    const rest = example.slice(idx + token.length)
    if (!rest || !/^[\u3040-\u309f\u30a0-\u30ffー]/.test(rest) || grammarAfter.test(rest)) {
      return true
    }
    if (/^(する|した|して|します|しました|こと|ください|下さい)/.test(rest)) return true
    // 「と」後面接助詞／漢字可；「と」後接假名多半是另一詞（ちゃんと）
    if (/^と([^\u3040-\u309f\u30a0-\u30ffー]|た|して|いう)/.test(rest)) return true
    idx += 1
  }
  return false
}

/** Word not glued to a kanji on the left (rejects 満足 for 足; allows 毎日話す・右の足). */
function hasStandaloneKanjiUse(example = '', word = '') {
  // Verb/adj with okurigana (決める・近い) — full surface match is enough
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(word) && example.includes(word)) return true
  const kanji = /[\u4e00-\u9fff]/
  let idx = 0
  while ((idx = example.indexOf(word, idx)) !== -1) {
    const before = idx > 0 ? example[idx - 1] : ''
    if (!kanji.test(before)) return true
    idx += 1
  }
  return false
}

export function hasChinese(text = '') {
  return /[\u4e00-\u9fff]/.test(text)
}

export function containsWordOrReading(example = '', word = '', reading = '') {
  if (!example) return false
  if (word && example.includes(word)) return true
  if (reading && reading !== word && example.includes(reading)) return true
  // する動詞：拝見する → 拝見します
  if (word && word.endsWith('する')) {
    const stem = word.slice(0, -2)
    if (stem && (example.includes(`${stem}し`) || example.includes(`${stem}する`))) return true
  }
  if (reading && reading.endsWith('する')) {
    const stem = reading.slice(0, -2)
    if (stem && example.includes(`${stem}し`)) return true
  }
  const stem = (reading || word || '').replace(/する$/, '').replace(/る$/, '')
  if (stem.length >= 2 && example.includes(stem)) return true
  if (word && /[\u4e00-\u9fff]/.test(word)) {
    const kanjiStem = word.replace(/する$/, '').replace(/る$/, '')
    if (kanjiStem.length >= 1 && example.includes(kanjiStem)) return true
  }
  // Kana headword ↔ kanji form with same reading stem (楽む ↔ 楽しむ)
  if (reading && reading.includes('たのし') && /楽し/.test(example)) return true
  if (reading && reading.includes('みる') && /見[るれ]?/.test(example)) return true
  return false
}

export function annotateHeadword(example, word, reading) {
  if (!example || !word || !example.includes(word)) return example || ''
  if (!reading || reading === word || !/[\u4e00-\u9fff]/.test(word)) return example
  if (example.includes(`${word}[`)) return example
  return example.replace(word, `${word}[${reading}]`, 1)
}

export function inferCategory(word, meaningEn, meaningZh) {
  const blob = `${word} ${meaningEn} ${meaningZh}`.toLowerCase()
  const pairs = [
    ['外來語', /[ァ-ヶー]{3,}|loan|english|america|asia/],
    ['敬語', /humble|respectful|honorable|polite|謙|敬/],
    ['時間', /day|week|month|year|time|morning|night|hour|clock|週|時|午/],
    ['場所', /place|station|school|park|shop|store|hospital|bank|駅|学校/],
    ['食物', /eat|food|drink|rice|bread|meat|fish|tea|coffee|食|飲/],
    ['動作', /^to |verb|する/],
    ['形容', /adjective|い$|な$|beautiful|big|small|形/],
    ['學習', /study|school|book|exam|class|勉強|試験/],
    ['自然', /weather|rain|wind|tree|flower|mountain|sea|雨|風/],
    ['生活', /family|home|house|work|job|life|家|仕事/],
  ]
  for (const [cat, pat] of pairs) {
    if (pat.test(blob)) return cat
  }
  if (/^[ァ-ヶー]+$/.test(word || '')) return '外來語'
  if ((meaningEn || '').toLowerCase().startsWith('to ')) return '動作'
  return '生活'
}

let glossaryCache = null

export function loadGlossary() {
  if (glossaryCache) return glossaryCache
  const path = join(ROOT, 'scripts/zh-glossary.json')
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const map = new Map()
  for (const [en, zh] of Object.entries(raw)) {
    map.set(en.toLowerCase().trim(), zh)
  }
  glossaryCache = map
  return map
}

export function cleanEnGloss(text = '') {
  let t = (text || '').trim()
  t = t.replace(/^\(n\)\s*/i, '')
  t = t.replace(/\s*\([^)]*:\s*[^)]+\)\s*/gi, ' ')
  t = t.replace(/\s*\(n\)\s*/gi, ' ')
  return t.trim()
}

export function translateEnGloss(en = '', glossary = loadGlossary()) {
  const src = cleanEnGloss(en)
  if (!src) return ''
  const lower = src.toLowerCase()
  if (glossary.has(lower)) return glossary.get(lower)

  const bare = lower.replace(/^to /, '').trim()
  if (bare && glossary.has(bare)) return glossary.get(bare)

  const toMatch = lower.match(/^to (.+)$/)
  if (toMatch) {
    const rest = toMatch[1]
    if (glossary.has(rest)) return glossary.get(rest)
    if (glossary.has(`to ${rest}`)) return glossary.get(`to ${rest}`)
  }

  const stripped = lower.replace(/^\(.*?\)\s*/, '').trim()
  if (glossary.has(stripped)) return glossary.get(stripped)

  return ''
}

export function translateMeanings(meanings = [], glossary = loadGlossary()) {
  const parts = []
  for (const m of meanings) {
    const zh = translateEnGloss(m, glossary)
    if (zh) parts.push(zh)
  }
  return parts
}

export function meaningEnText(meanings = []) {
  return (meanings || [])
    .map((m) => cleanEnGloss(m))
    .filter(Boolean)
    .join('; ')
}

export function detectReviewFlags(card) {
  const flags = []
  const meaning = card.meaning || ''
  const meaningEn = card.meaningEn || ''

  if (/\(n\)|\bnl:|\(nl\)/i.test(meaning)) flags.push('mt_artifact')
  if (meaningEn && meaning.trim() === meaningEn.trim()) flags.push('needs_zh')
  if (meaning && isMostlyAscii(meaning) && !/^[A-Za-z\s\-]+$/.test(meaning)) {
    // mixed — ok
  } else if (meaning && /^[A-Za-z0-9\s\(\);,\-\.]+$/.test(meaning)) {
    flags.push('needs_zh')
  }
  if (card.example && !isExampleValidForCard(card.example, card.word, card.reading)) {
    flags.push('example_mismatch')
  }
  if (card.reading && /[\u4e00-\u9fff]/.test(card.reading)) flags.push('reading_invalid')
  if (!card.level || !['N5', 'N4', '延伸'].includes(card.level)) flags.push('level_invalid')

  return [...new Set(flags)]
}

export function jsStr(value) {
  return JSON.stringify(value ?? '')
}

export function parseExistingVocab(vocabPath) {
  const text = readFileSync(vocabPath, 'utf8')
  const cards = []
  const blockRe = /\{[^{}]*id:\s*"v\d+"[^{}]*\}/g
  for (const block of text.match(blockRe) || []) {
    const field = (name) => {
      const re = new RegExp(`${name}:\\s*"((?:\\\\'|[^"])*)"`)
      const m = block.match(re)
      return m ? m[1].replace(/\\'/g, "'") : ''
    }
    const flagsMatch = block.match(/reviewFlags:\s*\[([^\]]*)\]/)
    let reviewFlags = []
    if (flagsMatch) {
      reviewFlags = [...flagsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    }
    cards.push({
      id: field('id'),
      type: 'vocab',
      word: field('word'),
      reading: field('reading'),
      meaning: field('meaning'),
      meaningEn: field('meaningEn'),
      example: field('example'),
      exampleMeaning: field('exampleMeaning'),
      exampleFurigana: field('exampleFurigana'),
      category: field('category'),
      level: field('level'),
      source: field('source') || 'openjlpt',
      reviewFlags,
    })
  }
  return cards
}

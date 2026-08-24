/**
 * Example sentence frames + OpenJLPT restore helpers.
 *
 * Source priority (highest first):
 *  1. vocab-overrides.json          → exampleSource: "override"
 *  2. OpenJLPT examples (CC BY-SA) → exampleSource: "openjlpt"
 *     (exact key, then reading / other-level kanji forms)
 *  3. Curated JLPT-style pack       → exampleSource: "jlpt"
 *  4. Safe POS frames (limited)     → exampleSource: "template"
 *  5. None                          → exampleSource: "missing" (+ reviewFlags)
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeKey, isExampleValidForCard } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPENJLPT_DIR = join(ROOT, 'data/openjlpt')
const JLPT_EXTRA_PATH = join(ROOT, 'scripts/jlpt-extra-examples.json')

/** Prefer the first writing when OpenJLPT gives 川/河 etc. */
export function primaryWriting(word = '') {
  const raw = String(word || '').trim()
  if (!raw) return raw
  return raw.split(/[/／]/)[0].replace(/\s+/g, '').trim() || raw
}

function escapeRe(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TIME_SEASON_WORDS = new Set([
  '今', '今日', '今週', '今月', '今年', '去年', '午前', '午後', '一日',
  '春', '夏', '秋', '冬', '今夜', '今朝', '昨夜', '今晩', '来週', 'さ来年', '大分',
  '毎日', '毎週', '毎月', '毎年',
])

const ADVERB_NO_PLEASE = new Set(['特に', '必ず', '急に', '近く'])

function isSuruCapable(card = {}) {
  const pos = `${card?.pos || ''} ${card?.meaningEn || ''}`.toLowerCase()
  const w = String(card?.word || '').trim()
  const r = String(card?.reading || '').trim()
  if (/suru verb/.test(pos)) return true
  if (w.endsWith('する') || r.endsWith('する')) return true
  if (/^to /.test(String(card?.meaningEn || '').trim().toLowerCase())) return true
  return false
}

/**
 * Only flag headword+します／してください when semantically unnatural.
 * 旅行します・準備してください → OK；春してください・服します → NG
 */
export function isUnnaturalHeadwordExample(example = '', card = {}) {
  const ex = String(example || '').trim()
  const w = String(card?.word || card || '').trim()
  if (!ex || !w) return false

  const pleaseRe = new RegExp(`^${escapeRe(w)}してください。$`)
  const shimasuRe = new RegExp(`^${escapeRe(w)}します。$`)

  if (pleaseRe.test(ex)) {
    if (TIME_SEASON_WORDS.has(w)) return true
    if (ADVERB_NO_PLEASE.has(w)) return true
    if (/色$/.test(w)) return true
    if (['服', '味', 'ギター', 'テキスト', '黄色'].includes(w)) return true
    if (!isSuruCapable(card)) return true
    return false
  }

  if (shimasuRe.test(ex)) {
    if (!isSuruCapable(card)) return true
    return false
  }

  return false
}

/** @deprecated use isUnnaturalHeadwordExample */
export function isLazyHeadwordExample(example = '', word = '') {
  return isUnnaturalHeadwordExample(example, { word })
}

/** Auto-generated frames that read unnaturally for this headword. */
export function isBadGeneratedExample(example = '', card = {}) {
  const ex = String(example || '').trim()
  const w = String(card?.word || '').trim()
  if (!ex || !w) return false
  if (/色$/.test(w) && new RegExp(`^${escapeRe(w)}な人です。$`).test(ex)) return true
  // Na-adj / noun boilerplate「複雑な人です」
  if (new RegExp(`^${escapeRe(w)}な人です。$`).test(ex)) return true
  if (new RegExp(`^ここは${escapeRe(w)}です。$`).test(ex)) return true
  if (/^とても.+です。$/.test(ex) && /色$/.test(w)) return true
  return false
}

/** Naive POS frames we previously generated — always rebuild these. */
export function isWeakTemplateExample(example = '', word = '') {
  const ex = String(example || '').trim()
  if (!ex) return true
  if (isUnnaturalHeadwordExample(ex, { word })) return true
  if (isBadGeneratedExample(ex, { word })) return true
  if (/[/／]/.test(ex)) return true
  if (/^もう一度[^。]{0,8}。$/.test(ex) && !/言って|聞いて|読んで|試して|確認/.test(ex)) return true
  if (/^ここに.+があります。$/.test(ex)) return true
  if (/ことができます。$/.test(ex)) return true
  if (new RegExp(`^${escapeRe(word)}があります。$`).test(ex)) return true
  if (/^とても.+です。$/.test(ex)) return true
  if (/^私の.+です。$/.test(ex) && /伯父|叔父|伯母|叔母|先輩/.test(ex)) return false
  return false
}

function readingVariants(reading = '') {
  const raw = String(reading || '').trim()
  if (!raw) return []
  return [...new Set(raw.split(/[/／]/).map((p) => p.trim()).filter(Boolean))]
}

function wordVariants(word = '') {
  const primary = primaryWriting(word)
  const parts = String(word || '')
    .split(/[/／]/)
    .map((p) => p.replace(/\s+/g, '').trim())
    .filter(Boolean)
  return [...new Set([primary, ...parts].filter(Boolean))]
}

let openJlptCache = null
let jlptExtraCache = null

export function clearOpenJlptExampleCache() {
  openJlptCache = null
  jlptExtraCache = null
}

/**
 * Load OpenJLPT example index.
 * - byKey: exact word+reading
 * - byReading: reading → entries that have examples (cross-level, kanji forms)
 */
export function loadOpenJlptExamples() {
  if (openJlptCache) return openJlptCache
  const byKey = new Map()
  const byReading = new Map()

  function addReading(reading, payload) {
    const r = String(reading || '').trim()
    if (!r || !payload.examples?.length) return
    if (!byReading.has(r)) byReading.set(r, [])
    byReading.get(r).push(payload)
  }

  for (const level of ['n5', 'n4', 'n3', 'n2']) {
    const path = join(OPENJLPT_DIR, `${level}.json`)
    if (!existsSync(path)) continue
    const items = JSON.parse(readFileSync(path, 'utf8'))
    for (const it of items) {
      const word = primaryWriting(it.word || '')
      if (!word) continue
      const examples = (it.examples || []).filter((e) => e?.ja)
      if (!examples.length) continue
      const reading = (it.reading || '').trim() || word
      const payload = {
        word,
        reading,
        examples,
        level,
        meanings: Array.isArray(it.meanings) ? it.meanings : [],
      }
      const key = makeKey(word, reading)
      if (!byKey.has(key)) byKey.set(key, payload)
      const key2 = makeKey(word, word)
      if (!byKey.has(key2)) byKey.set(key2, payload)
      addReading(reading, payload)
      if (reading !== word) addReading(word, payload)
    }
  }
  openJlptCache = { byKey, byReading }
  return openJlptCache
}

function meaningOverlapScore(card, entry) {
  const cardEn = String(card.meaningEn || '').toLowerCase()
  const cardZh = String(card.meaning || '')
  const meanings = (entry.meanings || []).join(' ').toLowerCase()
  if (!meanings) return 0
  let score = 0
  for (const token of meanings.split(/[^a-z]+/).filter((t) => t.length > 2)) {
    if (cardEn.includes(token)) score += 2
  }
  // Common JLPT sense hints (kana homophones)
  if (/wear|put on|trousers|pants|skirt|shoes|boots/.test(meanings) && /穿|履|靴|裙|褲/.test(cardZh)) {
    score += 8
  }
  if (/vomit|breathe|lie/.test(meanings) && /吐|謊|呼吸/.test(cardZh)) score += 8
  if (/enjoy/.test(meanings) && /樂|享受|楽し/.test(cardZh + card.word)) score += 6
  if (/receive|accept|eat|drink/.test(meanings) && /接受|領|吃|喝|謙/.test(cardZh)) score += 6
  if (/free time|leisure/.test(meanings) && /空閒|閒|暇/.test(cardZh)) score += 6
  if (/country|nation/.test(meanings) && /國家|國/.test(cardZh)) score += 4
  return score
}

function exampleMentionsHead(exJa, entry) {
  if (!exJa || !entry) return false
  if (entry.word && exJa.includes(entry.word)) {
    // Guard short kana: reject particle+next-mora false positives (は＋く in はくつろ)
    if (entry.word.length <= 2 && !/[\u4e00-\u9fff]/.test(entry.word)) {
      return isExampleValidForCard(exJa, entry.word, entry.reading || entry.word)
    }
    return true
  }
  if (entry.reading && entry.reading !== entry.word && exJa.includes(entry.reading)) {
    if (entry.reading.length <= 2) {
      return isExampleValidForCard(exJa, entry.word || entry.reading, entry.reading)
    }
    return true
  }
  return false
}

function pickValidExample(examples, card, entry, { loose = false } = {}) {
  const cardWord = primaryWriting(card.word)
  const cardReading = (card.reading || '').trim() || cardWord
  for (const ex of examples || []) {
    if (
      isUnnaturalHeadwordExample(ex.ja, card) ||
      isUnnaturalHeadwordExample(ex.ja, { word: entry.word, pos: entry.meanings?.join(' ') })
    ) {
      continue
    }
    const strictOk =
      isExampleValidForCard(ex.ja, cardWord, cardReading) ||
      isExampleValidForCard(ex.ja, entry.word, entry.reading)
    // Loose: allow compounds like 夕御飯 for 御飯, but not single-kanji embeds like 帝国 for 国
    const looseOk =
      loose &&
      exampleMentionsHead(ex.ja, entry) &&
      (String(entry.word).length >= 2 || strictOk)
    if (!strictOk && !looseOk) continue
    return { ja: ex.ja, en: ex.en || '', level: entry.level, source: 'openjlpt' }
  }
  return null
}

/**
 * Find a validated OpenJLPT example for a card.
 * Priority: exact word key (looser) → reading match with meaning disambiguation.
 */
export function findOpenJlptExample(card) {
  const { byKey, byReading } = loadOpenJlptExamples()
  const words = wordVariants(card.word)
  const readings = readingVariants(card.reading)
  if (!readings.length && words.length) readings.push(...words.slice(0, 1))

  // 1) Exact headword match — trust OpenJLPT pairing more (夕御飯 for 御飯)
  for (const w of words) {
    for (const r of readings) {
      const entry = byKey.get(makeKey(w, r)) || byKey.get(makeKey(w, w))
      if (!entry) continue
      // Prefer strict examples first; only then loose compounds
      const strictHit = pickValidExample(entry.examples, card, entry, { loose: false })
      if (strictHit) return strictHit
      const looseHit = pickValidExample(entry.examples, card, entry, { loose: true })
      if (looseHit) return looseHit
    }
  }

  // 2) Same reading, different writing (あびる → 浴びる) — score by meaning
  const candidates = []
  for (const r of readings) {
    for (const entry of byReading.get(r) || []) {
      const hit = pickValidExample(entry.examples, card, entry, { loose: false })
      if (!hit) {
        // Allow kana card ↔ kanji entry when readings match and example uses entry headword
        const looseHit = pickValidExample(entry.examples, card, entry, { loose: true })
        if (!looseHit) continue
        candidates.push({
          hit: looseHit,
          score: meaningOverlapScore(card, entry) + 1 / Math.max(1, entry.word.length),
          entry,
        })
        continue
      }
      candidates.push({
        hit,
        score: meaningOverlapScore(card, entry) + 10 + 1 / Math.max(1, entry.word.length),
        entry,
      })
    }
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)
  // Require some meaning signal when multiple homophones exist
  if (candidates.length > 1 && candidates[0].score < 2 && candidates[1].score >= candidates[0].score) {
    // Prefer shortest non-compound when meanings don't help
    candidates.sort((a, b) => a.entry.word.length - b.entry.word.length)
  }
  return candidates[0].hit
}

/** Curated JLPT-style examples for words OpenJLPT lacks a valid sentence for. */
export function loadJlptExtraExamples() {
  if (jlptExtraCache) return jlptExtraCache
  if (!existsSync(JLPT_EXTRA_PATH)) {
    jlptExtraCache = { byId: new Map(), byWord: new Map() }
    return jlptExtraCache
  }
  const raw = JSON.parse(readFileSync(JLPT_EXTRA_PATH, 'utf8'))
  const byId = new Map()
  const byWord = new Map()
  for (const [key, val] of Object.entries(raw || {})) {
    if (!val?.example) continue
    if (key.startsWith('v')) byId.set(key, val)
    else byWord.set(key, val)
  }
  jlptExtraCache = { byId, byWord }
  return jlptExtraCache
}

export function findJlptExtraExample(card) {
  const { byId, byWord } = loadJlptExtraExamples()
  const byIdHit = card?.id ? byId.get(card.id) : null
  if (byIdHit?.example) {
    return {
      example: byIdHit.example,
      exampleMeaning: byIdHit.exampleMeaning || '',
      exampleSource: 'jlpt',
    }
  }
  for (const w of wordVariants(card.word)) {
    const hit = byWord.get(w)
    // Curated pack is hand-written for this headword — trust it
    if (hit?.example) {
      return {
        example: hit.example,
        exampleMeaning: hit.exampleMeaning || '',
        exampleSource: 'jlpt',
      }
    }
  }
  return null
}

/** Concrete / countable things where「ここに〜があります」is acceptable. */
const CONCRETE_NOUN =
  /いす|椅子|机|本|鞄|かばん|傘|かさ|お金|お菓子|お茶|お酒|お皿|バス|電車|車|自転車|電話|時計|写真|手紙|新聞|辞書|ペン|鉛筆|ノート|コップ|ちゃわん|靴|服|鍵|かぎ|荷物|荷物|地図|切符|カメラ|テレビ|ラジオ|ドア|窓|まど|花|はな|木|き|山|川|海|空|そら|駅|学校|病院|銀行|公園|店|みせ/

/**
 * Last-resort safe frames. Prefer returning null over unnatural sentences
 * like「ここに病気があります。」
 */
export function buildFallbackExample(card, surface) {
  const curated = findJlptExtraExample(card)
  if (curated) return curated

  const w = surface || primaryWriting(card.word)
  const meaning = (card.meaning || '').split(/[；;]/)[0].trim() || '…'
  const pos = `${card.pos || ''} ${card.meaningEn || ''}`.toLowerCase()
  const en = (card.meaningEn || '').toLowerCase()

  if (w === '足' && card.reading === 'あし') {
    return { example: '右の足が痛いです。', exampleMeaning: '右腳痛。', exampleSource: 'template' }
  }
  if (w === '立てる') {
    return { example: '旗を立てます。', exampleMeaning: '把旗子豎起來。', exampleSource: 'template' }
  }
  if (w === '建てる') {
    return { example: '家を建てます。', exampleMeaning: '蓋房子。', exampleSource: 'template' }
  }
  if (w === '川' || w === '河') {
    return { example: '大きな川があります。', exampleMeaning: '有一條大河。', exampleSource: 'template' }
  }
  if (w === 'ちゃん' || w === 'くん' || w === 'さん' || /^suffix for familiar/i.test(en)) {
    return {
      example: `太郎${w}は学生です。`,
      exampleMeaning: '太郎（親暱／敬稱）是學生。',
      exampleSource: 'template',
    }
  }
  if (w === 'お互い' || card.reading === 'おたがい') {
    return {
      example: 'お互いに助け合います。',
      exampleMeaning: '彼此互相幫忙。',
      exampleSource: 'template',
    }
  }
  if (/i-adjective|い形容|keiyoushi/.test(pos) || (/い$/.test(w) && /adjective|形容/.test(pos))) {
    return {
      example: `とても${w}です。`,
      exampleMeaning: `非常${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/na-adjective|な形容|keiyodoshi/.test(pos)) {
    return {
      example: `あの人は${w}です。`,
      exampleMeaning: `那個人很${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/adverb|副詞|fukushi/.test(pos)) {
    if (/ぜひ|つまり|きっと|やはり|やっぱり|たぶん/.test(w)) {
      return { example: `${w}行きます。`, exampleMeaning: `${meaning}會去。`, exampleSource: 'template' }
    }
    if (/っと$|んと$|り$/.test(w) || /onomatopoeic|mimetic/i.test(pos)) {
      return { example: `${w}した。`, exampleMeaning: `${meaning}。`, exampleSource: 'template' }
    }
    return null
  }
  if (/suru verb/.test(pos) || /する$/.test(w)) {
    const base = w.replace(/する$/, '')
    return {
      example: `毎日${base}します。`,
      exampleMeaning: `每天${meaning}。`,
      exampleSource: 'template',
    }
  }
  // Concrete physical objects only — never「ここに病気／都合があります」
  if (CONCRETE_NOUN.test(w)) {
    return {
      example: `ここに${w}があります。`,
      exampleMeaning: `這裡有${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/伯父|叔父|伯母|叔母|先輩|先生|友達|家族/.test(w)) {
    return {
      example: `私の${w}です。`,
      exampleMeaning: `是我的${meaning}。`,
      exampleSource: 'template',
    }
  }
  // Verbs / abstract nouns: do NOT invent a sentence
  return null
}

export const EXAMPLE_SOURCE_LABELS = {
  openjlpt: 'OpenJLPT',
  jlpt: '日檢教材風',
  override: '手動校正',
  template: '安全模板',
  missing: '待補例句',
}

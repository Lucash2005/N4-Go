import { grammar } from '../data/grammar'
import { GRAMMAR_PATH_VERSION, getGrammarPath, grammarUnlockRank } from '../data/grammarPath'
import { FORM_CARDS } from '../data/verbForms'
import { vocabulary } from '../data/vocabulary'
import { getDueIds, isLearned, normalizeEntry } from './srs'
import { todayKey } from './storage'

export const DAILY_QUOTA = {
  vocab: 15,
  grammar: 2,
  forms: 2,
  review: 15,
}

const GENERIC_VOCAB = new Set([
  'する',
  'なる',
  'ある',
  'いる',
  'こと',
  'もの',
  'ため',
  'よう',
  'とき',
  'ところ',
])

/** Deterministic PRNG from a string seed (xmur3 + mulberry32) */
function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h >>> 0) || 1
}

export function seededShuffle(items, seedStr) {
  const rand = mulberry32(hashSeed(seedStr))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickByPriority(cards, count, seedStr, cardProgress, date = todayKey(), options = {}) {
  if (count <= 0 || !cards.length) return []

  const { excludeLearned = false } = options
  const pool = excludeLearned
    ? cards.filter((c) => !isLearned(cardProgress[c.id], date))
    : cards
  if (!pool.length) return []

  const newOnes = pool.filter((c) => !normalizeEntry(cardProgress[c.id], date))
  const dueOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due <= date && e.status !== 'learned'
  })
  const learningOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due > date && e.status !== 'learned'
  })
  const learnedOnes = excludeLearned
    ? []
    : pool.filter((c) => {
        const e = normalizeEntry(cardProgress[c.id], date)
        return e && e.status === 'learned' && e.due > date
      })

  const ordered = [
    ...seededShuffle(newOnes, `${seedStr}:new`),
    ...seededShuffle(dueOnes, `${seedStr}:due`),
    ...seededShuffle(learningOnes, `${seedStr}:learning`),
    ...seededShuffle(learnedOnes, `${seedStr}:learned`),
  ]

  const seen = new Set()
  const picked = []
  for (const card of ordered) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    picked.push(card.id)
    if (picked.length >= count) break
  }
  return picked
}

function pickGrammarByPath(count, seedStr, cardProgress, date = todayKey(), options = {}) {
  const { excludeLearned = false } = options
  const path = getGrammarPath(date)
  const unlocked = new Set(path.unlockedIds)
  let pool = grammar.filter((g) => unlocked.has(g.id))
  if (excludeLearned) {
    pool = pool.filter((c) => !isLearned(cardProgress[c.id], date))
  }
  if (!pool.length) {
    const fallback = excludeLearned
      ? grammar.filter((c) => !isLearned(cardProgress[c.id], date))
      : grammar
    return pickByPriority(fallback, count, seedStr, cardProgress, date, options)
  }

  const newOnes = pool.filter((c) => !normalizeEntry(cardProgress[c.id], date))
  // Catch up earlier months first, keep listed order within a month, light shuffle among same rank band
  const newOrdered = [...newOnes].sort((a, b) => {
    const ra = grammarUnlockRank(a.id, date)
    const rb = grammarUnlockRank(b.id, date)
    if (ra !== rb) return ra - rb
    return 0
  })

  const dueOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due <= date && e.status !== 'learned'
  })
  const learningOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due > date && e.status !== 'learned'
  })
  const learnedOnes = excludeLearned
    ? []
    : pool.filter((c) => {
        const e = normalizeEntry(cardProgress[c.id], date)
        return e && e.status === 'learned' && e.due > date
      })

  const ordered = [
    ...newOrdered,
    ...seededShuffle(dueOnes, `${seedStr}:due`),
    ...seededShuffle(learningOnes, `${seedStr}:learning`),
    ...seededShuffle(learnedOnes, `${seedStr}:learned`),
  ]

  const seen = new Set()
  const picked = []
  for (const card of ordered) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    picked.push(card.id)
    if (picked.length >= count) break
  }
  return picked
}

function pickFormIds(count, seedStr, cardProgress, date = todayKey(), options = {}) {
  const path = getGrammarPath(date)
  const day = Number(String(date).slice(8, 10)) || 1
  const te = FORM_CARDS.filter((c) => c.formDrill.theme === 'て形')
  const nai = FORM_CARDS.filter((c) => c.formDrill.theme === 'ない形')

  let pool = FORM_CARDS
  if (path.month === '2026-08') {
    const teNew = te.filter((c) => !normalizeEntry(cardProgress[c.id], date))
    pool = day <= 18 && teNew.length ? te : nai
  } else if (path.month === '2026-09') {
    pool = nai.length ? nai : FORM_CARDS
  }

  return pickByPriority(pool, count, seedStr, cardProgress, date, options)
}

function vocabMatchingTexts(texts) {
  const hay = texts.filter(Boolean).join('\n')
  if (!hay) return []
  return vocabulary.filter((v) => {
    if (!v.word || v.word.length < 2) return false
    if (GENERIC_VOCAB.has(v.word)) return false
    return hay.includes(v.word)
  })
}

function pickVocabThemed(count, seedStr, cardProgress, date, grammarIds, options = {}) {
  const path = getGrammarPath(date)
  const byId = new Map(grammar.map((g) => [g.id, g]))
  const todayTexts = grammarIds.flatMap((id) => {
    const g = byId.get(id)
    return g ? [g.example, g.word, g.pattern] : []
  })
  const monthTexts = path.newIds.flatMap((id) => {
    const g = byId.get(id)
    return g ? [g.example, g.word] : []
  })
  const unlockedTexts = path.unlockedIds.flatMap((id) => {
    const g = byId.get(id)
    return g ? [g.example] : []
  })

  const layers = [
    vocabMatchingTexts(todayTexts),
    vocabMatchingTexts(monthTexts),
    vocabMatchingTexts(unlockedTexts),
    vocabulary,
  ]

  const picked = []
  const seen = new Set()
  for (let i = 0; i < layers.length && picked.length < count; i += 1) {
    const pool = layers[i].filter((c) => !seen.has(c.id))
    const ids = pickByPriority(
      pool,
      count - picked.length,
      `${seedStr}:layer${i}`,
      cardProgress,
      date,
      options,
    )
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      picked.push(id)
    }
  }
  return picked
}

/**
 * Build a stable daily plan for `date` (YYYY-MM-DD).
 * Prefers new → due → learning → learned (learned skipped when excludeLearned).
 * Optional `seedExtra` reshuffles while keeping the same calendar date.
 * Optional `options.vocabQuota` raises today's new-vocab count when catching up.
 * Optional `options.excludeLearned` — omit mastered cards from today's study slots
 *   (they return via the SRS review queue when due).
 */
export function buildDailyPlan(date, cardProgress = {}, seedExtra = '', options = {}) {
  const seed = `n4-go:${date}${seedExtra ? `:${seedExtra}` : ''}`
  const pickOpts = { excludeLearned: options.excludeLearned ?? true }
  const vocabQuota = Math.max(
    DAILY_QUOTA.vocab,
    Math.min(40, Number(options.vocabQuota) || DAILY_QUOTA.vocab),
  )

  const grammarIds = pickGrammarByPath(
    DAILY_QUOTA.grammar,
    `${seed}:grammar`,
    cardProgress,
    date,
    pickOpts,
  )
  const formIds = pickFormIds(DAILY_QUOTA.forms, `${seed}:forms`, cardProgress, date, pickOpts)
  const vocabIds = pickVocabThemed(
    vocabQuota,
    `${seed}:vocab`,
    cardProgress,
    date,
    grammarIds,
    pickOpts,
  )

  const allIds = [...vocabulary, ...grammar, ...FORM_CARDS].map((c) => c.id)
  const reviewIds = getDueIds(cardProgress, allIds, DAILY_QUOTA.review, date)

  return {
    date,
    vocabIds,
    grammarIds,
    formIds,
    reviewIds,
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
    vocabQuota,
  }
}

export function resolveCards(ids) {
  const map = new Map([...vocabulary, ...grammar, ...FORM_CARDS].map((c) => [c.id, c]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

/** Live due review queue from SRS schedule. */
export function getLiveReviewIds(cardProgress = {}, limit = DAILY_QUOTA.review, date = todayKey()) {
  const allIds = [...vocabulary, ...grammar, ...FORM_CARDS].map((c) => c.id)
  return getDueIds(cardProgress, allIds, limit > 0 ? limit : 0, date)
}

export function emptyDailyPlan(date = '') {
  return {
    date,
    vocabIds: [],
    grammarIds: [],
    formIds: [],
    reviewIds: [],
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
    vocabQuota: DAILY_QUOTA.vocab,
  }
}

export function grammarQueueIds(plan = {}) {
  return [...(plan.formIds || []), ...(plan.grammarIds || [])]
}

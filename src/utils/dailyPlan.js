import { grammar } from '../data/grammar'
import { GRAMMAR_PATH_VERSION, getGrammarPath, grammarUnlockRank } from '../data/grammarPath'
import { vocabulary } from '../data/vocabulary'
import { getDueIds, normalizeEntry } from './srs'
import { todayKey } from './storage'

export const DAILY_QUOTA = {
  vocab: 15,
  grammar: 2,
  review: 15,
}

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

function pickByPriority(cards, count, seedStr, cardProgress, date = todayKey()) {
  if (count <= 0 || !cards.length) return []

  const newOnes = cards.filter((c) => !normalizeEntry(cardProgress[c.id], date))
  const dueOnes = cards.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due <= date
  })
  const learningOnes = cards.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due > date && e.status !== 'learned'
  })
  const learnedOnes = cards.filter((c) => {
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

function pickGrammarByPath(count, seedStr, cardProgress, date = todayKey()) {
  const path = getGrammarPath(date)
  const unlocked = new Set(path.unlockedIds)
  const pool = grammar.filter((g) => unlocked.has(g.id))
  if (!pool.length) return pickByPriority(grammar, count, seedStr, cardProgress, date)

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
    return e && e.due <= date
  })
  const learningOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due > date && e.status !== 'learned'
  })
  const learnedOnes = pool.filter((c) => {
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

/**
 * Build a stable daily plan for `date` (YYYY-MM-DD).
 * Prefers new → due → learning → learned.
 * Optional `seedExtra` reshuffles while keeping the same calendar date.
 */
export function buildDailyPlan(date, cardProgress = {}, seedExtra = '') {
  const seed = `n4-go:${date}${seedExtra ? `:${seedExtra}` : ''}`

  const vocabIds = pickByPriority(
    vocabulary,
    DAILY_QUOTA.vocab,
    `${seed}:vocab`,
    cardProgress,
    date,
  )
  const grammarIds = pickGrammarByPath(
    DAILY_QUOTA.grammar,
    `${seed}:grammar`,
    cardProgress,
    date,
  )

  const allIds = [...vocabulary, ...grammar].map((c) => c.id)
  const reviewIds = getDueIds(cardProgress, allIds, DAILY_QUOTA.review, date)

  return {
    date,
    vocabIds,
    grammarIds,
    reviewIds,
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
  }
}

export function resolveCards(ids) {
  const map = new Map([...vocabulary, ...grammar].map((c) => [c.id, c]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

/** Live due review queue from SRS schedule. */
export function getLiveReviewIds(cardProgress = {}, limit = DAILY_QUOTA.review, date = todayKey()) {
  const allIds = [...vocabulary, ...grammar].map((c) => c.id)
  return getDueIds(cardProgress, allIds, limit > 0 ? limit : 0, date)
}

export function emptyDailyPlan(date = '') {
  return {
    date,
    vocabIds: [],
    grammarIds: [],
    reviewIds: [],
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
  }
}

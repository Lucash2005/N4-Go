import { grammar } from '../data/grammar'
import { vocabulary } from '../data/vocabulary'

export const DAILY_QUOTA = {
  vocab: 15,
  grammar: 2,
  review: 10,
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

function pickByPriority(cards, count, seedStr, cardProgress) {
  if (count <= 0 || !cards.length) return []

  const newOnes = cards.filter((c) => !cardProgress[c.id])
  const reviewOnes = cards.filter((c) => cardProgress[c.id] === 'review')
  const learnedOnes = cards.filter((c) => cardProgress[c.id] === 'learned')

  const ordered = [
    ...seededShuffle(newOnes, `${seedStr}:new`),
    ...seededShuffle(reviewOnes, `${seedStr}:review`),
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
 * Prefers new → review-marked → learned to keep progress moving.
 * Optional `seedExtra` reshuffles while keeping the same calendar date.
 */
export function buildDailyPlan(date, cardProgress = {}, seedExtra = '') {
  const seed = `n4-go:${date}${seedExtra ? `:${seedExtra}` : ''}`

  const vocabIds = pickByPriority(vocabulary, DAILY_QUOTA.vocab, `${seed}:vocab`, cardProgress)
  const grammarIds = pickByPriority(grammar, DAILY_QUOTA.grammar, `${seed}:grammar`, cardProgress)

  const reviewPool = [...vocabulary, ...grammar].filter((c) => cardProgress[c.id] === 'review')
  let reviewIds = seededShuffle(reviewPool, `${seed}:review-queue`)
    .map((c) => c.id)
    .slice(0, DAILY_QUOTA.review)

  // If not enough marked reviews, fill with older learned vocab not already in today's new set
  if (reviewIds.length < DAILY_QUOTA.review) {
    const used = new Set([...vocabIds, ...grammarIds, ...reviewIds])
    const fillers = seededShuffle(
      vocabulary.filter((c) => cardProgress[c.id] === 'learned' && !used.has(c.id)),
      `${seed}:review-fill`,
    )
    for (const card of fillers) {
      reviewIds.push(card.id)
      if (reviewIds.length >= DAILY_QUOTA.review) break
    }
  }

  return {
    date,
    vocabIds,
    grammarIds,
    reviewIds,
    studiedIds: [],
    listenedIds: [],
  }
}

export function resolveCards(ids) {
  const map = new Map([...vocabulary, ...grammar].map((c) => [c.id, c]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

export function emptyDailyPlan(date = '') {
  return {
    date,
    vocabIds: [],
    grammarIds: [],
    reviewIds: [],
    studiedIds: [],
    listenedIds: [],
  }
}

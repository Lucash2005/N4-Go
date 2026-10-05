import { getGrammar, grammar } from '../data/grammar'
import { GRAMMAR_PATH_VERSION, getGrammarPath, grammarUnlockRank } from '../data/grammarPath'
import { FORM_CARDS } from '../data/verbForms'
import { getPhaseDailyQuota } from '../data/studyPhases'
import { getVocabulary } from '../data/vocabulary'
import { reportedIdSet } from './cardReports'
import { getDueIds, isLearned, normalizeEntry } from './srs'
import { todayKey } from './storage'

/** Fallback quotas (phase 1 baseline). Prefer `getPhaseDailyQuota()`. */
export const DAILY_QUOTA = {
  vocab: 15,
  grammar: 2,
  forms: 2,
  review: 15,
}

export function resolveDailyQuota(options = {}) {
  const phaseQ = getPhaseDailyQuota()
  return {
    vocab: Math.max(1, Number(options.vocabQuota) || phaseQ.vocab || DAILY_QUOTA.vocab),
    grammar: Math.max(1, Number(options.grammarQuota) || phaseQ.grammar || DAILY_QUOTA.grammar),
    forms: Math.max(0, Number(options.formsQuota) || phaseQ.forms || DAILY_QUOTA.forms),
    review: Math.max(0, Number(options.reviewQuota) || phaseQ.review || DAILY_QUOTA.review),
    reading: Math.max(0, Number(options.readingQuota) || phaseQ.reading || 0),
    listening: Math.max(0, Number(options.listeningQuota) || phaseQ.listening || 0),
    phaseId: phaseQ.phaseId,
  }
}

/**
 * While Gemini vocab scan is incomplete, grammar + 活用 still follow the monthly
 * path (same idea as forms). Only vocabulary is limited to the allowlist.
 * Bump when this policy changes so cached daily plans rebuild.
 */
export const ALLOWLIST_POLICY = 2

/**
 * Vocab daily pick strategy version.
 * 2 = one high-degree seed → undirected example-graph BFS (接龍) → refill seeds by degree.
 * Bump when the picker changes so cached daily plans rebuild.
 */
export const VOCAB_PICK_VERSION = 2

function alwaysAllowedDuringScan(id) {
  const s = String(id || '')
  return s.startsWith('g') || s.startsWith('f')
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
  // High-noise function / deictic words — skip when chaining from examples
  'いい',
  'よい',
  'この',
  'その',
  'あの',
  'これ',
  'それ',
  'あれ',
  'ここ',
  'そこ',
  'あそこ',
  'はい',
  'ええ',
  'では',
  'でも',
  'もう',
  'また',
  'まだ',
  'から',
  'まで',
  'ので',
  'のに',
  'です',
  'ます',
  'ました',
  'ません',
])

const KANA_ONLY = /^[\u3040-\u309F\u30A0-\u30FF]+$/

/** Skip surfaces that create noisy false positives inside example sentences. */
function isWeakMatchForm(form) {
  if (!form || form.length < 2) return true
  if (GENERIC_VOCAB.has(form)) return true
  // Short kana-only forms often match inside conjugations (ては／では, etc.)
  if (KANA_ONLY.test(form) && form.length <= 2) return true
  return false
}

export function isCoreVocab(card) {
  return card?.type === 'vocab' && card.level !== '延伸'
}

export function vocabStudyPool(options = {}) {
  const vocabulary = getVocabulary()
  let pool = options.includeExtension ? vocabulary : vocabulary.filter(isCoreVocab)
  if (options.allowedIds instanceof Set) {
    pool = pool.filter((c) => options.allowedIds.has(c.id))
  }
  return pool
}

export function vocabLevelCounts() {
  const vocabulary = getVocabulary()
  let n5 = 0
  let n4 = 0
  let ext = 0
  for (const v of vocabulary) {
    if (v.level === 'N5') n5 += 1
    else if (v.level === 'N4') n4 += 1
    else if (v.level === '延伸') ext += 1
  }
  return { n5, n4, core: n5 + n4, extension: ext, total: vocabulary.length }
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

function pickByPriority(cards, count, seedStr, cardProgress, date = todayKey(), options = {}) {
  if (count <= 0 || !cards.length) return []

  const { excludeLearned = false } = options
  const hidden = options.hiddenIds || reportedIdSet()
  const allowed = options.allowedIds
  let visible = hidden.size ? cards.filter((c) => !hidden.has(c.id)) : cards
  if (allowed instanceof Set) {
    visible = visible.filter((c) => allowed.has(c.id))
  }
  const pool = excludeLearned
    ? visible.filter((c) => !isLearned(cardProgress[c.id], date))
    : visible
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
  const hidden = options.hiddenIds || reportedIdSet()
  const path = getGrammarPath(date)
  const unlocked = new Set(path.unlockedIds)
  // Grammar is not gated by Gemini vocab allowlist — monthly path only.
  let pool = grammar.filter((g) => unlocked.has(g.id) && !hidden.has(g.id))
  if (excludeLearned) {
    pool = pool.filter((c) => !isLearned(cardProgress[c.id], date))
  }
  if (!pool.length) {
    let fallback = (excludeLearned
      ? grammar.filter((c) => !isLearned(cardProgress[c.id], date))
      : grammar
    ).filter((c) => !hidden.has(c.id))
    return pickByPriority(fallback, count, seedStr, cardProgress, date, {
      ...options,
      allowedIds: null,
    })
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

/** Surface forms used to find this vocab card inside another card's example. */
function vocabMatchForms(card) {
  const forms = []
  const word = String(card?.word || '').trim()
  const kanji = String(card?.kanji || '').trim()
  if (!isWeakMatchForm(word)) forms.push(word)
  if (kanji && kanji !== word && !isWeakMatchForm(kanji)) forms.push(kanji)
  return forms
}

function cardMatchesExample(card, exampleText) {
  if (!exampleText) return false
  return vocabMatchForms(card).some((form) => exampleText.includes(form))
}

/**
 * Priority order used by daily picks: new → due → learning → (optional) learned.
 * Returns cards (not ids) so callers can expand examples in the same order.
 */
function priorityOrderedCards(cards, seedStr, cardProgress, date = todayKey(), options = {}) {
  if (!cards.length) return []
  const { excludeLearned = false } = options
  const hidden = options.hiddenIds || reportedIdSet()
  const allowed = options.allowedIds
  let visible = hidden.size ? cards.filter((c) => !hidden.has(c.id)) : cards
  if (allowed instanceof Set) {
    visible = visible.filter((c) => allowed.has(c.id))
  }
  const pool = excludeLearned
    ? visible.filter((c) => !isLearned(cardProgress[c.id], date))
    : visible
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
  const out = []
  for (const card of ordered) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    out.push(card)
  }
  return out
}

/**
 * Undirected example-link: A↔B if A's example contains B, or B's example contains A.
 * One-way-only linking was too sparse (many cards only self-mention), so reshuffles
 * looked like unrelated bags once the 3 initial seeds ran out of neighbors.
 */
function cardsExampleLinked(a, b) {
  if (!a || !b || a.id === b.id) return false
  const aEx = String(a.example || '')
  const bEx = String(b.example || '')
  if (aEx && cardMatchesExample(b, aEx)) return true
  if (bEx && cardMatchesExample(a, bEx)) return true
  return false
}

function neighborDegree(card, remainingSet, byId, seen) {
  let degree = 0
  for (const id of remainingSet) {
    if (seen.has(id) || id === card.id) continue
    const other = byId.get(id)
    if (other && cardsExampleLinked(card, other)) degree += 1
  }
  return degree
}

/**
 * Pick today's vocab by example-linked chaining:
 * 1. Prefer one high-connectivity seed from the SRS priority pool (not 3 random seeds)
 * 2. BFS/接龍 on the undirected example graph until the frontier is empty
 * 3. When stuck, pick the remaining card with the most links still available
 *
 * Keeps related words together in the returned id list (study session keeps order).
 */
function pickVocabExampleLinked(count, seedStr, cardProgress, date, options = {}) {
  if (count <= 0) return []
  const studyPool = vocabStudyPool(options)
  const candidates = priorityOrderedCards(studyPool, seedStr, cardProgress, date, options)
  if (!candidates.length) return []

  const byId = new Map(candidates.map((c) => [c.id, c]))
  const remaining = candidates.map((c) => c.id) // priority order for fallback
  const remainingSet = new Set(remaining)
  const picked = []
  const seen = new Set()
  const frontier = []

  const addCard = (id) => {
    if (!id || seen.has(id) || picked.length >= count) return false
    if (!byId.has(id)) return false
    seen.add(id)
    remainingSet.delete(id)
    picked.push(id)
    frontier.push(id)
    return true
  }

  /** Next seed: highest remaining degree; ties keep SRS priority order. */
  const takeSeed = () => {
    let bestId = null
    let bestDegree = -1
    for (const id of remaining) {
      if (seen.has(id) || !remainingSet.has(id)) continue
      const card = byId.get(id)
      if (!card) continue
      const degree = neighborDegree(card, remainingSet, byId, seen)
      if (degree > bestDegree) {
        bestDegree = degree
        bestId = id
        // Early exit when we already found a richly linked seed
        if (bestDegree >= 6) break
      }
    }
    if (bestId) {
      remainingSet.delete(bestId)
      return bestId
    }
    while (remaining.length) {
      const id = remaining.shift()
      remainingSet.delete(id)
      if (!seen.has(id)) return id
    }
    return null
  }

  const neighborsOf = (card) => {
    const hits = []
    for (const id of remainingSet) {
      const other = byId.get(id)
      if (!other || seen.has(id)) continue
      if (cardsExampleLinked(card, other)) hits.push(other)
    }
    hits.sort((a, b) => {
      const la = Math.max(...vocabMatchForms(a).map((f) => f.length), 0)
      const lb = Math.max(...vocabMatchForms(b).map((f) => f.length), 0)
      if (lb !== la) return lb - la
      return 0
    })
    return hits.map((c) => c.id)
  }

  // One seed first, then deep-chain (avoid 3 unrelated mini-clusters)
  if (picked.length < count) {
    const id = takeSeed()
    if (id) addCard(id)
  }

  while (picked.length < count) {
    if (!frontier.length) {
      const id = takeSeed()
      if (!id) break
      addCard(id)
      continue
    }
    const currentId = frontier.shift()
    const current = byId.get(currentId)
    if (!current) continue
    for (const neighborId of neighborsOf(current)) {
      if (picked.length >= count) break
      addCard(neighborId)
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
  const pickOpts = {
    excludeLearned: options.excludeLearned ?? true,
    includeExtension: options.includeExtension ?? false,
    hiddenIds: options.hiddenIds || reportedIdSet(),
    allowedIds: options.allowedIds,
  }
  const quota = resolveDailyQuota(options)
  // Catch-up / user target may raise vocab above phase baseline (capped at 40).
  const vocabQuota = Math.min(40, Math.max(quota.vocab, Number(options.vocabQuota) || quota.vocab))
  const vocabQuotaSource = options.vocabQuotaSource || 'phase'
  const phaseVocab = Number(options.phaseVocab) || quota.vocab

  const grammarIds = pickGrammarByPath(
    quota.grammar,
    `${seed}:grammar`,
    cardProgress,
    date,
    pickOpts,
  )
  const formIds = pickFormIds(quota.forms, `${seed}:forms`, cardProgress, date, pickOpts)
  const vocabIds = pickVocabExampleLinked(
    vocabQuota,
    `${seed}:vocab`,
    cardProgress,
    date,
    pickOpts,
  )

  const vocabulary = getVocabulary()
  const hidden = pickOpts.hiddenIds
  const allowed = pickOpts.allowedIds
  let allIds = [...vocabulary, ...grammar, ...FORM_CARDS]
    .map((c) => c.id)
    .filter((id) => !hidden.has(id))
  // Review queue: only Gemini-approved vocab (+ grammar/forms always allowed).
  if (allowed instanceof Set) {
    allIds = allIds.filter((id) => allowed.has(id) || alwaysAllowedDuringScan(id))
  }
  const reviewIds = getDueIds(cardProgress, allIds, quota.review, date)

  return {
    date,
    vocabIds,
    grammarIds,
    formIds,
    reviewIds,
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
    allowlistPolicy: ALLOWLIST_POLICY,
    vocabPickVersion: VOCAB_PICK_VERSION,
    vocabQuota,
    vocabQuotaSource,
    phaseVocab,
    studyPrefsKey: options.studyPrefsKey || '',
    phaseId: quota.phaseId,
    readingQuota: quota.reading,
    listeningQuota: quota.listening,
    reviewQuota: quota.review,
    geminiApprovedCount: allowed instanceof Set ? allowed.size : null,
  }
}

export function resolveCards(ids) {
  const vocabulary = getVocabulary()
  const map = new Map([...vocabulary, ...getGrammar(), ...FORM_CARDS].map((c) => [c.id, c]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

/** Live due review queue from SRS schedule. */
export function getLiveReviewIds(
  cardProgress = {},
  limit = DAILY_QUOTA.review,
  date = todayKey(),
  options = {},
) {
  const vocabulary = getVocabulary()
  const hidden = options.hiddenIds || reportedIdSet()
  const allowed = options.allowedIds
  let allIds = [...vocabulary, ...grammar, ...FORM_CARDS]
    .map((c) => c.id)
    .filter((id) => !hidden.has(id))
  if (allowed instanceof Set) {
    allIds = allIds.filter((id) => allowed.has(id) || alwaysAllowedDuringScan(id))
  }
  return getDueIds(cardProgress, allIds, limit > 0 ? limit : 0, date)
}

export function emptyDailyPlan(date = '') {
  const quota = resolveDailyQuota()
  return {
    date,
    vocabIds: [],
    grammarIds: [],
    formIds: [],
    reviewIds: [],
    studiedIds: [],
    listenedIds: [],
    grammarPathVersion: GRAMMAR_PATH_VERSION,
    allowlistPolicy: ALLOWLIST_POLICY,
    vocabPickVersion: VOCAB_PICK_VERSION,
    vocabQuota: quota.vocab,
    vocabQuotaSource: 'phase',
    phaseVocab: quota.vocab,
    studyPrefsKey: '',
    phaseId: quota.phaseId,
    readingQuota: quota.reading,
    listeningQuota: quota.listening,
    reviewQuota: quota.review,
    geminiApprovedCount: null,
  }
}

export function grammarQueueIds(plan = {}) {
  return [...(plan.formIds || []), ...(plan.grammarIds || [])]
}

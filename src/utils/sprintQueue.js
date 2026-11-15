/**
 * Exam-sprint deck builder: wrong-bank + weak SRS + high-priority N4 grammar.
 */
import { getGrammar } from '../data/grammar'
import { FORM_CARDS } from '../data/verbForms'
import { getVocabulary } from '../data/vocabulary'
import { resolveCards } from './dailyPlan'
import { normalizeEntry, isDue } from './srs'
import { todayKey } from './storage'
import { loadJSON, saveJSON } from './storage'
import { pickWrongReviewIds } from './wrongBank'

const PIN_KEY = 'sprint-pins'

/** Easy-to-confuse / high-yield N4 grammar for the final sprint. */
export const SPRINT_PRIORITY_GRAMMAR_IDS = [
  // 授受
  'g001',
  'g002',
  'g003',
  // 義務・許可
  'g004',
  'g005',
  'g033',
  'g034',
  'g006',
  // 假定・條件
  'g014',
  'g015',
  'g051',
  'g052',
  'g016',
  'g017',
  // 使役・受身・可能
  'g060',
  'g061',
  'g062',
  'g045',
  // て形系列
  'g073',
  'g025',
  'g026',
  'g027',
  'g028',
  'g029',
  'g030',
  // 敬語／依頼基礎
  'g032',
  'g074',
  'g075',
]

/**
 * @returns {{ ids: string[], updatedAt: string }}
 */
export function loadSprintPins() {
  const raw = loadJSON(PIN_KEY, null)
  if (!raw || typeof raw !== 'object') return { ids: [], updatedAt: '' }
  return {
    ids: Array.isArray(raw.ids) ? raw.ids.map(String).filter(Boolean) : [],
    updatedAt: String(raw.updatedAt || ''),
  }
}

export function saveSprintPins(ids) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))]
  const next = { ids: unique, updatedAt: new Date().toISOString() }
  saveJSON(PIN_KEY, next)
  return next
}

/** Merge card ids into the sprint pin list (from quick-mock misses, etc.). */
export function addSprintPins(ids) {
  const prev = loadSprintPins()
  return saveSprintPins([...prev.ids, ...(ids || [])])
}

export function clearSprintPins() {
  return saveSprintPins([])
}

function weakFromProgress(cardProgress, limit, today) {
  const scored = []
  for (const [id, raw] of Object.entries(cardProgress || {})) {
    const e = normalizeEntry(raw, today)
    if (!e) continue
    const weakGrade = e.lastGrade === 'again' || e.lastGrade === 'hard'
    const manyLapses = (e.lapses || 0) > 0
    const dueNow = isDue(e, today)
    if (!weakGrade && !manyLapses && !(dueNow && e.status !== 'learned')) continue
    let score = 0
    if (e.lastGrade === 'again') score += 50
    if (e.lastGrade === 'hard') score += 35
    score += Math.min(40, (e.lapses || 0) * 8)
    if (dueNow) score += 20
    if (e.status === 'learning' || e.status === 'review') score += 10
    scored.push({ id, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.id)
}

function priorityGrammarIds(cardProgress, limit, today) {
  const scored = SPRINT_PRIORITY_GRAMMAR_IDS.map((id, idx) => {
    const e = normalizeEntry(cardProgress?.[id], today)
    let score = 100 - idx
    if (!e || e.status === 'new') score += 40
    else if (e.lastGrade === 'again') score += 50
    else if (e.lastGrade === 'hard') score += 30
    else if (e.status === 'learned' && !isDue(e, today)) score -= 60
    if (e && isDue(e, today)) score += 25
    return { id, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.id)
}

function formDrillIds(limit = 4) {
  const te = FORM_CARDS.filter((c) => c.formDrill?.theme === 'て形')
  const nai = FORM_CARDS.filter((c) => c.formDrill?.theme === 'ない形')
  const pool = [...te.slice(0, 8), ...nai.slice(0, 8)]
  const out = []
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  for (const c of pool) {
    if (out.length >= limit) break
    out.push(c.id)
  }
  return out
}

/**
 * Build a focused sprint deck (wrong → pins → weak SRS → priority grammar → forms).
 * @param {{
 *   cardProgress?: Record<string, unknown>,
 *   limit?: number,
 *   today?: string,
 * }} [options]
 */
export function buildSprintDeck(options = {}) {
  const {
    cardProgress = {},
    limit = 24,
    today = todayKey(),
  } = options

  const ordered = []
  const seen = new Set()

  function pushIds(ids, maxAdd = Infinity) {
    let added = 0
    for (const id of ids || []) {
      if (!id || seen.has(id)) continue
      seen.add(id)
      ordered.push(id)
      added += 1
      if (ordered.length >= limit || added >= maxAdd) break
    }
  }

  pushIds(pickWrongReviewIds(12), 12)
  pushIds(loadSprintPins().ids, 8)
  pushIds(weakFromProgress(cardProgress, 16, today), 12)
  pushIds(priorityGrammarIds(cardProgress, 10, today), 8)
  pushIds(formDrillIds(4), 4)

  // Fill with N4 vocab that is due / never graded if still short
  if (ordered.length < limit) {
    const vocabFill = getVocabulary()
      .filter((c) => c.level === 'N4' || c.level === 'N5')
      .map((c) => {
        const e = normalizeEntry(cardProgress[c.id], today)
        let score = 1
        if (!e) score = 30
        else if (isDue(e, today)) score = 40 + (e.lapses || 0)
        else if (e.status === 'learned') score = 0
        return { id: c.id, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.id)
    pushIds(vocabFill, limit - ordered.length)
  }

  const cards = resolveCards(ordered.slice(0, limit))
  return {
    ids: cards.map((c) => c.id),
    cards,
    stats: {
      wrong: pickWrongReviewIds(50).filter((id) => seen.has(id)).length,
      pins: loadSprintPins().ids.filter((id) => seen.has(id)).length,
      grammar: cards.filter((c) => c.type === 'grammar').length,
      forms: cards.filter((c) => c.type === 'form' || c.formDrill).length,
      vocab: cards.filter((c) => c.type === 'vocab').length,
      total: cards.length,
    },
  }
}

/** Ids that look like study cards (for pinning from quiz misses). */
export function filterPinnableIds(ids) {
  const map = new Map(
    [...getVocabulary(), ...getGrammar(), ...FORM_CARDS].map((c) => [c.id, true]),
  )
  return [...new Set((ids || []).map(String))].filter((id) => map.has(id))
}

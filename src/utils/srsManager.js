/**
 * SRS manager — thin façade over the app SM-2-style engine in `srs.js`.
 * Ratings map: again/hard/good/easy (UI: 忘記／困難／記得／簡單).
 */
import {
  applyGrade,
  GRADES,
  GRADE_LABELS,
  isDue,
  isLearned,
  normalizeEntry,
  newEntry,
} from './srs'
import { loadJSON, saveJSON, todayKey } from './storage'

export { GRADES, GRADE_LABELS, applyGrade, isDue, isLearned, normalizeEntry, newEntry }

const STORE_KEY = 'srs-manager-meta'

/**
 * @param {Record<string, unknown>} progress
 * @param {string} id
 * @param {'again'|'hard'|'good'|'easy'} grade
 * @param {string} [today]
 */
export function rateCard(progress, id, grade, today = todayKey()) {
  if (!id || !GRADES.includes(grade)) return progress
  return applyGrade(progress, id, grade, today)
}

/** Confidence 1–5 → app grades (5=easy … 1=again). */
export function confidenceToGrade(n) {
  const v = Math.max(1, Math.min(5, Number(n) || 3))
  if (v <= 1) return 'again'
  if (v === 2) return 'hard'
  if (v === 3) return 'good'
  return 'easy'
}

export function loadSrsMeta() {
  const raw = loadJSON(STORE_KEY, null)
  if (!raw || typeof raw !== 'object') return { lastRatedAt: '', ratingsToday: 0 }
  return {
    lastRatedAt: String(raw.lastRatedAt || ''),
    ratingsToday: Number(raw.ratingsToday) || 0,
  }
}

export function bumpSrsMeta() {
  const today = todayKey()
  const prev = loadSrsMeta()
  const ratingsToday = prev.lastRatedAt === today ? prev.ratingsToday + 1 : 1
  const next = { lastRatedAt: today, ratingsToday }
  saveJSON(STORE_KEY, next)
  return next
}

/**
 * Due ids from a progress map, highest-lapse first.
 * @param {Record<string, unknown>} progress
 * @param {string[]} ids
 * @param {number} [limit]
 */
export function pickWeakDue(progress, ids, limit = 20) {
  const today = todayKey()
  const scored = ids
    .map((id) => {
      const e = normalizeEntry(progress[id], today)
      if (!e || !isDue(e, today)) return null
      return { id, lapses: e.lapses || 0, interval: e.interval || 0 }
    })
    .filter(Boolean)
    .sort((a, b) => b.lapses - a.lapses || a.interval - b.interval)
  return scored.slice(0, limit).map((x) => x.id)
}

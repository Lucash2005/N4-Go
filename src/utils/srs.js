import { todayKey } from './storage'

/** @typedef {'again' | 'hard' | 'good' | 'easy'} Grade */
/** @typedef {'new' | 'learning' | 'review' | 'learned'} CardStatus */
/**
 * @typedef {{
 *   status: CardStatus,
 *   ease: number,
 *   interval: number,
 *   repetitions: number,
 *   due: string,
 *   lapses: number,
 *   lastGrade?: Grade | null,
 * }} SrsEntry
 */

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Migrate legacy string marks and normalize missing fields. */
export function normalizeEntry(raw, today = todayKey()) {
  if (!raw) return null

  if (raw === 'learned') {
    return {
      status: 'learned',
      ease: DEFAULT_EASE,
      interval: 7,
      repetitions: 2,
      due: addDays(today, 7),
      lapses: 0,
      lastGrade: null,
    }
  }

  if (raw === 'review') {
    return {
      status: 'review',
      ease: 2.3,
      interval: 0,
      repetitions: 0,
      due: today,
      lapses: 1,
      lastGrade: null,
    }
  }

  if (typeof raw !== 'object') return null

  const interval = typeof raw.interval === 'number' ? raw.interval : 0
  const repetitions = typeof raw.repetitions === 'number' ? raw.repetitions : 0
  let status = raw.status || 'learning'
  // Migrate older learning cards that already earned a long enough interval
  if (status === 'learning' && interval >= 4) status = 'learned'

  return {
    status,
    ease: typeof raw.ease === 'number' ? raw.ease : DEFAULT_EASE,
    interval,
    repetitions,
    due: raw.due || today,
    lapses: typeof raw.lapses === 'number' ? raw.lapses : 0,
    lastGrade: raw.lastGrade ?? null,
  }
}

export function getCardStatus(cardProgress, id, today = todayKey()) {
  const entry = normalizeEntry(cardProgress?.[id], today)
  if (!entry) return 'new'
  if (entry.due <= today && entry.status !== 'new') {
    return entry.status === 'learned' ? 'review' : entry.status === 'learning' ? 'learning' : 'review'
  }
  return entry.status
}

/** Filter-friendly bucket: new | review | learned */
export function getFilterStatus(cardProgress, id, today = todayKey()) {
  const entry = normalizeEntry(cardProgress?.[id], today)
  if (!entry) return 'new'
  if (entry.due <= today) return 'review'
  if (entry.status === 'learned') return 'learned'
  return 'review'
}

export function isDue(entry, today = todayKey()) {
  const n = normalizeEntry(entry, today)
  return Boolean(n && n.due <= today)
}

export function isLearned(entry, today = todayKey()) {
  const n = normalizeEntry(entry, today)
  // Keep counting as mastered even when due for review — otherwise the
  // progress bar drops every time SRS brings a card back, while the plan
  // target keeps climbing and the gap looks worse every day.
  return Boolean(n && n.status === 'learned')
}

/**
 * SM-2 inspired grading.
 * @param {unknown} raw
 * @param {Grade} grade
 * @param {string} [today]
 * @returns {SrsEntry}
 */
export function applyGrade(raw, grade, today = todayKey()) {
  const prev = normalizeEntry(raw, today) || {
    status: 'learning',
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    due: today,
    lapses: 0,
    lastGrade: null,
  }

  let { ease, interval, repetitions, lapses, status } = prev

  if (grade === 'again') {
    repetitions = 0
    interval = 0
    lapses += 1
    ease = Math.max(MIN_EASE, ease - 0.2)
    status = 'review'
    return {
      status,
      ease: round2(ease),
      interval,
      repetitions,
      due: today,
      lapses,
      lastGrade: grade,
    }
  }

  if (grade === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15)
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 2
    else interval = Math.max(1, Math.round(interval * 1.2))
    repetitions += 1
  } else if (grade === 'good') {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 4
    else interval = Math.max(1, Math.round(interval * ease))
    repetitions += 1
  } else if (grade === 'easy') {
    ease += 0.15
    if (repetitions === 0) interval = 4
    else if (repetitions === 1) interval = 7
    else interval = Math.max(1, Math.round(interval * ease * 1.3))
    repetitions += 1
  }

  // Mark mastered when interval reaches 4+ days.
  // easy ×1 or good ×2 is enough to move the plan progress bar.
  status = interval >= 4 ? 'learned' : repetitions >= 1 ? 'learning' : 'review'

  return {
    status,
    ease: round2(ease),
    interval,
    repetitions,
    due: addDays(today, interval),
    lapses,
    lastGrade: grade,
  }
}

/** Manual override used by legacy buttons. */
export function entryFromManualStatus(status, today = todayKey()) {
  if (!status) return null
  if (status === 'learned') {
    return {
      status: 'learned',
      ease: DEFAULT_EASE,
      interval: 14,
      repetitions: 3,
      due: addDays(today, 14),
      lapses: 0,
      lastGrade: 'good',
    }
  }
  if (status === 'review') {
    return {
      status: 'review',
      ease: 2.3,
      interval: 0,
      repetitions: 0,
      due: today,
      lapses: 1,
      lastGrade: 'again',
    }
  }
  return null
}

/**
 * Due cards for today's review queue, oldest due first.
 * @param {Record<string, unknown>} cardProgress
 * @param {string[]} allIds
 * @param {number} limit
 * @param {string} [today]
 */
export function getDueIds(cardProgress = {}, allIds = [], limit = 15, today = todayKey()) {
  const due = allIds
    .map((id) => ({ id, entry: normalizeEntry(cardProgress[id], today) }))
    .filter(({ entry }) => entry && entry.due <= today)
    .sort((a, b) => {
      if (a.entry.due !== b.entry.due) return a.entry.due < b.entry.due ? -1 : 1
      return (b.entry.lapses || 0) - (a.entry.lapses || 0)
    })
    .map(({ id }) => id)

  return limit > 0 ? due.slice(0, limit) : due
}

export function countByBucket(cardProgress, ids, today = todayKey()) {
  let learned = 0
  let due = 0
  for (const id of ids) {
    const entry = normalizeEntry(cardProgress[id], today)
    if (!entry) continue
    if (entry.due <= today) due += 1
    if (entry.status === 'learned') learned += 1
  }
  return { learned, due }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

export const GRADE_LABELS = {
  again: { label: '忘記', hint: '今天再看', tone: 'coral' },
  hard: { label: '困難', hint: '縮短間隔', tone: 'sand' },
  good: { label: '記得', hint: '再評 1 次可掌握', tone: 'sea' },
  easy: { label: '簡單', hint: '這次可算掌握', tone: 'ink' },
}

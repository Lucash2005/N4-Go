/**
 * Wrong-answer bank (錯題本) — persists quiz / reading / listening misses.
 */
import { loadJSON, saveJSON, todayKey } from './storage'
import { applyGrade, normalizeEntry, isDue } from './srs'

const STORE_KEY = 'wrong-bank'
const STATS_KEY = 'wrong-bank-stats'

/**
 * @typedef {{
 *   id: string,
 *   source: 'quiz'|'reading'|'listening'|'drill'|'mock',
 *   prompt?: string,
 *   wrongCount: number,
 *   lastWrongAt: string,
 *   lastCorrectAt?: string,
 *   resolved?: boolean,
 * }} WrongItem
 */

function emptyStore() {
  return { items: {}, updatedAt: '' }
}

export function loadWrongBank() {
  const raw = loadJSON(STORE_KEY, null)
  if (!raw || typeof raw !== 'object') return emptyStore()
  return {
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
    updatedAt: String(raw.updatedAt || ''),
  }
}

export function saveWrongBank(store) {
  const next = {
    items: store.items || {},
    updatedAt: new Date().toISOString(),
  }
  saveJSON(STORE_KEY, next)
  return next
}

/**
 * @param {string} id
 * @param {{ source?: WrongItem['source'], prompt?: string }} [meta]
 * @param {ReturnType<typeof loadWrongBank>} [store]
 */
export function recordWrong(id, meta = {}, store = loadWrongBank()) {
  if (!id) return store
  const prev = store.items[id] || {
    id,
    source: meta.source || 'quiz',
    prompt: '',
    wrongCount: 0,
    lastWrongAt: '',
    resolved: false,
  }
  const next = {
    ...store,
    items: {
      ...store.items,
      [id]: {
        ...prev,
        source: meta.source || prev.source || 'quiz',
        prompt: meta.prompt || prev.prompt || '',
        wrongCount: (prev.wrongCount || 0) + 1,
        lastWrongAt: todayKey(),
        resolved: false,
      },
    },
  }
  return saveWrongBank(next)
}

export function recordWrongCorrect(id, store = loadWrongBank()) {
  if (!id || !store.items[id]) return store
  const prev = store.items[id]
  const next = {
    ...store,
    items: {
      ...store.items,
      [id]: {
        ...prev,
        lastCorrectAt: todayKey(),
        resolved: (prev.wrongCount || 0) <= 1,
        wrongCount: Math.max(0, (prev.wrongCount || 1) - 1),
      },
    },
  }
  if (next.items[id].wrongCount === 0) delete next.items[id]
  return saveWrongBank(next)
}

export function clearWrongBank() {
  return saveWrongBank(emptyStore())
}

export function wrongBankList(store = loadWrongBank()) {
  return Object.values(store.items || {}).sort((a, b) => {
    if ((b.wrongCount || 0) !== (a.wrongCount || 0)) return (b.wrongCount || 0) - (a.wrongCount || 0)
    return String(b.lastWrongAt || '').localeCompare(String(a.lastWrongAt || ''))
  })
}

export function wrongBankCount(store = loadWrongBank()) {
  return Object.keys(store.items || {}).length
}

/** Optional: also push linked SRS card to due-today via again. */
export function syncWrongToSrs(cardProgress, id) {
  if (!id) return cardProgress
  return applyGrade(cardProgress, id, 'again')
}

export function loadWrongStats() {
  return loadJSON(STATS_KEY, { sessions: 0, cleared: 0 })
}

export function bumpWrongStats(partial = {}) {
  const prev = loadWrongStats()
  const next = { ...prev, ...partial }
  saveJSON(STATS_KEY, next)
  return next
}

/** Active (unresolved) wrong ids, highest failure first. */
export function pickWrongReviewIds(limit = 15, store = loadWrongBank()) {
  return wrongBankList(store)
    .filter((x) => !x.resolved && (x.wrongCount || 0) > 0)
    .slice(0, limit)
    .map((x) => x.id)
}

/** Due SRS among wrong-bank linked cards. */
export function pickWrongDueFromProgress(cardProgress, limit = 15, store = loadWrongBank()) {
  const today = todayKey()
  const ids = Object.keys(store.items || {})
  const due = ids.filter((id) => {
    const e = normalizeEntry(cardProgress[id], today)
    return e && isDue(e, today)
  })
  return due.slice(0, limit)
}

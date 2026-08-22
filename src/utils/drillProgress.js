import { DRILL_BY_ID, drillQuestions, filterDrillQuestions } from '../data/drill'
import { shuffle, withShuffledOptions } from '../data/quiz'
import { applyGrade, getDueIds, normalizeEntry } from './srs'
import { todayKey } from './storage'

/**
 * 基礎加強專用 SRS，與 card-progress（單字／文法卡）完全分開。
 * 答錯只影響 drill-progress，不會扣「已掌握」單字數。
 */

const ALL_DRILL_IDS = drillQuestions.map((q) => q.id)

export function getDueDrillIds(drillProgress = {}, limit = 20, today = todayKey()) {
  return getDueIds(drillProgress, ALL_DRILL_IDS, limit, today)
}

export function countDueDrills(drillProgress = {}, today = todayKey()) {
  return getDueDrillIds(drillProgress, 0, today).length
}

export function recordDrillResult(drillProgress, drillId, correct, today = todayKey()) {
  const grade = correct ? 'good' : 'again'
  return {
    ...drillProgress,
    [drillId]: applyGrade(drillProgress[drillId], grade, today),
  }
}

function drillWeight(id, drillProgress, today) {
  const entry = normalizeEntry(drillProgress[id], today)
  if (!entry) return 1
  if (entry.due <= today) return 80 + entry.lapses * 5
  if (entry.status === 'learning' || entry.status === 'review') return 40
  return 10
}

/**
 * @param {'mixed'|'confusable'|'passage'|'mistakes'} mode
 * @param {object} opts
 */
export function pickDrillSet({
  mode = 'mixed',
  drillProgress = {},
  count = 8,
  theme = 'all',
  today = todayKey(),
} = {}) {
  let pool = []

  if (mode === 'mistakes') {
    const dueIds = getDueDrillIds(drillProgress, count * 2, today)
    pool = dueIds.map((id) => DRILL_BY_ID[id]).filter(Boolean)
    if (pool.length < count) {
      const seen = new Set(pool.map((q) => q.id))
      const learning = ALL_DRILL_IDS.filter((id) => {
        if (seen.has(id)) return false
        const e = normalizeEntry(drillProgress[id], today)
        return e && e.status !== 'learned'
      })
        .sort((a, b) => drillWeight(b, drillProgress, today) - drillWeight(a, drillProgress, today))
        .slice(0, count - pool.length)
        .map((id) => DRILL_BY_ID[id])
      pool = [...pool, ...learning.filter(Boolean)]
    }
  } else if (mode === 'confusable') {
    pool = filterDrillQuestions({ kind: 'confusable' })
    if (theme !== 'all') pool = filterDrillQuestions({ kind: 'confusable', theme })
  } else if (mode === 'passage') {
    pool = filterDrillQuestions({ kind: 'passage' })
    if (theme === 'passage-hokkaido') {
      pool = filterDrillQuestions({ theme: 'passage-hokkaido' })
    }
  } else {
    pool = [...drillQuestions]
  }

  if (!pool.length) return []

  const weighted = pool.map((q) => ({
    q,
    w: drillWeight(q.id, drillProgress, today) + (mode === 'mistakes' ? 0 : 1),
  }))

  const picked = []
  const bag = [...weighted]
  while (bag.length && picked.length < count) {
    const total = bag.reduce((s, x) => s + x.w, 0)
    let roll = Math.random() * total
    let idx = 0
    for (; idx < bag.length; idx += 1) {
      roll -= bag[idx].w
      if (roll <= 0) break
    }
    idx = Math.min(idx, bag.length - 1)
    picked.push(bag[idx].q)
    bag.splice(idx, 1)
  }

  return shuffle(picked.slice(0, count)).map((q) => withShuffledOptions(q))
}

export function describeDrillProgress(drillProgress = {}, today = todayKey()) {
  const due = countDueDrills(drillProgress, today)
  const touched = ALL_DRILL_IDS.filter((id) => drillProgress[id]).length
  const mastered = ALL_DRILL_IDS.filter((id) => {
    const e = normalizeEntry(drillProgress[id], today)
    return e && e.status === 'learned'
  }).length
  return { due, touched, mastered, total: ALL_DRILL_IDS.length }
}

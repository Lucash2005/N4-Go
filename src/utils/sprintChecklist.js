/**
 * 20-day exam sprint checklist (aligned with studyPhases sprint window).
 */
import { STUDY_PHASES } from '../data/studyPhases'
import { loadJSON, saveJSON, todayKey } from './storage'

const STORE_KEY = 'sprint-checklist'

/**
 * @typedef {{ id: string, label: string, href?: string, done?: boolean }} SprintTask
 * @typedef {{ day: number, date: string, theme: string, focus: string, tasks: SprintTask[] }} SprintDayPlan
 */

function parseDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDay(dt) {
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function addDaysIso(iso, n) {
  const dt = parseDay(iso)
  dt.setDate(dt.getDate() + n)
  return formatDay(dt)
}

function daysBetween(a, b) {
  const ms = parseDay(b) - parseDay(a)
  return Math.round(ms / 86400000)
}

export function getSprintWindow() {
  const phase = STUDY_PHASES.find((p) => p.id === 'sprint') || STUDY_PHASES[STUDY_PHASES.length - 1]
  return { start: phase.start, end: phase.end }
}

/** Theme bands for the 20-day plan. */
function themeForDay(dayIndex) {
  if (dayIndex <= 5) {
    return {
      theme: '動詞變化・授受表現',
      focus: 'て形／ない形、あげる／もらう／くれる、義務與許可。',
    }
  }
  if (dayIndex <= 10) {
    return {
      theme: '高頻副詞・接續詞',
      focus: '條件假定（ば／たら／と／なら）、對照與接續句型。',
    }
  }
  if (dayIndex <= 15) {
    return {
      theme: '高頻單字盲刷',
      focus: '錯題＋弱點單字高速評分；限時小測驗加壓。',
    }
  }
  return {
    theme: '錯題清零・模擬測驗',
    focus: '錯題本歸零、衝刺卡清完、計時模考與限時小考。',
  }
}

/**
 * Build the fixed 20-day template (dates from sprint phase start).
 * @returns {SprintDayPlan[]}
 */
export function buildSprintDayPlans() {
  const { start } = getSprintWindow()
  const plans = []
  for (let i = 1; i <= 20; i += 1) {
    const date = addDaysIso(start, i - 1)
    const band = themeForDay(i)
    /** @type {SprintTask[]} */
    const tasks = [
      {
        id: 'sprint-cards',
        label: '衝刺字卡（錯題＋弱點＋高頻文法）',
        href: '/flashcards?mode=sprint',
      },
      {
        id: 'quick-mock',
        label: i >= 16 ? '限時小考 18 題／10 分' : '限時小考（加壓）',
        href: '/quiz?mode=quick',
      },
      {
        id: 'wrong-bank',
        label: '錯題本回顧',
        href: '/wrong-bank',
      },
    ]
    if (i <= 5) {
      tasks.push({
        id: 'forms-drill',
        label: '動詞て形／ない形活用',
        href: '/flashcards?mode=today-grammar',
      })
    } else if (i <= 10) {
      tasks.push({
        id: 'grammar-core',
        label: '假定・接續文法對照',
        href: '/flashcards?mode=sprint',
      })
    } else if (i <= 15) {
      tasks.push({
        id: 'vocab-blind',
        label: '今日單字盲刷一輪',
        href: '/flashcards?mode=today-vocab',
      })
    } else {
      tasks.push({
        id: 'full-mock',
        label: '計時模考（語彙／讀解／聽解擇一）',
        href: '/mock',
      })
    }
    plans.push({
      day: i,
      date,
      theme: band.theme,
      focus: band.focus,
      tasks,
    })
  }
  return plans
}

function emptyStore() {
  return {
    start: getSprintWindow().start,
    end: getSprintWindow().end,
    /** @type {Record<string, Record<string, boolean>>} */
    done: {},
    updatedAt: '',
  }
}

export function loadSprintChecklist() {
  const raw = loadJSON(STORE_KEY, null)
  const base = emptyStore()
  if (!raw || typeof raw !== 'object') return base
  return {
    start: String(raw.start || base.start),
    end: String(raw.end || base.end),
    done: raw.done && typeof raw.done === 'object' ? raw.done : {},
    updatedAt: String(raw.updatedAt || ''),
  }
}

export function saveSprintChecklist(store) {
  const next = {
    start: store.start || getSprintWindow().start,
    end: store.end || getSprintWindow().end,
    done: store.done || {},
    updatedAt: new Date().toISOString(),
  }
  saveJSON(STORE_KEY, next)
  return next
}

export function isSprintTaskDone(store, date, taskId) {
  return Boolean(store?.done?.[date]?.[taskId])
}

export function setSprintTaskDone(date, taskId, done = true, store = loadSprintChecklist()) {
  const dayMap = { ...(store.done[date] || {}) }
  if (done) dayMap[taskId] = true
  else delete dayMap[taskId]
  const nextDone = { ...store.done, [date]: dayMap }
  if (!Object.keys(dayMap).length) delete nextDone[date]
  return saveSprintChecklist({ ...store, done: nextDone })
}

export function toggleSprintTask(date, taskId, store = loadSprintChecklist()) {
  const cur = isSprintTaskDone(store, date, taskId)
  return setSprintTaskDone(date, taskId, !cur, store)
}

/**
 * Progress summary for UI.
 * @param {ReturnType<typeof loadSprintChecklist>} [store]
 * @param {string} [today]
 */
export function getSprintChecklistStats(store = loadSprintChecklist(), today = todayKey()) {
  const plans = buildSprintDayPlans()
  let totalTasks = 0
  let doneTasks = 0
  let daysFullyDone = 0
  let todayPlan = plans.find((p) => p.date === today) || null

  for (const plan of plans) {
    let dayDone = 0
    for (const task of plan.tasks) {
      totalTasks += 1
      if (isSprintTaskDone(store, plan.date, task.id)) {
        doneTasks += 1
        dayDone += 1
      }
    }
    if (dayDone === plan.tasks.length) daysFullyDone += 1
  }

  const { start, end } = getSprintWindow()
  const dayIndex = daysBetween(start, today) + 1
  const inWindow = today >= start && today <= end

  return {
    plans,
    todayPlan,
    totalTasks,
    doneTasks,
    daysFullyDone,
    dayIndex: inWindow ? Math.min(20, Math.max(1, dayIndex)) : dayIndex,
    inWindow,
    start,
    end,
    percent: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
  }
}

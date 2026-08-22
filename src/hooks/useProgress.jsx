import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_TASKS, TARGETS } from '../data/config'
import { grammar } from '../data/grammar'
import { GRAMMAR_PATH_VERSION, getGrammarPath, monthGrammarProgress } from '../data/grammarPath'
import { FORM_CARDS } from '../data/verbForms'
import { vocabulary } from '../data/vocabulary'
import {
  buildDailyPlan,
  DAILY_QUOTA,
  emptyDailyPlan,
  getLiveReviewIds,
  grammarQueueIds,
  resolveCards,
  seededShuffle,
} from '../utils/dailyPlan'
import {
  applyGrade,
  entryFromManualStatus,
  isLearned,
  normalizeEntry,
  countLearnedSince,
  addDays,
} from '../utils/srs'
import { todayKey } from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'
import { getPlanProgress } from '../utils/planProgress'
import {
  countDueDrills,
  describeDrillProgress,
  recordDrillResult,
} from '../utils/drillProgress'

const ProgressContext = createContext(null)
const ALL_CARDS = [...vocabulary, ...grammar, ...FORM_CARDS]

function catchUpVocabQuota(cardProgress) {
  const learnedVocab = vocabulary.filter((v) => isLearned(cardProgress[v.id])).length
  const learnedGrammar = grammar.filter((g) => isLearned(cardProgress[g.id])).length
  const since = addDays(todayKey(), -6)
  const weekVocabGain = countLearnedSince(
    cardProgress,
    vocabulary.map((v) => v.id),
    since,
  )
  const plan = getPlanProgress({
    learnedVocab,
    learnedGrammar,
    quizRate: null,
    appVocab: vocabulary.length,
    appGrammar: grammar.length,
    weekVocabGain,
  })
  if (!plan.behind.vocab) return DAILY_QUOTA.vocab
  return Math.min(
    40,
    Math.max(20, Math.ceil(plan.month.vocabRemaining / Math.max(7, plan.month.daysLeft))),
  )
}

function ensurePlan(plan, cardProgress) {
  const today = todayKey()
  const vocabQuota = catchUpVocabQuota(cardProgress)
  if (
    plan?.date === today &&
    Array.isArray(plan.vocabIds) &&
    Array.isArray(plan.formIds) &&
    plan.grammarPathVersion === GRAMMAR_PATH_VERSION
  ) {
    // If catch-up needs more vocab than today's plan holds, rebuild once
    if (vocabQuota > (plan.vocabQuota || DAILY_QUOTA.vocab) || plan.vocabIds.length < vocabQuota) {
      return buildDailyPlan(today, cardProgress, 'catch-up', { vocabQuota })
    }
    return plan
  }
  return buildDailyPlan(today, cardProgress, '', { vocabQuota })
}

function withTaskDone(tasks, id, done) {
  return tasks.map((t) => (t.id === id ? { ...t, done } : t))
}

function sameIds(a = [], b = []) {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

function findCardsForAnswer(answerText = '') {
  const text = answerText.trim()
  if (!text) return []
  const byId = ALL_CARDS.find((c) => c.id === text)
  if (byId) return [byId]
  return ALL_CARDS.filter(
    (c) =>
      c.word === text ||
      c.reading === text ||
      c.word?.includes(text) ||
      (text.length >= 2 && c.meaning?.includes(text)),
  ).slice(0, 2)
}

export function ProgressProvider({ children }) {
  const [sessionSeed] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [cardProgress, setCardProgress] = useLocalStorage('card-progress', {})
  const [dailyTasks, setDailyTasks] = useLocalStorage('daily-tasks', {
    date: todayKey(),
    tasks: DEFAULT_TASKS,
  })
  const [dailyPlan, setDailyPlan] = useLocalStorage('daily-plan', emptyDailyPlan(todayKey()))
  const [quizStats, setQuizStats] = useLocalStorage('quiz-stats', {
    attempted: 0,
    correct: 0,
    lastScore: null,
  })
  const [drillProgress, setDrillProgress] = useLocalStorage('drill-progress', {})
  const [drillStats, setDrillStats] = useLocalStorage('drill-stats', {
    attempted: 0,
    correct: 0,
    lastScore: null,
  })

  // Reset / create today's plan & tasks
  useEffect(() => {
    const today = todayKey()
    if (dailyTasks.date !== today) {
      setDailyTasks({
        date: today,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }
    const vocabQuota = catchUpVocabQuota(cardProgress)
    const needsRebuild =
      dailyPlan.date !== today ||
      dailyPlan.grammarPathVersion !== GRAMMAR_PATH_VERSION ||
      (dailyPlan.vocabIds?.length || 0) < vocabQuota ||
      (dailyPlan.vocabQuota || DAILY_QUOTA.vocab) < vocabQuota
    if (needsRebuild) {
      setDailyPlan(buildDailyPlan(today, cardProgress, '', { vocabQuota }))
    }
  }, [dailyTasks.date, dailyPlan.date, dailyPlan.grammarPathVersion, dailyPlan.vocabIds, dailyPlan.vocabQuota, cardProgress, setDailyTasks, setDailyPlan])

  // Keep review queue in sync with due SRS cards
  useEffect(() => {
    if (dailyPlan.date !== todayKey()) return
    const liveReviewIds = getLiveReviewIds(cardProgress, DAILY_QUOTA.review)
    setDailyPlan((prev) => {
      if (prev.date !== todayKey()) return prev
      if (sameIds(prev.reviewIds, liveReviewIds)) return prev
      const reviewSet = new Set(liveReviewIds)
      return {
        ...prev,
        reviewIds: liveReviewIds,
        studiedIds: (prev.studiedIds || []).filter(
          (id) =>
            prev.vocabIds.includes(id) ||
            prev.grammarIds.includes(id) ||
            (prev.formIds || []).includes(id) ||
            reviewSet.has(id),
        ),
      }
    })
  }, [cardProgress, dailyPlan.date, setDailyPlan])

  // Auto-complete checklist from plan progress
  useEffect(() => {
    const plan = ensurePlan(dailyPlan, cardProgress)
    if (plan.date !== todayKey()) return

    const studied = new Set(plan.studiedIds || [])
    const listened = new Set(plan.listenedIds || [])
    const liveReviewIds = getLiveReviewIds(cardProgress, DAILY_QUOTA.review)

    const vocabDone =
      plan.vocabIds.length > 0 && plan.vocabIds.every((id) => studied.has(id))
    const grammarQueue = grammarQueueIds(plan)
    const grammarDone =
      grammarQueue.length > 0 && grammarQueue.every((id) => studied.has(id))
    const reviewDone =
      liveReviewIds.length === 0 || liveReviewIds.every((id) => studied.has(id))
    const listeningDone =
      plan.vocabIds.length > 0 &&
      plan.vocabIds.filter((id) => listened.has(id)).length >=
        Math.min(10, plan.vocabIds.length)

    setDailyTasks((prev) => {
      if (prev.date !== todayKey()) return prev
      let tasks = prev.tasks
      const next = {
        'vocab-15': vocabDone,
        'grammar-2': grammarDone,
        'review-10': reviewDone && liveReviewIds.length > 0,
        'listening-15': listeningDone || tasks.find((t) => t.id === 'listening-15')?.done,
      }
      let changed = false
      tasks = tasks.map((t) => {
        if (next[t.id] == null) return t
        if (t.id === 'listening-15') {
          if (next[t.id] && !t.done) {
            changed = true
            return { ...t, done: true }
          }
          return t
        }
        if (t.id === 'review-10') {
          // Empty due queue: don't force incomplete forever; leave manual
          if (liveReviewIds.length === 0) return t
        }
        if (t.done !== next[t.id]) {
          changed = true
          return { ...t, done: next[t.id] }
        }
        return t
      })
      return changed ? { ...prev, tasks } : prev
    })
  }, [dailyPlan, cardProgress, setDailyTasks])

  const value = useMemo(() => {
    const plan = ensurePlan(dailyPlan, cardProgress)
    const studied = new Set(plan.studiedIds || [])
    const listened = new Set(plan.listenedIds || [])
    const liveReviewIds = getLiveReviewIds(cardProgress, DAILY_QUOTA.review)
    const today = todayKey()

    const learnedVocab = vocabulary.filter((v) => isLearned(cardProgress[v.id], today)).length
    const learnedGrammar = grammar.filter((g) => isLearned(cardProgress[g.id], today)).length
    const learningVocab = vocabulary.filter((v) => {
      const e = normalizeEntry(cardProgress[v.id], today)
      return e && e.status === 'learning'
    }).length
    const weekSince = addDays(today, -6)
    const weekVocabGain = countLearnedSince(
      cardProgress,
      vocabulary.map((v) => v.id),
      weekSince,
      today,
    )
    const weekGrammarGain = countLearnedSince(
      cardProgress,
      grammar.map((g) => g.id),
      weekSince,
      today,
    )
    const reviewCount = liveReviewIds.length
    const dueCount = getLiveReviewIds(cardProgress, 0).length

    function markStudied(id) {
      setDailyPlan((prev) => {
        const current = ensurePlan(prev, cardProgress)
        if ((current.studiedIds || []).includes(id)) return current
        return {
          ...current,
          studiedIds: [...(current.studiedIds || []), id],
        }
      })
    }

    function setCardStatus(id, status) {
      setCardProgress((prev) => {
        const next = { ...prev }
        const entry = entryFromManualStatus(status, today)
        if (!entry) delete next[id]
        else next[id] = entry
        return next
      })
      markStudied(id)
    }

    function gradeCard(id, grade) {
      setCardProgress((prev) => ({
        ...prev,
        [id]: applyGrade(prev[id], grade, today),
      }))
      markStudied(id)
    }

    function scheduleAgain(id) {
      gradeCard(id, 'again')
    }

    function toggleTask(id) {
      setDailyTasks((prev) => ({
        ...prev,
        date: todayKey(),
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }))
    }

    function setTaskDone(id, done = true) {
      setDailyTasks((prev) => ({
        ...prev,
        date: todayKey(),
        tasks: withTaskDone(prev.tasks, id, done),
      }))
    }

    function recordQuiz(correct, total, missedAnswers = []) {
      setQuizStats((prev) => ({
        attempted: prev.attempted + total,
        correct: prev.correct + correct,
        lastScore: { correct, total, at: new Date().toISOString() },
      }))

      if (missedAnswers.length) {
        setCardProgress((prev) => {
          const next = { ...prev }
          for (const answer of missedAnswers) {
            for (const card of findCardsForAnswer(answer)) {
              next[card.id] = applyGrade(next[card.id], 'again', today)
            }
          }
          return next
        })
      }
    }

    function recordDrillAnswer(drillId, correct) {
      setDrillProgress((prev) => recordDrillResult(prev, drillId, correct, today))
      setDrillStats((prev) => ({
        attempted: prev.attempted + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastScore: {
          drillId,
          correct,
          at: new Date().toISOString(),
        },
      }))
    }

    const dueDrillCount = countDueDrills(drillProgress, today)
    const drillSummary = describeDrillProgress(drillProgress, today)

    function markListened(id) {
      setDailyPlan((prev) => {
        const current = ensurePlan(prev, cardProgress)
        if ((current.listenedIds || []).includes(id)) return current
        return {
          ...current,
          listenedIds: [...(current.listenedIds || []), id],
        }
      })
    }

    function reshuffleTodayPlan() {
      const day = todayKey()
      const vocabQuota = catchUpVocabQuota(cardProgress)
      setDailyPlan(buildDailyPlan(day, cardProgress, `reshuffle:${Date.now()}`, { vocabQuota }))
      setDailyTasks({
        date: day,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }

    function getEntry(id) {
      return normalizeEntry(cardProgress[id], today)
    }

    const vocabCards = seededShuffle(
      resolveCards(plan.vocabIds),
      `session:${sessionSeed}:vocab`,
    )
    const grammarQueue = grammarQueueIds(plan)
    const grammarCards = resolveCards(grammarQueue)
    const reviewCards = seededShuffle(
      resolveCards(liveReviewIds),
      `session:${sessionSeed}:review`,
    )

    const learnedGrammarIds = new Set(
      grammar.filter((g) => isLearned(cardProgress[g.id], today)).map((g) => g.id),
    )
    const monthPath = monthGrammarProgress(learnedGrammarIds, plan.date || today)
    const nextGrammar = resolveCards(monthPath.nextIds)

    const vocabStudied = plan.vocabIds.filter((id) => studied.has(id)).length
    const grammarStudied = grammarQueue.filter((id) => studied.has(id)).length
    const reviewStudied = liveReviewIds.filter((id) => studied.has(id)).length
    const listenCount = plan.vocabIds.filter((id) => listened.has(id)).length

    return {
      cardProgress,
      setCardStatus,
      gradeCard,
      scheduleAgain,
      getEntry,
      dailyTasks: dailyTasks.tasks,
      toggleTask,
      setTaskDone,
      quizStats,
      recordQuiz,
      drillProgress,
      drillStats,
      dueDrillCount,
      drillSummary,
      recordDrillAnswer,
      learnedVocab,
      learningVocab,
      weekVocabGain,
      weekGrammarGain,
      learnedGrammar,
      reviewCount,
      dueCount,
      targets: TARGETS,
      totalVocabInApp: vocabulary.length,
      totalGrammarInApp: grammar.length,
      dailyPlan: { ...plan, reviewIds: liveReviewIds },
      todayVocab: vocabCards,
      todayGrammar: grammarCards,
      todayReview: reviewCards,
      vocabStudied,
      grammarStudied,
      reviewStudied,
      listenCount,
      listenTarget: Math.min(10, plan.vocabIds.length || 10),
      isStudied: (id) => studied.has(id),
      markStudied,
      markListened,
      reshuffleTodayPlan,
      grammarPath: getGrammarPath(plan.date || today),
      monthGrammarProgress: { ...monthPath, next: nextGrammar },
    }
  }, [
    cardProgress,
    dailyTasks,
    dailyPlan,
    quizStats,
    drillProgress,
    drillStats,
    sessionSeed,
    setCardProgress,
    setDailyTasks,
    setDailyPlan,
    setQuizStats,
    setDrillProgress,
    setDrillStats,
  ])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

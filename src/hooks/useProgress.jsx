import { createContext, useContext, useEffect, useMemo } from 'react'
import { DEFAULT_TASKS, TARGETS } from '../data/config'
import { grammar } from '../data/grammar'
import { vocabulary } from '../data/vocabulary'
import { buildDailyPlan, emptyDailyPlan, resolveCards } from '../utils/dailyPlan'
import { todayKey } from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'

const ProgressContext = createContext(null)

function ensurePlan(plan, cardProgress) {
  const today = todayKey()
  if (plan?.date === today && Array.isArray(plan.vocabIds)) return plan
  return buildDailyPlan(today, cardProgress)
}

function withTaskDone(tasks, id, done) {
  return tasks.map((t) => (t.id === id ? { ...t, done } : t))
}

export function ProgressProvider({ children }) {
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

  // Reset / create today's plan & tasks
  useEffect(() => {
    const today = todayKey()
    if (dailyTasks.date !== today) {
      setDailyTasks({
        date: today,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }
    if (dailyPlan.date !== today) {
      setDailyPlan(buildDailyPlan(today, cardProgress))
    }
  }, [dailyTasks.date, dailyPlan.date, cardProgress, setDailyTasks, setDailyPlan])

  // Auto-complete checklist from plan progress
  useEffect(() => {
    const plan = ensurePlan(dailyPlan, cardProgress)
    if (plan.date !== todayKey()) return

    const studied = new Set(plan.studiedIds || [])
    const listened = new Set(plan.listenedIds || [])

    const vocabDone =
      plan.vocabIds.length > 0 && plan.vocabIds.every((id) => studied.has(id))
    const grammarDone =
      plan.grammarIds.length > 0 && plan.grammarIds.every((id) => studied.has(id))
    const reviewTarget = plan.reviewIds
    const reviewDone =
      reviewTarget.length > 0 && reviewTarget.every((id) => studied.has(id))
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
        'review-10': reviewDone,
        'listening-15': listeningDone || tasks.find((t) => t.id === 'listening-15')?.done,
      }
      let changed = false
      tasks = tasks.map((t) => {
        if (next[t.id] == null) return t
        // Auto-check when done; don't uncheck manual listening if already done
        if (t.id === 'listening-15') {
          if (next[t.id] && !t.done) {
            changed = true
            return { ...t, done: true }
          }
          return t
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

    const learnedVocab = vocabulary.filter((v) => cardProgress[v.id] === 'learned').length
    const learnedGrammar = grammar.filter((g) => cardProgress[g.id] === 'learned').length
    const reviewCount = Object.values(cardProgress).filter((s) => s === 'review').length

    function setCardStatus(id, status) {
      setCardProgress((prev) => {
        const next = { ...prev }
        if (!status) delete next[id]
        else next[id] = status
        return next
      })
      markStudied(id)
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

    function recordQuiz(correct, total) {
      setQuizStats((prev) => ({
        attempted: prev.attempted + total,
        correct: prev.correct + correct,
        lastScore: { correct, total, at: new Date().toISOString() },
      }))
    }

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
      const today = todayKey()
      setDailyPlan(buildDailyPlan(today, cardProgress, `reshuffle:${Date.now()}`))
      setDailyTasks({
        date: today,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }

    const vocabCards = resolveCards(plan.vocabIds)
    const grammarCards = resolveCards(plan.grammarIds)
    const reviewCards = resolveCards(plan.reviewIds)

    const vocabStudied = plan.vocabIds.filter((id) => studied.has(id)).length
    const grammarStudied = plan.grammarIds.filter((id) => studied.has(id)).length
    const reviewStudied = plan.reviewIds.filter((id) => studied.has(id)).length
    const listenCount = plan.vocabIds.filter((id) => listened.has(id)).length

    return {
      cardProgress,
      setCardStatus,
      dailyTasks: dailyTasks.tasks,
      toggleTask,
      setTaskDone,
      quizStats,
      recordQuiz,
      learnedVocab,
      learnedGrammar,
      reviewCount,
      targets: TARGETS,
      totalVocabInApp: vocabulary.length,
      totalGrammarInApp: grammar.length,
      dailyPlan: plan,
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
    }
  }, [
    cardProgress,
    dailyTasks,
    dailyPlan,
    quizStats,
    setCardProgress,
    setDailyTasks,
    setDailyPlan,
    setQuizStats,
  ])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DAILY_QUOTA, DEFAULT_TASKS, TARGETS } from '../data/config'
import { vocabulary } from '../data/vocabulary'
import { applyGrade, getDueIds, isLearned, normalizeEntry } from '../utils/srs'
import { todayKey } from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'

const ProgressContext = createContext(null)

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildDailyPlan(date, cardProgress, seedExtra = '') {
  const due = getDueIds(
    cardProgress,
    vocabulary.map((v) => v.id),
    DAILY_QUOTA.review,
    date,
  )
  const dueSet = new Set(due)
  const fresh = shuffle(vocabulary.filter((v) => !cardProgress[v.id] && !dueSet.has(v.id))).slice(
    0,
    DAILY_QUOTA.vocab,
  )
  // fill remaining with not-due learning cards
  const filler = shuffle(
    vocabulary.filter((v) => !dueSet.has(v.id) && !fresh.find((f) => f.id === v.id)),
  ).slice(0, Math.max(0, DAILY_QUOTA.vocab - fresh.length))

  return {
    date,
    seedExtra,
    vocabIds: [...fresh, ...filler].slice(0, DAILY_QUOTA.vocab).map((v) => v.id),
    reviewIds: due,
    studiedIds: [],
    practiceDone: { reading: false, listening: false, speaking: false, writing: false },
  }
}

export function ProgressProvider({ children }) {
  const [sessionSeed] = useState(() => `${Date.now()}-${Math.random()}`)
  const [cardProgress, setCardProgress] = useLocalStorage('card-progress', {})
  const [dailyTasks, setDailyTasks] = useLocalStorage('daily-tasks', {
    date: todayKey(),
    tasks: DEFAULT_TASKS,
  })
  const [dailyPlan, setDailyPlan] = useLocalStorage('daily-plan', buildDailyPlan(todayKey(), {}))
  const [quizStats, setQuizStats] = useLocalStorage('quiz-stats', {
    attempted: 0,
    correct: 0,
    lastScore: null,
  })
  const [sectionStats, setSectionStats] = useLocalStorage('section-stats', {
    reading: 0,
    listening: 0,
    speaking: 0,
    writing: 0,
  })

  useEffect(() => {
    const today = todayKey()
    if (dailyTasks.date !== today) {
      setDailyTasks({ date: today, tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })) })
    }
    if (dailyPlan.date !== today) {
      setDailyPlan(buildDailyPlan(today, cardProgress))
    }
  }, [dailyTasks.date, dailyPlan.date, cardProgress, setDailyTasks, setDailyPlan])

  // Sync due review queue
  useEffect(() => {
    if (dailyPlan.date !== todayKey()) return
    const live = getDueIds(
      cardProgress,
      vocabulary.map((v) => v.id),
      DAILY_QUOTA.review,
    )
    setDailyPlan((prev) => {
      if (prev.date !== todayKey()) return prev
      if (prev.reviewIds.join() === live.join()) return prev
      return { ...prev, reviewIds: live }
    })
  }, [cardProgress, dailyPlan.date, setDailyPlan])

  const value = useMemo(() => {
    const today = todayKey()
    const plan =
      dailyPlan.date === today ? dailyPlan : buildDailyPlan(today, cardProgress, sessionSeed)
    const studied = new Set(plan.studiedIds || [])
    const learnedCount = vocabulary.filter((v) => isLearned(cardProgress[v.id], today)).length
    const dueCount = getDueIds(
      cardProgress,
      vocabulary.map((v) => v.id),
      0,
    ).length

    const vocabMap = new Map(vocabulary.map((v) => [v.id, v]))
    const todayVocab = shuffle(plan.vocabIds.map((id) => vocabMap.get(id)).filter(Boolean))
    const todayReview = plan.reviewIds.map((id) => vocabMap.get(id)).filter(Boolean)

    function markStudied(id) {
      setDailyPlan((prev) => {
        const current = prev.date === today ? prev : buildDailyPlan(today, cardProgress)
        if ((current.studiedIds || []).includes(id)) return current
        return { ...current, studiedIds: [...(current.studiedIds || []), id] }
      })
    }

    function gradeCard(id, grade) {
      setCardProgress((prev) => ({ ...prev, [id]: applyGrade(prev[id], grade, today) }))
      markStudied(id)
    }

    function getEntry(id) {
      return normalizeEntry(cardProgress[id], today)
    }

    function toggleTask(id) {
      setDailyTasks((prev) => ({
        ...prev,
        date: today,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }))
    }

    function setTaskDone(id, done = true) {
      setDailyTasks((prev) => ({
        ...prev,
        date: today,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done } : t)),
      }))
    }

    function recordPractice(section) {
      setSectionStats((prev) => ({ ...prev, [section]: (prev[section] || 0) + 1 }))
      setDailyPlan((prev) => {
        const current = prev.date === today ? prev : buildDailyPlan(today, cardProgress)
        return {
          ...current,
          practiceDone: { ...current.practiceDone, [section]: true },
        }
      })
      if (section === 'reading') setTaskDone('reading-1', true)
      if (section === 'listening') setTaskDone('listening-1', true)
      if (section === 'speaking' || section === 'writing') setTaskDone('speaking-or-writing', true)
    }

    function recordQuiz(correct, total) {
      setQuizStats((prev) => ({
        attempted: prev.attempted + total,
        correct: prev.correct + correct,
        lastScore: { correct, total, at: new Date().toISOString() },
      }))
    }

    function reshuffleTodayPlan() {
      setDailyPlan(buildDailyPlan(today, cardProgress, `reshuffle:${Date.now()}`))
      setDailyTasks({ date: today, tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })) })
    }

    // Auto complete vocab task
    const vocabStudied = plan.vocabIds.filter((id) => studied.has(id)).length
    const reviewStudied = plan.reviewIds.filter((id) => studied.has(id)).length
    if (
      plan.vocabIds.length > 0 &&
      plan.vocabIds.every((id) => studied.has(id)) &&
      !dailyTasks.tasks.find((t) => t.id === 'vocab-20')?.done
    ) {
      // deferred via effect-like call in consumer; set here safely
    }

    return {
      cardProgress,
      gradeCard,
      getEntry,
      dailyTasks: dailyTasks.tasks,
      toggleTask,
      setTaskDone,
      quizStats,
      recordQuiz,
      sectionStats,
      recordPractice,
      learnedCount,
      dueCount,
      targets: TARGETS,
      totalVocab: vocabulary.length,
      todayVocab,
      todayReview,
      vocabStudied,
      reviewStudied,
      isStudied: (id) => studied.has(id),
      markStudied,
      reshuffleTodayPlan,
      practiceDone: plan.practiceDone || {},
    }
  }, [
    cardProgress,
    dailyTasks,
    dailyPlan,
    quizStats,
    sectionStats,
    sessionSeed,
    setCardProgress,
    setDailyTasks,
    setDailyPlan,
    setQuizStats,
    setSectionStats,
  ])

  // Auto-check vocab task when all studied
  useEffect(() => {
    const today = todayKey()
    if (dailyPlan.date !== today) return
    const studied = new Set(dailyPlan.studiedIds || [])
    const vocabDone =
      dailyPlan.vocabIds?.length > 0 && dailyPlan.vocabIds.every((id) => studied.has(id))
    if (!vocabDone) return
    setDailyTasks((prev) => {
      if (prev.date !== today) return prev
      const task = prev.tasks.find((t) => t.id === 'vocab-20')
      if (!task || task.done) return prev
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === 'vocab-20' ? { ...t, done: true } : t)),
      }
    })
  }, [dailyPlan, setDailyTasks])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

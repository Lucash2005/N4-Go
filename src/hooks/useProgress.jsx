import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_TASKS, TARGETS } from '../data/config'
import { grammar } from '../data/grammar'
import { GRAMMAR_PATH_VERSION, getGrammarPath, monthGrammarProgress } from '../data/grammarPath'
import { FORM_CARDS } from '../data/verbForms'
import {
  clearVocabularyCache,
  getVocabulary,
  hasPendingVocabUpdate,
  loadVocabulary,
} from '../data/vocabulary'
import {
  buildDailyPlan,
  DAILY_QUOTA,
  emptyDailyPlan,
  getLiveReviewIds,
  grammarQueueIds,
  resolveCards,
  seededShuffle,
  vocabLevelCounts,
} from '../utils/dailyPlan'
import {
  clearAllReports,
  exportReportsJson,
  filterOutReported,
  loadReportedCards,
  REPORT_REASONS,
  reportCard as saveReport,
  reportedIdSet,
  unreportCard as removeReport,
} from '../utils/cardReports'
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

function catchUpPlanOptions(cardProgress) {
  const vocabulary = getVocabulary()
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
  const vocabQuota = plan.behind.vocab
    ? Math.min(
        40,
        Math.max(20, Math.ceil(plan.month.vocabRemaining / Math.max(7, plan.month.daysLeft))),
      )
    : DAILY_QUOTA.vocab
  return {
    vocabQuota,
    // Prefer N5/N4 only for now — 延伸 cards have more data quality issues
    includeExtension: false,
  }
}

function ensurePlan(plan, cardProgress) {
  const today = todayKey()
  const hiddenIds = reportedIdSet()
  if (
    plan?.date === today &&
    Array.isArray(plan.vocabIds) &&
    Array.isArray(plan.formIds) &&
    plan.grammarPathVersion === GRAMMAR_PATH_VERSION
  ) {
    return plan
  }
  const catchUp = catchUpPlanOptions(cardProgress)
  return buildDailyPlan(today, cardProgress, '', { ...catchUp, hiddenIds })
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
  const allCards = [...getVocabulary(), ...grammar, ...FORM_CARDS]
  const byId = allCards.find((c) => c.id === text)
  if (byId) return [byId]
  return allCards.filter(
    (c) =>
      c.word === text ||
      c.reading === text ||
      c.word?.includes(text) ||
      (text.length >= 2 && c.meaning?.includes(text)),
  ).slice(0, 2)
}

export function ProgressProvider({ children }) {
  const [sessionSeed] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [vocabReady, setVocabReady] = useState(false)
  const [vocabError, setVocabError] = useState(null)
  const [vocabUpdatePending, setVocabUpdatePending] = useState(() => hasPendingVocabUpdate())
  const [cardProgress, setCardProgress] = useLocalStorage('card-progress', {})
  const [dailyTasks, setDailyTasks] = useLocalStorage('daily-tasks', {
    date: todayKey(),
    tasks: DEFAULT_TASKS,
  })
  const [dailyPlan, setDailyPlan] = useLocalStorage('daily-plan', emptyDailyPlan(todayKey()))
  const [reportedStore, setReportedStore] = useState(() => loadReportedCards())
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

  useEffect(() => {
    let cancelled = false
    loadVocabulary()
      .then(() => {
        if (!cancelled) setVocabReady(true)
      })
      .catch((err) => {
        if (!cancelled) setVocabError(err?.message || '詞彙載入失敗')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reset / create today's plan & tasks (after vocab loaded)
  useEffect(() => {
    if (!vocabReady) return
    const today = todayKey()
    if (dailyTasks.date !== today) {
      setDailyTasks({
        date: today,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }
    const catchUp = catchUpPlanOptions(cardProgress)
    const needsRebuild =
      dailyPlan.date !== today ||
      dailyPlan.grammarPathVersion !== GRAMMAR_PATH_VERSION
    if (needsRebuild) {
      setDailyPlan(
        buildDailyPlan(today, cardProgress, '', {
          ...catchUp,
          hiddenIds: reportedIdSet(reportedStore),
        }),
      )
    }
  }, [vocabReady, dailyTasks.date, dailyPlan.date, dailyPlan.grammarPathVersion, dailyPlan.vocabIds, dailyPlan.vocabQuota, cardProgress, reportedStore, setDailyTasks, setDailyPlan])

  // Drop reported cards from today's plan slots (quota may shrink until reshuffle)
  useEffect(() => {
    if (!vocabReady || dailyPlan.date !== todayKey()) return
    const hidden = reportedIdSet(reportedStore)
    if (!hidden.size) return
    setDailyPlan((prev) => {
      if (prev.date !== todayKey()) return prev
      const vocabIds = (prev.vocabIds || []).filter((id) => !hidden.has(id))
      const grammarIds = (prev.grammarIds || []).filter((id) => !hidden.has(id))
      const formIds = (prev.formIds || []).filter((id) => !hidden.has(id))
      const reviewIds = (prev.reviewIds || []).filter((id) => !hidden.has(id))
      const studiedIds = (prev.studiedIds || []).filter((id) => !hidden.has(id))
      const listenedIds = (prev.listenedIds || []).filter((id) => !hidden.has(id))
      if (
        sameIds(prev.vocabIds, vocabIds) &&
        sameIds(prev.grammarIds, grammarIds) &&
        sameIds(prev.formIds, formIds) &&
        sameIds(prev.reviewIds, reviewIds)
      ) {
        return prev
      }
      return {
        ...prev,
        vocabIds,
        grammarIds,
        formIds,
        reviewIds,
        studiedIds,
        listenedIds,
      }
    })
  }, [vocabReady, reportedStore, dailyPlan.date, setDailyPlan])

  // Keep review queue in sync with due SRS cards
  useEffect(() => {
    if (!vocabReady || dailyPlan.date !== todayKey()) return
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
  }, [cardProgress, dailyPlan.date, reportedStore, setDailyPlan])

  // Auto-complete checklist from plan progress
  useEffect(() => {
    if (!vocabReady) return
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
  }, [vocabReady, dailyPlan, cardProgress, setDailyTasks])

  const value = useMemo(() => {
    const vocabulary = getVocabulary()
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
      const catchUp = catchUpPlanOptions(cardProgress)
      setDailyPlan(
        buildDailyPlan(day, cardProgress, `reshuffle:${Date.now()}`, {
          ...catchUp,
          hiddenIds: reportedIdSet(reportedStore),
        }),
      )
      setDailyTasks({
        date: day,
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }

    async function applyVocabUpdate() {
      clearVocabularyCache()
      await loadVocabulary({ force: true })
      setVocabUpdatePending(false)
    }

    function catchUpTodayPlan() {
      const day = todayKey()
      const catchUp = catchUpPlanOptions(cardProgress)
      setDailyPlan(
        buildDailyPlan(day, cardProgress, `catch-up:${Date.now()}`, {
          ...catchUp,
          hiddenIds: reportedIdSet(reportedStore),
        }),
      )
    }

    function reportCardIssue(card, reasonIds, note = '', extra = {}) {
      if (!card?.id) return
      const next = saveReport(card, reasonIds, note, reportedStore, extra)
      setReportedStore(next)
    }

    function unreportCardIssue(id) {
      if (!id) return
      setReportedStore(removeReport(id, reportedStore))
    }

    function clearCardReports() {
      setReportedStore(clearAllReports())
    }

    function copyReportsExport() {
      const text = exportReportsJson(reportedStore)
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).then(() => text)
      }
      return Promise.resolve(text)
    }

    function getEntry(id) {
      return normalizeEntry(cardProgress[id], today)
    }

    const vocabCards = filterOutReported(
      seededShuffle(resolveCards(plan.vocabIds), `session:${sessionSeed}:vocab`),
      reportedStore,
    )
    const grammarQueue = grammarQueueIds(plan)
    const grammarCards = filterOutReported(resolveCards(grammarQueue), reportedStore)
    const reviewCards = filterOutReported(
      seededShuffle(resolveCards(liveReviewIds), `session:${sessionSeed}:review`),
      reportedStore,
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
    const reportedItems = Object.values(reportedStore.items || {})
    const reportedCount = reportedItems.length

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
      coreVocabInApp: vocabLevelCounts().core,
      extensionVocabInApp: vocabLevelCounts().extension,
      vocabLevelCounts: vocabLevelCounts(),
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
      catchUpTodayPlan,
      applyVocabUpdate,
      vocabUpdatePending,
      reportCardIssue,
      unreportCardIssue,
      clearCardReports,
      copyReportsExport,
      reportedItems,
      reportedCount,
      reportReasons: REPORT_REASONS,
      isCardReported: (id) => Boolean(id && reportedStore.items?.[id]),
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
    vocabReady,
    vocabUpdatePending,
    reportedStore,
    setCardProgress,
    setDailyTasks,
    setDailyPlan,
    setQuizStats,
    setDrillProgress,
    setDrillStats,
  ])

  if (vocabError) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-foam px-6 text-center text-ink">
        <p className="font-display text-lg font-bold">詞彙載入失敗</p>
        <p className="text-sm text-ink-soft">{vocabError}</p>
        <button
          type="button"
          className="rounded-2xl bg-sea px-4 py-2 text-white"
          onClick={() => window.location.reload()}
        >
          重新整理
        </button>
      </div>
    )
  }

  if (!vocabReady) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-foam text-ink">
        <p className="font-display text-lg font-bold">N4 Go</p>
        <p className="text-sm text-ink-soft">載入詞彙資料中…</p>
      </div>
    )
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

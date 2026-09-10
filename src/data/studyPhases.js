/**
 * Strict 3-phase JLPT N4 prep timeline (exam early December 2026).
 * Quotas are study-day targets; SRS still drives review spacing.
 */

/** @typedef {'foundation' | 'skills' | 'sprint'} StudyPhaseId */

/**
 * @typedef {{
 *   id: StudyPhaseId,
 *   title: string,
 *   period: string,
 *   start: string,
 *   end: string,
 *   goal: string,
 *   focus: string[],
 *   daily: { vocab: number, grammar: number, reading: number, listening: number, reviewShare: number },
 *   modules: string[],
 * }} StudyPhase
 */

/** @type {StudyPhase[]} */
export const STUDY_PHASES = [
  {
    id: 'foundation',
    title: '知識加速',
    period: '現在〜10/20',
    start: '2026-09-01',
    end: '2026-10-20',
    goal: '完成 N4 單字約 1500、文法約 80～120；SRS 穩定評分。',
    focus: ['單字／文法衝刺', 'SRS 評分養成', '活用て形・ない形'],
    daily: { vocab: 30, grammar: 5, reading: 0, listening: 0, reviewShare: 0.4 },
    modules: ['flashcards', 'quiz', 'drill'],
  },
  {
    id: 'skills',
    title: '技能應用・弱點打擊',
    period: '10/21〜11/15',
    start: '2026-10-21',
    end: '2026-11-15',
    goal: '解鎖讀解／聽解；每日約 40% 單字文法複習 + 30% 閱讀 + 30% 聽力。',
    focus: ['短文／情報檢索', '課題理解／重點理解', '錯題回補'],
    daily: { vocab: 12, grammar: 2, reading: 1, listening: 1, reviewShare: 0.4 },
    modules: ['flashcards', 'reading', 'listening', 'wrong-bank'],
  },
  {
    id: 'sprint',
    title: '全真模考・衝刺',
    period: '11/16〜考前',
    start: '2026-11-16',
    end: '2026-12-06',
    goal: '計時模考（語彙 30／文法讀解 55／聽解 35）；錯題本每日清。',
    focus: ['計時模考', '錯題本', '輕量維持複習'],
    daily: { vocab: 10, grammar: 2, reading: 2, listening: 2, reviewShare: 0.5 },
    modules: ['mock', 'reading', 'listening', 'wrong-bank'],
  },
]

function parseDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** @param {Date|string} [now] */
export function getStudyPhase(now = new Date()) {
  const t = typeof now === 'string' ? parseDay(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const phase of STUDY_PHASES) {
    const start = parseDay(phase.start)
    const end = parseDay(phase.end)
    if (t >= start && t <= end) return phase
  }
  if (t < parseDay(STUDY_PHASES[0].start)) return STUDY_PHASES[0]
  return STUDY_PHASES[STUDY_PHASES.length - 1]
}

/** @param {StudyPhaseId|string} id */
export function getStudyPhaseById(id) {
  return STUDY_PHASES.find((p) => p.id === id) || STUDY_PHASES[0]
}

/**
 * Exam readiness 0–100 from coverage across vocab / grammar / reading / listening.
 * @param {{
 *   learnedVocab: number,
 *   learnedGrammar: number,
 *   vocabTarget?: number,
 *   grammarTarget?: number,
 *   readingDone?: number,
 *   readingTotal?: number,
 *   listeningDone?: number,
 *   listeningTotal?: number,
 *   quizRate?: number|null,
 * }} s
 */
export function computeReadiness(s) {
  const vocabT = Math.max(1, s.vocabTarget || 1500)
  const grammarT = Math.max(1, s.grammarTarget || 80)
  const readingT = Math.max(1, s.readingTotal || 1)
  const listeningT = Math.max(1, s.listeningTotal || 1)

  const vocabPct = Math.min(1, (s.learnedVocab || 0) / vocabT)
  const grammarPct = Math.min(1, (s.learnedGrammar || 0) / grammarT)
  const readingPct = Math.min(1, (s.readingDone || 0) / readingT)
  const listeningPct = Math.min(1, (s.listeningDone || 0) / listeningT)
  const quizPct =
    s.quizRate == null || Number.isNaN(s.quizRate) ? 0.5 : Math.min(1, Math.max(0, s.quizRate / 100))

  // Phase-aware weights: early = knowledge heavy; later = skills + accuracy.
  const phase = getStudyPhase()
  const weights =
    phase.id === 'foundation'
      ? { vocab: 0.4, grammar: 0.35, reading: 0.05, listening: 0.05, quiz: 0.15 }
      : phase.id === 'skills'
        ? { vocab: 0.25, grammar: 0.2, reading: 0.2, listening: 0.2, quiz: 0.15 }
        : { vocab: 0.2, grammar: 0.15, reading: 0.2, listening: 0.2, quiz: 0.25 }

  const score =
    vocabPct * weights.vocab +
    grammarPct * weights.grammar +
    readingPct * weights.reading +
    listeningPct * weights.listening +
    quizPct * weights.quiz

  return {
    percent: Math.round(score * 1000) / 10,
    parts: {
      vocab: Math.round(vocabPct * 100),
      grammar: Math.round(grammarPct * 100),
      reading: Math.round(readingPct * 100),
      listening: Math.round(listeningPct * 100),
      quiz: Math.round(quizPct * 100),
    },
    phase,
    weights,
  }
}

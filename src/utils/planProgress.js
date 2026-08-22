import { EXAM_DATE, TARGETS } from '../data/config'
import { monthlyMilestones } from '../data/schedule'

/** @param {Date} [now] */
export function monthKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Interpolate expected vocab/grammar between monthly checkpoints.
 * @param {{ learnedVocab: number, learnedGrammar: number, quizRate: number | null, appVocab: number, appGrammar: number }} stats
 * @param {Date} [now]
 */
export function getPlanProgress(stats, now = new Date()) {
  const points = monthlyMilestones.map((m) => ({
    key: m.month,
    date: parseMonthEnd(m.month),
    vocab: m.vocabTarget,
    grammar: m.grammarTarget,
    quizRate: m.quizRateTarget,
  }))

  // Starting point: July end ≈ 0
  const start = {
    key: '2026-07',
    date: new Date('2026-07-31T23:59:59+09:00'),
    vocab: 0,
    grammar: 0,
    quizRate: null,
  }
  const series = [start, ...points]

  const expected = interpolateAt(series, now)
  const currentKey = monthKey(now)
  const currentMilestone =
    monthlyMilestones.find((m) => m.month === currentKey) ||
    monthlyMilestones.find((m) => m.month > currentKey) ||
    monthlyMilestones[monthlyMilestones.length - 1]

  const prevMilestone =
    [...monthlyMilestones].reverse().find((m) => m.month < currentKey) || null

  const vocabExpected = Math.round(expected.vocab)
  const grammarExpected = Math.round(expected.grammar)

  // Cap "reachable now" by what the app currently contains
  const vocabCap = Math.min(TARGETS.vocabulary, stats.appVocab)
  const grammarCap = Math.min(TARGETS.grammar, stats.appGrammar)

  const vocabGap = vocabExpected - stats.learnedVocab
  const grammarGap = grammarExpected - stats.learnedGrammar

  const vocabBehind = vocabGap > Math.max(5, vocabExpected * 0.15)
  const grammarBehind = grammarGap > Math.max(2, grammarExpected * 0.15)

  const quizBehind =
    expected.quizRate != null &&
    stats.quizRate != null &&
    stats.quizRate < expected.quizRate - 10

  const daysToExam = Math.max(0, Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86400000))
  const severity = vocabBehind || grammarBehind ? (vocabGap > 150 || grammarGap > 15 ? 'high' : 'mid') : 'ok'

  return {
    currentKey,
    currentMilestone,
    prevMilestone,
    expected: {
      vocab: vocabExpected,
      grammar: grammarExpected,
      quizRate: expected.quizRate,
    },
    actual: {
      vocab: stats.learnedVocab,
      grammar: stats.learnedGrammar,
      quizRate: stats.quizRate,
    },
    gap: {
      vocab: vocabGap,
      grammar: grammarGap,
      quizRate:
        expected.quizRate != null && stats.quizRate != null
          ? expected.quizRate - stats.quizRate
          : null,
    },
    caps: { vocab: vocabCap, grammar: grammarCap },
    behind: { vocab: vocabBehind, grammar: grammarBehind, quiz: Boolean(quizBehind) },
    severity,
    daysToExam,
    remedies: buildRemedies({
      severity,
      vocabBehind,
      grammarBehind,
      quizBehind: Boolean(quizBehind),
      vocabGap,
      grammarGap,
      daysToExam,
      appVocab: stats.appVocab,
      learnedVocab: stats.learnedVocab,
    }),
  }
}

function parseMonthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59) // last day of month, local
}

function interpolateAt(series, now) {
  if (now <= series[0].date) return { vocab: 0, grammar: 0, quizRate: null }
  for (let i = 1; i < series.length; i += 1) {
    const a = series[i - 1]
    const b = series[i]
    if (now <= b.date) {
      const span = b.date.getTime() - a.date.getTime()
      const t = span <= 0 ? 1 : (now.getTime() - a.date.getTime()) / span
      const quizRate =
        b.quizRate == null
          ? a.quizRate
          : a.quizRate == null
            ? b.quizRate * t
            : a.quizRate + (b.quizRate - a.quizRate) * t
      return {
        vocab: a.vocab + (b.vocab - a.vocab) * t,
        grammar: a.grammar + (b.grammar - a.grammar) * t,
        quizRate: quizRate == null ? null : Math.round(quizRate),
      }
    }
  }
  const last = series[series.length - 1]
  return { vocab: last.vocab, grammar: last.grammar, quizRate: last.quizRate }
}

function buildRemedies({
  severity,
  vocabBehind,
  grammarBehind,
  quizBehind,
  vocabGap,
  grammarGap,
  daysToExam,
  appVocab,
  learnedVocab,
}) {
  if (severity === 'ok') {
    return [
      {
        title: '維持節奏即可',
        detail: '每日完成單字評分＋本月路線文法，週末做一回測驗。',
        to: '/',
        cta: '回今日排程',
      },
    ]
  }

  const items = []

  if (vocabBehind) {
    const daily = Math.min(40, Math.max(20, Math.ceil(vocabGap / Math.max(7, Math.floor(daysToExam / 8)))))
    items.push({
      title: `單字加速：今天會自動排約 ${daily} 個`,
      detail:
        learnedVocab >= appVocab
          ? `App 內 ${appVocab} 字已幾乎學完；請優先清 SRS 到期。`
          : `落後約 ${Math.max(0, Math.round(vocabGap))} 字。按「簡單」一次即可算掌握；按「記得」再評一次也會進進度。到期複習不會把掌握數扣掉。`,
      to: '/flashcards?mode=today-vocab',
      cta: '開始單字',
    })
    items.push({
      title: '先清到期複習',
      detail: '到期卡仍算「已掌握」；清完再專心加新字，避免只複習卻覺得沒進步。',
      to: '/flashcards?mode=today-review',
      cta: '開始複習',
    })
  }

  if (grammarBehind) {
    items.push({
      title: `文法回補：每天至少 3 條`,
      detail: `落後約 ${Math.max(0, Math.round(grammarGap))} 條。先把路線裡較早的句型評分學會，不要跳去後面的使役受身。`,
      to: '/flashcards?mode=today-grammar',
      cta: '開始文法',
    })
  }

  if (quizBehind || severity === 'high') {
    items.push({
      title: '每週至少 3 回測驗',
      detail: '答錯的會進複習佇列。先練綜合，再針對弱科。',
      to: '/quiz',
      cta: '去做測驗',
    })
  }

  items.push({
    title: '週末補課（90 分鐘）',
    detail: '30 分單字複習 → 30 分文法／測驗 → 30 分聽力循環。一次補一週落後。',
    to: '/flashcards?mode=today-listening',
    cta: '開始聽力',
  })

  return items
}

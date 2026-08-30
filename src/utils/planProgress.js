import { EXAM_DATE, TARGETS } from '../data/config'
import { monthlyMilestones } from '../data/schedule'

/** @param {Date} [now] */
export function monthKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Honest plan progress: month-end + final targets matter more than
 * a daily "you should have N by today" line that always feels behind.
 *
 * @param {{
 *   learnedVocab: number,
 *   learnedGrammar: number,
 *   quizRate: number | null,
 *   appVocab: number,
 *   appGrammar: number,
 *   weekVocabGain?: number,
 *   weekGrammarGain?: number,
 * }} stats
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

  const vocabCap = Math.min(TARGETS.vocabulary, stats.appVocab)
  const grammarCap = Math.min(TARGETS.grammar, stats.appGrammar)

  const monthVocabTarget = currentMilestone?.vocabTarget ?? TARGETS.vocabulary
  const monthGrammarTarget = currentMilestone?.grammarTarget ?? TARGETS.grammar
  const vocabToMonth = Math.max(0, monthVocabTarget - stats.learnedVocab)
  const grammarToMonth = Math.max(0, monthGrammarTarget - stats.learnedGrammar)
  const vocabToFinal = Math.max(0, TARGETS.vocabulary - stats.learnedVocab)
  const grammarToFinal = Math.max(0, TARGETS.grammar - stats.learnedGrammar)

  const daysToExam = Math.max(0, Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86400000))
  const daysLeftInMonth = daysUntilMonthEnd(now)

  const weekVocabGain = Math.max(0, stats.weekVocabGain || 0)
  const weekGrammarGain = Math.max(0, stats.weekGrammarGain || 0)
  const dailyVocabPace = weekVocabGain / 7
  const dailyGrammarPace = weekGrammarGain / 7

  const projectedMonthVocab = stats.learnedVocab + dailyVocabPace * daysLeftInMonth
  const projectedMonthGrammar = stats.learnedGrammar + dailyGrammarPace * daysLeftInMonth

  // Behind only if month-end projection clearly misses (or no pace yet and far from target)
  const vocabBehind =
    vocabToMonth > 0 &&
    (dailyVocabPace < 0.2
      ? vocabToMonth > Math.max(20, daysLeftInMonth * 8)
      : projectedMonthVocab < monthVocabTarget * 0.85)
  const grammarBehind =
    grammarToMonth > 0 &&
    (dailyGrammarPace < 0.05
      ? grammarToMonth > Math.max(3, daysLeftInMonth * 0.8)
      : projectedMonthGrammar < monthGrammarTarget * 0.85)

  const quizBehind =
    expected.quizRate != null &&
    stats.quizRate != null &&
    stats.quizRate < expected.quizRate - 10

  const severity =
    vocabBehind || grammarBehind
      ? vocabToMonth > 150 || grammarToMonth > 15
        ? 'high'
        : 'mid'
      : 'ok'

  const daysToMonthVocab =
    dailyVocabPace >= 0.5 ? Math.ceil(vocabToMonth / dailyVocabPace) : null
  const daysToFinalVocab =
    dailyVocabPace >= 0.5 ? Math.ceil(vocabToFinal / dailyVocabPace) : null

  // Catch-up quota uses remaining-to-month, not the harsh daily curve
  const vocabGapForCatchUp = Math.max(vocabToMonth, vocabExpected - stats.learnedVocab)

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
      vocab: vocabExpected - stats.learnedVocab,
      grammar: grammarExpected - stats.learnedGrammar,
      quizRate:
        expected.quizRate != null && stats.quizRate != null
          ? expected.quizRate - stats.quizRate
          : null,
    },
    month: {
      vocabTarget: monthVocabTarget,
      grammarTarget: monthGrammarTarget,
      vocabRemaining: vocabToMonth,
      grammarRemaining: grammarToMonth,
      daysLeft: daysLeftInMonth,
    },
    final: {
      vocabTarget: TARGETS.vocabulary,
      grammarTarget: TARGETS.grammar,
      vocabRemaining: vocabToFinal,
      grammarRemaining: grammarToFinal,
    },
    momentum: {
      weekVocabGain,
      weekGrammarGain,
      dailyVocabPace: Math.round(dailyVocabPace * 10) / 10,
      daysToMonthVocab,
      daysToFinalVocab,
      projectedMonthVocab: Math.round(projectedMonthVocab),
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
      vocabGap: vocabGapForCatchUp,
      grammarGap: grammarToMonth,
      daysToExam,
      appVocab: stats.appVocab,
      learnedVocab: stats.learnedVocab,
      daysToMonthVocab,
      weekVocabGain,
    }),
  }
}

function parseMonthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59)
}

function daysUntilMonthEnd(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000))
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
  daysToMonthVocab,
  weekVocabGain,
}) {
  if (severity === 'ok') {
    return [
      {
        title: '節奏可用，繼續往前',
        detail:
          weekVocabGain > 0
            ? `近 7 日新掌握 ${weekVocabGain} 字。維持每日評分＋到期複習即可靠近本月目標。`
            : '每日完成單字評分＋本月路線文法，週末做一回測驗。',
        to: '/',
        cta: '回今日排程',
      },
    ]
  }

  const items = []

  if (vocabBehind) {
    const daily = Math.min(40, Math.max(20, Math.ceil(vocabGap / Math.max(7, Math.floor(daysToExam / 8)))))
    items.push({
      title: `單字加速：今天可手動加量至約 ${daily} 個`,
      detail:
        learnedVocab >= appVocab
          ? `App 內 ${appVocab} 字已幾乎學完；請優先清 SRS 到期。`
          : `還差約 ${Math.max(0, Math.round(vocabGap))} 才到本月目標。同一字「簡單／記得」成功兩次後才算掌握（較誠實）；近一週有前進就會反映在預估天數上。`,
      to: '/flashcards?mode=today-vocab',
      cta: '開始單字',
    })
    items.push({
      title: '先清到期複習',
      detail:
        daysToMonthVocab != null
          ? `依近一週速度，約 ${daysToMonthVocab} 天可到本月單字目標。清完到期再加新字最有效。`
          : '到期卡仍算已掌握；清完再加新字，每週數字才會往上走。',
      to: '/flashcards?mode=today-review',
      cta: '開始複習',
    })
  }

  if (grammarBehind) {
    items.push({
      title: `文法回補：每天至少 3 條`,
      detail: `本月還差約 ${Math.max(0, Math.round(grammarGap))} 條。先把路線裡較早的句型評分學會。`,
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
    detail: '30 分單字複習 → 30 分文法／測驗 → 30 分聽力循環。',
    to: '/flashcards?mode=today-listening',
    cta: '開始聽力',
  })

  return items
}

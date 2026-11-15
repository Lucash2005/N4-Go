import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { todayKey } from '../utils/storage'
import { describeQuizSource, pickAdaptiveQuiz } from '../utils/quizFromProgress'
import { addSprintPins, filterPinnableIds } from '../utils/sprintQueue'
import { setSprintTaskDone } from '../utils/sprintChecklist'

const QUICK_COUNT = 18
const QUICK_SECONDS = 10 * 60

function formatRemain(sec) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Quiz() {
  const { recordQuiz, cardProgress, dailyPlan, todayVocab, todayGrammar, todayReview, grammarPath } =
    useProgress()
  const [searchParams] = useSearchParams()
  const isQuickRoute = searchParams.get('mode') === 'quick'

  const [mode, setMode] = useState('all')
  const [view, setView] = useState(isQuickRoute ? 'quick' : 'hub')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [sourceInfo, setSourceInfo] = useState(null)
  const [remain, setRemain] = useState(QUICK_SECONDS)
  const [timedOut, setTimedOut] = useState(false)
  const [pinnedMsg, setPinnedMsg] = useState('')
  const [reviewMisses, setReviewMisses] = useState([])

  const correctRef = useRef(0)
  const missedRef = useRef([])
  const missedMetaRef = useRef([])
  const missDetailsRef = useRef([])
  const finishedRef = useRef(false)
  const quickMode = view === 'quick'

  const question = questions[current]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `${current + 1} / ${questions.length}`
  }, [current, questions.length])

  const focusHint = useMemo(() => {
    const n =
      (todayVocab?.length || 0) + (todayGrammar?.length || 0) + (todayReview?.length || 0)
    return n > 0
      ? `優先考已解鎖文法（${grammarPath?.title || '本月路線'}）、活用與今日 ${todayVocab?.length || 0} 單字、${todayGrammar?.length || 0} 張文法卡`
      : `文法只出已解鎖路線（${grammarPath?.title || '本月'}），不會跳到後面的使役受身`
  }, [todayVocab, todayGrammar, todayReview, grammarPath])

  useEffect(() => {
    if (isQuickRoute) setView('quick')
  }, [isQuickRoute])

  function finishQuiz({ timeout = false } = {}) {
    if (finishedRef.current) return
    finishedRef.current = true
    recordQuiz(correctRef.current, questions.length, missedRef.current, missedMetaRef.current)
    setReviewMisses(missDetailsRef.current)
    setTimedOut(timeout)
    setFinished(true)
    if (quickMode) {
      setSprintTaskDone(todayKey(), 'quick-mock', true)
    }
  }

  function start(options = {}) {
    const quick = options.quick ?? quickMode
    const count = quick ? QUICK_COUNT : 10
    const qs = pickAdaptiveQuiz({
      count,
      type: quick ? 'all' : mode,
      cardProgress,
      dailyPlan,
      today: todayKey(),
    })
    setQuestions(qs)
    setSourceInfo(describeQuizSource(qs))
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    correctRef.current = 0
    missedRef.current = []
    missedMetaRef.current = []
    missDetailsRef.current = []
    finishedRef.current = false
    setFinished(false)
    setTimedOut(false)
    setPinnedMsg('')
    setReviewMisses([])
    setRemain(QUICK_SECONDS)
    setStarted(true)
    if (quick) setView('quick')
  }

  // Quick-mock countdown
  useEffect(() => {
    if (!started || !quickMode || finished) return undefined
    const timer = window.setInterval(() => {
      setRemain((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          finishQuiz({ timeout: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer owns finish side-effect
  }, [started, quickMode, finished, questions.length])

  function choose(idx) {
    if (revealed || !question || finished) return
    setSelected(idx)
    setRevealed(true)
    if (idx === question.answer) {
      correctRef.current += 1
      setCorrectCount(correctRef.current)
    } else {
      if (question.grammarId) missedRef.current.push(question.grammarId)
      if (question.vocabId) missedRef.current.push(question.vocabId)
      if (question.formId) missedRef.current.push(question.formId)
      const correctText = question.options[question.answer]
      if (correctText) missedRef.current.push(correctText)
      missedMetaRef.current.push({
        id: question.id,
        source: question.type === 'reading' ? 'reading' : 'quiz',
        prompt: question.prompt || '',
      })
      missDetailsRef.current.push({
        id: question.vocabId || question.grammarId || question.formId || question.id,
        prompt: question.prompt,
        correct: correctText,
        picked: question.options[idx],
        explanation: question.explanation,
      })
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      finishQuiz()
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  function pinMissesToSprint() {
    const ids = filterPinnableIds(missDetailsRef.current.map((m) => m.id))
    if (!ids.length) {
      setPinnedMsg('沒有可釘選的字卡 id（已進錯題本）')
      return
    }
    addSprintPins(ids)
    setPinnedMsg(`已將 ${ids.length} 題錯題加入衝刺清單`)
  }

  if (!started && view === 'hub') {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <h2 className="font-display text-2xl font-bold text-ink">測驗與加強</h2>
          <p className="mt-1 text-sm text-ink-soft">
            模擬測驗對齊 N4 進度；基礎加強專補易混句型，不影響今日單字排程。
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="surface soft-shadow animate-fade-up stagger-1 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">限時模擬小考</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              {QUICK_COUNT} 題高頻單字／文法，限時 {QUICK_SECONDS / 60}{' '}
              分鐘。結束可一鍵把錯題釘進衝刺複習。
            </p>
            <button
              type="button"
              onClick={() => {
                setView('quick')
                start({ quick: true })
              }}
              className="mt-5 w-full rounded-2xl bg-coral px-4 py-3.5 text-base font-medium text-white transition hover:bg-coral/90"
            >
              開始限時小考
            </button>
          </section>

          <section className="surface soft-shadow animate-fade-up stagger-1 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">N4 模擬測驗</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              依今日計畫與 SRS 動態出題。錯題會進錯題本，並影響對應卡片複習。
            </p>
            <p className="mt-2 text-xs text-sea-deep">{focusHint}</p>
            <button
              type="button"
              onClick={() => setView('exam')}
              className="mt-5 w-full rounded-2xl bg-sea px-4 py-3.5 text-base font-medium text-white transition hover:bg-sea-deep"
            >
              進入模擬測驗
            </button>
          </section>

          <section className="surface soft-shadow animate-fade-up stagger-2 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">讀解／聽解</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              短文・情報検索・課題理解。答錯自動進錯題本。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                to="/reading"
                className="rounded-2xl bg-sea px-3 py-3 text-center text-sm font-medium text-white"
              >
                讀解
              </Link>
              <Link
                to="/listening"
                className="rounded-2xl bg-coral px-3 py-3 text-center text-sm font-medium text-white"
              >
                聽解
              </Link>
            </div>
            <Link to="/wrong-bank" className="mt-2 text-center text-xs text-sea-deep underline">
              打開錯題本
            </Link>
          </section>

          <section className="surface soft-shadow animate-fade-up stagger-2 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">考前衝刺</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              20 天打卡、衝刺字卡、錯題清零入口。
            </p>
            <Link
              to="/sprint"
              className="mt-5 block w-full rounded-2xl bg-white px-4 py-3.5 text-center text-base font-medium text-ink ring-1 ring-line transition hover:bg-foam"
            >
              打開衝刺中心
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (!started && view === 'quick') {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <button
            type="button"
            onClick={() => setView('hub')}
            className="text-sm text-sea-deep hover:underline"
          >
            ← 回測驗首頁
          </button>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">限時模擬小考</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {QUICK_COUNT} 題選擇題 · 限時 {QUICK_SECONDS / 60} 分鐘 · 綜合單字與文法（依進度加權）
          </p>
        </section>
        <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>· 時間到會自動交卷並結算</li>
            <li>· 錯題進錯題本，也可釘進衝刺清單</li>
            <li>· 建議每天至少一輪，搭配衝刺字卡</li>
          </ul>
          <button
            type="button"
            onClick={() => start({ quick: true })}
            className="mt-6 w-full rounded-2xl bg-coral px-4 py-3.5 text-base font-medium text-white hover:bg-coral/90"
          >
            開始計時
          </button>
          <Link to="/sprint" className="mt-3 block text-center text-xs text-sea-deep underline">
            回衝刺中心
          </Link>
        </section>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <button
            type="button"
            onClick={() => setView('hub')}
            className="text-sm text-sea-deep hover:underline"
          >
            ← 回測驗首頁
          </button>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">N4 模擬測驗</h2>
          <p className="mt-1 text-sm text-ink-soft">
            依學習進度動態出題。題庫已對齊 N4 目標（單字 1500、文法 80），優先今日計畫與到期複習。
          </p>
          <p className="mt-2 text-xs text-sea-deep">{focusHint}</p>
        </section>

        <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
          <h3 className="font-medium text-ink">選擇題型</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: 'all', label: '綜合' },
              { id: 'vocab', label: '單字' },
              { id: 'grammar', label: '文法' },
              { id: 'reading', label: '閱讀' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-full px-4 py-2 text-sm ${
                  mode === m.id ? 'bg-sea text-white' : 'bg-white ring-1 ring-line text-ink-soft'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => start({ quick: false })}
            className="mt-6 w-full rounded-2xl bg-sea px-4 py-3.5 text-base font-medium text-white transition hover:bg-sea-deep"
          >
            開始 10 題測驗
          </button>
        </section>
      </div>
    )
  }

  if (finished) {
    const score = correctCount
    const total = questions.length
    const pct = total ? Math.round((score / total) * 100) : 0
    const missCount = reviewMisses.length

    return (
      <section className="surface soft-shadow animate-fade-up mx-auto max-w-lg rounded-3xl p-6 sm:p-8">
        <p className="text-center text-sm text-sea-deep">
          {quickMode ? (timedOut ? '時間到 · 自動交卷' : '限時小考結果') : '本回結果'}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl font-bold text-ink">
          {score} / {total}
        </h2>
        <p className="mt-2 text-center text-ink-soft">正確率 {pct}%</p>
        {quickMode ? (
          <p className="mt-1 text-center text-xs text-ink-soft">剩餘時間 {formatRemain(remain)}</p>
        ) : null}
        {sourceInfo ? (
          <p className="mt-2 text-center text-xs text-ink-soft">
            本回：進度題 {sourceInfo.dynamic} · 補充題 {sourceInfo.curated}
          </p>
        ) : null}
        <div className="mx-auto mt-5 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-foam">
          <div className="h-full rounded-full bg-sea" style={{ width: `${pct}%` }} />
        </div>

        {missCount > 0 ? (
          <div className="mt-5 max-h-56 space-y-2 overflow-y-auto text-left">
            <p className="text-sm font-medium text-ink">錯題解析（{missCount}）</p>
            {reviewMisses.map((m, i) => (
              <div key={`${m.id}-${i}`} className="rounded-xl bg-foam/80 px-3 py-2 text-xs text-ink">
                <p className="font-medium">{m.prompt}</p>
                <p className="mt-1 text-coral">你的答案：{m.picked}</p>
                <p className="text-sea-deep">正解：{m.correct}</p>
                {m.explanation ? <p className="mt-1 text-ink-soft">{m.explanation}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-sea-deep">本回全對，太棒了！</p>
        )}

        {pinnedMsg ? <p className="mt-3 text-center text-xs text-sea-deep">{pinnedMsg}</p> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {quickMode && missCount > 0 ? (
            <button
              type="button"
              onClick={pinMissesToSprint}
              className="rounded-2xl bg-coral px-5 py-3 text-white hover:bg-coral/90"
            >
              將錯題加入衝刺清單
            </button>
          ) : null}
          {quickMode ? (
            <Link
              to="/flashcards?mode=sprint"
              className="rounded-2xl bg-sea px-5 py-3 text-center text-white hover:bg-sea-deep"
            >
              去衝刺字卡
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => start({ quick: quickMode })}
            className="rounded-2xl bg-white px-5 py-3 text-ink ring-1 ring-line"
          >
            再考一回
          </button>
          <button
            type="button"
            onClick={() => {
              setStarted(false)
              setView(quickMode ? 'quick' : 'hub')
            }}
            className="rounded-2xl bg-white px-5 py-3 text-ink ring-1 ring-line"
          >
            回設定
          </button>
        </div>
      </section>
    )
  }

  const typeLabel =
    question.type === 'vocab' ? '單字' : question.type === 'grammar' ? '文法' : '閱讀'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">
          {quickMode ? '限時小考' : '模擬測驗'}
        </h2>
        <div className="flex items-center gap-2">
          {quickMode ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                remain <= 60 ? 'bg-coral/15 text-coral' : 'bg-foam text-sea-deep'
              }`}
            >
              {formatRemain(remain)}
            </span>
          ) : null}
          <span className="rounded-full bg-foam px-3 py-1 text-xs text-sea-deep">{progressLabel}</span>
        </div>
      </div>
      {sourceInfo ? (
        <p className="text-xs text-ink-soft">
          依進度出題（動態 {sourceInfo.dynamic}／補充 {sourceInfo.curated}）
        </p>
      ) : null}

      <article className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
        <span className="rounded-full bg-sea/10 px-3 py-1 text-xs font-medium text-sea-deep">
          {typeLabel}
        </span>

        {question.passage ? (
          <div className="mt-4 rounded-2xl bg-sand/80 p-4 text-sm leading-relaxed text-ink">
            {question.passage}
          </div>
        ) : null}

        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-ink">
          {question.prompt}
        </p>

        <div className="mt-5 space-y-2">
          {question.options.map((opt, idx) => {
            let style = 'bg-white ring-1 ring-line hover:bg-foam'
            if (revealed) {
              if (idx === question.answer) style = 'bg-sea text-white ring-sea'
              else if (idx === selected) style = 'bg-coral/90 text-white ring-coral'
              else style = 'bg-white/60 text-ink-soft ring-1 ring-line'
            } else if (selected === idx) {
              style = 'bg-foam ring-2 ring-sea'
            }

            return (
              <button
                key={`${opt}-${idx}`}
                type="button"
                disabled={revealed}
                onClick={() => choose(idx)}
                className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${style}`}
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs">
                  {idx + 1}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {revealed ? (
          <div className="mt-5 rounded-2xl bg-foam/90 p-4">
            <p className="text-sm font-medium text-sea-deep">
              {selected === question.answer ? '答對了！' : '再接再厲'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{question.explanation}</p>
            {question.memoryTip || question.memoryForm || question.memoryCompare ? (
              <div className="mt-3 space-y-2 rounded-xl bg-white/80 px-3.5 py-3 text-sm leading-relaxed text-ink ring-1 ring-line/50">
                {question.memoryUseWhen ? (
                  <p>
                    <span className="font-medium text-sea-deep">場面：</span>
                    {question.memoryUseWhen}
                  </p>
                ) : null}
                {question.memoryForm ? (
                  <p className="whitespace-pre-line">
                    <span className="font-medium text-sea-deep">接續：</span>
                    {question.memoryForm}
                  </p>
                ) : null}
                {question.memoryCompare ? (
                  <p>
                    <span className="font-medium text-sea-deep">對照：</span>
                    {question.memoryCompare}
                  </p>
                ) : null}
                {question.memoryTip ? (
                  <p>
                    <span className="font-medium text-sea-deep">口訣：</span>
                    {question.memoryTip}
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="mt-4 w-full rounded-2xl bg-sea px-4 py-3 text-white hover:bg-sea-deep"
            >
              {current + 1 >= questions.length ? '看成績' : '下一題'}
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}

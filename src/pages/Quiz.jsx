import { useMemo, useRef, useState } from 'react'
import { pickQuiz } from '../data/quiz'
import { useProgress } from '../hooks/useProgress'

export default function Quiz() {
  const { recordQuiz } = useProgress()
  const [mode, setMode] = useState('all')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const correctRef = useRef(0)
  const missedRef = useRef([])

  const question = questions[current]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `${current + 1} / ${questions.length}`
  }, [current, questions.length])

  function start() {
    const qs = pickQuiz(10, mode)
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    correctRef.current = 0
    missedRef.current = []
    setFinished(false)
    setStarted(true)
  }

  function choose(idx) {
    if (revealed || !question) return
    setSelected(idx)
    setRevealed(true)
    if (idx === question.answer) {
      correctRef.current += 1
      setCorrectCount(correctRef.current)
    } else {
      if (question.grammarId) missedRef.current.push(question.grammarId)
      if (question.vocabId) missedRef.current.push(question.vocabId)
      const correctText = question.options[question.answer]
      if (correctText) missedRef.current.push(correctText)
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      recordQuiz(correctRef.current, questions.length, missedRef.current)
      setFinished(true)
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (!started) {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <h2 className="font-display text-2xl font-bold text-ink">N4 模擬測驗</h2>
          <p className="mt-1 text-sm text-ink-soft">
            隨機抽題；答錯的相關單字／文法會自動排入今日 SRS 複習。
          </p>
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
            onClick={start}
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
    const pct = Math.round((score / total) * 100)

    return (
      <section className="surface soft-shadow animate-fade-up mx-auto max-w-lg rounded-3xl p-6 text-center sm:p-8">
        <p className="text-sm text-sea-deep">本回結果</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-ink">
          {score} / {total}
        </h2>
        <p className="mt-2 text-ink-soft">正確率 {pct}%</p>
        <div className="mx-auto mt-5 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-foam">
          <div className="h-full rounded-full bg-sea" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={start}
            className="rounded-2xl bg-sea px-5 py-3 text-white hover:bg-sea-deep"
          >
            再考一回
          </button>
          <button
            type="button"
            onClick={() => setStarted(false)}
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
        <h2 className="font-display text-xl font-bold text-ink">模擬測驗</h2>
        <span className="rounded-full bg-foam px-3 py-1 text-xs text-sea-deep">{progressLabel}</span>
      </div>

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
                key={opt}
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

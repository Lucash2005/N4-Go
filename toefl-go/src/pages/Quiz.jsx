import { useMemo, useRef, useState } from 'react'
import { pickQuiz } from '../data/quiz'
import { useProgress } from '../hooks/useProgress'

export default function Quiz() {
  const { recordQuiz } = useProgress()
  const [section, setSection] = useState('all')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const correctRef = useRef(0)

  const question = questions[current]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `${current + 1} / ${questions.length}`
  }, [current, questions.length])

  function start() {
    const qs = pickQuiz(8, section)
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setFinished(false)
    setCorrectCount(0)
    correctRef.current = 0
    setStarted(true)
  }

  function choose(idx) {
    if (revealed || !question) return
    setSelected(idx)
    setRevealed(true)
    if (idx === question.answer) {
      correctRef.current += 1
      setCorrectCount(correctRef.current)
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      recordQuiz(correctRef.current, questions.length)
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
          <h2 className="font-display text-2xl font-bold text-ink">快速測驗</h2>
          <p className="mt-1 text-sm text-ink-soft">每次題目與選項順序都會重洗</p>
        </section>
        <section className="surface soft-shadow rounded-3xl p-5">
          <h3 className="font-medium text-ink">選擇範圍</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: 'all', label: '綜合' },
              { id: 'vocab', label: '單字' },
              { id: 'reading', label: '閱讀策略' },
              { id: 'listening', label: '聽力策略' },
              { id: 'speaking', label: '口說' },
              { id: 'writing', label: '寫作' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSection(m.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  section === m.id ? 'bg-tide text-white' : 'bg-white ring-1 ring-line text-ink-soft'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={start}
            className="mt-6 w-full rounded-2xl bg-tide px-4 py-3.5 text-white hover:bg-tide-deep"
          >
            開始 8 題
          </button>
        </section>
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100)
    return (
      <section className="surface soft-shadow mx-auto max-w-lg rounded-3xl p-6 text-center">
        <p className="text-sm text-tide">本回結果</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-ink">
          {correctCount}/{questions.length}
        </h2>
        <p className="mt-2 text-ink-soft">正確率 {pct}%</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={start}
            className="rounded-2xl bg-tide px-5 py-3 text-white"
          >
            再考一回
          </button>
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="rounded-2xl bg-white px-5 py-3 ring-1 ring-line"
          >
            回設定
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">快速測驗</h2>
        <span className="rounded-full bg-mist px-3 py-1 text-xs text-tide">{progressLabel}</span>
      </div>
      <article className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <span className="rounded-full bg-tide/10 px-3 py-1 text-xs font-medium text-tide">
          {question.section}
        </span>
        <p className="mt-4 text-base leading-relaxed text-ink">{question.prompt}</p>
        <div className="mt-5 space-y-2">
          {question.options.map((opt, idx) => {
            let style = 'bg-white ring-1 ring-line'
            if (revealed) {
              if (idx === question.answer) style = 'bg-tide text-white'
              else if (idx === selected) style = 'bg-coral text-white'
            }
            return (
              <button
                key={opt}
                type="button"
                disabled={revealed}
                onClick={() => choose(idx)}
                className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm ${style}`}
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
          <div className="mt-5 rounded-2xl bg-mist/90 p-4">
            <p className="text-sm font-medium text-tide">
              {selected === question.answer ? '答對了！' : '再接再厲'}
            </p>
            <p className="mt-2 text-sm text-ink">{question.explanation}</p>
            <button
              type="button"
              onClick={next}
              className="mt-4 w-full rounded-2xl bg-tide px-4 py-3 text-white"
            >
              {current + 1 >= questions.length ? '看成績' : '下一題'}
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}

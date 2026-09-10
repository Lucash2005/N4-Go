import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { readingQuestions } from '../data/readings'
import { listeningItems } from '../data/listening'
import { getVocabulary } from '../data/vocabulary'
import { grammar } from '../data/grammar'
import { recordWrong, recordWrongCorrect } from '../utils/wrongBank'
import { loadJSON, saveJSON, todayKey } from '../utils/storage'

const SECTIONS = [
  { id: 'vocab', title: '語彙', minutes: 30, pick: 10 },
  { id: 'grammar_reading', title: '文法・讀解', minutes: 55, pick: 8 },
  { id: 'listening', title: '聽解', minutes: 35, pick: 5 },
]

const RESULT_KEY = 'mock-exam-results'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildSectionQuestions(sectionId, pick) {
  if (sectionId === 'vocab') {
    const pool = getVocabulary().filter((c) => c.level === 'N4' || c.level === 'N5')
    return shuffle(pool)
      .slice(0, pick)
      .map((c) => {
        const distractors = shuffle(
          pool.filter((x) => x.id !== c.id).map((x) => x.meaning),
        ).slice(0, 3)
        const options = shuffle([c.meaning, ...distractors])
        return {
          id: `mock-v-${c.id}`,
          sourceId: c.id,
          prompt: `「${c.word}」的意思是？`,
          options,
          answer: options.indexOf(c.meaning),
          explanation: `${c.word}（${c.reading || ''}）：${c.meaning}`,
        }
      })
  }
  if (sectionId === 'grammar_reading') {
    const g = shuffle(grammar)
      .slice(0, Math.ceil(pick / 2))
      .map((c) => {
        const distractors = shuffle(grammar.filter((x) => x.id !== c.id).map((x) => x.meaning)).slice(
          0,
          3,
        )
        const options = shuffle([c.meaning, ...distractors])
        return {
          id: `mock-g-${c.id}`,
          sourceId: c.id,
          prompt: `文法「${c.word}」表示？`,
          options,
          answer: options.indexOf(c.meaning),
          explanation: c.explanation || c.meaning,
        }
      })
    const r = shuffle(readingQuestions)
      .slice(0, Math.floor(pick / 2))
      .map((item) => ({
        id: `mock-r-${item.id}`,
        sourceId: item.id,
        prompt: item.prompt || item.question,
        passage: item.passage,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation,
      }))
    return shuffle([...g, ...r]).slice(0, pick)
  }
  return shuffle(listeningItems)
    .slice(0, pick)
    .map((item) => ({
      id: `mock-l-${item.id}`,
      sourceId: item.id,
      prompt: item.question,
      script: item.script,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation,
    }))
}

function formatRemain(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function loadResults() {
  const raw = loadJSON(RESULT_KEY, null)
  return Array.isArray(raw?.items) ? raw.items : []
}

function saveResult(entry) {
  const items = [entry, ...loadResults()].slice(0, 20)
  saveJSON(RESULT_KEY, { items })
  return items
}

export default function MockExam() {
  const [sectionIdx, setSectionIdx] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [attempted, setAttempted] = useState(0)
  const [remain, setRemain] = useState(0)
  const [expired, setExpired] = useState(false)
  const [results, setResults] = useState(() => loadResults())
  const [showScript, setShowScript] = useState(false)

  const section = sectionIdx == null ? null : SECTIONS[sectionIdx]
  const item = questions[qIdx]

  useEffect(() => {
    if (sectionIdx == null || expired) return undefined
    const t = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          setExpired(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [sectionIdx, expired])

  function startSection(i) {
    const s = SECTIONS[i]
    setSectionIdx(i)
    setQuestions(buildSectionQuestions(s.id, s.pick))
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrect(0)
    setAttempted(0)
    setRemain(s.minutes * 60)
    setExpired(false)
    setShowScript(false)
  }

  function finishSection() {
    if (!section) return
    const entry = {
      at: new Date().toISOString(),
      day: todayKey(),
      section: section.id,
      title: section.title,
      correct,
      attempted,
      timedOut: expired,
    }
    setResults(saveResult(entry))
    setSectionIdx(null)
    setQuestions([])
  }

  function choose(i) {
    if (!item || revealed || expired) return
    setSelected(i)
    setRevealed(true)
    const ok = i === item.answer
    setAttempted((n) => n + 1)
    if (ok) {
      setCorrect((n) => n + 1)
      recordWrongCorrect(item.sourceId)
    } else {
      recordWrong(item.sourceId, {
        source: 'mock',
        prompt: item.prompt,
      })
    }
    if (section?.id === 'listening') setShowScript(true)
  }

  function next() {
    if (qIdx + 1 >= questions.length) {
      finishSection()
      return
    }
    setQIdx((n) => n + 1)
    setSelected(null)
    setRevealed(false)
    setShowScript(false)
  }

  const recent = useMemo(() => results.slice(0, 5), [results])

  if (section && item) {
    return (
      <div className="space-y-4">
        <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-sea">MOCK · {section.title}</p>
              <h2 className="font-display text-xl font-bold text-ink">
                第 {qIdx + 1}/{questions.length} 題
              </h2>
            </div>
            <div
              className={[
                'rounded-full px-3 py-1.5 text-sm font-medium',
                remain < 60 ? 'bg-coral/15 text-coral' : 'bg-foam text-sea-deep',
              ].join(' ')}
            >
              剩餘 {formatRemain(remain)}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            目前 {correct}/{attempted} 正確
            {expired ? ' · 時間到，請結束本節' : ''}
          </p>
        </section>

        <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
          {item.passage ? (
            <div className="mb-4 whitespace-pre-wrap rounded-2xl bg-foam/70 p-4 text-sm leading-relaxed">
              {item.passage}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap font-medium text-ink">{item.prompt}</p>
          {section.id === 'listening' && showScript && item.script ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-foam/70 p-3 text-sm">{item.script}</pre>
          ) : null}
          <div className="mt-4 space-y-2">
            {item.options.map((opt, i) => {
              const isAnswer = i === item.answer
              const isPick = i === selected
              let cls = 'w-full rounded-2xl border px-4 py-3 text-left text-sm transition '
              if (!revealed) cls += 'border-line bg-white hover:bg-foam'
              else if (isAnswer) cls += 'border-sea bg-sea/10 text-sea-deep'
              else if (isPick) cls += 'border-coral bg-coral/10 text-coral'
              else cls += 'border-line/50 bg-white/50 text-ink-soft'
              return (
                <button
                  key={`${item.id}-${opt}`}
                  type="button"
                  disabled={revealed || expired}
                  onClick={() => choose(i)}
                  className={cls}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {revealed || expired ? (
            <div className="mt-4 space-y-3">
              {revealed ? <p className="text-sm text-ink-soft">{item.explanation}</p> : null}
              <div className="flex flex-wrap gap-2">
                {!expired ? (
                  <button
                    type="button"
                    onClick={next}
                    className="rounded-full bg-sea px-4 py-2 text-sm font-medium text-white"
                  >
                    {qIdx + 1 >= questions.length ? '完成本節' : '下一題'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finishSection}
                    className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white"
                  >
                    時間到 · 結束並記分
                  </button>
                )}
                <button
                  type="button"
                  onClick={finishSection}
                  className="rounded-full bg-white px-4 py-2 text-sm text-ink-soft ring-1 ring-line"
                >
                  提前結束
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-medium tracking-wide text-sea">MOCK EXAM</p>
        <h2 className="font-display text-2xl font-bold text-ink">計時模考</h2>
        <p className="mt-1 text-sm text-ink-soft">
          依 JLPT N4 時段練習：語彙 30 分、文法・讀解 55 分、聽解 35 分。錯題會進入錯題本。
        </p>
        <Link to="/skills" className="mt-3 inline-block text-xs text-sea-deep underline">
          回讀聽選單
        </Link>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => startSection(i)}
            className="surface soft-shadow rounded-3xl p-5 text-left transition hover:bg-foam/80"
          >
            <p className="text-xs text-sea">{s.minutes} 分鐘</p>
            <h3 className="font-display text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-1 text-xs text-ink-soft">約 {s.pick} 題（精簡模考）</p>
          </button>
        ))}
      </div>

      {recent.length ? (
        <section className="rounded-3xl border border-line bg-foam/60 p-4 sm:p-5">
          <h3 className="font-display text-lg font-bold text-ink">最近成績</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((r) => (
              <li key={`${r.at}-${r.section}`} className="rounded-2xl bg-white/80 px-3 py-2">
                {r.day} · {r.title} · {r.correct}/{r.attempted}
                {r.timedOut ? '（逾時）' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

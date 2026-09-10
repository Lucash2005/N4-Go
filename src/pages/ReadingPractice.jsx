import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { readingQuestions, inferReadingKind, READING_KIND_LABELS } from '../data/readings'
import { recordWrong, recordWrongCorrect } from '../utils/wrongBank'
import { loadJSON, saveJSON } from '../utils/storage'

const PROGRESS_KEY = 'reading-progress'

function loadReadingProgress() {
  const raw = loadJSON(PROGRESS_KEY, null)
  return raw && typeof raw === 'object' ? raw : { done: {}, correct: 0, attempted: 0 }
}

function markReadingDone(id, ok) {
  const prev = loadReadingProgress()
  const done = { ...(prev.done || {}), [id]: { at: new Date().toISOString(), ok: Boolean(ok) } }
  const next = {
    done,
    correct: (prev.correct || 0) + (ok ? 1 : 0),
    attempted: (prev.attempted || 0) + 1,
  }
  saveJSON(PROGRESS_KEY, next)
  return next
}

export function getReadingStats() {
  const p = loadReadingProgress()
  return {
    doneCount: Object.keys(p.done || {}).length,
    total: readingQuestions.length,
    correct: p.correct || 0,
    attempted: p.attempted || 0,
  }
}

export default function ReadingPractice() {
  const [kindFilter, setKindFilter] = useState('all')
  const [showFuriganaHint, setShowFuriganaHint] = useState(true)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [highlight, setHighlight] = useState('')
  const [stats, setStats] = useState(() => getReadingStats())

  const pool = useMemo(() => {
    return readingQuestions.filter((q) => {
      if (kindFilter === 'all') return true
      return inferReadingKind(q) === kindFilter
    })
  }, [kindFilter])

  const item = pool[Math.min(index, Math.max(0, pool.length - 1))]
  const kind = item ? inferReadingKind(item) : 'short'

  function choose(i) {
    if (!item || revealed) return
    setSelected(i)
    setRevealed(true)
    const ok = i === item.answer
    setStats(markReadingDone(item.id, ok))
    if (ok) recordWrongCorrect(item.id)
    else recordWrong(item.id, { source: 'reading', prompt: item.prompt || item.title || item.id })
  }

  function next() {
    setSelected(null)
    setRevealed(false)
    setHighlight('')
    setIndex((n) => (n + 1) % Math.max(1, pool.length))
  }

  if (!item) {
    return (
      <section className="surface soft-shadow rounded-3xl p-5">
        <p className="text-ink-soft">此類型暫無題目。</p>
        <Link to="/" className="mt-3 inline-block text-sea-deep underline">
          回首頁
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-sea">READING</p>
            <h2 className="font-display text-2xl font-bold text-ink">讀解練習</h2>
            <p className="mt-1 text-sm text-ink-soft">
              短文／中文／情報検索 · 已完成 {stats.doneCount}/{stats.total}
            </p>
          </div>
          <Link to="/wrong-bank" className="text-xs text-sea-deep underline-offset-2 hover:underline">
            錯題本
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['all', '全部'],
            ['short', '短文'],
            ['medium', '中文'],
            ['info_retrieval', '情報検索'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setKindFilter(id)
                setIndex(0)
                setSelected(null)
                setRevealed(false)
              }}
              className={[
                'rounded-full px-3 py-1.5 text-xs ring-1',
                kindFilter === id ? 'bg-sea text-white ring-sea' : 'bg-white text-ink-soft ring-line',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFuriganaHint((v) => !v)}
            className="rounded-full bg-foam px-3 py-1.5 text-xs text-sea-deep ring-1 ring-line"
          >
            {showFuriganaHint ? '隱藏提示' : '顯示關鍵句提示'}
          </button>
        </div>
      </section>

      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="rounded-full bg-foam px-2 py-0.5 ring-1 ring-line">
            {READING_KIND_LABELS[kind] || kind}
          </span>
          <span>
            {index + 1}/{pool.length}
          </span>
          {item.title ? <span className="font-medium text-ink">{item.title}</span> : null}
        </div>

        <div
          className="mt-4 whitespace-pre-wrap rounded-2xl bg-foam/70 p-4 text-base leading-relaxed text-ink"
          onMouseUp={() => {
            const sel = window.getSelection?.()?.toString?.() || ''
            if (sel.trim()) setHighlight(sel.trim().slice(0, 80))
          }}
        >
          {item.passage}
        </div>
        {highlight ? (
          <p className="mt-2 text-xs text-sea-deep">已選取：{highlight}</p>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">可拖曳選取段落重點（畫線備註）。</p>
        )}

        {showFuriganaHint && Array.isArray(item.keySentences) && item.keySentences.length ? (
          <div className="mt-3 rounded-2xl border border-line/70 bg-white/70 p-3 text-sm text-ink-soft">
            <p className="text-xs font-medium text-ink">關鍵句</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {item.keySentences.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-5 font-medium text-ink">{item.prompt || item.question}</p>
        <div className="mt-3 space-y-2">
          {item.options.map((opt, i) => {
            const isAnswer = i === item.answer
            const isPick = i === selected
            let cls = 'w-full rounded-2xl border px-4 py-3 text-left text-sm transition '
            if (!revealed) cls += 'border-line bg-white hover:bg-foam'
            else if (isAnswer) cls += 'border-sea bg-sea/10 text-sea-deep'
            else if (isPick) cls += 'border-coral bg-coral/10 text-coral'
            else cls += 'border-line/50 bg-white/50 text-ink-soft'
            return (
              <button key={opt} type="button" disabled={revealed} onClick={() => choose(i)} className={cls}>
                {opt}
              </button>
            )
          })}
        </div>

        {revealed ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink-soft">{item.explanation}</p>
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-sea px-4 py-2 text-sm font-medium text-white"
            >
              下一題
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

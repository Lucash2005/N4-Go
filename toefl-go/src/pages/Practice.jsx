import { useEffect, useMemo, useRef, useState } from 'react'
import {
  listeningSets,
  readingPassages,
  speakingPrompts,
  writingPrompts,
} from '../data/practice'
import { useProgress } from '../hooks/useProgress'
import { speakEnglish, stopSpeaking } from '../utils/tts'

const TABS = [
  { id: 'reading', label: '閱讀' },
  { id: 'listening', label: '聽力' },
  { id: 'speaking', label: '口說' },
  { id: 'writing', label: '寫作' },
]

export default function Practice() {
  const { recordPractice } = useProgress()
  const [tab, setTab] = useState('reading')

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">四大科練習</h2>
        <p className="mt-1 text-sm text-ink-soft">先求每天短練，再拉長計時模考</p>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === t.id ? 'bg-tide text-white' : 'bg-white text-ink-soft ring-1 ring-line'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reading' ? <ReadingPanel onDone={() => recordPractice('reading')} /> : null}
      {tab === 'listening' ? <ListeningPanel onDone={() => recordPractice('listening')} /> : null}
      {tab === 'speaking' ? <SpeakingPanel onDone={() => recordPractice('speaking')} /> : null}
      {tab === 'writing' ? <WritingPanel onDone={() => recordPractice('writing')} /> : null}
    </div>
  )
}

function ReadingPanel({ onDone }) {
  const [idx, setIdx] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const item = readingPassages[idx]
  const question = item.questions[qIndex]

  function choose(i) {
    if (revealed) return
    setSelected(i)
    setRevealed(true)
  }

  function next() {
    if (qIndex + 1 < item.questions.length) {
      setQIndex((v) => v + 1)
      setSelected(null)
      setRevealed(false)
      return
    }
    onDone()
    if (idx + 1 < readingPassages.length) {
      setIdx((v) => v + 1)
      setQIndex(0)
      setSelected(null)
      setRevealed(false)
    }
  }

  return (
    <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
      <p className="text-xs font-medium text-tide">
        {item.level} · {idx + 1}/{readingPassages.length}
      </p>
      <h3 className="font-display mt-1 text-xl font-bold text-ink">{item.title}</h3>
      <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-paper/80 p-4 text-sm leading-relaxed text-ink">
        {item.passage}
      </div>
      <p className="mt-5 text-sm font-medium text-ink">{question.prompt}</p>
      <div className="mt-3 space-y-2">
        {question.options.map((opt, i) => {
          let style = 'bg-white ring-1 ring-line'
          if (revealed) {
            if (i === question.answer) style = 'bg-tide text-white'
            else if (i === selected) style = 'bg-coral text-white'
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => choose(i)}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${style}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {revealed ? (
        <div className="mt-4 rounded-2xl bg-mist/90 p-4">
          <p className="text-sm text-ink">{question.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-2xl bg-tide px-4 py-3 text-white"
          >
            {qIndex + 1 >= item.questions.length ? '完成本篇' : '下一題'}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function ListeningPanel({ onDone }) {
  const [idx, setIdx] = useState(0)
  const [showScript, setShowScript] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const item = listeningSets[idx]
  const question = item.questions[qIndex]

  function play() {
    speakEnglish(item.script, { rate: 0.92 })
  }

  function choose(i) {
    if (revealed) return
    setSelected(i)
    setRevealed(true)
  }

  function next() {
    if (qIndex + 1 < item.questions.length) {
      setQIndex((v) => v + 1)
      setSelected(null)
      setRevealed(false)
      return
    }
    stopSpeaking()
    onDone()
    if (idx + 1 < listeningSets.length) {
      setIdx((v) => v + 1)
      setQIndex(0)
      setSelected(null)
      setRevealed(false)
      setShowScript(false)
    }
  }

  return (
    <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
      <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
      <p className="mt-1 text-xs text-ink-soft">先聽 1–2 次再作答；必要時再看逐字稿</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={play}
          className="rounded-2xl bg-tide px-4 py-2.5 text-sm text-white"
        >
          播放聽力
        </button>
        <button
          type="button"
          onClick={() => setShowScript((v) => !v)}
          className="rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-line"
        >
          {showScript ? '隱藏逐字稿' : '顯示逐字稿'}
        </button>
      </div>
      {showScript ? (
        <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-paper/80 p-4 text-sm leading-relaxed">
          {item.script}
        </div>
      ) : null}
      <p className="mt-5 text-sm font-medium text-ink">{question.prompt}</p>
      <div className="mt-3 space-y-2">
        {question.options.map((opt, i) => {
          let style = 'bg-white ring-1 ring-line'
          if (revealed) {
            if (i === question.answer) style = 'bg-tide text-white'
            else if (i === selected) style = 'bg-coral text-white'
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => choose(i)}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${style}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {revealed ? (
        <div className="mt-4 rounded-2xl bg-mist/90 p-4">
          <p className="text-sm text-ink">{question.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-2xl bg-tide px-4 py-3 text-white"
          >
            下一題／完成
          </button>
        </div>
      ) : null}
    </section>
  )
}

function SpeakingPanel({ onDone }) {
  const [idx, setIdx] = useState(0)
  const item = speakingPrompts[idx]
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | prep | speak | done
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const label = useMemo(() => {
    if (phase === 'prep') return `準備中 ${seconds}s`
    if (phase === 'speak') return `作答中 ${seconds}s`
    if (phase === 'done') return '本輪結束'
    return '尚未開始'
  }, [phase, seconds])

  function start() {
    stopSpeaking()
    clearInterval(timerRef.current)
    setPhase('prep')
    let left = item.prepSeconds
    setSeconds(left)
    timerRef.current = setInterval(() => {
      left -= 1
      if (left > 0) {
        setSeconds(left)
        return
      }
      clearInterval(timerRef.current)
      setPhase('speak')
      let speakLeft = item.speakSeconds
      setSeconds(speakLeft)
      timerRef.current = setInterval(() => {
        speakLeft -= 1
        if (speakLeft > 0) {
          setSeconds(speakLeft)
          return
        }
        clearInterval(timerRef.current)
        setPhase('done')
        onDone()
      }, 1000)
    }, 1000)
  }

  return (
    <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
      <p className="text-xs font-medium text-tide">{item.type}</p>
      <h3 className="font-display mt-1 text-xl font-bold text-ink">口說練習</h3>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.prompt}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {item.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium text-tide">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-tide px-4 py-2.5 text-sm text-white"
        >
          開始計時
        </button>
        <button
          type="button"
          onClick={() => {
            onDone()
            setIdx((v) => (v + 1) % speakingPrompts.length)
            setPhase('idle')
          }}
          className="rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-line"
        >
          下一題
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-soft">可用手機錄音 App 錄下答案，再回聽流暢度。</p>
    </section>
  )
}

function WritingPanel({ onDone }) {
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const item = writingPrompts[idx]
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
      <p className="text-xs font-medium text-tide">
        {item.type} · 建議 {item.minutes} 分鐘
      </p>
      <h3 className="font-display mt-1 text-xl font-bold text-ink">寫作練習</h3>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.prompt}</p>
      <div className="mt-3 rounded-2xl bg-mist/80 p-3">
        <p className="text-xs font-medium text-ink-soft">建議大綱</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink">
          {item.outline.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ol>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="在這裡打草稿（只存在此裝置）…"
        className="mt-4 w-full rounded-2xl border border-line bg-white/90 p-4 text-sm outline-none ring-tide/30 focus:ring-2"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">字數約 {words}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onDone()
              setText('')
              setIdx((v) => (v + 1) % writingPrompts.length)
            }}
            className="rounded-2xl bg-tide px-4 py-2.5 text-sm text-white"
          >
            完成本題
          </button>
        </div>
      </div>
    </section>
  )
}

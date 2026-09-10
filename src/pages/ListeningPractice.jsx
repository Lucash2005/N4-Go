import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listeningItems, LISTENING_TYPE_LABELS } from '../data/listening'
import { recordWrong, recordWrongCorrect } from '../utils/wrongBank'
import { loadJSON, saveJSON } from '../utils/storage'

const PROGRESS_KEY = 'listening-progress'
const SPEEDS = [0.8, 1, 1.2]

function loadListeningProgress() {
  const raw = loadJSON(PROGRESS_KEY, null)
  return raw && typeof raw === 'object' ? raw : { done: {}, correct: 0, attempted: 0 }
}

function markListeningDone(id, ok) {
  const prev = loadListeningProgress()
  const done = { ...(prev.done || {}), [id]: { at: new Date().toISOString(), ok: Boolean(ok) } }
  const next = {
    done,
    correct: (prev.correct || 0) + (ok ? 1 : 0),
    attempted: (prev.attempted || 0) + 1,
  }
  saveJSON(PROGRESS_KEY, next)
  return next
}

export function getListeningStats() {
  const p = loadListeningProgress()
  return {
    doneCount: Object.keys(p.done || {}).length,
    total: listeningItems.length,
    correct: p.correct || 0,
    attempted: p.attempted || 0,
  }
}

function speakJapanese(text, rate = 1, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.()
    return null
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(String(text || '').replace(/\n/g, '。'))
  u.lang = 'ja-JP'
  u.rate = rate
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
  return u
}

export default function ListeningPractice() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState(() => getListeningStats())
  const audioRef = useRef(null)

  const pool = useMemo(() => {
    return listeningItems.filter((q) => (typeFilter === 'all' ? true : q.type === typeFilter))
  }, [typeFilter])

  const item = pool[Math.min(index, Math.max(0, pool.length - 1))]

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel?.()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  function stopAudio() {
    window.speechSynthesis?.cancel?.()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
  }

  function play() {
    if (!item) return
    stopAudio()
    setPlaying(true)
    if (item.audioUrl) {
      const audio = new Audio(`${import.meta.env.BASE_URL || './'}${item.audioUrl.replace(/^\//, '')}`)
      audio.playbackRate = speed
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => {
        // fallback to TTS script
        speakJapanese(item.script, speed, () => setPlaying(false))
      }
      void audio.play().catch(() => speakJapanese(item.script, speed, () => setPlaying(false)))
      return
    }
    speakJapanese(item.script, speed, () => setPlaying(false))
  }

  function choose(i) {
    if (!item || revealed) return
    setSelected(i)
    setRevealed(true)
    setShowScript(true)
    stopAudio()
    const answer = item.answerIndex ?? item.answer
    const ok = i === answer
    setStats(markListeningDone(item.id, ok))
    if (ok) recordWrongCorrect(item.id)
    else recordWrong(item.id, { source: 'listening', prompt: item.question })
  }

  function next() {
    stopAudio()
    setSelected(null)
    setRevealed(false)
    setShowScript(false)
    setIndex((n) => (n + 1) % Math.max(1, pool.length))
  }

  if (!item) {
    return (
      <section className="surface soft-shadow rounded-3xl p-5">
        <p className="text-ink-soft">此類型暫無題目。</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-sea">LISTENING</p>
            <h2 className="font-display text-2xl font-bold text-ink">聽解練習</h2>
            <p className="mt-1 text-sm text-ink-soft">
              課題理解／ポイント理解 · 已完成 {stats.doneCount}/{stats.total}
            </p>
          </div>
          <Link to="/wrong-bank" className="text-xs text-sea-deep underline-offset-2 hover:underline">
            錯題本
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['all', '全部'],
            ['task_comprehension', '課題理解'],
            ['point_comprehension', 'ポイント理解'],
            ['utterance_response', '発話表現'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTypeFilter(id)
                setIndex(0)
                setSelected(null)
                setRevealed(false)
                setShowScript(false)
                stopAudio()
              }}
              className={[
                'rounded-full px-3 py-1.5 text-xs ring-1',
                typeFilter === id ? 'bg-sea text-white ring-sea' : 'bg-white text-ink-soft ring-line',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="rounded-full bg-foam px-2 py-0.5 ring-1 ring-line">
            {LISTENING_TYPE_LABELS[item.type] || item.type}
          </span>
          <span>
            {index + 1}/{pool.length}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap font-medium text-ink">{item.question}</p>

        {item.imageUrl ? (
          <img
            src={`${import.meta.env.BASE_URL || './'}${item.imageUrl.replace(/^\//, '')}`}
            alt="選項圖"
            className="mt-3 max-h-56 w-full rounded-2xl object-contain ring-1 ring-line"
          />
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={play}
            className="rounded-full bg-sea px-4 py-2 text-sm font-medium text-white"
          >
            {playing ? '播放中…' : '播放音檔／朗讀'}
          </button>
          <button
            type="button"
            onClick={stopAudio}
            className="rounded-full bg-white px-3 py-2 text-sm text-ink-soft ring-1 ring-line"
          >
            停止
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={[
                'rounded-full px-3 py-1.5 text-xs ring-1',
                speed === s ? 'bg-foam text-sea-deep ring-sea/40' : 'bg-white text-ink-soft ring-line',
              ].join(' ')}
            >
              {s.toFixed(1)}x
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowScript((v) => !v)}
            className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line"
          >
            {showScript ? '隱藏原稿' : '顯示原稿'}
          </button>
        </div>

        {showScript ? (
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-foam/70 p-3 text-sm leading-relaxed text-ink">
            {item.script}
          </pre>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">作答中預設隱藏原稿；作答後可打開核對。</p>
        )}

        <div className="mt-4 space-y-2">
          {item.options.map((opt, i) => {
            const answer = item.answerIndex ?? item.answer
            const isAnswer = i === answer
            const isPick = i === selected
            let cls = 'w-full rounded-2xl border px-4 py-3 text-left text-sm transition '
            if (!revealed) cls += 'border-line bg-white hover:bg-foam'
            else if (isAnswer) cls += 'border-sea bg-sea/10 text-sea-deep'
            else if (isPick) cls += 'border-coral bg-coral/10 text-coral'
            else cls += 'border-line/50 bg-white/50 text-ink-soft'
            return (
              <button key={opt} type="button" disabled={revealed} onClick={() => choose(i)} className={cls}>
                {i + 1}. {opt}
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

import { useEffect, useRef, useState } from 'react'
import { getSpeechRecognition, scorePronunciation } from '../utils/pronounce'

/**
 * Record + Japanese speech recognition.
 * Checks whether the learner said the right word (not native pitch accent).
 */
export default function PronounceCoach({ card }) {
  const [phase, setPhase] = useState('idle') // idle | recording | done
  const [heard, setHeard] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const recRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    return () => cleanup()
  }, [])

  useEffect(() => {
    cleanup()
    setPhase('idle')
    setHeard('')
    setResult(null)
    setError('')
    setAudioUrl('')
  }, [card?.id])

  function cleanup() {
    try {
      recRef.current?.stop?.()
    } catch {
      /* ignore */
    }
    recRef.current = null
    try {
      mediaRef.current?.stop?.()
    } catch {
      /* ignore */
    }
    mediaRef.current = null
    streamRef.current?.getTracks?.().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function start() {
    setError('')
    setHeard('')
    setResult(null)
    cleanup()

    const SpeechRec = getSpeechRecognition()
    let started = false

    if (SpeechRec) {
      try {
        const rec = new SpeechRec()
        rec.lang = 'ja-JP'
        rec.interimResults = false
        rec.maxAlternatives = 3
        rec.continuous = false
        rec.onresult = (event) => {
          const alt = event.results?.[0]?.[0]?.transcript || ''
          setHeard(alt)
          setResult(scorePronunciation(alt, card))
          setPhase('done')
        }
        rec.onerror = (event) => {
          if (event.error === 'no-speech') setError('沒聽到聲音，請再靠近麥克風試試')
          else if (event.error === 'not-allowed') setError('請允許麥克風權限後再試')
          else setError('這個裝置的語音辨識不穩定，請聽回放自行對照')
          setPhase('done')
        }
        rec.onend = () => {
          recRef.current = null
          setPhase((p) => (p === 'recording' ? 'done' : p))
        }
        recRef.current = rec
        rec.start()
        started = true
      } catch {
        started = false
      }
    }

    // Also record for playback (iPhone Safari supports MediaRecorder in many versions)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size) {
          const url = URL.createObjectURL(blob)
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRef.current = mr
      mr.start()
      started = true
    } catch {
      if (!started) {
        setError('無法開啟麥克風。請在 Safari 設定允許此網站使用麥克風。')
        setPhase('idle')
        return
      }
    }

    setPhase('recording')
  }

  function stop() {
    try {
      recRef.current?.stop?.()
    } catch {
      /* ignore */
    }
    try {
      if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks?.().forEach((t) => t.stop())
    setPhase('done')
  }

  if (!card) return null

  const canRecognize = Boolean(getSpeechRecognition())

  return (
    <div
      className="rounded-2xl bg-white/80 p-4 ring-1 ring-line/60"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium text-ink">跟讀檢查</p>
      <p className="mt-1 text-xs text-ink-soft">
        看漢字，念出讀音。系統比對你有沒有唸對這個詞（不是專業口音評分）。
        {!canRecognize ? ' 此瀏覽器可能無法自動辨識，仍可錄音回放。' : ''}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {phase === 'recording' ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-2xl bg-coral px-4 py-2.5 text-sm font-medium text-white"
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="rounded-2xl bg-sea px-4 py-2.5 text-sm font-medium text-white hover:bg-sea-deep"
          >
            {phase === 'done' ? '再唸一次' : '開始錄音'}
          </button>
        )}
        {audioUrl ? (
          <button
            type="button"
            onClick={() => {
              const a = new Audio(audioUrl)
              a.play()
            }}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-line"
          >
            聽自己
          </button>
        ) : null}
      </div>

      {phase === 'recording' ? (
        <p className="mt-3 text-sm text-coral">錄音中… 請念「{card.reading || card.word}」</p>
      ) : null}

      {result ? (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            result.level === 'good'
              ? 'bg-sea/15 text-sea-deep'
              : result.level === 'close'
                ? 'bg-sand text-ink'
                : 'bg-coral/10 text-coral'
          }`}
        >
          {result.level === 'good'
            ? `唸對了（約 ${result.score}%）`
            : result.level === 'close'
              ? `接近了，再對一次讀音（約 ${result.score}%）`
              : `再試一次，先看假名再念`}
          {heard ? <span className="mt-1 block text-xs opacity-80">辨識到：{heard}</span> : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-coral">{error}</p> : null}
    </div>
  )
}

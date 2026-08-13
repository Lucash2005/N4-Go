import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { GRADE_LABELS } from '../utils/srs'
import { speakEnglish } from '../utils/tts'

const GRADES = ['again', 'hard', 'good', 'easy']

export default function Vocab() {
  const { todayVocab, todayReview, gradeCard, getEntry } = useProgress()
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'today'

  const source = useMemo(() => {
    if (mode === 'review') return todayReview
    if (mode === 'all') return vocabulary
    return todayVocab.length ? todayVocab : vocabulary.slice(0, 20)
  }, [mode, todayVocab, todayReview])

  const [deck, setDeck] = useState(source)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    setDeck(source)
    setIndex(0)
    setFlipped(false)
  }, [mode]) // snapshot on mode change

  const card = deck[index]
  const done = deck.length === 0
  const entry = card ? getEntry(card.id) : null

  function onGrade(grade) {
    if (!card) return
    gradeCard(card.id, grade)
    setFlipped(false)
    if (grade === 'again') {
      const rest = deck.filter((c) => c.id !== card.id)
      setDeck([...rest, card])
      setIndex(index >= rest.length ? 0 : index)
      return
    }
    const next = deck.filter((c) => c.id !== card.id)
    setDeck(next)
    setIndex(Math.min(index, Math.max(0, next.length - 1)))
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">
          {mode === 'review' ? '到期複習' : mode === 'all' ? '全部單字' : '今日單字'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          先看英文想中文，翻面後評分。系統會安排下次出現時間。
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link to="/vocab?mode=today" className="text-tide underline-offset-2 hover:underline">
            今日
          </Link>
          <Link to="/vocab?mode=review" className="text-tide underline-offset-2 hover:underline">
            複習
          </Link>
          <Link to="/vocab?mode=all" className="text-tide underline-offset-2 hover:underline">
            全部
          </Link>
        </div>
      </section>

      <p className="text-xs text-ink-soft">
        本輪剩餘 {deck.length} 張
        {entry?.due ? ` · 下次 ${entry.due}` : ''}
      </p>

      {done ? (
        <div className="surface soft-shadow rounded-3xl p-8 text-center">
          <p className="font-display text-2xl font-bold text-ink">本輪完成</p>
          <p className="mt-2 text-sm text-ink-soft">忘記的卡片會較快再出現</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-2xl bg-tide px-5 py-3 text-white hover:bg-tide-deep"
          >
            回今日
          </Link>
        </div>
      ) : (
        <>
          <article
            className="surface soft-shadow min-h-[300px] cursor-pointer rounded-3xl p-6 text-center"
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setFlipped((f) => !f)
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="rounded-full bg-tide/10 px-3 py-1 text-xs font-medium text-tide">
              {card.category}
            </span>
            {!flipped ? (
              <>
                <p className="font-display mt-8 text-4xl font-bold text-ink">{card.word}</p>
                <p className="mt-3 text-sm text-ink-soft">先想意思與搭配，再翻面</p>
              </>
            ) : (
              <>
                <p className="mt-6 text-2xl font-bold text-ink">{card.meaning}</p>
                {card.phonetic ? <p className="mt-1 text-sm text-tide">{card.phonetic}</p> : null}
                <div className="mt-5 rounded-2xl bg-mist/80 p-4 text-left">
                  <p className="text-base leading-relaxed text-ink">{card.example}</p>
                  <p className="mt-2 text-sm text-ink-soft">{card.exampleMeaning}</p>
                </div>
              </>
            )}
          </article>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => speakEnglish(flipped ? card.example : card.word)}
              className="rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-line hover:bg-mist"
            >
              播放發音
            </button>
          </div>

          {flipped ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGrade(g)}
                  className={`touch-target rounded-2xl px-3 py-3 text-sm font-medium ${gradeClass(g)}`}
                >
                  <span className="block">{GRADE_LABELS[g].label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{GRADE_LABELS[g].hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-ink-soft">翻面後評分才會進入下一張</p>
          )}
        </>
      )}
    </div>
  )
}

function gradeClass(grade) {
  if (grade === 'again') return 'bg-coral text-white'
  if (grade === 'hard') return 'bg-amber-soft text-ink ring-1 ring-line'
  if (grade === 'good') return 'bg-tide text-white'
  return 'bg-ink text-white'
}

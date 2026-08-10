import { useMemo, useState } from 'react'
import { grammar } from '../data/grammar'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { speakJapanese } from '../utils/tts'

const ALL_CARDS = [...vocabulary, ...grammar]

export default function Flashcards() {
  const { cardProgress, setCardStatus } = useProgress()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_CARDS.filter((card) => {
      if (typeFilter !== 'all' && card.type !== typeFilter) return false
      const status = cardProgress[card.id] || 'new'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true
      const hay = [card.word, card.reading, card.meaning, card.example, card.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query, typeFilter, statusFilter, cardProgress])

  const safeIndex = filtered.length ? Math.min(index, filtered.length - 1) : 0
  const card = filtered[safeIndex]

  function go(delta) {
    if (!filtered.length) return
    setFlipped(false)
    setIndex((prev) => (prev + delta + filtered.length) % filtered.length)
  }

  function onFilterChange(setter, value) {
    setter(value)
    setIndex(0)
    setFlipped(false)
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">單字與文法卡片</h2>
        <p className="mt-1 text-sm text-ink-soft">點擊卡片翻面 · 支援搜尋與分類 · TTS 發音</p>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 space-y-3 rounded-3xl p-4 sm:p-5">
        <input
          type="search"
          value={query}
          onChange={(e) => onFilterChange(setQuery, e.target.value)}
          placeholder="搜尋單字、文法、讀音、中文…"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-sea/30 focus:ring-2"
        />

        <div className="flex flex-wrap gap-2">
          <FilterChip active={typeFilter === 'all'} onClick={() => onFilterChange(setTypeFilter, 'all')}>
            全部
          </FilterChip>
          <FilterChip
            active={typeFilter === 'vocab'}
            onClick={() => onFilterChange(setTypeFilter, 'vocab')}
          >
            單字
          </FilterChip>
          <FilterChip
            active={typeFilter === 'grammar'}
            onClick={() => onFilterChange(setTypeFilter, 'grammar')}
          >
            文法
          </FilterChip>
          <FilterChip
            active={statusFilter === 'learned'}
            onClick={() =>
              onFilterChange(setStatusFilter, statusFilter === 'learned' ? 'all' : 'learned')
            }
          >
            只看已學會
          </FilterChip>
          <FilterChip
            active={statusFilter === 'review'}
            onClick={() =>
              onFilterChange(setStatusFilter, statusFilter === 'review' ? 'all' : 'review')
            }
          >
            只看需複習
          </FilterChip>
        </div>

        <p className="text-xs text-ink-soft">
          共 {filtered.length} 張
          {card ? ` · 目前第 ${safeIndex + 1} 張` : ''}
        </p>
      </section>

      {!card ? (
        <div className="surface rounded-3xl p-8 text-center text-ink-soft">沒有符合條件的卡片</div>
      ) : (
        <>
          <article
            className="animate-flip-in soft-shadow relative min-h-[320px] cursor-pointer rounded-3xl [perspective:1200px]"
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setFlipped((f) => !f)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="翻轉卡片"
          >
            <div
              className={`relative h-full min-h-[320px] transition-transform duration-500 [transform-style:preserve-3d] ${
                flipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <CardFace className="absolute inset-0 [backface-visibility:hidden]">
                <Badge>{card.type === 'vocab' ? '單字' : '文法'}</Badge>
                <p className="mt-6 font-display text-4xl font-bold text-ink sm:text-5xl">
                  {card.word}
                </p>
                <p className="mt-3 text-lg text-sea-deep">{card.reading}</p>
                <p className="mt-8 text-sm text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <Badge>{card.category}</Badge>
                <p className="mt-4 text-2xl font-bold text-ink">{card.meaning}</p>
                {card.pattern ? (
                  <p className="mt-2 text-sm text-sea-deep">句型：{card.pattern}</p>
                ) : null}
                <div className="mt-5 rounded-2xl bg-foam/80 p-4 text-left">
                  <p className="text-base leading-relaxed text-ink">{card.example}</p>
                  <p className="mt-2 text-sm text-ink-soft">{card.exampleMeaning}</p>
                </div>
              </CardFace>
            </div>
          </article>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ActionButton onClick={() => go(-1)}>上一張</ActionButton>
            <ActionButton
              onClick={(e) => {
                e.stopPropagation()
                speakJapanese(flipped ? card.example : `${card.word}。${card.reading}`)
              }}
            >
              🔊 播放
            </ActionButton>
            <ActionButton onClick={() => go(1)}>下一張</ActionButton>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatusButton
              active={cardProgress[card.id] === 'learned'}
              onClick={() =>
                setCardStatus(card.id, cardProgress[card.id] === 'learned' ? null : 'learned')
              }
              tone="sea"
            >
              已學會
            </StatusButton>
            <StatusButton
              active={cardProgress[card.id] === 'review'}
              onClick={() =>
                setCardStatus(card.id, cardProgress[card.id] === 'review' ? null : 'review')
              }
              tone="coral"
            >
              需要複習
            </StatusButton>
            <StatusButton
              className="col-span-2 sm:col-span-1"
              onClick={() => setCardStatus(card.id, null)}
            >
              清除標記
            </StatusButton>
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-sea text-white' : 'bg-white/80 text-ink-soft ring-1 ring-line'
      }`}
    >
      {children}
    </button>
  )
}

function CardFace({ className = '', children }) {
  return (
    <div
      className={`surface flex flex-col items-center justify-center rounded-3xl p-6 text-center ${className}`}
    >
      {children}
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-sea/10 px-3 py-1 text-xs font-medium text-sea-deep">
      {children}
    </span>
  )
}

function ActionButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line transition hover:bg-foam"
    >
      {children}
    </button>
  )
}

function StatusButton({ active, onClick, tone = 'line', children, className = '' }) {
  const activeClass =
    tone === 'coral'
      ? 'bg-coral text-white'
      : tone === 'sea'
        ? 'bg-sea text-white'
        : 'bg-ink text-white'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-target rounded-2xl px-4 py-3 text-sm font-medium transition ${className} ${
        active ? activeClass : 'bg-white text-ink ring-1 ring-line hover:bg-foam'
      }`}
    >
      {children}
    </button>
  )
}

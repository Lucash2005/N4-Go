import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { grammar } from '../data/grammar'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { speakJapanese, speechTextForCard, audioClipForCard } from '../utils/tts'

const ALL_CARDS = [...vocabulary, ...grammar]

const MODE_META = {
  'today-vocab': { title: '今日單字', hint: '翻完卡片會自動計入今日進度' },
  'today-grammar': { title: '今日文法', hint: '翻完卡片會自動計入今日進度' },
  'today-review': { title: '今日複習', hint: '複習標記與補強項目' },
  'today-listening': { title: '今日聽力', hint: '點播放聽發音，累積聽力進度' },
}

function hasKanji(text = '') {
  return /[\u4e00-\u9fff]/.test(text)
}

export default function Flashcards() {
  const {
    cardProgress,
    setCardStatus,
    todayVocab,
    todayGrammar,
    todayReview,
    markStudied,
    markListened,
    isStudied,
  } = useProgress()
  const { showFurigana, setShowFurigana, ttsEngine, setTtsEngine, ttsRate, setTtsRate } =
    useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'all'

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [voiceEngine, setVoiceEngine] = useState(null)

  const todayMode = mode in MODE_META

  const filtered = useMemo(() => {
    if (mode === 'today-vocab') return todayVocab
    if (mode === 'today-grammar') return todayGrammar
    if (mode === 'today-review') return todayReview
    if (mode === 'today-listening') return todayVocab

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
  }, [
    mode,
    todayVocab,
    todayGrammar,
    todayReview,
    query,
    typeFilter,
    statusFilter,
    cardProgress,
  ])

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [mode, query, typeFilter, statusFilter])

  const safeIndex = filtered.length ? Math.min(index, filtered.length - 1) : 0
  const card = filtered[safeIndex]

  function go(delta) {
    if (!filtered.length) return
    if (card && todayMode) markStudied(card.id)
    setFlipped(false)
    setIndex((prev) => (prev + delta + filtered.length) % filtered.length)
  }

  function flipCard() {
    setFlipped((f) => {
      const next = !f
      if (next && card && todayMode) markStudied(card.id)
      return next
    })
  }

  function onFilterChange(setter, value) {
    setter(value)
  }

  function clearMode() {
    setSearchParams({})
  }

  function playAudio() {
    if (!card) return
    const text = speechTextForCard(card, { flipped })
    const clipUrl = audioClipForCard(card, { flipped })
    setVoiceEngine('…')
    speakJapanese(text, {
      engine: ttsEngine,
      rate: ttsRate,
      clipUrl: ttsEngine === 'system' ? null : clipUrl,
      onEngine: (engine) => {
        setVoiceEngine(engine === 'neural' ? 'neural' : 'system')
      },
    })
    if (todayMode) {
      markListened(card.id)
      markStudied(card.id)
    }
  }

  const meta = MODE_META[mode]

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">
          {meta ? meta.title : '單字與文法卡片'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {meta ? meta.hint : '點擊卡片翻面 · 支援搜尋與分類 · TTS 發音'}
        </p>
        {todayMode ? (
          <button
            type="button"
            onClick={clearMode}
            className="mt-2 text-sm text-sea-deep underline-offset-2 hover:underline"
          >
            返回全部卡片
          </button>
        ) : (
          <Link
            to="/flashcards?mode=today-vocab"
            className="mt-2 inline-block text-sm text-sea-deep underline-offset-2 hover:underline"
          >
            練習今日排程 →
          </Link>
        )}
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 space-y-3 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={showFurigana} onClick={() => setShowFurigana(!showFurigana)}>
            {showFurigana ? '音標：顯示中' : '音標：已隱藏'}
          </FilterChip>
          <FilterChip
            active={ttsEngine === 'auto'}
            onClick={() => setTtsEngine(ttsEngine === 'auto' ? 'system' : 'auto')}
          >
            {ttsEngine === 'auto' ? '發音：Neural 自然聲' : '發音：系統聲'}
          </FilterChip>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="shrink-0">語速</span>
          <input
            type="range"
            min="0.7"
            max="1.1"
            step="0.02"
            value={ttsRate}
            onChange={(e) => setTtsRate(Number(e.target.value))}
            className="w-full accent-sea"
          />
          <span className="w-10 tabular-nums">{ttsRate.toFixed(2)}</span>
        </label>
        <p className="text-xs text-ink-soft">
          Neural 自然聲使用預錄的日語人聲（Nanami），與系統聲會明顯不同。音標開關同時控制單字與例句讀音。
          {voiceEngine ? ` · 剛剛播放：${voiceEngine === 'neural' ? 'Neural 自然聲' : '系統聲'}` : ''}
        </p>
      </section>

      {!todayMode ? (
        <section className="surface soft-shadow animate-fade-up stagger-2 space-y-3 rounded-3xl p-4 sm:p-5">
          <input
            type="search"
            value={query}
            onChange={(e) => onFilterChange(setQuery, e.target.value)}
            placeholder="搜尋單字、文法、讀音、中文…"
            className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-sea/30 focus:ring-2"
          />

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={typeFilter === 'all'}
              onClick={() => onFilterChange(setTypeFilter, 'all')}
            >
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
        </section>
      ) : null}

      <p className="text-xs text-ink-soft">
        共 {filtered.length} 張
        {card ? ` · 目前第 ${safeIndex + 1} 張` : ''}
        {card && todayMode && isStudied(card.id) ? ' · 已計入今日' : ''}
      </p>

      {!card ? (
        <div className="surface rounded-3xl p-8 text-center text-ink-soft">
          {todayMode ? (
            <div className="space-y-3">
              <p>今日這個項目沒有卡片可練</p>
              <Link to="/" className="inline-block text-sea-deep underline">
                回首頁看排程
              </Link>
            </div>
          ) : (
            '沒有符合條件的卡片'
          )}
        </div>
      ) : (
        <>
          <article
            className="animate-flip-in soft-shadow relative min-h-[320px] cursor-pointer rounded-3xl [perspective:1200px]"
            onClick={flipCard}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                flipCard()
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
                {showFurigana ? (
                  <p className="mt-3 text-lg text-sea-deep">{card.reading}</p>
                ) : hasKanji(card.word) ? (
                  <p className="mt-3 text-sm text-ink-soft">音標已隱藏</p>
                ) : null}
                <p className="mt-8 text-sm text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <Badge>{card.category}</Badge>
                <p className="mt-4 text-2xl font-bold text-ink">{card.meaning}</p>
                {showFurigana && card.reading ? (
                  <p className="mt-1 text-sm text-sea-deep">{card.reading}</p>
                ) : null}
                {card.pattern ? (
                  <p className="mt-2 text-sm text-sea-deep">句型：{card.pattern}</p>
                ) : null}
                <div className="mt-5 rounded-2xl bg-foam/80 p-4 text-left">
                  <p className="text-base leading-relaxed text-ink">{card.example}</p>
                  {showFurigana && card.exampleReading ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-sea-deep">
                      {card.exampleReading}
                    </p>
                  ) : null}
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
                playAudio()
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

          {todayMode && safeIndex === filtered.length - 1 && isStudied(card.id) ? (
            <Link
              to="/"
              className="block rounded-2xl bg-sea px-4 py-3 text-center text-white hover:bg-sea-deep"
            >
              本組完成 · 回首頁看進度
            </Link>
          ) : null}
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

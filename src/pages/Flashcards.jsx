import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FuriganaText from '../components/FuriganaText'
import { grammar } from '../data/grammar'
import { withMemory } from '../data/memory'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { seededShuffle } from '../utils/dailyPlan'
import {
  buildCardTracks,
  getPlaylistState,
  next as playlistNext,
  pause as playlistPause,
  previous as playlistPrevious,
  resume as playlistResume,
  startPlaylist,
  stop as playlistStop,
  subscribePlaylist,
} from '../utils/playlistPlayer'
import { getFilterStatus, GRADE_LABELS, normalizeEntry } from '../utils/srs'
import { speakJapanese, speechTextForCard, audioClipForCard, stopSpeaking } from '../utils/tts'

const ALL_CARDS = [...vocabulary, ...grammar]

const MODE_META = {
  'today-vocab': {
    title: '今日單字',
    hint: '先回想意思，翻面後用下方四鍵評分（間隔重複）',
  },
  'today-grammar': {
    title: '今日文法',
    hint: '先想「什麼時候用」，翻面看接續步驟與易混對照，例句跟讀 2 次再評分',
  },
  'today-review': {
    title: '到期複習',
    hint: '只出現今天該複習的卡片 · 評分越準，記住越久',
  },
  'today-listening': {
    title: '今日聽力',
    hint: '可循環播放單字＋例句；鎖屏後也會繼續（需用 Neural 音檔）',
  },
}

const GRADES = ['again', 'hard', 'good', 'easy']

function hasKanji(text = '') {
  return /[\u4e00-\u9fff]/.test(text)
}

export default function Flashcards() {
  const {
    cardProgress,
    setCardStatus,
    gradeCard,
    getEntry,
    todayVocab,
    todayGrammar,
    todayReview,
    markStudied,
    markListened,
    isStudied,
  } = useProgress()
  const {
    showFurigana,
    setShowFurigana,
    showExampleMeaning,
    setShowExampleMeaning,
    ttsEngine,
    setTtsEngine,
    ttsRate,
    setTtsRate,
    loopPlayWord,
    loopPlayExample,
    loopPlayMeaning,
    loopPlayExampleMeaning,
    setLoopPlayWord,
    setLoopPlayExample,
    setLoopPlayMeaning,
    setLoopPlayExampleMeaning,
  } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'all'

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [voiceEngine, setVoiceEngine] = useState(null)
  const [sessionLeft, setSessionLeft] = useState(null)
  const [browseSeed] = useState(() => `${Date.now()}-${Math.random()}`)
  const [playlist, setPlaylist] = useState(() => getPlaylistState())

  const todayMode = mode in MODE_META
  const srsMode = mode === 'today-vocab' || mode === 'today-grammar' || mode === 'today-review'
  const hideReadingOnFront = srsMode

  const filtered = useMemo(() => {
    if (mode === 'today-vocab') return todayVocab
    if (mode === 'today-grammar') return todayGrammar
    if (mode === 'today-review') return todayReview
    if (mode === 'today-listening') return todayVocab

    const q = query.trim().toLowerCase()
    const list = ALL_CARDS.filter((card) => {
      if (typeFilter !== 'all' && card.type !== typeFilter) return false
      const status = getFilterStatus(cardProgress, card.id)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true
      const hay = [card.word, card.reading, card.meaning, card.example, card.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    return seededShuffle(list, `browse:${browseSeed}:${typeFilter}:${statusFilter}:${q}`)
  }, [
    mode,
    todayVocab,
    todayGrammar,
    todayReview,
    query,
    typeFilter,
    statusFilter,
    cardProgress,
    browseSeed,
  ])

  const deck = sessionLeft ?? filtered

  useEffect(() => subscribePlaylist(setPlaylist), [])

  useEffect(() => {
    return () => {
      // Keep playing if user only flips within flashcards; stop when leaving page
    }
  }, [])

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    if (!srsMode) setSessionLeft(null)
  }, [mode, query, typeFilter, statusFilter, srsMode])

  // Snapshot the deck once when entering an SRS mode (don't reset mid-session on progress updates)
  useEffect(() => {
    if (!srsMode) return
    setSessionLeft(seededShuffle(filtered, `srs-enter:${Date.now()}:${Math.random()}`))
    setIndex(0)
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only on mode enter
  }, [mode])

  // Follow the currently playing card during loop playback
  useEffect(() => {
    const cardId = playlist.track?.cardId
    if (!cardId || !deck.length) return
    const idx = deck.findIndex((c) => c.id === cardId)
    if (idx >= 0 && idx !== index) {
      setIndex(idx)
      setFlipped(playlist.track?.kind === 'example')
    }
    if (cardId && playlist.playing) {
      markListened(cardId)
      if (todayMode && !srsMode) markStudied(cardId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from playlist only
  }, [playlist.track?.id, playlist.playing])

  const safeIndex = deck.length ? Math.min(index, deck.length - 1) : 0
  const card = withMemory(deck[safeIndex])
  const entry = card ? getEntry?.(card.id) || normalizeEntry(cardProgress[card.id]) : null

  function go(delta) {
    if (!deck.length) return
    if (card && todayMode && !srsMode) markStudied(card.id)
    setFlipped(false)
    setIndex((prev) => (prev + delta + deck.length) % deck.length)
  }

  function flipCard() {
    setFlipped((f) => {
      const next = !f
      if (next && card && todayMode && !srsMode) markStudied(card.id)
      return next
    })
  }

  function onGrade(grade) {
    if (!card) return
    gradeCard(card.id, grade)
    setFlipped(false)

    if (srsMode && sessionLeft) {
      const nextDeck = sessionLeft.filter((c) => c.id !== card.id)
      // "Again" cards stay in session for another pass
      if (grade === 'again') {
        const rest = sessionLeft.filter((c) => c.id !== card.id)
        const requeue = [...rest, card]
        setSessionLeft(requeue)
        setIndex(safeIndex >= rest.length ? 0 : safeIndex)
        return
      }
      setSessionLeft(nextDeck)
      if (!nextDeck.length) {
        setIndex(0)
        return
      }
      setIndex(Math.min(safeIndex, nextDeck.length - 1))
      return
    }

    go(1)
  }

  function onFilterChange(setter, value) {
    setter(value)
  }

  function clearMode() {
    setSearchParams({})
  }

  function playAudio() {
    if (!card) return
    playlistStop()
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
      if (!srsMode) markStudied(card.id)
    }
  }

  const loopOptions = {
    playWord: loopPlayWord,
    playExample: loopPlayExample,
    playMeaning: loopPlayMeaning,
    playExampleMeaning: loopPlayExampleMeaning,
  }

  const loopSelectionValid =
    loopPlayWord || loopPlayExample || loopPlayMeaning || loopPlayExampleMeaning

  function startLoopPlay() {
    if (!deck.length || !loopSelectionValid) return
    stopSpeaking()
    const startCardIndex = Math.max(0, safeIndex)
    const currentId = deck[startCardIndex]?.id
    // Build tracks from current deck, starting at current card
    const rotated = [...deck.slice(startCardIndex), ...deck.slice(0, startCardIndex)]
    const tracks = buildCardTracks(rotated, loopOptions)
    if (!tracks.length) return
    // If rebuilding mid-session, try to stay on the same card
    let startIndex = 0
    if (currentId) {
      const idx = tracks.findIndex((t) => t.cardId === currentId)
      if (idx >= 0) startIndex = idx
    }
    const ok = startPlaylist(tracks, {
      loop: true,
      rate: Math.min(1.25, Math.max(0.7, ttsRate / 0.88)),
      startIndex,
    })
    if (ok) setVoiceEngine('neural')
  }

  function toggleLoopPlay() {
    if (playlist.playing) {
      playlistPause()
      return
    }
    if (playlist.total > 0 && playlist.track) {
      playlistResume()
      return
    }
    startLoopPlay()
  }

  function toggleLoopOption(key, value, setter) {
    // Keep at least one track type enabled
    const next = {
      word: loopPlayWord,
      example: loopPlayExample,
      meaning: loopPlayMeaning,
      exampleMeaning: loopPlayExampleMeaning,
      [key]: value,
    }
    if (!next.word && !next.example && !next.meaning && !next.exampleMeaning) return
    setter(value)
    // If already in a loop session, rebuild with new options
    if (playlist.total > 0) {
      // defer until state commits
      queueMicrotask(() => {
        // use the intended next flags directly
        stopSpeaking()
        const startCardIndex = Math.max(0, safeIndex)
        const rotated = [...deck.slice(startCardIndex), ...deck.slice(0, startCardIndex)]
        const tracks = buildCardTracks(rotated, {
          playWord: next.word,
          playExample: next.example,
          playMeaning: next.meaning,
          playExampleMeaning: next.exampleMeaning,
        })
        if (!tracks.length) return
        startPlaylist(tracks, {
          loop: true,
          rate: Math.min(1.25, Math.max(0.7, ttsRate / 0.88)),
          startIndex: 0,
        })
      })
    }
  }

  const meta = MODE_META[mode]
  const doneSession = srsMode && sessionLeft && sessionLeft.length === 0
  const loopActive = playlist.total > 0

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
            to="/flashcards?mode=today-review"
            className="mt-2 inline-block text-sm text-sea-deep underline-offset-2 hover:underline"
          >
            開始 SRS 複習 →
          </Link>
        )}
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 space-y-3 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={showFurigana} onClick={() => setShowFurigana(!showFurigana)}>
            {showFurigana ? '音標：顯示中' : '音標：已隱藏'}
          </FilterChip>
          <FilterChip
            active={showExampleMeaning}
            onClick={() => setShowExampleMeaning(!showExampleMeaning)}
          >
            {showExampleMeaning ? '中文解釋：顯示中' : '中文解釋：已隱藏'}
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
          練習模式正面不顯示讀音，逼自己先回想。翻面後用「忘記／困難／記得／簡單」評分。
          {voiceEngine
            ? ` · 剛剛播放：${
                voiceEngine === 'neural'
                  ? 'Neural 自然聲'
                  : voiceEngine === 'mixed'
                    ? 'Neural＋中文解釋'
                    : '系統聲'
              }`
            : ''}
        </p>
      </section>

      {deck.length > 0 && !doneSession ? (
        <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">循環播放</p>
              <p className="mt-1 text-xs text-ink-soft">
                可開關要播的內容。日文／中文皆為 Neural 音檔，鎖屏後也可繼續。
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLoopPlay}
              disabled={!loopSelectionValid}
              className="rounded-2xl bg-sea px-4 py-2.5 text-sm font-medium text-white hover:bg-sea-deep disabled:opacity-40"
            >
              {playlist.playing ? '暫停' : loopActive ? '繼續播放' : '開始循環'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip
              active={loopPlayWord}
              onClick={() => toggleLoopOption('word', !loopPlayWord, setLoopPlayWord)}
            >
              單字
            </FilterChip>
            <FilterChip
              active={loopPlayMeaning}
              onClick={() => toggleLoopOption('meaning', !loopPlayMeaning, setLoopPlayMeaning)}
            >
              詞義解釋
            </FilterChip>
            <FilterChip
              active={loopPlayExample}
              onClick={() => toggleLoopOption('example', !loopPlayExample, setLoopPlayExample)}
            >
              例句
            </FilterChip>
            <FilterChip
              active={loopPlayExampleMeaning}
              onClick={() =>
                toggleLoopOption(
                  'exampleMeaning',
                  !loopPlayExampleMeaning,
                  setLoopPlayExampleMeaning,
                )
              }
            >
              例句解釋
            </FilterChip>
          </div>

          {loopActive ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink">
                {playlist.track?.title || '…'}
                <span className="text-ink-soft">
                  {' '}
                  · {playlist.track?.subtitle || ''} · {playlist.index + 1}/{playlist.total}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => playlistPrevious()}>上一則</ActionButton>
                <ActionButton onClick={() => playlistNext()}>下一則</ActionButton>
                <ActionButton
                  onClick={() => {
                    playlistStop()
                  }}
                >
                  停止
                </ActionButton>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

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
        {srsMode
          ? `本輪剩餘 ${deck.length} 張`
          : `共 ${deck.length} 張`}
        {card && !doneSession ? ` · 目前第 ${safeIndex + 1} 張` : ''}
        {entry?.due ? ` · 下次 ${entry.due}` : ''}
        {card && todayMode && !srsMode && isStudied(card.id) ? ' · 已計入今日' : ''}
      </p>

      {doneSession ? (
        <div className="surface soft-shadow animate-fade-up rounded-3xl p-8 text-center">
          <p className="font-display text-2xl font-bold text-ink">本輪複習完成</p>
          <p className="mt-2 text-sm text-ink-soft">忘記的卡片已排到今天稍後／明天再出現</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-2xl bg-sea px-5 py-3 text-white hover:bg-sea-deep"
          >
            回首頁看進度
          </Link>
        </div>
      ) : !card ? (
        <div className="surface rounded-3xl p-8 text-center text-ink-soft">
          {todayMode ? (
            <div className="space-y-3">
              <p>
                {mode === 'today-review'
                  ? '目前沒有到期卡片，去練今日單字或測驗吧'
                  : '今日這個項目沒有卡片可練'}
              </p>
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
                {hideReadingOnFront ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    {card.type === 'grammar'
                      ? '先想：什麼時候用？怎麼接？'
                      : '先想讀音與意思，再翻面'}
                  </p>
                ) : showFurigana ? (
                  <p className="mt-3 text-lg text-sea-deep">{card.reading}</p>
                ) : hasKanji(card.word) ? (
                  <p className="mt-3 text-sm text-ink-soft">音標已隱藏</p>
                ) : null}
                <p className="mt-8 text-sm text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <Badge>{card.category}</Badge>
                {card.pos ? (
                  <p className="mt-3 text-xs font-medium text-sea-deep">{card.pos}</p>
                ) : null}
                <p className="mt-2 text-2xl font-bold text-ink">{card.meaning}</p>
                {(showFurigana || hideReadingOnFront) && card.reading ? (
                  <p className="mt-1 text-sm text-sea-deep">{card.reading}</p>
                ) : null}
                {card.pattern ? (
                  <p className="mt-2 text-sm text-sea-deep">句型：{card.pattern}</p>
                ) : null}

                {card.type === 'grammar' ? (
                  <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-ink">
                    {card.useWhen ? (
                      <p className="rounded-xl bg-foam/90 px-3 py-2">
                        <span className="font-medium text-sea-deep">場面：</span>
                        {card.useWhen}
                      </p>
                    ) : null}
                    {card.form ? (
                      <p className="whitespace-pre-line rounded-xl bg-sand/80 px-3 py-2">
                        <span className="font-medium text-sea-deep">接續：</span>
                        {card.form}
                      </p>
                    ) : null}
                    {card.compare ? (
                      <p className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-line/60">
                        <span className="font-medium text-sea-deep">對照：</span>
                        {card.compare}
                      </p>
                    ) : null}
                    {card.tip ? (
                      <p className="rounded-xl bg-sea/10 px-3 py-2">
                        <span className="font-medium text-sea-deep">口訣：</span>
                        {card.tip}
                      </p>
                    ) : null}
                  </div>
                ) : card.memory ? (
                  <p className="mt-3 rounded-xl bg-sand/70 px-3 py-2 text-left text-xs leading-relaxed text-ink">
                    記憶：{card.memory}
                  </p>
                ) : null}

                <div className="mt-4 rounded-2xl bg-foam/80 p-4 text-left">
                  <p className="text-base leading-relaxed text-ink">
                    <FuriganaText
                      text={card.example}
                      annotated={card.exampleFurigana}
                      showFurigana={showFurigana}
                    />
                  </p>
                  {showExampleMeaning ? (
                    <p className="mt-2 text-sm text-ink-soft">{card.exampleMeaning}</p>
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">中文解釋已隱藏</p>
                  )}
                </div>
              </CardFace>
            </div>
          </article>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!srsMode ? <ActionButton onClick={() => go(-1)}>上一張</ActionButton> : null}
            <ActionButton
              onClick={(e) => {
                e.stopPropagation()
                playAudio()
              }}
            >
              🔊 播放
            </ActionButton>
            {!srsMode ? <ActionButton onClick={() => go(1)}>下一張</ActionButton> : null}
          </div>

          {srsMode ? (
            flipped ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((grade) => {
                  const metaG = GRADE_LABELS[grade]
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => onGrade(grade)}
                      className={`touch-target rounded-2xl px-3 py-3 text-sm font-medium transition ${gradeButtonClass(grade)}`}
                    >
                      <span className="block">{metaG.label}</span>
                      <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                        {metaG.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-ink-soft">翻面後評分，才會進入下一張</p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatusButton
                active={getFilterStatus(cardProgress, card.id) === 'learned'}
                onClick={() =>
                  setCardStatus(
                    card.id,
                    getFilterStatus(cardProgress, card.id) === 'learned' ? null : 'learned',
                  )
                }
                tone="sea"
              >
                已學會
              </StatusButton>
              <StatusButton
                active={getFilterStatus(cardProgress, card.id) === 'review'}
                onClick={() =>
                  setCardStatus(
                    card.id,
                    getFilterStatus(cardProgress, card.id) === 'review' ? null : 'review',
                  )
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
          )}
        </>
      )}
    </div>
  )
}

function gradeButtonClass(grade) {
  if (grade === 'again') return 'bg-coral text-white hover:opacity-90'
  if (grade === 'hard') return 'bg-sand text-ink ring-1 ring-line hover:bg-sand/80'
  if (grade === 'good') return 'bg-sea text-white hover:bg-sea-deep'
  return 'bg-ink text-white hover:opacity-90'
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

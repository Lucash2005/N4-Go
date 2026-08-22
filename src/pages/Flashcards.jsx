import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FuriganaText from '../components/FuriganaText'
import { grammar } from '../data/grammar'
import { withMemory } from '../data/memory'
import { FORM_CARDS, formRule } from '../data/verbForms'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { useLocalStorage } from '../hooks/useLocalStorage'
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

const ALL_CARDS = [...vocabulary, ...grammar, ...FORM_CARDS]

const MODE_META = {
  'today-vocab': {
    title: '今日單字',
    hint: '先回想意思，翻面後用下方四鍵評分（間隔重複）',
  },
  'today-grammar': {
    title: '今日文法',
    hint: '先做活用，再對文法走三步：接續 → 對照 → 自己造句',
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
    grammarPath,
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
  const [cardNotes, setCardNotes] = useLocalStorage('card-notes', {})
  const [noteDraft, setNoteDraft] = useState('')

  const todayMode = mode in MODE_META
  const srsMode = mode === 'today-vocab' || mode === 'today-grammar' || mode === 'today-review'
  const hideReadingOnFront = srsMode
  const showZhMeaning = showExampleMeaning || mode === 'today-grammar'

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
      const hay = [card.word, card.reading, card.meaning, card.meaningEn, card.example, card.category]
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
    setSessionLeft(
      mode === 'today-grammar'
        ? filtered
        : seededShuffle(filtered, `srs-enter:${Date.now()}:${Math.random()}`),
    )
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
      // Remount face-up first; only open the back when the track is an example
      setFlipped(false)
      setIndex(idx)
      if (playlist.track?.kind === 'example') {
        requestAnimationFrame(() => setFlipped(true))
      }
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

  // Keep note draft in sync with the current card; avoid leaking previous card's text
  useEffect(() => {
    setNoteDraft(card ? cardNotes[card.id] || '' : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when the card changes
  }, [card?.id])

  function saveNote(text) {
    if (!card) return
    const next = text.trim()
    setCardNotes((prev) => {
      const copy = { ...prev }
      if (!next) delete copy[card.id]
      else copy[card.id] = next
      return copy
    })
  }

  /** Advance only after the card is face-up, so the next card never flashes its answer. */
  function advanceTo(nextIndexOrFn, nextDeck = null) {
    setFlipped(false)
    // Defer deck/index change to the next frame so this card unflips first
    requestAnimationFrame(() => {
      if (nextDeck) setSessionLeft(nextDeck)
      setIndex(nextIndexOrFn)
    })
  }

  function go(delta) {
    if (!deck.length) return
    if (card && todayMode && !srsMode) markStudied(card.id)
    advanceTo((prev) => (prev + delta + deck.length) % deck.length)
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

    if (srsMode && sessionLeft) {
      // "Again" cards stay in session for another pass
      if (grade === 'again') {
        const rest = sessionLeft.filter((c) => c.id !== card.id)
        const requeue = [...rest, card]
        advanceTo(safeIndex >= rest.length ? 0 : safeIndex, requeue)
        return
      }
      const nextDeck = sessionLeft.filter((c) => c.id !== card.id)
      if (!nextDeck.length) {
        advanceTo(0, nextDeck)
        return
      }
      advanceTo(Math.min(safeIndex, nextDeck.length - 1), nextDeck)
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
  const grammarHint = grammarPath
    ? `${grammarPath.label}「${grammarPath.title}」：前兩張是活用，後面文法走三步（接續→對照→造句）。${grammarPath.howTo}`
    : MODE_META['today-grammar'].hint

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">
          {meta ? meta.title : '單字與文法卡片'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {meta
            ? mode === 'today-grammar'
              ? grammarHint
              : meta.hint
            : '點擊卡片翻面 · 支援搜尋與分類 · TTS 發音'}
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
              active={typeFilter === 'form'}
              onClick={() => onFilterChange(setTypeFilter, 'form')}
            >
              活用
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
            key={card.id}
            className="animate-flip-in soft-shadow relative cursor-pointer rounded-3xl [perspective:1200px]"
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
            {/* Grid stack: height follows the taller face so content never covers play buttons */}
            <div
              className={`grid min-h-[280px] [grid-template-areas:'stack'] [transform-style:preserve-3d] ${
                flipped
                  ? 'transition-transform duration-500 [transform:rotateY(180deg)]'
                  : 'transition-transform duration-500'
              }`}
            >
              <CardFace className="[grid-area:stack] [backface-visibility:hidden]">
                <Badge>
                  {card.type === 'vocab' ? '單字' : card.type === 'form' ? '活用' : '文法'}
                </Badge>
                <p className="mt-6 font-display text-4xl font-bold text-ink sm:text-5xl">
                  {card.word}
                </p>
                {hideReadingOnFront ? (
                  card.type === 'form' ? (
                    <p className="mt-3 text-base text-ink-soft">
                      先改成{card.formDrill?.target || card.category}，再翻面核對
                    </p>
                  ) : card.type === 'grammar' ? (
                    <ol className="mt-4 w-full space-y-1.5 text-left text-sm leading-relaxed text-ink-soft sm:text-base">
                      <li>1. 接續：接什麼形？</li>
                      <li>2. 對照：和哪條最容易混？</li>
                      <li>3. 造句：自己先想一句</li>
                    </ol>
                  ) : (
                    <p className="mt-3 text-base text-ink-soft">先想讀音與意思，再翻面</p>
                  )
                ) : showFurigana ? (
                  <p className="mt-3 text-xl text-sea-deep">{card.reading}</p>
                ) : hasKanji(card.word) ? (
                  <p className="mt-3 text-base text-ink-soft">音標已隱藏</p>
                ) : null}
                <p className="mt-8 text-base text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace
                align="start"
                className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <Badge>{card.category}</Badge>
                {card.level ? (
                  <span className="ml-2 rounded-full bg-foam px-2 py-0.5 text-xs text-ink-soft">
                    {card.level}
                  </span>
                ) : null}
                {card.reviewFlags?.length ? (
                  <span className="ml-2 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-medium text-coral">
                    建議核對
                  </span>
                ) : null}
                {card.pos ? (
                  <p className="mt-3 text-sm font-medium text-sea-deep">{card.pos}</p>
                ) : null}
                <p className="mt-2 text-3xl font-bold text-ink">{card.meaning}</p>
                {card.meaningEn ? (
                  <p className="mt-1 text-sm text-ink-soft">EN: {card.meaningEn}</p>
                ) : null}
                {(showFurigana || hideReadingOnFront) && card.reading ? (
                  <p className="mt-1 text-base text-sea-deep">
                    {card.type === 'form'
                      ? card.formDrill?.answerReading || card.reading
                      : card.reading}
                  </p>
                ) : null}
                {card.pattern ? (
                  <p className="mt-2 text-base text-sea-deep">句型：{card.pattern}</p>
                ) : null}

                {card.type === 'form' ? (
                  <div className="mt-4 w-full space-y-2.5 text-left text-sm leading-relaxed text-ink sm:text-base">
                    <p className="rounded-xl bg-sand/80 px-3.5 py-2.5">
                      <span className="font-medium text-sea-deep">正確：</span>
                      {card.formDrill?.answer}
                      {card.formDrill?.answerReading ? `（${card.formDrill.answerReading}）` : ''}
                    </p>
                    <p className="rounded-xl bg-foam/90 px-3.5 py-2.5">
                      <span className="font-medium text-sea-deep">規則：</span>
                      {card.formDrill ? formRule(card.formDrill) : card.exampleMeaning}
                    </p>
                    {card.useWhen ? (
                      <p className="rounded-xl bg-foam/90 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">用途：</span>
                        {card.useWhen}
                      </p>
                    ) : null}
                    {card.form ? (
                      <p className="whitespace-pre-line rounded-xl bg-sand/80 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">接續：</span>
                        {card.form}
                      </p>
                    ) : null}
                    {card.tip ? (
                      <p className="rounded-xl bg-sea/10 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">口訣：</span>
                        {card.tip}
                      </p>
                    ) : null}
                  </div>
                ) : card.type === 'grammar' ? (
                  <div className="mt-4 w-full space-y-2.5 text-left text-sm leading-relaxed text-ink sm:text-base">
                    {card.useWhen ? (
                      <p className="rounded-xl bg-foam/90 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">場面：</span>
                        {card.useWhen}
                      </p>
                    ) : null}
                    {card.form ? (
                      <p className="whitespace-pre-line rounded-xl bg-sand/80 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">1. 接續：</span>
                        {card.form}
                      </p>
                    ) : null}
                    {card.compare ? (
                      <p className="rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-line/60">
                        <span className="font-medium text-sea-deep">2. 對照：</span>
                        {card.compare}
                      </p>
                    ) : null}
                    {card.tip ? (
                      <p className="rounded-xl bg-sea/10 px-3.5 py-2.5">
                        <span className="font-medium text-sea-deep">口訣：</span>
                        {card.tip}
                      </p>
                    ) : null}
                    <p className="rounded-xl bg-white/70 px-3.5 py-2.5 text-ink-soft">
                      3. 造句：看完例句後，用自己的生活再寫一句
                    </p>
                  </div>
                ) : card.memory ? (
                  <p className="mt-4 w-full rounded-xl bg-sand/70 px-3.5 py-2.5 text-left text-sm leading-relaxed text-ink sm:text-base">
                    記憶：{card.memory}
                  </p>
                ) : null}

                {card.senses?.length ? (
                  <div className="mt-4 w-full space-y-2 text-left text-sm leading-relaxed text-ink sm:text-base">
                    <p className="text-xs font-medium text-sea-deep">常用多義（意思＋例句＋中文）</p>
                    <ul className="space-y-2">
                      {card.senses.map((sense) => (
                        <li
                          key={`${sense.meaning}-${sense.example}`}
                          className="rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-line/50"
                        >
                          <p className="font-medium text-ink">{sense.meaning}</p>
                          <p className="mt-1 text-sea-deep">{sense.example}</p>
                          {sense.exampleZh ? (
                            <p className="mt-0.5 text-ink-soft">{sense.exampleZh}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {card.exampleUsage ? (
                  <p className="mt-4 w-full rounded-xl bg-coral/10 px-3.5 py-2.5 text-left text-sm leading-relaxed text-ink sm:text-base">
                    <span className="font-medium text-coral">例句用法：</span>
                    {card.exampleUsage}
                  </p>
                ) : null}

                {card.type === 'form' ? (
                <div className="mt-4 w-full rounded-2xl bg-foam/80 p-4 text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-sea-deep">例句</p>
                  <p className="mt-2 text-lg leading-relaxed text-ink">
                    <FuriganaText
                      text={card.example}
                      annotated={card.exampleFurigana}
                      showFurigana={showFurigana}
                    />
                  </p>
                  {showZhMeaning ? (
                    <p className="mt-2 text-base text-ink-soft">{card.exampleMeaning}</p>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">中文解釋已隱藏</p>
                  )}
                </div>
                ) : (
                <div className="mt-4 w-full rounded-2xl bg-foam/80 p-4 text-left">
                  <p className="text-lg leading-relaxed text-ink">
                    <FuriganaText
                      text={card.example}
                      annotated={card.exampleFurigana}
                      showFurigana={showFurigana}
                    />
                  </p>
                  {showZhMeaning ? (
                    <p className="mt-2 text-base text-ink-soft">{card.exampleMeaning}</p>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">中文解釋已隱藏</p>
                  )}
                </div>
                )}
              </CardFace>
            </div>
          </article>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-1">
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

          <div
            className="surface soft-shadow rounded-3xl p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">我的筆記</p>
              <span className="text-xs text-ink-soft">只存在這支手機／瀏覽器</span>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => saveNote(noteDraft)}
              rows={3}
              placeholder="寫下接續口訣、自己的例句、易混對照…"
              className="w-full resize-y rounded-2xl border border-line bg-white/80 px-3 py-2.5 text-sm text-ink outline-none ring-sea/30 placeholder:text-ink-soft/70 focus:ring-2"
            />
            <div className="mt-2 flex justify-end gap-2">
              {noteDraft.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft('')
                    saveNote('')
                  }}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
                >
                  清除
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => saveNote(noteDraft)}
                className="rounded-xl bg-sea px-3 py-1.5 text-xs text-white hover:bg-sea-deep"
              >
                儲存筆記
              </button>
            </div>
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

function CardFace({ className = '', align = 'center', children }) {
  return (
    <div
      className={`surface flex h-full min-h-[280px] w-full flex-col items-center rounded-3xl p-5 text-center sm:p-6 ${
        align === 'start' ? 'justify-start' : 'justify-center'
      } ${className}`}
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
      className="touch-target rounded-2xl bg-white px-5 py-3 text-base font-medium text-ink ring-1 ring-line transition hover:bg-foam"
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

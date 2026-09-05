import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FuriganaText from '../components/FuriganaText'
import { grammar } from '../data/grammar'
import { withMemory } from '../data/memory'
import { FORM_CARDS, formRule } from '../data/verbForms'
import { getVocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { seededShuffle } from '../utils/dailyPlan'
import { compactGlossLines, compactSenseGlosses, isChineseGloss } from '../utils/gloss'

const EXAMPLE_SOURCE_LABEL = {
  openjlpt: 'OpenJLPT',
  jlpt: '日檢教材風',
  override: '手動校正',
  template: '安全模板',
  missing: '待補',
}

function exampleSourceLabel(source) {
  return EXAMPLE_SOURCE_LABEL[source] || source
}
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
import { frontPromptForCard, scriptFormsForCard } from '../utils/scriptForms'
import { reviewCardWithGemini } from '../utils/geminiReview'

function allBrowseCards() {
  return [...getVocabulary(), ...grammar, ...FORM_CARDS]
}

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
    reportCardIssue,
    reportReasons,
    isCardReported,
  } = useProgress()
  const {
    showFurigana,
    setShowFurigana,
    showExampleMeaning,
    setShowExampleMeaning,
    promptScript,
    setPromptScript,
    geminiApiKey,
    setGeminiApiKey,
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
  const [levelFilter, setLevelFilter] = useState('core') // core = N5+N4
  const [statusFilter, setStatusFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [voiceEngine, setVoiceEngine] = useState(null)
  const [sessionLeft, setSessionLeft] = useState(null)
  const [browseSeed] = useState(() => `${Date.now()}-${Math.random()}`)
  const [playlist, setPlaylist] = useState(() => getPlaylistState())
  const [cardNotes, setCardNotes] = useLocalStorage('card-notes', {})
  const [noteDraft, setNoteDraft] = useState('')
  const [showMoreSenses, setShowMoreSenses] = useState(false)
  const [showMoreDetail, setShowMoreDetail] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReasonsSelected, setReportReasonsSelected] = useState(() => ['meaning'])
  const [reportNote, setReportNote] = useState('')
  const [reportToast, setReportToast] = useState('')
  const [geminiChecking, setGeminiChecking] = useState(false)
  const [geminiError, setGeminiError] = useState('')
  const [geminiAnalysis, setGeminiAnalysis] = useState('')
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('')

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
    const list = allBrowseCards().filter((card) => {
      if (isCardReported?.(card.id)) return false
      if (typeFilter !== 'all' && card.type !== typeFilter) return false
      if (card.type === 'vocab') {
        if (levelFilter === 'core' && card.level === '延伸') return false
        if (levelFilter === 'N5' && card.level !== 'N5') return false
        if (levelFilter === 'N4' && card.level !== 'N4') return false
        if (levelFilter === '延伸' && card.level !== '延伸') return false
        // levelFilter === 'all' → no level restriction
      }
      const status = getFilterStatus(cardProgress, card.id)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true
      const hay = [card.word, card.reading, card.meaning, card.meaningEn, card.example, card.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    const levelRank = (c) => {
      if (c.type !== 'vocab') return 3
      if (c.level === 'N5') return 0
      if (c.level === 'N4') return 1
      if (c.level === '延伸') return 2
      return 3
    }
    const shuffled = seededShuffle(list, `browse:${browseSeed}:${typeFilter}:${levelFilter}:${statusFilter}:${q}`)
    return [...shuffled].sort((a, b) => levelRank(a) - levelRank(b))
  }, [
    mode,
    todayVocab,
    todayGrammar,
    todayReview,
    query,
    typeFilter,
    levelFilter,
    statusFilter,
    cardProgress,
    browseSeed,
    isCardReported,
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
  }, [mode, query, typeFilter, levelFilter, statusFilter, srsMode])

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
    setShowMoreSenses(false)
    setShowMoreDetail(false)
    setShowNotes(false)
    setShowReport(false)
    setReportReasonsSelected(['meaning'])
    setReportNote('')
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

  function removeCardFromSession(cardId) {
    setFlipped(false)
    if (srsMode && sessionLeft) {
      const nextDeck = sessionLeft.filter((c) => c.id !== cardId)
      requestAnimationFrame(() => {
        setSessionLeft(nextDeck)
        setIndex((prev) => {
          if (!nextDeck.length) return 0
          return Math.min(prev, nextDeck.length - 1)
        })
      })
      return
    }
    // Browse / listening: filtered list drops the card on next render
    requestAnimationFrame(() => {
      setIndex((prev) => Math.max(0, prev))
    })
  }

  function toggleReportReason(id) {
    setReportReasonsSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id)
        return next.length ? next : prev
      }
      return [...prev, id]
    })
  }

  async function runGeminiReview(targetCard = card, keyOverride = '') {
    if (!targetCard) return
    const key = String(keyOverride || geminiApiKey || '').trim()
    if (!key) {
      setGeminiError('missing_key')
      setGeminiChecking(false)
      setReportNote(
        '尚未設定 Gemini API Key。請在下方貼上金鑰後按「重新檢查」，系統會把字卡（含例句）送去檢查語意用法，結果會填入此欄供回報與後續修正參考。',
      )
      return
    }
    setGeminiChecking(true)
    setGeminiError('')
    setReportNote('正在請 Gemini 檢查字義與例句用法…')
    const result = await reviewCardWithGemini(targetCard, key)
    setGeminiChecking(false)
    if (!result.ok) {
      setGeminiError(result.error || 'failed')
      setGeminiAnalysis('')
      setReportNote(
        `Gemini 檢查失敗（${result.error || 'unknown'}）。仍可手動填寫補充說明後回報。`,
      )
      return
    }
    setGeminiAnalysis(result.text)
    setReportNote(result.text)
  }

  function openReportPanel() {
    setShowReport(true)
    setShowNotes(false)
    setReportReasonsSelected(['meaning'])
    setGeminiAnalysis('')
    setGeminiError('')
    setGeminiKeyDraft(geminiApiKey || '')
    void runGeminiReview(card, geminiApiKey)
  }

  function submitReport() {
    if (!card || !reportCardIssue) return
    if (!reportReasonsSelected.length) return
    reportCardIssue(card, reportReasonsSelected, reportNote, {
      geminiAnalysis: geminiAnalysis || reportNote,
    })
    setShowReport(false)
    setReportToast('已回報並隱藏，下次內容更新後再一併處理')
    window.setTimeout(() => setReportToast(''), 2800)
    removeCardFromSession(card.id)
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
            active={promptScript !== 'auto'}
            onClick={() =>
              setPromptScript(
                promptScript === 'auto' ? 'kana' : promptScript === 'kana' ? 'kanji' : 'auto',
              )
            }
          >
            {promptScript === 'kana'
              ? '正面：平假名（練漢字）'
              : promptScript === 'kanji'
                ? '正面：漢字（練假名）'
                : '正面：預設寫法'}
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

      {deck.length > 0 && !doneSession && !(srsMode && flipped) ? (
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
              active={levelFilter === 'core'}
              onClick={() => onFilterChange(setLevelFilter, 'core')}
            >
              N5＋N4
            </FilterChip>
            <FilterChip
              active={levelFilter === 'N5'}
              onClick={() => onFilterChange(setLevelFilter, levelFilter === 'N5' ? 'core' : 'N5')}
            >
              只看 N5
            </FilterChip>
            <FilterChip
              active={levelFilter === 'N4'}
              onClick={() => onFilterChange(setLevelFilter, levelFilter === 'N4' ? 'core' : 'N4')}
            >
              只看 N4
            </FilterChip>
            <FilterChip
              active={levelFilter === 'all'}
              onClick={() => onFilterChange(setLevelFilter, 'all')}
            >
              含延伸（錯誤較多）
            </FilterChip>
            <FilterChip
              active={levelFilter === '延伸'}
              onClick={() =>
                onFilterChange(setLevelFilter, levelFilter === '延伸' ? 'core' : '延伸')
              }
            >
              只看延伸
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
          <p className="text-xs text-ink-soft">預設只顯示 N5／N4；延伸詞庫錯誤較多，需手動開啟。</p>
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
              className={`grid h-[min(46vh,300px)] min-h-[220px] [grid-template-areas:'stack'] [transform-style:preserve-3d] ${
                flipped
                  ? 'transition-transform duration-500 [transform:rotateY(180deg)]'
                  : 'transition-transform duration-500'
              }`}
            >
              <CardFace className="[grid-area:stack] [backface-visibility:hidden] overflow-hidden">
                <Badge>
                  {card.type === 'vocab' ? '單字' : card.type === 'form' ? '活用' : '文法'}
                </Badge>
                <p className="mt-6 font-display text-4xl font-bold text-ink sm:text-5xl">
                  {card.type === 'vocab'
                    ? frontPromptForCard(card, promptScript)
                    : card.word}
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
                  ) : promptScript === 'kana' ? (
                    <p className="mt-3 text-base text-ink-soft">先想漢字寫法與意思，再翻面</p>
                  ) : promptScript === 'kanji' ? (
                    <p className="mt-3 text-base text-ink-soft">先想平假名讀音與意思，再翻面</p>
                  ) : (
                    <p className="mt-3 text-base text-ink-soft">先想讀音與意思，再翻面</p>
                  )
                ) : showFurigana &&
                  card.type === 'vocab' &&
                  frontPromptForCard(card, promptScript) !== card.reading ? (
                  <p className="mt-3 text-xl text-sea-deep">{card.reading}</p>
                ) : showFurigana && card.type !== 'vocab' ? (
                  <p className="mt-3 text-xl text-sea-deep">{card.reading}</p>
                ) : !showFurigana && hasKanji(frontPromptForCard(card, promptScript)) ? (
                  <p className="mt-3 text-base text-ink-soft">音標已隱藏</p>
                ) : null}
                <p className="mt-8 text-base text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace
                align="start"
                className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-y-auto overscroll-contain"
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

                {card.type === 'form' ? (
                  <FormCardBack card={card} showZhMeaning={showZhMeaning} showFurigana={showFurigana} />
                ) : card.type === 'grammar' ? (
                  <GrammarCardBack card={card} />
                ) : (
                  <VocabCardBack
                    card={card}
                    showZhMeaning={showZhMeaning}
                    showFurigana={showFurigana}
                    hideReadingOnFront={hideReadingOnFront}
                    promptScript={promptScript}
                    showMoreSenses={showMoreSenses}
                    setShowMoreSenses={setShowMoreSenses}
                    showMoreDetail={showMoreDetail}
                    setShowMoreDetail={setShowMoreDetail}
                  />
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

          <div className="mt-1">
            {!showReport ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openReportPanel()
                }}
                className="w-full rounded-2xl bg-white/80 px-4 py-2.5 text-sm text-ink-soft ring-1 ring-line hover:bg-foam"
              >
                回報問題（隱藏此卡直到下次更新）
              </button>
            ) : (
              <div
                className="surface soft-shadow rounded-3xl p-4 sm:p-5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">回報問題並隱藏</p>
                  <button
                    type="button"
                    onClick={() => setShowReport(false)}
                    className="text-xs text-ink-soft underline-offset-2 hover:underline"
                  >
                    取消
                  </button>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-ink-soft">
                  只選問題類型。開啟時會把本卡字義＋例句送 Gemini 檢查，結果寫入下方補充說明，方便之後修正參考。
                </p>
                <div className="flex flex-wrap gap-2">
                  {(reportReasons || []).map((reason) => {
                    const active = reportReasonsSelected.includes(reason.id)
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => toggleReportReason(reason.id)}
                        className={`rounded-full px-3 py-1.5 text-xs transition ${
                          active
                            ? 'bg-coral/15 font-medium text-coral ring-1 ring-coral/40'
                            : 'bg-foam text-ink-soft ring-1 ring-line hover:bg-foam'
                        }`}
                      >
                        {active ? '✓ ' : ''}
                        {reason.label}
                      </button>
                    )
                  })}
                </div>

                {!geminiApiKey || geminiError === 'missing_key' ? (
                  <div className="mt-3 rounded-2xl bg-foam/80 px-3 py-2.5 ring-1 ring-line">
                    <p className="text-xs text-ink-soft">
                      請貼上 Gemini API Key（只存在本機設定，用來自動檢查語意）。可到{' '}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sea-deep underline-offset-2 hover:underline"
                      >
                        Google AI Studio
                      </a>{' '}
                      免費建立。
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="password"
                        value={geminiKeyDraft}
                        onChange={(e) => setGeminiKeyDraft(e.target.value)}
                        placeholder="AIza…"
                        className="w-full flex-1 rounded-xl border border-line bg-white/90 px-3 py-2 text-sm text-ink outline-none ring-sea/30 focus:ring-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const key = geminiKeyDraft.trim()
                          setGeminiApiKey(key)
                          void runGeminiReview(card, key)
                        }}
                        className="rounded-xl bg-sea px-3 py-2 text-xs font-medium text-white hover:bg-sea-deep"
                      >
                        儲存並檢查
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-sea-deep">
                    補充說明（Gemini 語意檢查）
                    {geminiChecking ? ' · 檢查中…' : geminiAnalysis ? ' · 已填入' : ''}
                  </p>
                  <button
                    type="button"
                    disabled={geminiChecking}
                    onClick={() => void runGeminiReview(card)}
                    className="text-xs text-sea-deep underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    重新檢查
                  </button>
                </div>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  rows={7}
                  placeholder="Gemini 檢查結果會顯示在這裡，也可自行修改…"
                  className="mt-1.5 w-full resize-y rounded-2xl border border-line bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none ring-sea/30 placeholder:text-ink-soft/70 focus:ring-2"
                />
                {geminiError && geminiError !== 'missing_key' ? (
                  <p className="mt-1 text-xs text-coral">檢查失敗：{geminiError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={!reportReasonsSelected.length || geminiChecking}
                  className="mt-3 w-full rounded-2xl bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral/90 disabled:opacity-50"
                >
                  確認回報並隱藏
                  {reportReasonsSelected.length > 1
                    ? `（${reportReasonsSelected.length} 項）`
                    : ''}
                </button>
              </div>
            )}
          </div>

          <div className="mt-1">
            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="w-full rounded-2xl bg-white/80 px-4 py-2.5 text-sm text-ink-soft ring-1 ring-line hover:bg-foam"
              >
                我的筆記（選填）
              </button>
            ) : (
              <div
                className="surface soft-shadow rounded-3xl p-4 sm:p-5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">我的筆記</p>
                  <button
                    type="button"
                    onClick={() => setShowNotes(false)}
                    className="text-xs text-ink-soft underline-offset-2 hover:underline"
                  >
                    收合
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => saveNote(noteDraft)}
                  rows={2}
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
            )}
          </div>

          {reportToast ? (
            <p className="animate-fade-up rounded-2xl bg-sea/10 px-4 py-2 text-center text-sm text-sea-deep">
              {reportToast}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

function VocabCardBack({
  card,
  showZhMeaning,
  showFurigana,
  hideReadingOnFront,
  promptScript = 'auto',
  showMoreSenses,
  setShowMoreSenses,
  showMoreDetail,
  setShowMoreDetail,
}) {
  // Prefer Chinese glosses only; English stays behind「更多說明」
  const zhSenses = (card.senses || []).filter((s) => isChineseGloss(s.meaning))
  const sensePool = zhSenses
  const primaryLines = (() => {
    const fromSenses = compactSenseGlosses(sensePool, 2)
    if (fromSenses.length) return fromSenses
    return compactGlossLines(isChineseGloss(card.meaning) ? card.meaning : '', 2)
  })()
  const extraSenses = sensePool.slice(2)
  const hiddenSenseCount = Math.max(0, sensePool.length - 2)
  const hasHiddenSenses = hiddenSenseCount > 0 && !showMoreSenses
  const showSenseBlock = primaryLines.length > 0 && sensePool.length > 1
  const canExpandDetail =
    card.memory ||
    card.exampleUsage ||
    card.meaningEn ||
    card.pos ||
    (card.senses || []).some((s) => !isChineseGloss(s.meaning)) ||
    (card.senses || []).some((s) => s.example || s.exampleZh)
  const forms = scriptFormsForCard(card)
  const frontPrompt = frontPromptForCard(card, promptScript)
  const showKanjiLine = Boolean(forms.kanji)
  const showKanaLine = Boolean(forms.kana)
  const highlightKanji = frontPrompt === forms.kana && forms.kanji
  const highlightKana = forms.kanji && frontPrompt === forms.kanji

  return (
    <div className="w-full text-left">
      <p className="mt-1 text-2xl font-bold leading-snug text-ink sm:text-3xl">
        {isChineseGloss(card.meaning) ? card.meaning.split(/[；;]/)[0].trim() : card.meaning}
      </p>

      {(showKanjiLine || showKanaLine) && (forms.kanji !== forms.kana || showKanaLine) ? (
        <div className="mt-2 rounded-xl bg-sand/60 px-3 py-2 ring-1 ring-line/50">
          <p className="text-[11px] font-medium text-sea-deep">寫法練習（與此字義／例句一致）</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
            {showKanjiLine ? (
              <p>
                <span className="text-ink-soft">漢字：</span>
                <span className={highlightKanji ? 'text-lg font-bold text-coral' : 'font-semibold'}>
                  {forms.kanji}
                </span>
              </p>
            ) : null}
            {showKanaLine ? (
              <p>
                <span className="text-ink-soft">平假名：</span>
                <span className={highlightKana ? 'text-lg font-bold text-coral' : 'font-semibold'}>
                  {forms.kana}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      ) : (showFurigana || hideReadingOnFront) && card.reading ? (
        <p className="mt-0.5 text-sm text-sea-deep">{card.reading}</p>
      ) : null}

      {showSenseBlock ? (
        <div className="mt-2 space-y-1 text-sm leading-snug text-ink">
          <p className="text-[11px] font-medium text-sea-deep">常用多義</p>
          <ul className="space-y-0.5">
            {primaryLines.map((line) => (
              <li key={line} className="rounded-md bg-white/70 px-2 py-0.5 ring-1 ring-line/40">
                {line}
              </li>
            ))}
          </ul>
          {hasHiddenSenses ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMoreSenses(true)
              }}
              className="text-xs text-sea-deep underline-offset-2 hover:underline"
            >
              更多多義（{hiddenSenseCount}）
            </button>
          ) : null}
          {showMoreSenses && extraSenses.length ? (
            <ul className="mt-1 space-y-0.5">
              {extraSenses.map((sense) =>
                compactGlossLines(sense.meaning, 2, 32).map((line) => (
                  <li
                    key={`${sense.senseIndex}-${line}`}
                    className="rounded-md bg-white/70 px-2 py-0.5 ring-1 ring-line/40"
                  >
                    {line}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 rounded-xl bg-foam/80 px-3 py-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="text-xs font-medium text-sea-deep">例句</p>
          {card.exampleSource ? (
            <p className="text-[11px] text-ink-soft">
              出處：{exampleSourceLabel(card.exampleSource)}
            </p>
          ) : null}
        </div>
        <p className="mt-1.5 text-base leading-relaxed text-ink sm:text-lg">
          <FuriganaText
            text={card.example}
            annotated={card.exampleFurigana || card.example}
            showFurigana={true}
          />
        </p>
        {showZhMeaning ? (
          <p className="mt-1 text-sm text-ink-soft">{card.exampleMeaning}</p>
        ) : (
          <p className="mt-1 text-xs text-ink-soft">中文解釋已隱藏</p>
        )}
      </div>

      {canExpandDetail ? (
        <div className="mt-2">
          {!showMoreDetail ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMoreDetail(true)
              }}
              className="text-xs text-sea-deep underline-offset-2 hover:underline"
            >
              更多說明（含英文）
            </button>
          ) : (
            <div className="mt-1 space-y-1.5 text-xs leading-relaxed text-ink sm:text-sm">
              {card.pos ? <p className="font-medium text-sea-deep">{card.pos}</p> : null}
              {card.meaningEn ? <p className="text-ink-soft">EN: {card.meaningEn}</p> : null}
              {card.memory ? (
                <p className="rounded-lg bg-sand/70 px-2.5 py-1.5">記憶：{card.memory}</p>
              ) : null}
              {card.exampleUsage ? (
                <p className="rounded-lg bg-coral/10 px-2.5 py-1.5">
                  <span className="font-medium text-coral">例句用法：</span>
                  {card.exampleUsage}
                </p>
              ) : null}
              {(card.senses || []).map((sense) => (
                <div
                  key={`all-${sense.senseIndex ?? sense.meaningEn}`}
                  className="rounded-lg bg-white/80 px-2.5 py-1.5 ring-1 ring-line/50"
                >
                  <SenseDetail sense={sense} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function SenseDetail({ sense }) {
  return (
    <>
      <p className="font-medium text-ink">{sense.meaning}</p>
      {sense.meaningEn && sense.meaningEn !== sense.meaning ? (
        <p className="mt-0.5 text-xs text-ink-soft">EN: {sense.meaningEn}</p>
      ) : null}
      {sense.pos ? <p className="mt-0.5 text-xs text-sea-deep">{sense.pos}</p> : null}
    </>
  )
}

function FormCardBack({ card, showZhMeaning, showFurigana }) {
  return (
    <>
      <p className="mt-2 text-3xl font-bold text-ink">{card.meaning}</p>
      {showFurigana && card.reading ? (
        <p className="mt-1 text-base text-sea-deep">
          {card.formDrill?.answerReading || card.reading}
        </p>
      ) : null}
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
      <div className="mt-4 w-full rounded-2xl bg-foam/80 p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-sea-deep">例句</p>
        <p className="mt-2 text-lg leading-relaxed text-ink">
          <FuriganaText
            text={card.example}
            annotated={card.exampleFurigana}
            showFurigana={true}
          />
        </p>
        {showZhMeaning ? (
          <p className="mt-2 text-base text-ink-soft">{card.exampleMeaning}</p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">中文解釋已隱藏</p>
        )}
      </div>
    </>
  )
}

function GrammarCardBack({ card }) {
  return (
    <>
      <p className="mt-2 text-3xl font-bold text-ink">{card.meaning}</p>
      {card.pattern ? <p className="mt-2 text-base text-sea-deep">句型：{card.pattern}</p> : null}
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
      {card.example ? (
        <div className="mt-4 w-full rounded-2xl bg-foam/80 p-4 text-left">
          <p className="text-lg leading-relaxed text-ink">
            <FuriganaText
              text={card.example}
              annotated={card.exampleFurigana}
              showFurigana={true}
            />
          </p>
          {card.exampleMeaning ? (
            <p className="mt-2 text-base text-ink-soft">{card.exampleMeaning}</p>
          ) : null}
        </div>
      ) : null}
    </>
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
      className={`surface flex h-full w-full flex-col items-center rounded-3xl p-4 text-center sm:p-5 ${
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

import { saveJSON } from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'

/** Flashcard type scale — applied via --fc-scale CSS var */
export const CARD_FONT_SIZES = {
  sm: { label: '小', scale: 0.85 },
  md: { label: '中', scale: 1 },
  lg: { label: '大', scale: 1.18 },
  xl: { label: '特大', scale: 1.35 },
}

const DEFAULT_SETTINGS = {
  showFurigana: true,
  showExampleMeaning: true,
  /** auto = card.word; kanji/kana = force that script on the front for writing practice */
  promptScript: 'auto', // auto | kanji | kana
  /**
   * Flashcard quiz direction:
   * - ja-zh: front Japanese → flip for Chinese (default)
   * - zh-ja: front Chinese meaning → flip for Japanese word/reading
   */
  quizDirection: 'ja-zh', // ja-zh | zh-ja
  /** Device-local Gemini API key for report-time meaning checks */
  geminiApiKey: '',
  ttsEngine: 'auto', // auto | system
  ttsRate: 0.88,
  /** Flashcard content type size: sm | md | lg | xl */
  cardFontSize: 'md',
  /** Auto-speak when a card face is shown */
  autoPlayOnShow: false,
  loopPlayWord: true,
  loopPlayExample: true,
  loopPlayMeaning: false,
  loopPlayExampleMeaning: false,
  /**
   * Daily new-vocab target: 'phase' follows studyPhases, or 12–30 fixed.
   * Catch-up boost is separate (autoCatchUp / 手動加量).
   */
  dailyVocabTarget: 'phase',
  /** How many non-again grades a new card needs in today-vocab before it leaves the session */
  newCardPasses: 2,
  /** When behind month target, auto-raise today's vocab up to 40 (default off) */
  autoCatchUp: false,
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('ui-settings', DEFAULT_SETTINGS)

  function updateSetting(key, value) {
    setSettings((prev) => {
      const next = { ...DEFAULT_SETTINGS, ...prev, [key]: value }
      // Sync persist so plan rebuild / getStudyPrefs() sees the new value immediately.
      saveJSON('ui-settings', next)
      return next
    })
  }

  const merged = { ...DEFAULT_SETTINGS, ...settings }

  const promptScript = ['auto', 'kanji', 'kana'].includes(settings.promptScript)
    ? settings.promptScript
    : 'auto'
  const quizDirection = settings.quizDirection === 'zh-ja' ? 'zh-ja' : 'ja-zh'
  const geminiApiKey = String(settings.geminiApiKey || '').trim()
  const cardFontSize = CARD_FONT_SIZES[settings.cardFontSize]
    ? settings.cardFontSize
    : 'md'
  const cardFontScale = CARD_FONT_SIZES[cardFontSize].scale

  const rawTarget = merged.dailyVocabTarget
  const dailyVocabTarget =
    rawTarget === 'phase' || rawTarget === undefined || rawTarget === null || rawTarget === ''
      ? 'phase'
      : Number.isFinite(Number(rawTarget))
        ? Math.min(40, Math.max(5, Number(rawTarget)))
        : 'phase'
  const newCardPasses = Math.min(3, Math.max(1, Number(merged.newCardPasses) || 2))
  const autoCatchUp = merged.autoCatchUp === true

  return {
    settings: merged,
    showFurigana: settings.showFurigana !== false,
    showExampleMeaning: settings.showExampleMeaning !== false,
    promptScript,
    quizDirection,
    geminiApiKey,
    ttsEngine: settings.ttsEngine || 'auto',
    ttsRate: typeof settings.ttsRate === 'number' ? settings.ttsRate : 0.88,
    cardFontSize,
    cardFontScale,
    autoPlayOnShow: merged.autoPlayOnShow === true,
    loopPlayWord: merged.loopPlayWord !== false,
    loopPlayExample: merged.loopPlayExample !== false,
    loopPlayMeaning: merged.loopPlayMeaning === true,
    loopPlayExampleMeaning: merged.loopPlayExampleMeaning === true,
    dailyVocabTarget,
    newCardPasses,
    autoCatchUp,
    setShowFurigana: (v) => updateSetting('showFurigana', v),
    setShowExampleMeaning: (v) => updateSetting('showExampleMeaning', v),
    setPromptScript: (v) => updateSetting('promptScript', v),
    setQuizDirection: (v) => updateSetting('quizDirection', v === 'zh-ja' ? 'zh-ja' : 'ja-zh'),
    setGeminiApiKey: (v) => updateSetting('geminiApiKey', String(v || '').trim()),
    setTtsEngine: (v) => updateSetting('ttsEngine', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
    setCardFontSize: (v) =>
      updateSetting('cardFontSize', CARD_FONT_SIZES[v] ? v : 'md'),
    setAutoPlayOnShow: (v) => updateSetting('autoPlayOnShow', Boolean(v)),
    setLoopPlayWord: (v) => updateSetting('loopPlayWord', v),
    setLoopPlayExample: (v) => updateSetting('loopPlayExample', v),
    setLoopPlayMeaning: (v) => updateSetting('loopPlayMeaning', v),
    setLoopPlayExampleMeaning: (v) => updateSetting('loopPlayExampleMeaning', v),
    setDailyVocabTarget: (v) =>
      updateSetting(
        'dailyVocabTarget',
        v === 'phase' || v === undefined || v === null || v === ''
          ? 'phase'
          : Math.min(40, Math.max(5, Number(v) || 18)),
      ),
    setNewCardPasses: (v) =>
      updateSetting('newCardPasses', Math.min(3, Math.max(1, Number(v) || 2))),
    setAutoCatchUp: (v) => updateSetting('autoCatchUp', Boolean(v)),
  }
}

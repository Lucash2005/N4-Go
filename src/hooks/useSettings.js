import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS = {
  showFurigana: true,
  showExampleMeaning: true,
  /** auto = card.word; kanji/kana = force that script on the front for writing practice */
  promptScript: 'auto', // auto | kanji | kana
  /** Device-local Gemini API key for report-time meaning checks */
  geminiApiKey: '',
  ttsEngine: 'auto', // auto | system
  ttsRate: 0.88,
  loopPlayWord: true,
  loopPlayExample: true,
  loopPlayMeaning: false,
  loopPlayExampleMeaning: false,
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('ui-settings', DEFAULT_SETTINGS)

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, [key]: value }))
  }

  const merged = { ...DEFAULT_SETTINGS, ...settings }

  const promptScript = ['auto', 'kanji', 'kana'].includes(settings.promptScript)
    ? settings.promptScript
    : 'auto'
  const geminiApiKey = String(settings.geminiApiKey || '').trim()

  return {
    settings: merged,
    showFurigana: settings.showFurigana !== false,
    showExampleMeaning: settings.showExampleMeaning !== false,
    promptScript,
    geminiApiKey,
    ttsEngine: settings.ttsEngine || 'auto',
    ttsRate: typeof settings.ttsRate === 'number' ? settings.ttsRate : 0.88,
    loopPlayWord: merged.loopPlayWord !== false,
    loopPlayExample: merged.loopPlayExample !== false,
    loopPlayMeaning: merged.loopPlayMeaning === true,
    loopPlayExampleMeaning: merged.loopPlayExampleMeaning === true,
    setShowFurigana: (v) => updateSetting('showFurigana', v),
    setShowExampleMeaning: (v) => updateSetting('showExampleMeaning', v),
    setPromptScript: (v) => updateSetting('promptScript', v),
    setGeminiApiKey: (v) => updateSetting('geminiApiKey', String(v || '').trim()),
    setTtsEngine: (v) => updateSetting('ttsEngine', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
    setLoopPlayWord: (v) => updateSetting('loopPlayWord', v),
    setLoopPlayExample: (v) => updateSetting('loopPlayExample', v),
    setLoopPlayMeaning: (v) => updateSetting('loopPlayMeaning', v),
    setLoopPlayExampleMeaning: (v) => updateSetting('loopPlayExampleMeaning', v),
  }
}

import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS = {
  showFurigana: true,
  showExampleMeaning: true,
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

  return {
    settings: merged,
    showFurigana: settings.showFurigana !== false,
    showExampleMeaning: settings.showExampleMeaning !== false,
    ttsEngine: settings.ttsEngine || 'auto',
    ttsRate: typeof settings.ttsRate === 'number' ? settings.ttsRate : 0.88,
    loopPlayWord: merged.loopPlayWord !== false,
    loopPlayExample: merged.loopPlayExample !== false,
    loopPlayMeaning: merged.loopPlayMeaning === true,
    loopPlayExampleMeaning: merged.loopPlayExampleMeaning === true,
    setShowFurigana: (v) => updateSetting('showFurigana', v),
    setShowExampleMeaning: (v) => updateSetting('showExampleMeaning', v),
    setTtsEngine: (v) => updateSetting('ttsEngine', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
    setLoopPlayWord: (v) => updateSetting('loopPlayWord', v),
    setLoopPlayExample: (v) => updateSetting('loopPlayExample', v),
    setLoopPlayMeaning: (v) => updateSetting('loopPlayMeaning', v),
    setLoopPlayExampleMeaning: (v) => updateSetting('loopPlayExampleMeaning', v),
  }
}

import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS = {
  showFurigana: true,
  ttsEngine: 'auto', // auto | system
  ttsRate: 0.88,
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('ui-settings', DEFAULT_SETTINGS)

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, [key]: value }))
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    showFurigana: settings.showFurigana !== false,
    ttsEngine: settings.ttsEngine || 'auto',
    ttsRate: typeof settings.ttsRate === 'number' ? settings.ttsRate : 0.88,
    setShowFurigana: (v) => updateSetting('showFurigana', v),
    setTtsEngine: (v) => updateSetting('ttsEngine', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
  }
}

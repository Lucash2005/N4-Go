/**
 * Study pacing prefs (stored in ui-settings localStorage).
 * Shared by ProgressProvider (plan build) and Settings UI.
 */
import { getPhaseDailyQuota } from '../data/studyPhases'
import { loadJSON } from './storage'

export const VOCAB_TARGET_CHOICES = [
  { value: 'phase', label: '階段預設' },
  { value: 12, label: '12' },
  { value: 15, label: '15' },
  { value: 18, label: '18' },
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 30, label: '30' },
]

export const NEW_CARD_PASS_CHOICES = [1, 2, 3]

/** @returns {{ dailyVocabTarget: 'phase'|number, vocabQuota: number, phaseVocab: number, newCardPasses: number, autoCatchUp: boolean }} */
export function getStudyPrefs() {
  const s = loadJSON('ui-settings', {}) || {}
  const phaseVocab = getPhaseDailyQuota().vocab
  const raw = s.dailyVocabTarget
  let dailyVocabTarget = /** @type {'phase'|number} */ ('phase')
  let vocabQuota = phaseVocab
  if (raw !== undefined && raw !== null && raw !== '' && raw !== 'phase') {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 5 && n <= 40) {
      dailyVocabTarget = n
      vocabQuota = n
    }
  }
  const newCardPasses = Math.min(3, Math.max(1, Number(s.newCardPasses) || 2))
  // Default OFF: auto-boost to ~40 was the main reason sessions felt too thin.
  const autoCatchUp = s.autoCatchUp === true
  return { dailyVocabTarget, vocabQuota, phaseVocab, newCardPasses, autoCatchUp }
}

export function vocabQuotaSourceLabel(source, phaseVocab) {
  if (source === 'catch-up') return `進度落後加量（階段 ${phaseVocab}）`
  if (source === 'user') return '你設定的目標'
  return `階段預設 ${phaseVocab}`
}

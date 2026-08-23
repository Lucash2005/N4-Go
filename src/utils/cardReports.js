import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const STORAGE_KEY = 'reported-cards'

export const REPORT_REASONS = [
  { id: 'audio', label: '音檔不一致' },
  { id: 'meaning', label: '字義有誤／疑慮' },
  { id: 'example', label: '例句有問題' },
  { id: 'ui', label: '畫面有問題' },
  { id: 'other', label: '其他錯誤' },
]

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: raw.contentVersion || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

/** Drop hides from older content builds so fixed cards can return after an update. */
export function loadReportedCards() {
  const store = normalizeStore(loadJSON(STORAGE_KEY, null))
  if (store.contentVersion !== CONTENT_VERSION) {
    const next = { contentVersion: CONTENT_VERSION, items: {} }
    saveJSON(STORAGE_KEY, next)
    return next
  }
  return store
}

export function saveReportedCards(store) {
  saveJSON(STORAGE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function reportedIdSet(store = loadReportedCards()) {
  return new Set(Object.keys(store.items || {}))
}

export function isCardReported(id, store = loadReportedCards()) {
  return Boolean(id && store.items?.[id])
}

export function reportCard(card, reasonId, note = '', store = loadReportedCards()) {
  if (!card?.id) return store
  const reason = REPORT_REASONS.find((r) => r.id === reasonId) || REPORT_REASONS[REPORT_REASONS.length - 1]
  const next = {
    contentVersion: CONTENT_VERSION,
    items: {
      ...store.items,
      [card.id]: {
        id: card.id,
        word: card.word || card.reading || card.id,
        type: card.type || 'vocab',
        level: card.level || '',
        reason: reason.id,
        reasonLabel: reason.label,
        note: String(note || '').trim().slice(0, 200),
        at: new Date().toISOString(),
        contentVersion: CONTENT_VERSION,
      },
    },
  }
  saveReportedCards(next)
  return next
}

export function unreportCard(id, store = loadReportedCards()) {
  if (!id || !store.items?.[id]) return store
  const items = { ...store.items }
  delete items[id]
  const next = { contentVersion: CONTENT_VERSION, items }
  saveReportedCards(next)
  return next
}

export function clearAllReports() {
  const next = { contentVersion: CONTENT_VERSION, items: {} }
  saveReportedCards(next)
  return next
}

export function filterOutReported(cards, store = loadReportedCards()) {
  const hidden = reportedIdSet(store)
  if (!hidden.size) return cards
  return cards.filter((c) => !hidden.has(c.id))
}

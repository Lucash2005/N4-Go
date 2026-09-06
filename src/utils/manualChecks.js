/**
 * Manually verified cards — device-local, survives content updates.
 * If card text changes after verify, keep the mark but flag “needs recheck”.
 */
import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const STORAGE_KEY = 'manual-checked-cards'

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

/** Stable fingerprint of the fields a learner would verify. */
export function contentFingerprint(card = {}) {
  return [
    card.word || '',
    card.reading || '',
    card.kanji || '',
    card.meaning || '',
    card.example || '',
    card.exampleMeaning || '',
    card.pattern || '',
  ].join('\u0001')
}

/**
 * Load store. Never wipe items on CONTENT_VERSION bump — only refresh the version stamp.
 */
export function loadManualChecks() {
  const store = normalizeStore(loadJSON(STORAGE_KEY, null))
  if (store.contentVersion !== CONTENT_VERSION) {
    const next = { ...store, contentVersion: CONTENT_VERSION }
    saveJSON(STORAGE_KEY, next)
    return next
  }
  return store
}

export function saveManualChecks(store) {
  saveJSON(STORAGE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function isManuallyChecked(id, store = loadManualChecks()) {
  return Boolean(id && store.items?.[id])
}

export function getManualCheck(id, store = loadManualChecks()) {
  if (!id) return null
  return store.items?.[id] || null
}

/**
 * @returns {{ stale: boolean, checkedAt: string } | null}
 */
export function manualCheckStatus(card, store = loadManualChecks()) {
  if (!card?.id) return null
  const item = store.items?.[card.id]
  if (!item) return null
  const fp = contentFingerprint(card)
  return {
    stale: Boolean(item.fingerprint && item.fingerprint !== fp),
    checkedAt: item.at || '',
    fingerprint: item.fingerprint || '',
  }
}

export function markManuallyChecked(card, store = loadManualChecks()) {
  if (!card?.id) return store
  const next = {
    contentVersion: CONTENT_VERSION,
    items: {
      ...store.items,
      [card.id]: {
        id: card.id,
        word: card.word || card.reading || card.id,
        type: card.type || 'vocab',
        fingerprint: contentFingerprint(card),
        at: new Date().toISOString(),
        contentVersion: CONTENT_VERSION,
      },
    },
  }
  saveManualChecks(next)
  return next
}

export function unmarkManuallyChecked(id, store = loadManualChecks()) {
  if (!id || !store.items?.[id]) return store
  const items = { ...store.items }
  delete items[id]
  const next = { contentVersion: CONTENT_VERSION, items }
  saveManualChecks(next)
  return next
}

export function manualCheckedIdSet(store = loadManualChecks()) {
  return new Set(Object.keys(store.items || {}))
}

export function manualCheckedCount(store = loadManualChecks()) {
  return Object.keys(store.items || {}).length
}

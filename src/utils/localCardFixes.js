/**
 * Device-local card fixes from Gemini suggestions.
 * Survive CONTENT_VERSION bumps; official deploys do not wipe these.
 */
import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const STORAGE_KEY = 'local-card-fixes'

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

/** Load store; never wipe items when content version changes. */
export function loadLocalCardFixes() {
  const store = normalizeStore(loadJSON(STORAGE_KEY, null))
  if (store.contentVersion !== CONTENT_VERSION) {
    const next = { ...store, contentVersion: CONTENT_VERSION }
    saveJSON(STORAGE_KEY, next)
    return next
  }
  return store
}

export function saveLocalCardFixes(store) {
  saveJSON(STORAGE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function getLocalCardFix(id, store = loadLocalCardFixes()) {
  if (!id) return null
  return store.items?.[id] || null
}

export function applyLocalCardFix(card, patch = {}, meta = {}, store = loadLocalCardFixes()) {
  if (!card?.id) return store
  const clean = {}
  for (const key of ['meaning', 'example', 'exampleMeaning', 'pattern', 'kanji']) {
    const v = String(patch[key] || '').trim()
    if (!v) continue
    if (v === '…' || v === '...' || v === '無' || v === '同原文' || v === '不變') continue
    if (card[key] && v === String(card[key]).trim()) continue
    clean[key] = v
  }
  if (clean.example) clean.exampleFurigana = ''
  if (!Object.keys(clean).length) return store

  const next = {
    contentVersion: CONTENT_VERSION,
    items: {
      ...store.items,
      [card.id]: {
        id: card.id,
        word: card.word || card.reading || card.id,
        type: card.type || 'vocab',
        ...clean,
        source: meta.source || 'gemini',
        note: String(meta.note || '').slice(0, 500),
        at: new Date().toISOString(),
        contentVersion: CONTENT_VERSION,
      },
    },
  }
  saveLocalCardFixes(next)
  return next
}

export function clearLocalCardFix(id, store = loadLocalCardFixes()) {
  if (!id || !store.items?.[id]) return store
  const items = { ...store.items }
  delete items[id]
  const next = { contentVersion: CONTENT_VERSION, items }
  saveLocalCardFixes(next)
  return next
}

/** Merge local fix onto a card for display / study. */
export function withLocalCardFix(card, store = loadLocalCardFixes()) {
  if (!card?.id) return card
  const fix = store.items?.[card.id]
  if (!fix) return card
  const next = { ...card }
  for (const key of ['meaning', 'example', 'exampleMeaning', 'exampleFurigana', 'pattern', 'kanji']) {
    if (fix[key] != null && String(fix[key]).length) next[key] = fix[key]
  }
  next.localFix = {
    at: fix.at || '',
    source: fix.source || 'gemini',
  }
  return next
}

export function mapCardsWithLocalFixes(cards, store = loadLocalCardFixes()) {
  if (!Array.isArray(cards)) return cards
  return cards.map((c) => withLocalCardFix(c, store))
}

export function localFixCount(store = loadLocalCardFixes()) {
  return Object.keys(store.items || {}).length
}

export function exportLocalCardFixesJson(store = loadLocalCardFixes()) {
  const items = Object.values(store.items || {})
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      contentVersion: CONTENT_VERSION,
      count: items.length,
      items: items.sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))),
    },
    null,
    2,
  )
}

/**
 * Device-local cache for Gemini example-grammar analyses.
 * Keyed by card id + example fingerprint so meaning/example edits invalidate.
 */
import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const CACHE_KEY = 'example-grammar-cache'

function fingerprint(example, exampleMeaning) {
  return `${String(example || '').trim()}||${String(exampleMeaning || '').trim()}`
}

function loadStore() {
  const raw = loadJSON(CACHE_KEY, null)
  if (!raw || typeof raw !== 'object') {
    return { contentVersion: CONTENT_VERSION, items: {} }
  }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function saveStore(store) {
  saveJSON(CACHE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function getCachedExampleGrammar(cardId, example, exampleMeaning) {
  if (!cardId) return null
  const store = loadStore()
  if (store.contentVersion !== CONTENT_VERSION) return null
  const hit = store.items?.[cardId]
  if (!hit?.text) return null
  if (hit.fp !== fingerprint(example, exampleMeaning)) return null
  return hit
}

export function setCachedExampleGrammar(cardId, example, exampleMeaning, text, meta = {}) {
  if (!cardId || !text) return
  const store = loadStore()
  const items = store.contentVersion === CONTENT_VERSION ? { ...store.items } : {}
  items[cardId] = {
    text: String(text).slice(0, 1800),
    fp: fingerprint(example, exampleMeaning),
    at: new Date().toISOString(),
    model: meta.model || '',
  }
  saveStore({ contentVersion: CONTENT_VERSION, items })
}

export function clearCachedExampleGrammar(cardId) {
  if (!cardId) return
  const store = loadStore()
  if (!store.items?.[cardId]) return
  const items = { ...store.items }
  delete items[cardId]
  saveStore({ contentVersion: store.contentVersion || CONTENT_VERSION, items })
}

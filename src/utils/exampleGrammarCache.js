/**
 * Device-local cache for Gemini example-grammar analyses.
 *
 * Invalidation is per-card only:
 * - example or exampleMeaning text changed (fingerprint mismatch)
 * - user taps「重新分析」(clearCachedExampleGrammar)
 *
 * Content version bumps do NOT wipe analyses — otherwise every vocab fix
 * would re-spend Gemini tokens for unchanged sentences.
 */
import { loadJSON, saveJSON } from './storage'

const CACHE_KEY = 'example-grammar-cache'

function fingerprint(example, exampleMeaning) {
  return `${String(example || '').trim()}||${String(exampleMeaning || '').trim()}`
}

function loadStore() {
  const raw = loadJSON(CACHE_KEY, null)
  if (!raw || typeof raw !== 'object') {
    return { items: {} }
  }
  return {
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function saveStore(store) {
  saveJSON(CACHE_KEY, {
    items: store.items || {},
  })
}

export function getCachedExampleGrammar(cardId, example, exampleMeaning) {
  if (!cardId) return null
  const store = loadStore()
  const hit = store.items?.[cardId]
  if (!hit?.text) return null
  if (hit.fp !== fingerprint(example, exampleMeaning)) return null
  return hit
}

export function setCachedExampleGrammar(cardId, example, exampleMeaning, text, meta = {}) {
  if (!cardId || !text) return
  const store = loadStore()
  const items = { ...store.items }
  items[cardId] = {
    text: String(text).slice(0, 1800),
    fp: fingerprint(example, exampleMeaning),
    at: new Date().toISOString(),
    model: meta.model || '',
  }
  saveStore({ items })
}

export function clearCachedExampleGrammar(cardId) {
  if (!cardId) return
  const store = loadStore()
  if (!store.items?.[cardId]) return
  const items = { ...store.items }
  delete items[cardId]
  saveStore({ items })
}

/**
 * Content-update manifest + local Gemini review cache.
 * Avoids re-sending already-checked / already-fixed cards to the API.
 */
import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const MANIFEST_KEY = 'content-updates-ack'
const GEMINI_CACHE_KEY = 'gemini-review-cache'
const GEMINI_DAY_KEY = 'gemini-day-usage'

/** @typedef {{ contentVersion: number, updatedAt: string, days: Record<string, string[]>, ids: string[], note?: string }} ContentUpdatesManifest */

function todayKeyLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getTodayKey() {
  return todayKeyLocal()
}

/** @returns {Promise<ContentUpdatesManifest>} */
export async function fetchContentUpdates() {
  const base = import.meta.env.BASE_URL || './'
  const url = `${base}data/content-updates.json?v=${CONTENT_VERSION}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return {
      contentVersion: CONTENT_VERSION,
      updatedAt: '',
      days: {},
      ids: [],
      note: 'missing_manifest',
    }
  }
  const data = await res.json()
  return {
    contentVersion: Number(data.contentVersion) || CONTENT_VERSION,
    updatedAt: String(data.updatedAt || ''),
    days: data.days && typeof data.days === 'object' ? data.days : {},
    ids: Array.isArray(data.ids) ? data.ids.map(String) : [],
    note: data.note || '',
  }
}

export function loadAck() {
  const raw = loadJSON(MANIFEST_KEY, null)
  if (!raw || typeof raw !== 'object') {
    return { contentVersion: 0, checkedAt: '', todayKey: '', seenIds: [] }
  }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    checkedAt: String(raw.checkedAt || ''),
    todayKey: String(raw.todayKey || ''),
    seenIds: Array.isArray(raw.seenIds) ? raw.seenIds.map(String) : [],
  }
}

export function saveAck(partial) {
  const prev = loadAck()
  const next = { ...prev, ...partial }
  saveJSON(MANIFEST_KEY, next)
  return next
}

/** Card ids marked updated for this content version. */
export function updatedIdSet(manifest) {
  const set = new Set((manifest?.ids || []).map(String))
  const days = manifest?.days || {}
  for (const list of Object.values(days)) {
    if (!Array.isArray(list)) continue
    for (const id of list) set.add(String(id))
  }
  return set
}

/** Card ids updated on a specific local calendar day. */
export function todayUpdatedIds(manifest, day = todayKeyLocal()) {
  const fromDay = manifest?.days?.[day]
  if (Array.isArray(fromDay) && fromDay.length) return fromDay.map(String)
  const at = String(manifest?.updatedAt || '').slice(0, 10)
  if (at === day && Array.isArray(manifest?.ids)) return manifest.ids.map(String)
  return []
}

export function isCardContentUpdated(cardId, manifest) {
  if (!cardId || !manifest) return false
  return updatedIdSet(manifest).has(String(cardId))
}

function loadGeminiCache() {
  const raw = loadJSON(GEMINI_CACHE_KEY, null)
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function saveGeminiCache(store) {
  saveJSON(GEMINI_CACHE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function getCachedGeminiReview(cardId) {
  if (!cardId) return null
  const store = loadGeminiCache()
  if (store.contentVersion !== CONTENT_VERSION) return null
  const hit = store.items?.[cardId]
  if (!hit?.text) return null
  return hit
}

export function setCachedGeminiReview(cardId, text, meta = {}) {
  if (!cardId || !text) return
  const store = loadGeminiCache()
  const items = store.contentVersion === CONTENT_VERSION ? { ...store.items } : {}
  items[cardId] = {
    text: String(text).slice(0, 1200),
    at: new Date().toISOString(),
    model: meta.model || '',
    skipped: Boolean(meta.skipped),
  }
  saveGeminiCache({ contentVersion: CONTENT_VERSION, items })
}

export function clearGeminiCacheForVersionBump() {
  saveGeminiCache({ contentVersion: CONTENT_VERSION, items: {} })
}

export function getGeminiDayUsage() {
  const day = todayKeyLocal()
  const raw = loadJSON(GEMINI_DAY_KEY, null)
  if (!raw || raw.day !== day) return { day, count: 0 }
  return { day, count: Number(raw.count) || 0 }
}

export function bumpGeminiDayUsage() {
  const cur = getGeminiDayUsage()
  const next = { day: cur.day, count: cur.count + 1 }
  saveJSON(GEMINI_DAY_KEY, next)
  return next
}

/**
 * @param {{ vocabPending?: boolean }} [opts]
 */
export async function checkContentUpdates({ vocabPending = false } = {}) {
  const manifest = await fetchContentUpdates()
  const day = todayKeyLocal()
  const todayIds = todayUpdatedIds(manifest, day)
  const versionIds = [...updatedIdSet(manifest)]
  const ack = loadAck()
  const alreadyAckedToday =
    ack.contentVersion === CONTENT_VERSION && ack.todayKey === day && todayIds.length > 0
      ? todayIds.every((id) => ack.seenIds.includes(id))
      : ack.contentVersion === CONTENT_VERSION && ack.todayKey === day && !todayIds.length

  saveAck({
    contentVersion: CONTENT_VERSION,
    checkedAt: new Date().toISOString(),
    todayKey: day,
    seenIds: [...new Set([...(ack.seenIds || []), ...todayIds, ...versionIds])],
  })

  let message = ''
  if (vocabPending) {
    message = `有新詞彙包（v${CONTENT_VERSION}），請先載入。`
  } else if (todayIds.length) {
    message = `今日內容有更新：${todayIds.length} 張字卡已修正（卡片上會標「已更新」）。已修正的不會再自動送 Gemini。`
  } else if (versionIds.length) {
    message = `目前內容版 v${CONTENT_VERSION} 共標記 ${versionIds.length} 張曾修正；今日清單尚無新項目。`
  } else {
    message = `目前內容版 v${CONTENT_VERSION}，今日沒有新的修正清單。`
  }

  return {
    manifest,
    todayIds,
    versionIds,
    todayCount: todayIds.length,
    versionCount: versionIds.length,
    vocabPending,
    alreadyAckedToday,
    message,
  }
}

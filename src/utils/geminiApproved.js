/**
 * Gemini-approved card allowlist (cards already batch-reviewed).
 * Until the full corpus is scanned, daily study + browse only use these IDs.
 */
import { CONTENT_VERSION } from '../data/config'

/** @typedef {{ ids: string[], count: number, updatedAt: string, complete: boolean, total?: number, done?: number }} GeminiApprovedManifest */

let cached = /** @type {GeminiApprovedManifest | null} */ (null)
let fetchPromise = /** @type {Promise<GeminiApprovedManifest> | null} */ (null)

export function emptyApprovedManifest() {
  return {
    ids: [],
    count: 0,
    updatedAt: '',
    complete: false,
    total: 0,
    done: 0,
  }
}

/** @returns {Promise<GeminiApprovedManifest>} */
export async function fetchGeminiApprovedIds() {
  if (cached?.ids?.length) return cached
  if (fetchPromise) return fetchPromise
  const base = import.meta.env.BASE_URL || './'
  fetchPromise = (async () => {
    try {
      const res = await fetch(`${base}data/gemini-approved-ids.json?v=${CONTENT_VERSION}`, {
        cache: 'no-store',
      })
      if (!res.ok) return emptyApprovedManifest()
      const data = await res.json()
      const ids = Array.isArray(data.ids) ? data.ids.map(String) : []
      cached = {
        ids,
        count: ids.length || Number(data.count) || 0,
        updatedAt: String(data.updatedAt || ''),
        complete: Boolean(data.complete),
        total: Number(data.total) || 0,
        done: Number(data.done) || ids.length,
      }
      return cached
    } catch {
      return emptyApprovedManifest()
    } finally {
      fetchPromise = null
    }
  })()
  return fetchPromise
}

export function approvedIdSet(manifest) {
  return new Set((manifest?.ids || []).map(String))
}

/** True while corpus scan is incomplete — hide unscanned cards from study/browse. */
export function shouldRestrictToApproved(manifest) {
  if (!manifest) return true
  if (manifest.complete) return false
  // Restrict as soon as we have any allowlist (or even if empty → show nothing yet).
  return true
}

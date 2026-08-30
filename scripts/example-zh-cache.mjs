/**
 * Example-sentence Chinese gloss cache (prefer JA→zh-TW).
 * Keys:
 *   ja:<normalized japanese>
 *   en:<normalized english>  (legacy / fallback)
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasChinese } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = join(ROOT, 'data/example-zh-cache.json')

let cache = null

export function normExampleKey(text = '') {
  return String(text).trim().replace(/\s+/g, ' ')
}

export function jaCacheKey(ja = '') {
  const k = normExampleKey(ja)
  return k ? `ja:${k}` : ''
}

export function enCacheKey(en = '') {
  const k = normExampleKey(en)
  return k ? `en:${k}` : ''
}

export function loadExampleZhCache() {
  if (cache) return cache
  if (!existsSync(CACHE_PATH)) {
    cache = new Map()
    return cache
  }
  const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  cache = new Map(Object.entries(raw))
  return cache
}

/** Reject low-quality machine glosses so postprocess can retry. */
export function isBadExampleZh(zh = '', ja = '') {
  const t = String(zh || '').trim()
  if (!t) return true
  if (t.startsWith('例句大意：')) return true
  if (/MYMEMORY WARNING|AVAILABLE FREE TRANSLATIONS/i.test(t)) return true
  if (!hasChinese(t)) return true
  if (/的的/.test(t)) return true
  if (/^[A-Za-z0-9]/.test(t) && /[A-Za-z]{3,}/.test(t)) return true
  // English leftover mixed in heavily
  const letters = (t.match(/[A-Za-z]/g) || []).length
  if (letters > Math.max(8, t.length * 0.35)) return true
  // Identical to Japanese source (failed translate)
  if (ja && normExampleKey(t) === normExampleKey(ja)) return true
  return false
}

export function lookupExampleZh(en = '') {
  const key = normExampleKey(en)
  if (!key) return ''
  const map = loadExampleZhCache()
  const hit = map.get(enCacheKey(key)) || map.get(key) // legacy bare EN keys
  return hit && !isBadExampleZh(hit) ? hit : ''
}

export function lookupExampleZhByJa(ja = '') {
  const key = jaCacheKey(ja)
  if (!key) return ''
  const hit = loadExampleZhCache().get(key)
  return hit && !isBadExampleZh(hit, ja) ? hit : ''
}

/** Prefer Japanese sentence gloss, then English gloss. */
export function resolveExampleZh({ ja = '', en = '' } = {}) {
  return lookupExampleZhByJa(ja) || lookupExampleZh(en) || ''
}

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasChinese } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = join(ROOT, 'data/example-zh-cache.json')

let cache = null

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

export function lookupExampleZh(en = '') {
  const key = String(en).trim().replace(/\s+/g, ' ')
  if (!key) return ''
  const hit = loadExampleZhCache().get(key)
  return hit && hasChinese(hit) ? hit : ''
}

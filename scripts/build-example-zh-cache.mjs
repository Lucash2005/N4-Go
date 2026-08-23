#!/usr/bin/env node
/**
 * Build Chinese gloss cache for OpenJLPT example sentences (en → zh-TW).
 * Run: node scripts/build-example-zh-cache.mjs
 * Merge-only: keeps existing cache entries; fetches missing keys.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clearOpenJlptExampleCache, findOpenJlptExample } from './example-frames.mjs'
import { hasChinese } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const CACHE_PATH = join(ROOT, 'data/example-zh-cache.json')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normKey(en = '') {
  return String(en).trim().replace(/\s+/g, ' ')
}

async function translateEnToZhTw(text) {
  const q = encodeURIComponent(text.trim())
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|zh-TW`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const out = data?.responseData?.translatedText?.trim() || ''
  if (!out || !hasChinese(out)) return ''
  // API sometimes returns same English on failure
  if (/^[A-Za-z0-9\s.,!?'"-]+$/.test(out)) return ''
  return out
}

async function main() {
  clearOpenJlptExampleCache()
  const vocab = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))
  let cache = {}
  if (existsSync(CACHE_PATH)) {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  }

  const needed = new Map()
  for (const c of vocab) {
    if (c.exampleMeaning && hasChinese(c.exampleMeaning) && !c.exampleMeaning.startsWith('例句大意：')) {
      continue
    }
    const open = findOpenJlptExample(c)
    const en = open?.en || ''
    if (!en.trim()) continue
    const key = normKey(en)
    if (cache[key] && hasChinese(cache[key])) continue
    needed.set(key, en)
  }

  console.log(`example-zh-cache: ${Object.keys(cache).length} cached, ${needed.size} to fetch`)
  let ok = 0
  let fail = 0
  let i = 0
  for (const [key, en] of needed) {
    i += 1
    try {
      const zh = await translateEnToZhTw(en)
      if (zh) {
        cache[key] = zh
        ok += 1
      } else {
        fail += 1
      }
    } catch (err) {
      fail += 1
      console.warn('fail', en.slice(0, 50), err.message)
    }
    if (i % 20 === 0) {
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
      console.log(`  progress ${i}/${needed.size} ok=${ok} fail=${fail}`)
    }
    await sleep(250)
  }

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
  console.log(`done: ${Object.keys(cache).length} entries, new ok=${ok}, fail=${fail}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

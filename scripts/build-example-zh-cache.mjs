#!/usr/bin/env node
/**
 * Build / refresh Chinese glosses for vocab example sentences.
 * Prefer JA→zh-TW (Google dict-chrome endpoint), fall back to EN→zh-TW.
 *
 *   node scripts/build-example-zh-cache.mjs
 *   FORCE=1 node scripts/build-example-zh-cache.mjs   # refresh even if ZH exists
 *   ONLY_LAZY=1 ...                                  # only 例句大意 / missing
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  enCacheKey,
  isBadExampleZh,
  jaCacheKey,
  loadExampleZhCache,
  normExampleKey,
} from './example-zh-cache.mjs'
import { hasChinese } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const CACHE_PATH = join(ROOT, 'data/example-zh-cache.json')

const FORCE = process.env.FORCE === '1'
const ONLY_LAZY = process.env.ONLY_LAZY === '1'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translatePair(text, sl, tl = 'zh-TW') {
  const q = String(text || '').trim()
  if (!q) return ''
  const url =
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex` +
    `&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(q)}`
  let lastErr
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; N4-Go/1.0)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let out = ''
      if (typeof data === 'string') out = data
      else if (Array.isArray(data)) {
        if (typeof data[0] === 'string') out = data[0]
        else if (Array.isArray(data[0])) out = data[0].map((x) => (Array.isArray(x) ? x[0] : x)).join('')
      }
      out = String(out || '').trim()
      if (isBadExampleZh(out, q)) return ''
      return out
    } catch (err) {
      lastErr = err
      await sleep(400 * (attempt + 1))
    }
  }
  throw lastErr || new Error('translate failed')
}

async function translateJaToZh(ja) {
  return translatePair(ja, 'ja')
}

async function translateEnToZh(en) {
  return translatePair(en, 'en')
}

function needsRefresh(card) {
  const zh = card.exampleMeaning || ''
  if (!card.example || /例句準備中/.test(card.example)) return false
  if (FORCE) return true
  if (!zh || !hasChinese(zh) || zh.startsWith('例句大意：') || isBadExampleZh(zh, card.example)) {
    return true
  }
  if (ONLY_LAZY) return false
  return false
}

async function main() {
  // reset in-memory cache loader
  const vocab = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))
  let cache = {}
  if (existsSync(CACHE_PATH)) {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  }

  const jobs = []
  const seenJa = new Set()
  for (const c of vocab) {
    if (!needsRefresh(c)) continue
    const ja = normExampleKey(c.example || '')
    if (!ja || seenJa.has(ja)) continue
    seenJa.add(ja)
    const jaKey = jaCacheKey(ja)
    if (!FORCE && cache[jaKey] && !isBadExampleZh(cache[jaKey], ja)) continue
    jobs.push({ ja, en: '' })
  }

  // Also fill EN keys for OpenJLPT English when JA translate fails later
  console.log(
    `example-zh-cache: ${Object.keys(cache).length} existing, ${jobs.length} JA sentences to translate` +
      ` (FORCE=${FORCE ? 1 : 0}, ONLY_LAZY=${ONLY_LAZY ? 1 : 0})`,
  )

  let ok = 0
  let fail = 0
  for (let i = 0; i < jobs.length; i += 1) {
    const { ja } = jobs[i]
    try {
      let zh = await translateJaToZh(ja)
      if (!zh) {
        fail += 1
      } else {
        cache[jaCacheKey(ja)] = zh
        ok += 1
      }
    } catch (err) {
      fail += 1
      console.warn('fail', ja.slice(0, 40), err.message)
    }
    if ((i + 1) % 25 === 0 || i + 1 === jobs.length) {
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
      console.log(`  progress ${i + 1}/${jobs.length} ok=${ok} fail=${fail}`)
    }
    await sleep(80)
  }

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
  console.log(`done: ${Object.keys(cache).length} keys, new ok=${ok}, fail=${fail}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

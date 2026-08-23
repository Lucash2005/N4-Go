/**
 * Jisho.org API client (JMdict data). Cache responses in data/jisho-cache.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeKey } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = join(ROOT, 'data/jisho-cache.json')
const UA = 'N4-Go/1.0 (vocab build; educational)'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function loadJishoCache() {
  if (!existsSync(CACHE_PATH)) return {}
  return JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
}

export function saveJishoCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
}

export async function searchJisho(keyword) {
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Jisho ${res.status} for ${keyword}`)
  const json = await res.json()
  return json.data || []
}

function readingNorm(r = '') {
  return r.replace(/する$/, '').trim()
}

function scoreEntry(entry, word, reading) {
  const w = (word || '').trim()
  const r = (reading || '').trim()
  let best = 0
  for (const jp of entry.japanese || []) {
    const jw = (jp.word || '').trim()
    const jr = (jp.reading || '').trim()
    let s = 0
    if (jw === w) s += 4
    else if (jw && w.includes(jw) || jw.includes(w)) s += 2
    if (jr === r) s += 4
    else if (jr && r && readingNorm(jr) === readingNorm(r)) s += 3
    else if (jr && r && jr.startsWith(r.slice(0, 3))) s += 1
    if (entry.is_common) s += 0.5
    if (best < s) best = s
  }
  return best
}

export function pickJishoEntry(results, word, reading) {
  if (!results?.length) return null
  let best = null
  let bestScore = 0
  for (const entry of results) {
    const s = scoreEntry(entry, word, reading)
    if (s > bestScore) {
      bestScore = s
      best = entry
    }
  }
  return bestScore >= 2 ? best : results[0]
}

export function jishoSenses(entry) {
  if (!entry?.senses) return []
  return entry.senses.map((sense, senseIndex) => ({
    senseIndex,
    meaningEn: (sense.english_definitions || []).join('; '),
    pos: (sense.parts_of_speech || []).join('；'),
    tags: sense.tags || [],
  }))
}

export function jishoJlptLevel(entry) {
  const tags = entry?.jlpt || []
  for (const t of tags) {
    const m = String(t).match(/jlpt-n(\d)/i)
    if (m) return `N${m[1]}`
  }
  return null
}

export async function fetchJishoForCard(card, cache, { delayMs = 120 } = {}) {
  const word = (card.word || '').trim()
  const reading = (card.reading || '').trim()
  const cacheKey = makeKey(word, reading)
  if (cache[cacheKey]) return cache[cacheKey]

  const queries = [word]
  if (word.endsWith('する') && word.length > 2) {
    queries.push(word.replace(/する$/, ''))
  }
  if (reading && reading !== word) queries.push(reading)

  let results = []
  for (const q of queries) {
    if (!q) continue
    try {
      results = await searchJisho(q)
      if (results.length) break
    } catch {
      await sleep(delayMs)
    }
    await sleep(delayMs)
  }

  const entry = pickJishoEntry(results, word, reading)
  const payload = entry
    ? {
        slug: entry.slug,
        jlpt: entry.jlpt,
        is_common: entry.is_common,
        japanese: entry.japanese,
        senses: jishoSenses(entry),
        jlptLevel: jishoJlptLevel(entry),
      }
    : null

  cache[cacheKey] = payload
  await sleep(delayMs)
  return payload
}

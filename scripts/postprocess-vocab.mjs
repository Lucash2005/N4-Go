#!/usr/bin/env node
/**
 * Fix vocab JSON: Chinese glosses, valid examples, example furigana.
 */
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyFuriganaOverrides } from './furigana-overrides.mjs'
import {
  annotateHeadword,
  cleanEnGloss,
  hasChinese,
  isExampleValidForCard,
  loadGlossary,
  makeKey,
  translateEnGloss,
  translateMeanings,
} from './vocab-shared.mjs'

const require = createRequire(import.meta.url)
const Kuroshiro = require('kuroshiro').default || require('kuroshiro')
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const OVERRIDES_PATH = join(ROOT, 'scripts/vocab-overrides.json')
const ZH_CACHE_PATH = join(ROOT, 'data/zh-cache.json')

const KANJI = /[\u4e00-\u9fff々〆ヵヶ]/

function loadOverrides() {
  return JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))
}

function loadZhCache() {
  try {
    return JSON.parse(readFileSync(ZH_CACHE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function saveZhCache(cache) {
  writeFileSync(ZH_CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
}

function zhFromEn(text, glossary, cache) {
  const key = (text || '').toLowerCase().trim()
  if (cache[key]) return cache[key]
  const zh = translateEnGloss(text, glossary)
  if (zh) cache[key] = zh
  return zh
}

function ensureZh(text, enFallback, glossary, cache) {
  if (hasChinese(text) && text.trim() !== (enFallback || '').trim()) return text
  const parts = (enFallback || text || '')
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const zhParts = parts.map((p) => zhFromEn(p, glossary, cache)).filter(Boolean)
  if (zhParts.length) return zhParts.join('；')
  return hasChinese(text) ? text : enFallback || text
}

function uniqueZhParts(parts = []) {
  const seen = new Set()
  const out = []
  for (const p of parts) {
    const t = (p || '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function fixSenses(senses, glossary, cache) {
  if (!senses?.length) return senses
  const filtered = senses
    .filter((s) => !/wikipedia/i.test(s.pos || ''))
    .slice(0, 5)
  return filtered.map((s) => {
    const meaningEn = cleanEnGloss(s.meaningEn || s.meaning || '')
    const parts = meaningEn
      .split(/[;；]/)
      .map((p) => p.trim())
      .filter(Boolean)
    const zhParts = uniqueZhParts(translateMeanings(parts, glossary))
    let meaning = zhParts.slice(0, 3).join('；')
    if (!meaning) {
      meaning = ensureZh(s.meaning, meaningEn, glossary, cache)
    }
    if (!hasChinese(meaning) || meaning === meaningEn) {
      meaning = zhParts.length ? zhParts.slice(0, 3).join('；') : meaningEn
    }
    return {
      ...s,
      meaning,
      meaningEn,
    }
  })
}

function fallbackExample(card) {
  const w = card.word
  const r = card.reading
  if (w === '足' && r === 'あし') {
    return {
      example: '右の足が痛いです。',
      exampleMeaning: '右腳痛。',
    }
  }
  if (r && /[\u3040-\u309f]/.test(r)) {
    return {
      example: `${w}。`,
      exampleMeaning: card.meaning,
    }
  }
  return null
}

function leftoverKanji(annotated = '') {
  const stripped = String(annotated).replace(
    /[\u4e00-\u9fff々〆ヵヶ]+(?:[\u3040-\u309f\u30a0-\u30ff]*)\[[^\]]+\]/g,
    '',
  )
  return /[\u4e00-\u9fff々〆ヵヶ]/.test(stripped)
}

function rubyHtmlToBrackets(html = '') {
  return String(html)
    .replace(/<ruby>([\s\S]*?)<\/ruby>/g, (_, inner) => {
      const text = inner.replace(/<rp>[\s\S]*?<\/rp>/g, '').replace(/<rt>[\s\S]*?<\/rt>/g, '')
      const rt = (inner.match(/<rt>([\s\S]*?)<\/rt>/) || [, ''])[1]
      const surface = text.replace(/<[^>]+>/g, '')
      const reading = String(rt).split(/[\/／]/)[0].replace(/\s+/g, '')
      return reading ? `${surface}[${reading}]` : surface
    })
    .replace(/<[^>]+>/g, '')
}

async function annotateExample(kuroshiro, text) {
  const plain = String(text || '').replace(/\[[^\]]+\]/g, '')
  if (!KANJI.test(plain)) return plain
  try {
    const html = await kuroshiro.convert(plain, { mode: 'furigana', to: 'hiragana' })
    const converted = rubyHtmlToBrackets(html)
    if (converted.includes('[')) return applyFuriganaOverrides(converted)
  } catch {
    /* fall through */
  }
  const okuri = await kuroshiro.convert(plain, { mode: 'okurigana', to: 'hiragana' })
  return applyFuriganaOverrides(
    okuri.replace(/([\u4e00-\u9fff々〆ヵヶ]+)[（(]([^）)]+)[）)]/g, '$1[$2]'),
  )
}

function needsFurigana(card) {
  const example = card.example || ''
  if (!KANJI.test(example)) return false
  const annotated = card.exampleFurigana || ''
  return !annotated || leftoverKanji(annotated)
}

async function main() {
  const glossary = loadGlossary()
  const cache = loadZhCache()
  const overrides = loadOverrides()
  const cards = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))

  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer())

  let zhFixed = 0
  let exFixed = 0
  let furiFixed = 0

  const out = []
  for (const card of cards) {
    let c = { ...card }
    const patch = overrides[c.id]

    c.meaning = ensureZh(c.meaning, c.meaningEn, glossary, cache)
    if (c.meaningEn) {
      c.meaningZh = translateMeanings(c.meaningEn.split(/[;；]/), glossary)
      if (!c.meaningZh.length) c.meaningZh = c.meaning.split(/[；;]/).map((s) => s.trim()).filter(Boolean)
    }
    if (c.senses?.length) {
      c.senses = fixSenses(c.senses, glossary, cache)
      zhFixed += 1
    }
    if (!hasChinese(c.meaning)) {
      c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'needs_zh'])]
    } else {
      c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'needs_zh')
    }

    if (!isExampleValidForCard(c.example, c.word, c.reading)) {
      const fb = fallbackExample(c)
      if (fb) {
        c.example = fb.example
        c.exampleMeaning = fb.exampleMeaning
        exFixed += 1
      }
      c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'example_mismatch'])]
    } else {
      c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'example_mismatch')
    }

    if (needsFurigana(c)) {
      c.exampleFurigana = await annotateExample(kuroshiro, c.example)
      furiFixed += 1
    } else if (!c.exampleFurigana) {
      c.exampleFurigana = annotateHeadword(c.example, c.word, c.reading) || c.example
    }

    if (patch) c = { ...c, ...patch }

    out.push(c)
  }

  saveZhCache(cache)
  writeFileSync(VOCAB_JSON, JSON.stringify(out))
  console.log(`postprocess: zh senses ${zhFixed}, examples ${exFixed}, furigana ${furiFixed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

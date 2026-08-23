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
  isTrivialExample,
  loadGlossary,
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
  const meaning = (card.meaning || '').split(/[；;]/)[0].trim() || '…'
  const pos = `${card.pos || ''} ${card.meaningEn || ''}`.toLowerCase()

  if (w === '足' && r === 'あし') {
    return { example: '右の足が痛いです。', exampleMeaning: '右腳痛。' }
  }
  if (w === 'ちゃん' || w === 'くん' || w === 'さん' || /^suffix for familiar/i.test(card.meaningEn || '')) {
    return {
      example: `太郎${w}は学生です。`,
      exampleMeaning: `太郎（親暱／敬稱）是學生。`,
    }
  }
  if (/noun, used as a suffix|used as a suffix/i.test(pos) && w.length <= 2) {
    return {
      example: `この${w}を見てください。`,
      exampleMeaning: `請看這個${meaning}。`,
    }
  }
  if (w === 'お互い' || r === 'おたがい') {
    return {
      example: 'お互いに助け合います。',
      exampleMeaning: '彼此互相幫忙。',
    }
  }
  if (/i-adjective|い形容|keiyoushi/.test(pos) || (/い$/.test(w) && /adjective|形容/.test(pos))) {
    return {
      example: `ここは${w}です。`,
      exampleMeaning: `這裡很${meaning}。`,
    }
  }
  if (/na-adjective|な形容|keiyodoshi/.test(pos)) {
    return {
      example: `${w}な人です。`,
      exampleMeaning: `是${meaning}的人。`,
    }
  }
  if (/adverb|副詞|fukushi/.test(pos)) {
    // Avoid 「ぜひしてください」for discourse adverbs
    if (/ぜひ|つまり|きっと|やはり|たぶん/.test(w)) {
      return {
        example: `${w}行きます。`,
        exampleMeaning: `${meaning}會去。`,
      }
    }
    if (/っと$|んと$|り$/.test(w) || /onomatopoeic|mimetic/i.test(pos)) {
      return {
        example: `${w}した。`,
        exampleMeaning: `${meaning}。`,
      }
    }
    return {
      example: `${w}話してください。`,
      exampleMeaning: `請${meaning}地說。`,
    }
  }
  if (/suru verb/.test(pos) || /する$/.test(w)) {
    const base = w.replace(/する$/, '')
    return {
      example: `${base}します。`,
      exampleMeaning: `要${meaning}。`,
    }
  }
  if ((card.meaningEn || '').toLowerCase().startsWith('to ') || /verb|動詞/.test(pos)) {
    return {
      example: `もう一度${w}。`,
      exampleMeaning: `再${meaning}一次。`,
    }
  }
  // noun / default — full sentence, not bare word
  if (/^[ァ-ヶー]+$/.test(w) || /^[ぁ-ん]+$/.test(w) && w.length >= 3) {
    return {
      example: `${w}をもう一度お願いします。`,
      exampleMeaning: `請再給我一次${meaning}。`,
    }
  }
  return {
    example: `${w}があります。`,
    exampleMeaning: `有${meaning}。`,
  }
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

    const suffixMisapplied =
      /^太郎.+は学生です/.test(c.example || '') &&
      !['ちゃん', 'さん', 'くん'].includes(c.word)
    const weakVerbEx = /^毎日[^、]/.test(c.example || '') && /verb/i.test(c.pos || '')
    if (
      !isExampleValidForCard(c.example, c.word, c.reading) ||
      isTrivialExample(c.example, c.word, c.reading) ||
      suffixMisapplied ||
      weakVerbEx
    ) {
      const fb = fallbackExample(c)
      if (fb) {
        c.example = fb.example
        c.exampleMeaning = fb.exampleMeaning
        c.exampleFurigana = '' // force re-annotate
        exFixed += 1
      }
      if (!isExampleValidForCard(c.example, c.word, c.reading)) {
        c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'example_mismatch'])]
      } else {
        c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'example_mismatch')
      }
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

#!/usr/bin/env node
/**
 * Fix vocab JSON: Chinese glosses, valid examples, example furigana.
 */
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyFuriganaOverrides } from './furigana-overrides.mjs'
import { lookupExampleZh } from './example-zh-cache.mjs'
import {
  annotateHeadword,
  cleanEnGloss,
  hasChinese,
  isExampleValidForCard,
  isMisleadingHomophoneExample,
  isTrivialExample,
  loadGlossary,
  translateEnGloss,
  translateMeanings,
} from './vocab-shared.mjs'
import {
  buildFallbackExample,
  clearOpenJlptExampleCache,
  findJlptExtraExample,
  findOpenJlptExample,
  isWeakTemplateExample,
  loadJlptExtraExamples,
  primaryWriting,
} from './example-frames.mjs'

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

function escapeRe(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Fix Kuroshiro homograph misreads when the card reading is known (角[かく]→角[かど]). */
function fixHeadwordFurigana(furi, word, reading) {
  if (!furi || !word || !reading) return furi
  if (/一\[ひと\]つ|一\[ひと\]り|一\[ひと\]人/.test(furi)) return furi
  const variants = String(reading)
    .split(/[/／\s]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const re = new RegExp(`${escapeRe(word)}\\[([^\\]]+)\\]`)
  const m = furi.match(re)
  if (!m) return furi
  const rb = m[1].split('/')[0]
  if (variants.some((r) => rb === r || rb.startsWith(r) || r.startsWith(rb))) return furi
  return furi.replace(re, `${word}[${variants[0]}]`)
}

function isNonsenseExample(example = '') {
  return /^(今朝|昨夜|今晩|来週|さ来年|大分)してください。$/.test(String(example).trim())
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
  clearOpenJlptExampleCache()
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

    // Normalize OpenJLPT slash headwords: 川/河 → 川
    const surface = primaryWriting(c.word)
    if (surface && surface !== c.word) {
      c.word = surface
    }
    if (c.reading && /\s/.test(c.reading)) {
      c.reading = c.reading
        .split(/\s+/)
        .filter(Boolean)
        .join('/')
    }

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
    const overrideHasExample = Boolean(patch?.example)
    const isPlaceholderExample =
      c.exampleSource === 'missing' ||
      /例句準備中/.test(c.example || '') ||
      (c.reviewFlags || []).includes('needs_example')
    const exampleInvalid =
      c.example &&
      (isNonsenseExample(c.example) ||
        !isExampleValidForCard(c.example, c.word, c.reading) ||
        isMisleadingHomophoneExample(c.example, c.word)) &&
      !isTrivialExample(c.example, c.word, c.reading)
    const needsExample =
      !overrideHasExample &&
      (isPlaceholderExample ||
        exampleInvalid ||
        isTrivialExample(c.example, c.word, c.reading) ||
        isWeakTemplateExample(c.example, c.word) ||
        suffixMisapplied)

    const lazyExampleZh = c.exampleMeaning?.startsWith('例句大意：')
    const idFix = loadJlptExtraExamples().byId.get(c.id)

    if (overrideHasExample) {
      c.exampleSource = 'override'
    } else if (!overrideHasExample && idFix && (needsExample || lazyExampleZh)) {
      c.example = idFix.example
      c.exampleMeaning = idFix.exampleMeaning || c.exampleMeaning
      c.exampleFurigana = ''
      c.exampleSource = 'jlpt'
      exFixed += 1
    } else if (needsExample) {
      const open = findOpenJlptExample(c)
      if (open?.ja) {
        c.example = open.ja
        const zh =
          translateEnGloss(open.en || '', glossary) ||
          translateMeanings([open.en || ''], glossary)[0] ||
          ''
        if (hasChinese(zh)) {
          c.exampleMeaning = zh
        } else if (open.en) {
          const cached = lookupExampleZh(open.en)
          if (cached) {
            c.exampleMeaning = cached
          } else if (open.en && hasChinese(c.meaning)) {
            c.exampleMeaning = open.en
            c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'needs_example_zh'])]
          } else {
            c.exampleMeaning = open.en || c.meaning
          }
        } else if (open.en && hasChinese(c.meaning)) {
          // Keep OpenJLPT English until we have a proper ZH sentence gloss
          c.exampleMeaning = open.en
          c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'needs_example_zh'])]
        } else {
          c.exampleMeaning = open.en || c.meaning
        }
        c.exampleFurigana = ''
        c.exampleSource = 'openjlpt'
        exFixed += 1
      } else {
        const fb = buildFallbackExample(c, c.word)
        if (fb) {
          c.example = fb.example
          c.exampleMeaning = fb.exampleMeaning
          c.exampleFurigana = ''
          c.exampleSource = fb.exampleSource || 'template'
          exFixed += 1
        } else {
          // Drop unnatural templates; leave a clear placeholder
          c.example = `（例句準備中：${c.word}）`
          c.exampleMeaning = '此字卡尚無合適例句，請先記單字本身。'
          c.exampleFurigana = c.example
          c.exampleSource = 'missing'
          c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'needs_example'])]
          exFixed += 1
        }
      }
    } else {
      // Infer source for existing sentence
      const open = findOpenJlptExample(c)
      if (open?.ja && open.ja === c.example) c.exampleSource = 'openjlpt'
      else if (isWeakTemplateExample(c.example, c.word)) c.exampleSource = 'template'
      else c.exampleSource = c.exampleSource || 'openjlpt'
    }

    if (!isExampleValidForCard(c.example, c.word, c.reading) && c.exampleSource !== 'missing') {
      c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'example_mismatch'])]
    } else {
      c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'example_mismatch')
    }
    if (c.exampleSource !== 'missing') {
      c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'needs_example')
    }

    if (needsFurigana(c)) {
      c.exampleFurigana = fixHeadwordFurigana(
        await annotateExample(kuroshiro, c.example),
        c.word,
        c.reading,
      )
      furiFixed += 1
    } else if (!c.exampleFurigana) {
      c.exampleFurigana =
        fixHeadwordFurigana(
          annotateHeadword(c.example, c.word, c.reading) || c.example,
          c.word,
          c.reading,
        )
    } else if (c.exampleFurigana) {
      c.exampleFurigana = fixHeadwordFurigana(c.exampleFurigana, c.word, c.reading)
    }

    if (patch) {
      c = { ...c, ...patch }
      if (patch.example) c.exampleSource = 'override'
    }

    // Chinese gloss for example sentence
    if (c.exampleMeaning && !hasChinese(c.exampleMeaning)) {
      const enLine = String(c.exampleMeaning).trim()
      let zh = lookupExampleZh(enLine) || translateEnGloss(enLine, glossary)
      if (!zh) {
        zh =
          translateMeanings(enLine.split(/[.!?。！？]/).map((s) => s.trim()).filter(Boolean), glossary)[0] ||
          ''
      }
      if (!zh && hasChinese(c.meaning)) {
        const hint = (c.meaning || '').split(/[；;]/)[0].trim()
        zh = hint ? `例句大意：${hint}` : ''
      }
      if (zh) {
        c.exampleMeaning = zh
        c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'needs_example_zh')
      } else {
        c.reviewFlags = [...new Set([...(c.reviewFlags || []), 'needs_example_zh'])]
      }
    } else if (c.exampleMeaning?.startsWith('例句大意：')) {
      const open = findOpenJlptExample(c)
      const cached = open?.en ? lookupExampleZh(open.en) : ''
      if (cached) {
        c.exampleMeaning = cached
        c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'needs_example_zh')
      }
    }

    if (c.exampleMeaning && hasChinese(c.exampleMeaning) && !c.exampleMeaning.startsWith('例句大意：')) {
      c.reviewFlags = (c.reviewFlags || []).filter((f) => f !== 'needs_example_zh')
    }

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

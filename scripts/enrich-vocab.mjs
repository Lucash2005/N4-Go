#!/usr/bin/env node
/**
 * Phase 2: enrich vocabulary from Jisho (JMdict) + zh-cache.
 * Run after build:vocab. Preserves card IDs.
 *
 *   node scripts/enrich-vocab.mjs
 *   node scripts/enrich-vocab.mjs --only-flagged
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchJishoForCard,
  loadJishoCache,
  saveJishoCache,
} from './jisho-client.mjs'
import {
  annotateHeadword,
  detectReviewFlags,
  inferCategory,
  loadGlossary,
  translateEnGloss,
  translateMeanings,
} from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const ZH_CACHE_PATH = join(ROOT, 'data/zh-cache.json')
const OVERRIDES_PATH = join(ROOT, 'scripts/vocab-overrides.json')
const CHANGED_IDS_PATH = join(ROOT, 'data/vocab-changed-ids.json')

function loadZhCache() {
  if (!existsSync(ZH_CACHE_PATH)) return {}
  return JSON.parse(readFileSync(ZH_CACHE_PATH, 'utf8'))
}

function saveZhCache(cache) {
  writeFileSync(ZH_CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')
}

function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) return {}
  return JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))
}

function applyOverrides(card, overrides) {
  const patch = overrides[card.id]
  if (!patch) return card
  return { ...card, ...patch }
}

function zhFromEn(text, glossary, zhCache) {
  const key = text.toLowerCase().trim()
  if (zhCache[key]) return zhCache[key]
  const fromGlossary = translateEnGloss(text, glossary)
  if (fromGlossary) {
    zhCache[key] = fromGlossary
    return fromGlossary
  }
  return ''
}

function enrichSenses(jishoSenses, glossary, zhCache) {
  return jishoSenses.slice(0, 5).map((s) => {
    const meaningZh =
      zhFromEn(s.meaningEn, glossary, zhCache) ||
      translateMeanings(s.meaningEn.split(/[;；]/), glossary).join('；')
    return {
      senseIndex: s.senseIndex,
      meaning: meaningZh || s.meaningEn,
      meaningEn: s.meaningEn,
      pos: s.pos,
    }
  })
}

function cardChanged(before, after) {
  const keys = [
    'meaning',
    'meaningEn',
    'example',
    'exampleMeaning',
    'reading',
    'word',
  ]
  return keys.some((k) => before[k] !== after[k])
}

function trimCard(card) {
  const o = { ...card }
  if (o.senses?.length > 3) o.senses = o.senses.slice(0, 3)
  return o
}

function writeVocabJson(cards) {
  writeFileSync(VOCAB_JSON, JSON.stringify(cards.map(trimCard)))
}

function enrichCard(card, jisho, glossary, zhCache, overrides) {
  const before = { ...card }
  let enriched = { ...card, source: card.source?.includes('jisho') ? card.source : 'openjlpt+jisho' }

  const preserveMeaning =
    !before.reviewFlags?.includes('needs_zh') &&
    !before.reviewFlags?.includes('mt_artifact') &&
    before.meaning &&
    /[\u4e00-\u9fff]/.test(before.meaning) &&
    !/^[A-Za-z0-9\s\(\);,\-\.]+$/.test(before.meaning)

  if (jisho?.senses?.length) {
    const senses = enrichSenses(jisho.senses, glossary, zhCache)
    const primary = senses[0]
    const meaningEnParts = senses.map((s) => s.meaningEn).filter(Boolean)
    const meaningZhParts = senses.map((s) => s.meaning).filter(Boolean)

    enriched.meaningEn = meaningEnParts.slice(0, 2).join('; ')
    if (!preserveMeaning) {
      enriched.meaningZh = meaningZhParts.slice(0, 3)
      enriched.meaning = enriched.meaningZh.slice(0, 2).join('；') || enriched.meaning
    } else if (!enriched.meaningZh?.length) {
      enriched.meaningZh = enriched.meaning.split(/[；;]/).map((s) => s.trim()).filter(Boolean)
    }
    enriched.pos = primary.pos || enriched.pos
    enriched.senseIndex = enriched.senseIndex ?? 0
    if (senses.length > 1) {
      enriched.senses = senses
    }
  }

  enriched = applyOverrides(enriched, overrides)
  enriched.reviewFlags = detectReviewFlags(enriched)
  enriched.category =
    enriched.category || inferCategory(enriched.word, enriched.meaningEn, enriched.meaning)
  enriched.exampleFurigana =
    annotateHeadword(enriched.example, enriched.word, enriched.reading) ||
    enriched.exampleFurigana

  return { card: enriched, changed: cardChanged(before, enriched) }
}

async function loadCards() {
  if (!existsSync(VOCAB_JSON)) {
    throw new Error(`Missing ${VOCAB_JSON}`)
  }
  return JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))
}

async function main() {
  const onlyFlagged = process.argv.includes('--only-flagged')
  const cards = await loadCards()
  const jishoCache = loadJishoCache()
  const zhCache = loadZhCache()
  const glossary = loadGlossary()
  const overrides = loadOverrides()

  const targets = onlyFlagged
    ? cards.filter((c) => c.reviewFlags?.length)
    : cards

  console.log(`Enriching ${targets.length}/${cards.length} cards…`)
  const changedIds = []
  const enriched = []
  let done = 0

  for (const card of cards) {
    if (onlyFlagged && !card.reviewFlags?.length) {
      const c = applyOverrides({ ...card }, overrides)
      c.reviewFlags = detectReviewFlags(c)
      enriched.push(c)
      continue
    }

    const jisho = await fetchJishoForCard(card, jishoCache)
    const { card: next, changed } = enrichCard(card, jisho, glossary, zhCache, overrides)
    enriched.push(next)
    if (changed) changedIds.push(next.id)
    done += 1
    if (done % 50 === 0) {
      saveJishoCache(jishoCache)
      saveZhCache(zhCache)
      console.log(`  ${done}/${targets.length}`)
    }
  }

  saveJishoCache(jishoCache)
  saveZhCache(zhCache)
  writeVocabJson(enriched)
  writeFileSync(CHANGED_IDS_PATH, JSON.stringify(changedIds, null, 2), 'utf8')

  const flagged = enriched.filter((c) => c.reviewFlags?.length).length
  console.log(`Done. Changed: ${changedIds.length}, flagged: ${flagged}`)
  console.log(`Written ${VOCAB_JSON}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

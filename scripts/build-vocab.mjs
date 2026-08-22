#!/usr/bin/env node
/**
 * Build vocabulary.js from OpenJLPT + existing cards (preserves IDs).
 * No Google Translate — Chinese from glossary / preserved meanings.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TARGET_VOCAB,
  makeKey,
  annotateHeadword,
  inferCategory,
  loadGlossary,
  translateMeanings,
  meaningEnText,
  detectReviewFlags,
  jsStr,
  parseExistingVocab,
} from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPENJLPT_DIR = join(ROOT, 'data/openjlpt')
const VOCAB_PATH = join(ROOT, 'src/data/vocabulary.js')
const OVERRIDES_PATH = join(ROOT, 'scripts/vocab-overrides.json')

function loadOpenJlpt(level) {
  const path = join(OPENJLPT_DIR, `${level}.json`)
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run: node scripts/fetch-openjlpt.mjs`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function buildLookup(items, levelTag) {
  const map = new Map()
  for (const item of items) {
    const word = (item.word || '').trim()
    if (!word) continue
    const reading = (item.reading || '').trim() || word
    const key = makeKey(word, reading)
    if (!map.has(key)) {
      map.set(key, { ...item, _level: levelTag })
    }
  }
  return map
}

function buildWordSet(items) {
  const words = new Set()
  for (const item of items) {
    const w = (item.word || '').trim()
    if (w) words.add(w)
  }
  return words
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

function resolveLevel(key, word, sets) {
  if (sets.n5.has(key)) return 'N5'
  if (sets.n4.has(key)) return 'N4'
  if (sets.n4Words.has(word)) return 'N4'
  if (sets.n5Words.has(word)) return 'N5'
  if (sets.n3.has(key)) return '延伸'
  return '延伸'
}

function openEntryForKey(key, lookups) {
  return lookups.n5.get(key) || lookups.n4.get(key) || lookups.n3.get(key) || null
}

function splitMeaningZh(text = '') {
  return (text || '')
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildCardFromOpen(entry, level, glossary, existing = null) {
  const word = (entry.word || '').trim()
  const reading = (entry.reading || '').trim() || word
  const meanings = entry.meanings || []
  const meaningEn = meaningEnText(meanings)
  const meaningZhParts = translateMeanings(meanings, glossary)
  const examples = entry.examples || []

  let meaning = existing?.meaning || ''
  let exampleMeaning = existing?.exampleMeaning || ''
  let example = existing?.example || ''
  let exampleFurigana = existing?.exampleFurigana || ''

  if (!meaning && meaningZhParts.length) {
    meaning = meaningZhParts.join('；')
  }
  if (!meaning && meaningEn) {
    meaning = meaningEn
  }

  if (examples.length) {
    const ex = examples[0]
    if (!example || example === word) example = ex.ja || example
    if (!exampleMeaning) {
      const exEn = ex.en || ''
      const exZh = translateMeanings([exEn], glossary)[0]
      exampleMeaning = exZh || exEn || meaning
    }
  }

  if (!example) example = word
  exampleFurigana = annotateHeadword(example, word, reading) || exampleFurigana

  const meaningZh =
    existing?.meaningZh?.length
      ? existing.meaningZh
      : meaningZhParts.length
        ? meaningZhParts
        : splitMeaningZh(meaning)

  const card = {
    id: existing?.id || '',
    type: 'vocab',
    word,
    reading,
    meaning,
    meaningEn,
    meaningZh,
    example,
    exampleMeaning,
    exampleFurigana,
    category: existing?.category || inferCategory(word, meaningEn, meaning),
    level,
    source: 'openjlpt',
  }

  card.reviewFlags = detectReviewFlags(card)
  return card
}

function emitVocab(cards) {
  const lines = [
    '/** @typedef {{ id: string, type: \'vocab\', word: string, reading: string, meaning: string, meaningEn?: string, meaningZh?: string[], example: string, exampleFurigana?: string, exampleMeaning: string, category: string, level?: string, source?: string, reviewFlags?: string[] }} VocabCard */',
    '',
    '/** N5+N4 core (OpenJLPT, CC BY-SA 4.0) + N3 extension to 1500. Chinese from glossary / preserved; see meaningEn. */',
    '/** @type {VocabCard[]} */',
    'export const vocabulary = [',
  ]

  for (const card of cards) {
    lines.push('  {')
    lines.push(`    id: ${jsStr(card.id)},`)
    lines.push("    type: 'vocab',")
    lines.push(`    word: ${jsStr(card.word)},`)
    lines.push(`    reading: ${jsStr(card.reading)},`)
    lines.push(`    meaning: ${jsStr(card.meaning)},`)
    if (card.meaningEn) lines.push(`    meaningEn: ${jsStr(card.meaningEn)},`)
    if (card.meaningZh?.length) {
      lines.push(`    meaningZh: ${JSON.stringify(card.meaningZh)},`)
    }
    lines.push(`    example: ${jsStr(card.example)},`)
    lines.push(`    exampleMeaning: ${jsStr(card.exampleMeaning)},`)
    if (card.exampleFurigana) {
      lines.push(`    exampleFurigana: ${jsStr(card.exampleFurigana)},`)
    }
    lines.push(`    category: ${jsStr(card.category)},`)
    if (card.level) lines.push(`    level: ${jsStr(card.level)},`)
    if (card.source) lines.push(`    source: ${jsStr(card.source)},`)
    if (card.reviewFlags?.length) {
      lines.push(
        `    reviewFlags: ${JSON.stringify(card.reviewFlags)},`,
      )
    }
    lines.push('  },')
  }
  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

function buildFullReorder(existingByKey, lookups, sets, glossary) {
  const seen = new Set()
  const cards = []

  const addFromLevel = (items, level) => {
    for (const item of items) {
      if (cards.length >= TARGET_VOCAB) return
      const word = (item.word || '').trim()
      if (!word || word === 'あ') continue
      const reading = (item.reading || '').trim() || word
      const key = makeKey(word, reading)
      if (seen.has(key)) continue
      seen.add(key)
      const existing = existingByKey.get(key)
      const resolvedLevel = level === 'n3' ? '延伸' : level === 'n5' ? 'N5' : 'N4'
      const card = buildCardFromOpen(item, resolvedLevel, glossary, existing)
      card.id = existing?.id || `v${String(cards.length + 1).padStart(3, '0')}`
      cards.push(card)
    }
  }

  addFromLevel(loadOpenJlpt('n5'), 'n5')
  addFromLevel(loadOpenJlpt('n4'), 'n4')
  addFromLevel(loadOpenJlpt('n3'), 'n3')

  return cards
}

function buildPreserveOrder(existing, lookups, sets, glossary, overrides) {
  const cards = []
  for (const old of existing) {
    const key = makeKey(old.word, old.reading)
    const entry = openEntryForKey(key, lookups)
    const level = resolveLevel(key, old.word, sets)
    let card = entry
      ? buildCardFromOpen(entry, level, glossary, old)
      : {
          ...old,
          level,
          meaningEn: old.meaningEn || old.meaning,
          meaningZh: old.meaningZh?.length ? old.meaningZh : splitMeaningZh(old.meaning),
          source: old.source || 'openjlpt',
        }
    card.id = old.id
    card = applyOverrides(card, overrides)
    card.reviewFlags = detectReviewFlags(card)
    cards.push(card)
  }
  return cards
}

async function main() {
  const full = process.argv.includes('--full')
  await mkdir(OPENJLPT_DIR, { recursive: true })

  const n5 = loadOpenJlpt('n5')
  const n4 = loadOpenJlpt('n4')
  const n3 = loadOpenJlpt('n3')

  const lookups = {
    n5: buildLookup(n5, 'N5'),
    n4: buildLookup(n4, 'N4'),
    n3: buildLookup(n3, '延伸'),
  }

  const sets = {
    n5: new Set(lookups.n5.keys()),
    n4: new Set(lookups.n4.keys()),
    n3: new Set(lookups.n3.keys()),
    n5Words: buildWordSet(n5),
    n4Words: buildWordSet(n4),
  }

  const glossary = loadGlossary()
  const overrides = loadOverrides()
  const existing = parseExistingVocab(VOCAB_PATH)
  const existingByKey = new Map(existing.map((c) => [makeKey(c.word, c.reading), c]))

  console.log(`Existing cards: ${existing.length}`)
  console.log(`OpenJLPT: N5=${n5.length} N4=${n4.length} N3=${n3.length}`)

  const cards = full
    ? buildFullReorder(existingByKey, lookups, sets, glossary)
    : buildPreserveOrder(existing, lookups, sets, glossary, overrides)

  if (cards.length !== TARGET_VOCAB) {
    console.warn(`Warning: ${cards.length} cards (target ${TARGET_VOCAB})`)
  }

  const levelCounts = { N5: 0, N4: 0, 延伸: 0 }
  let flagged = 0
  for (const c of cards) {
    levelCounts[c.level] = (levelCounts[c.level] || 0) + 1
    if (c.reviewFlags?.length) flagged += 1
  }

  writeFileSync(VOCAB_PATH, emitVocab(cards), 'utf8')
  console.log('Written', VOCAB_PATH)
  console.log('Levels:', levelCounts)
  console.log(`Flagged for review: ${flagged}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Full vocabulary quality audit aligned with flashcard report categories.
 *   node scripts/audit-quality.mjs
 *   node scripts/audit-quality.mjs --json > audit.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  detectReviewFlags,
  hasChinese,
  isExampleValidForCard,
  isTrivialExample,
} from './vocab-shared.mjs'
import { isWeakTemplateExample } from './example-frames.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const OUT_JSON = join(ROOT, 'data/audit-quality.json')

const kanji = /[\u4e00-\u9fff]/

function leftoverKanji(annotated = '') {
  const stripped = String(annotated).replace(
    /[\u4e00-\u9fff々〆ヵヶ]+(?:[\u3040-\u309f\u30a0-\u30ff]*)\[[^\]]+\]/g,
    '',
  )
  return kanji.test(stripped)
}

const cards = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))
const report = {
  generatedAt: new Date().toISOString(),
  total: cards.length,
  summary: {},
  byCategory: {
    audio: { note: 'Audio mp3 not checked in CI (run on device)', count: 0, items: [] },
    meaning: { count: 0, items: [] },
    translation: { count: 0, items: [] },
    example: { count: 0, items: [] },
    furigana: { count: 0, items: [] },
    reading: { count: 0, items: [] },
    ui: { count: 0, items: [] },
  },
  reviewFlags: {},
}

function push(cat, item) {
  const bucket = report.byCategory[cat]
  bucket.count += 1
  if (bucket.items.length < 200) bucket.items.push(item)
}

for (const c of cards) {
  for (const f of detectReviewFlags(c)) {
    report.reviewFlags[f] = (report.reviewFlags[f] || 0) + 1
  }
  for (const f of c.reviewFlags || []) {
    report.reviewFlags[f] = (report.reviewFlags[f] || 0) + 1
  }

  if (!hasChinese(c.meaning)) {
    push('meaning', { id: c.id, word: c.word, meaning: c.meaning?.slice(0, 80) })
  }
  if (c.exampleMeaning && (!hasChinese(c.exampleMeaning) || c.exampleMeaning.startsWith('例句大意：'))) {
    push('translation', {
      id: c.id,
      word: c.word,
      exampleMeaning: c.exampleMeaning?.slice(0, 80),
    })
  }
  if (
    !c.example ||
    c.exampleSource === 'missing' ||
    !isExampleValidForCard(c.example, c.word, c.reading) ||
    isWeakTemplateExample(c.example, c.word) ||
    isTrivialExample(c.example, c.word, c.reading)
  ) {
    push('example', {
      id: c.id,
      word: c.word,
      example: c.example?.slice(0, 60),
      source: c.exampleSource,
    })
  }
  if (kanji.test(c.example || '')) {
    const f = c.exampleFurigana || ''
    if (!f.includes('[') || leftoverKanji(f)) {
      push('furigana', { id: c.id, word: c.word, example: c.example?.slice(0, 40) })
    }
  }
  if (/[/／]/.test(c.word || '') || /[/／]/.test(c.reading || '')) {
    push('reading', { id: c.id, word: c.word, reading: c.reading })
  }
  if ((c.meaning || '').length > 100 || (c.senses || []).length > 5) {
    push('ui', {
      id: c.id,
      word: c.word,
      issue: (c.meaning || '').length > 100 ? 'long meaning' : `${c.senses.length} senses`,
    })
  }
}

for (const [cat, bucket] of Object.entries(report.byCategory)) {
  if (cat !== 'audio') report.summary[cat] = bucket.count
}

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8')

const asJson = process.argv.includes('--json')
if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`Audit: ${report.total} cards → data/audit-quality.json`)
  console.log('Summary (matches report categories):')
  for (const [k, v] of Object.entries(report.summary)) {
    console.log(`  ${k}: ${v}`)
  }
  console.log('reviewFlags:', report.reviewFlags)
}

const problemTotal = Object.values(report.summary).reduce((a, b) => a + b, 0)
if (problemTotal > 0) process.exitCode = 1

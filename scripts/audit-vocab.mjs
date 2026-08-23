#!/usr/bin/env node
/**
 * Audit vocabulary.json quality — run after build/enrich/postprocess.
 *   node scripts/audit-vocab.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasChinese, loadGlossary, translateEnGloss } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_JSON = join(ROOT, 'public/data/vocabulary.json')
const kanji = /[\u4e00-\u9fff々〆ヵヶ]/

function leftoverKanji(annotated = '') {
  const stripped = String(annotated).replace(
    /[\u4e00-\u9fff々〆ヵヶ]+(?:[\u3040-\u309f\u30a0-\u30ff]*)\[[^\]]+\]/g,
    '',
  )
  return kanji.test(stripped)
}

const cards = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'))
const glossary = loadGlossary()

let noFuri = 0
let enSenses = 0
let longSense = 0
let needsZh = 0
const samples = { noFuri: [], enSenses: [], longSense: [] }

for (const c of cards) {
  if (kanji.test(c.example || '')) {
    const f = c.exampleFurigana || ''
    if (!f.includes('[') || leftoverKanji(f)) {
      noFuri += 1
      if (samples.noFuri.length < 5) samples.noFuri.push(c.id)
    }
  }
  if (c.meaning && !hasChinese(c.meaning)) needsZh += 1
  for (const s of c.senses || []) {
    if (!hasChinese(s.meaning || '')) {
      enSenses += 1
      if (samples.enSenses.length < 5) samples.enSenses.push(`${c.id}:${s.senseIndex}`)
    }
    if ((s.meaning || '').length > 48) {
      longSense += 1
      if (samples.longSense.length < 5) samples.longSense.push(c.id)
    }
  }
}

const report = {
  cards: cards.length,
  noFuri,
  enSenses,
  longSense,
  needsZh,
  samples,
}
console.log(JSON.stringify(report, null, 2))
if (noFuri || enSenses > 100 || needsZh) process.exitCode = 1

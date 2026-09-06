#!/usr/bin/env node
/**
 * Merge device-exported local Gemini fixes into official overrides.
 *
 *   node scripts/merge-local-card-fixes.mjs path/to/export.json
 *   # or pipe:
 *   cat export.json | node scripts/merge-local-card-fixes.mjs
 *
 * Writes / updates:
 *   scripts/vocab-overrides.json
 *   data/grammar-overrides.json
 *
 * Then run:
 *   npm run postprocess:vocab
 *   npm run apply:grammar-overrides
 *   npm run build:content-updates
 *   # bump CONTENT_VERSION in src/data/config.js, build & deploy
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_OVERRIDES = join(ROOT, 'scripts/vocab-overrides.json')
const GRAMMAR_OVERRIDES = join(ROOT, 'data/grammar-overrides.json')

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

async function readInput() {
  const arg = process.argv[2]
  if (arg && arg !== '-') {
    return readFileSync(arg, 'utf8')
  }
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) {
    console.error('Usage: node scripts/merge-local-card-fixes.mjs export.json')
    process.exit(1)
  }
  return text
}

const ALLOWED = ['meaning', 'example', 'exampleMeaning', 'pattern', 'kanji', 'exampleFurigana']

const raw = await readInput()
const data = JSON.parse(raw)
const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
if (!items.length) {
  console.error('No items in export')
  process.exit(1)
}

const vocab = loadJson(VOCAB_OVERRIDES, {})
const grammar = loadJson(GRAMMAR_OVERRIDES, {})
let vCount = 0
let gCount = 0

for (const item of items) {
  if (!item?.id) continue
  const patch = {}
  for (const key of ALLOWED) {
    const v = item[key]
    if (v == null) continue
    const s = String(v).trim()
    if (!s || s === '…' || s === '...' || s === '無' || s === '同原文') continue
    patch[key] = s
  }
  if (patch.example && patch.exampleFurigana == null) patch.exampleFurigana = ''
  if (!Object.keys(patch).length) continue

  const isGrammar = item.type === 'grammar' || String(item.id).startsWith('g')
  if (isGrammar) {
    grammar[item.id] = { ...(grammar[item.id] || {}), ...patch }
    gCount += 1
  } else {
    vocab[item.id] = { ...(vocab[item.id] || {}), ...patch }
    vCount += 1
  }
}

saveJson(VOCAB_OVERRIDES, vocab)
saveJson(GRAMMAR_OVERRIDES, grammar)
console.log(`Merged ${items.length} export items → vocab ${vCount}, grammar ${gCount}`)
console.log('Next: npm run postprocess:vocab && npm run apply:grammar-overrides && bump CONTENT_VERSION')

#!/usr/bin/env node
/**
 * Merge data/grammar-overrides.json → src/data/grammarOverrides.js
 * and fill missing exampleFurigana with Kuroshiro.
 *
 *   node scripts/apply-grammar-overrides.mjs
 */

import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { grammarBase } from '../src/data/grammar.js'

const require = createRequire(import.meta.url)
const Kuroshiro = require('kuroshiro').default || require('kuroshiro')
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OVERRIDES_JSON = join(ROOT, 'data/grammar-overrides.json')
const OVERRIDES_JS = join(ROOT, 'src/data/grammarOverrides.js')

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function annotateExample(kuroshiro, text) {
  const plain = String(text || '').trim()
  if (!plain) return ''
  try {
    const html = await kuroshiro.convert(plain, { mode: 'furigana', to: 'hiragana' })
    // Convert <ruby>漢字<rt>かんじ</rt></ruby> → 漢字[かんじ]
    return html
      .replace(/<ruby>([^<]+)<rt>([^<]*)<\/rt><\/ruby>/g, '$1[$2]')
      .replace(/<[^>]+>/g, '')
  } catch {
    return plain
  }
}

function serializeOverrides(obj) {
  const body = JSON.stringify(obj, null, 2)
  return `/** Gemini / manual grammar card patches. Keys are grammar ids (g001…). */\nexport const grammarOverrides = ${body}\n`
}

async function main() {
  const raw = loadJson(OVERRIDES_JSON, {})
  const byId = Object.fromEntries(grammarBase.map((c) => [c.id, c]))
  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer())

  const out = {}
  let patched = 0
  let furi = 0

  for (const [id, patch] of Object.entries(raw)) {
    if (!patch || typeof patch !== 'object') continue
    const card = byId[id]
    if (!card) {
      console.warn(`skip unknown grammar id: ${id}`)
      continue
    }
    const next = { ...patch }
    if (next.example && !next.exampleFurigana) {
      next.exampleFurigana = await annotateExample(kuroshiro, next.example)
      furi += 1
    }
    // Drop no-op fields identical to base
    for (const key of Object.keys(next)) {
      if (next[key] === card[key]) delete next[key]
    }
    if (!Object.keys(next).length) continue
    out[id] = next
    patched += 1
  }

  mkdirSync(dirname(OVERRIDES_JS), { recursive: true })
  writeFileSync(OVERRIDES_JS, serializeOverrides(out), 'utf8')
  writeFileSync(OVERRIDES_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ patched, furiganaFilled: furi, out: OVERRIDES_JS }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

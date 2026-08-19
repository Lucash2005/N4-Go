#!/usr/bin/env node
/**
 * Fill exampleFurigana for cards whose examples still have bare kanji.
 * Uses Kuroshiro okurigana → 漢字[かんじ] format used by FuriganaText.
 */
import { createRequire } from 'module'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { vocabulary } from '../src/data/vocabulary.js'
import { grammar } from '../src/data/grammar.js'
import { applyFuriganaOverrides } from './furigana-overrides.mjs'

const require = createRequire(import.meta.url)
const Kuroshiro = require('kuroshiro').default || require('kuroshiro')
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji')

const __dirname = dirname(fileURLToPath(import.meta.url))
const KANJI = /[\u4e00-\u9fff々〆ヵヶ]/

function jsStr(value) {
  return JSON.stringify(value ?? '')
}

function kanjiRuns(text = '') {
  return (String(text).match(/[\u4e00-\u9fff々〆ヵヶ]+/g) || []).length
}

function leftoverKanji(annotated = '') {
  const stripped = String(annotated).replace(
    /[\u4e00-\u9fff々〆ヵヶ]+(?:[\u3040-\u309f\u30a0-\u30ff]*)\[[^\]]+\]/g,
    '',
  )
  return /[\u4e00-\u9fff々〆ヵヶ]/.test(stripped)
}

function needsFurigana(card) {
  const example = card.example || ''
  if (!KANJI.test(example)) return false
  const annotated = card.exampleFurigana || example
  return leftoverKanji(annotated)
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

function parenToBrackets(text = '') {
  return String(text).replace(/([\u4e00-\u9fff々〆ヵヶ]+)[（(]([^）)]+)[）)]/g, '$1[$2]')
}

async function annotate(kuroshiro, text) {
  const plain = String(text || '').replace(/\[[^\]]+\]/g, '')
  if (!KANJI.test(plain)) return plain
  try {
    const html = await kuroshiro.convert(plain, { mode: 'furigana', to: 'hiragana' })
    const converted = rubyHtmlToBrackets(html)
    if (KANJI.test(converted) && (converted.match(/\[/g) || []).length >= kanjiRuns(plain)) {
      return applyFuriganaOverrides(converted)
    }
  } catch {
    /* fall through */
  }
  const okuri = await kuroshiro.convert(plain, { mode: 'okurigana', to: 'hiragana' })
  return applyFuriganaOverrides(parenToBrackets(okuri))
}

function emitVocab(cards) {
  const lines = [
    "/** @typedef {{ id: string, type: 'vocab', word: string, reading: string, meaning: string, example: string, exampleFurigana?: string, exampleMeaning: string, category: string, level?: string }} VocabCard */",
    '',
    '/** N5+N4 core list (OpenJLPT, CC BY-SA 4.0) topped up to the N4 study target. */',
    '/** @type {VocabCard[]} */',
    'export const vocabulary = [',
  ]
  for (const card of cards) {
    lines.push('  {')
    lines.push(`    id: ${jsStr(card.id)},`)
    lines.push("    type: 'vocab',")
    for (const key of [
      'word',
      'reading',
      'meaning',
      'example',
      'exampleMeaning',
      'exampleFurigana',
      'category',
    ]) {
      lines.push(`    ${key}: ${jsStr(card[key])},`)
    }
    if (card.level) lines.push(`    level: ${jsStr(card.level)},`)
    lines.push('  },')
  }
  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

function emitGrammar(cards) {
  const lines = [
    "/** @typedef {{ id: string, type: 'grammar', word: string, reading: string, meaning: string, example: string, exampleFurigana?: string, exampleMeaning: string, category: string, pattern: string }} GrammarCard */",
    '',
    '/** @type {GrammarCard[]} */',
    'export const grammar = [',
  ]
  for (const card of cards) {
    lines.push('  {')
    lines.push(`    id: ${jsStr(card.id)},`)
    lines.push("    type: 'grammar',")
    for (const key of [
      'word',
      'reading',
      'meaning',
      'pattern',
      'example',
      'exampleMeaning',
      'exampleFurigana',
      'category',
    ]) {
      lines.push(`    ${key}: ${jsStr(card[key])},`)
    }
    lines.push('  },')
  }
  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer())
  let changed = 0

  const vocabOut = []
  for (const card of vocabulary) {
    const next = { ...card }
    if (needsFurigana(card)) {
      next.exampleFurigana = await annotate(kuroshiro, card.example)
      changed += 1
    }
    vocabOut.push(next)
  }

  const grammarOut = []
  for (const card of grammar) {
    const next = { ...card }
    if (needsFurigana(card)) {
      next.exampleFurigana = await annotate(kuroshiro, card.example)
      changed += 1
    }
    grammarOut.push(next)
  }

  writeFileSync(join(__dirname, '../src/data/vocabulary.js'), emitVocab(vocabOut))
  writeFileSync(join(__dirname, '../src/data/grammar.js'), emitGrammar(grammarOut))
  console.log('annotated', changed, 'examples')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

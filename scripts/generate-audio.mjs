#!/usr/bin/env node
/**
 * Generate Neural TTS MP3s for flashcards.
 * Japanese: ja-JP-NanamiNeural (word / example)
 * Chinese:  zh-TW-HsiaoChenNeural (meaning / exampleMeaning)
 *
 * Run: node scripts/generate-audio.mjs
 * Force regenerate: FORCE=1 node scripts/generate-audio.mjs
 * Only Chinese: ONLY=zh node scripts/generate-audio.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { EdgeTTS } from 'edge-tts-universal'
import { vocabulary } from '../src/data/vocabulary.js'
import { grammar } from '../src/data/grammar.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/audio')
mkdirSync(outDir, { recursive: true })

const JA_VOICE = 'ja-JP-NanamiNeural'
const ZH_VOICE = 'zh-TW-HsiaoChenNeural'
const cards = [...vocabulary, ...grammar]
const only = process.env.ONLY || 'all' // all | ja | zh

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function synthesizeToFile(text, filePath, voice) {
  if (!text?.trim()) return false
  if (existsSync(filePath) && process.env.FORCE !== '1') {
    console.log('skip', filePath)
    return true
  }
  const tts = new EdgeTTS(text.trim(), voice, { rate: '-5%', pitch: '+0Hz' })
  const result = await tts.synthesize()
  const raw = result.audio
  const buf = Buffer.from(raw instanceof Blob ? await raw.arrayBuffer() : raw)
  writeFileSync(filePath, buf)
  console.log('ok', filePath, buf.length)
  return true
}

let count = 0
for (const card of cards) {
  if (only === 'all' || only === 'ja') {
    const wordText = card.reading || card.word
    const exampleText = card.example
    await synthesizeToFile(wordText, join(outDir, `${card.id}-word.mp3`), JA_VOICE)
    await sleep(200)
    count += 1
    await synthesizeToFile(exampleText, join(outDir, `${card.id}-example.mp3`), JA_VOICE)
    await sleep(200)
    count += 1
  }

  if (only === 'all' || only === 'zh') {
    if (card.meaning) {
      await synthesizeToFile(card.meaning, join(outDir, `${card.id}-meaning.mp3`), ZH_VOICE)
      await sleep(200)
      count += 1
    }
    if (card.exampleMeaning) {
      await synthesizeToFile(
        card.exampleMeaning,
        join(outDir, `${card.id}-example-meaning.mp3`),
        ZH_VOICE,
      )
      await sleep(200)
      count += 1
    }
  }
}

console.log('done processed slots ~', count, 'for', cards.length, 'cards')

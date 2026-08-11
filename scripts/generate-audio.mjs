#!/usr/bin/env node
/**
 * Generate Neural TTS MP3s for flashcards (ja-JP-NanamiNeural).
 * Run: node scripts/generate-audio.mjs
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

const VOICE = 'ja-JP-NanamiNeural'
const cards = [...vocabulary, ...grammar]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function synthesizeToFile(text, filePath) {
  if (!text?.trim()) return false
  if (existsSync(filePath) && process.env.FORCE !== '1') {
    console.log('skip', filePath)
    return true
  }
  const tts = new EdgeTTS(text.trim(), VOICE, { rate: '-5%', pitch: '+0Hz' })
  const result = await tts.synthesize()
  const raw = result.audio
  const buf = Buffer.from(raw instanceof Blob ? await raw.arrayBuffer() : raw)
  writeFileSync(filePath, buf)
  console.log('ok', filePath, buf.length)
  return true
}

for (const card of cards) {
  const wordText = card.reading || card.word
  const exampleText = card.example
  await synthesizeToFile(wordText, join(outDir, `${card.id}-word.mp3`))
  await sleep(250)
  await synthesizeToFile(exampleText, join(outDir, `${card.id}-example.mp3`))
  await sleep(250)
}

console.log('done', cards.length * 2, 'clips')

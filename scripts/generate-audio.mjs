#!/usr/bin/env node
/**
 * Generate Neural TTS MP3s for flashcards.
 * Japanese: ja-JP-NanamiNeural (word / example)
 * Chinese:  zh-TW-HsiaoChenNeural (meaning / exampleMeaning)
 *
 * Run: node scripts/generate-audio.mjs
 * Force regenerate: FORCE=1 node scripts/generate-audio.mjs
 * Only Japanese: ONLY=ja node scripts/generate-audio.mjs
 * Concurrency: CONCURRENCY=6 node scripts/generate-audio.mjs
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EdgeTTS } from 'edge-tts-universal'
import { grammar } from '../src/data/grammar.js'
import { FORM_CARDS } from '../src/data/verbForms.js'
import { readingForSpeech } from '../src/utils/speechText.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vocabulary = JSON.parse(
  readFileSync(join(__dirname, '../public/data/vocabulary.json'), 'utf8'),
)
const outDir = join(__dirname, '../public/audio')
mkdirSync(outDir, { recursive: true })

const JA_VOICE = 'ja-JP-NanamiNeural'
const ZH_VOICE = 'zh-TW-HsiaoChenNeural'
const cards = [...vocabulary, ...grammar, ...FORM_CARDS]
const only = process.env.ONLY || 'all' // all | ja | zh
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 6))
const force = process.env.FORCE === '1'
const onlyIds = new Set(
  String(process.env.IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function synthesizeToFile(text, filePath, voice) {
  if (!text?.trim()) return 'empty'
  if (!force && existsSync(filePath)) return 'skip'
  let lastErr
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const tts = new EdgeTTS(text.trim(), voice, { rate: '-5%', pitch: '+0Hz' })
      const result = await tts.synthesize()
      const raw = result.audio
      const buf = Buffer.from(raw instanceof Blob ? await raw.arrayBuffer() : raw)
      if (buf.length < 200) throw new Error(`tiny audio ${buf.length}`)
      writeFileSync(filePath, buf)
      return 'ok'
    } catch (err) {
      lastErr = err
      await sleep(400 * (attempt + 1))
    }
  }
  throw lastErr || new Error(`failed ${filePath}`)
}

function jobsFor(card) {
  if (onlyIds.size && !onlyIds.has(card.id)) return []
  const jobs = []
  const isForm = card.type === 'form'
  const wordText = isForm
    ? card.formDrill?.reading || card.reading || card.word
    : readingForSpeech(card.reading, card.word)
  const exampleText = isForm
    ? card.example || card.formDrill?.answerReading
    : card.example
  if (only === 'all' || only === 'ja') {
    jobs.push({
      text: wordText,
      path: join(outDir, `${card.id}-word.mp3`),
      voice: JA_VOICE,
    })
    jobs.push({
      text: exampleText,
      path: join(outDir, `${card.id}-example.mp3`),
      voice: JA_VOICE,
    })
  }
  if (only === 'all' || only === 'zh') {
    if (card.meaning) {
      jobs.push({
        text: card.meaning,
        path: join(outDir, `${card.id}-meaning.mp3`),
        voice: ZH_VOICE,
      })
    }
    if (card.exampleMeaning) {
      jobs.push({
        text: card.exampleMeaning,
        path: join(outDir, `${card.id}-example-meaning.mp3`),
        voice: ZH_VOICE,
      })
    }
  }
  return jobs
}

async function runPool(jobs, n, fn) {
  let index = 0
  let ok = 0
  let skipped = 0
  let failed = 0
  async function worker() {
    while (index < jobs.length) {
      const current = jobs[index]
      index += 1
      try {
        const result = await fn(current)
        if (result === 'ok') ok += 1
        else skipped += 1
      } catch (err) {
        failed += 1
        console.error('fail', current.path, err.message || err)
      }
      const done = ok + skipped + failed
      if (done % 50 === 0 || done === jobs.length) {
        console.log(`audio ${done}/${jobs.length} ok=${ok} skip=${skipped} fail=${failed}`)
      }
    }
  }
  await Promise.all(Array.from({ length: n }, worker))
  return { ok, skipped, failed }
}

const jobs = cards.flatMap(jobsFor)
console.log('cards', cards.length, 'jobs', jobs.length, 'concurrency', concurrency)
const stats = await runPool(jobs, concurrency, (job) =>
  synthesizeToFile(job.text, job.path, job.voice),
)
console.log('done', stats)
if (stats.failed) process.exitCode = 1

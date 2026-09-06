#!/usr/bin/env node
/**
 * Rebuild public/data/gemini-scan-progress.json from batch results.
 * Safe to run without API key.
 *
 *   node scripts/sync-gemini-progress.mjs
 *   node scripts/sync-gemini-progress.mjs --daily-quota=800
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_PATH = join(ROOT, 'public/data/vocabulary.json')
const GRAMMAR_PATH = join(ROOT, 'src/data/grammar.js')
const RESULTS_PATH = join(ROOT, 'data/gemini-batch-results.json')
const OUT = join(ROOT, 'public/data/gemini-scan-progress.json')

function countGrammarCards() {
  const src = readFileSync(GRAMMAR_PATH, 'utf8')
  return [...src.matchAll(/\bid:\s*["']g\d+["']/g)].length
}

const args = process.argv.slice(2)
function flag(name, fallback = null) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return fallback
  if (hit === `--${name}`) return true
  return hit.slice(name.length + 3)
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function dayOf(iso) {
  return String(iso || '').slice(0, 10)
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const vocab = loadJson(VOCAB_PATH, [])
const total = (Array.isArray(vocab) ? vocab.length : 0) + countGrammarCards()
const batch = loadJson(RESULTS_PATH, { items: {} })
const items = Object.values(batch.items || {})
const doneRows = items.filter((x) => x.status === 'done')
const errorRows = items.filter((x) => x.status === 'error')
const ok = doneRows.filter((x) => x.verdict === 'OK').length
const fix = doneRows.filter((x) => x.verdict === 'FIX').length
const done = doneRows.length
const remaining = Math.max(0, total - done)

const days = {}
for (const row of items) {
  const day = dayOf(row.at) || 'unknown'
  if (!days[day]) days[day] = { scanned: 0, ok: 0, fix: 0, error: 0 }
  days[day].scanned += 1
  if (row.status === 'error') days[day].error += 1
  else if (row.verdict === 'OK') days[day].ok += 1
  else if (row.verdict === 'FIX') days[day].fix += 1
}

/** Free-tier Flash-Lite is often ~1000 RPD; keep a conservative daily target. */
const dailyQuota = Math.max(50, Number(flag('daily-quota', 800)) || 800)
const estimatedDaysLeft = remaining === 0 ? 0 : Math.ceil(remaining / dailyQuota)
const today = todayKey()

const out = {
  total,
  done,
  remaining,
  ok,
  fix,
  error: errorRows.length,
  percent: total ? Math.round((done / total) * 1000) / 10 : 0,
  dailyQuotaHint: dailyQuota,
  estimatedDaysLeft,
  today,
  todayScanned: days[today]?.scanned || 0,
  todayFix: days[today]?.fix || 0,
  todayOk: days[today]?.ok || 0,
  updatedAt: new Date().toISOString(),
  days,
  note:
    'Gemini 全庫掃描進度。remaining = 尚未檢查張數。每日免費額度用完後需等到太平洋時間午夜重置。',
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(JSON.stringify(out, null, 2))

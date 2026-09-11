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

/** Keep in sync with scripts/batch-gemini-fix.mjs GEMINI_PROMPT_VERSION. */
const GEMINI_PROMPT_VERSION = 2

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

function isCurrentPrompt(row) {
  return Number(row?.promptVersion) === GEMINI_PROMPT_VERSION
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
const needsRecheck = doneRows.filter((x) => !isCurrentPrompt(x)).length
const currentPromptDone = doneRows.filter((x) => isCurrentPrompt(x)).length
const remainingWork = remaining + needsRecheck

const days = {}
for (const row of items) {
  const day = dayOf(row.at) || 'unknown'
  if (!days[day]) days[day] = { scanned: 0, ok: 0, fix: 0, error: 0 }
  days[day].scanned += 1
  if (row.status === 'error') days[day].error += 1
  else if (row.verdict === 'OK') days[day].ok += 1
  else if (row.verdict === 'FIX') days[day].fix += 1
}

/** Free-tier Flash-Lite can do more, but we pace by study-days (default ~75 = 5×15). */
const dailyQuota = Math.max(15, Number(flag('daily-quota', 75)) || 75)
const estimatedDaysLeft = remainingWork === 0 ? 0 : Math.ceil(remainingWork / dailyQuota)
const today = todayKey()

const out = {
  total,
  done,
  remaining,
  needsRecheck,
  remainingWork,
  currentPromptDone,
  promptVersion: GEMINI_PROMPT_VERSION,
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
    'Gemini 全庫掃描進度。線上可學 = 僅 prompt v' +
    GEMINI_PROMPT_VERSION +
    '（currentPromptDone）。needsRecheck = 舊版已審、排入每日 --recheck；remaining = 未掃過；remainingWork = 兩者合計。每日約 75 張；完成後停止每日審查。',
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')

/**
 * Allowlist for daily plan / browse: ONLY cards reviewed with the CURRENT prompt.
 * Outdated-prompt (needsRecheck) cards stay out of study until the daily --recheck
 * queue refreshes them to promptVersion === GEMINI_PROMPT_VERSION.
 */
const APPROVED_OUT = join(ROOT, 'public/data/gemini-approved-ids.json')
const approvedIds = doneRows
  .filter((x) => isCurrentPrompt(x))
  .map((x) => String(x.id || ''))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
const approved = {
  updatedAt: out.updatedAt,
  count: approvedIds.length,
  done: currentPromptDone,
  total,
  remaining,
  needsRecheck,
  remainingWork,
  promptVersion: GEMINI_PROMPT_VERSION,
  complete: remainingWork === 0,
  ids: approvedIds,
  note:
    'Live study/browse only includes prompt-v' +
    GEMINI_PROMPT_VERSION +
    ' cards. Outdated reviews go through daily --recheck first; unscanned cards stay hidden until reviewed. complete=true when remainingWork hits 0.',
}
writeFileSync(APPROVED_OUT, JSON.stringify(approved, null, 2) + '\n', 'utf8')

console.log(JSON.stringify(out, null, 2))
console.log(
  JSON.stringify(
    { approvedCount: approved.count, complete: approved.complete, approvedOut: APPROVED_OUT },
    null,
    2,
  ),
)

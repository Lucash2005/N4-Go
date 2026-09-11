#!/usr/bin/env node
/**
 * One daily Gemini slice: resume scan → apply FIX → content-updates (today only) → progress.
 *
 * Defaults to a small reviewable batch (~5 study-days of new vocab), not the free-tier max.
 *
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --days=3
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --days=7
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --limit=90
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --recheck
 *
 * Study-day size follows DAILY_QUOTA.vocab (15). --days=3..7 → limit 45..105.
 * Prefer flash-lite. Stops early on hard 429 RPD.
 * With --recheck: refresh outdated promptVersion first, then never-scanned.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROGRESS_PATH = join(ROOT, 'public/data/gemini-scan-progress.json')
const STUDY_DAY_CARDS = 15
const DEFAULT_DAYS = 5

const args = process.argv.slice(2)
function flag(name, fallback = null) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return fallback
  if (hit === `--${name}`) return true
  return hit.slice(name.length + 3)
}

const daysRaw = flag('days', null)
const DAYS = daysRaw == null ? DEFAULT_DAYS : Math.min(7, Math.max(3, Number(daysRaw) || DEFAULT_DAYS))
const LIMIT = Number(flag('limit', DAYS * STUDY_DAY_CARDS)) || DAYS * STUDY_DAY_CARDS
const RPM = Number(flag('rpm', 12)) || 12
const RECHECK = Boolean(flag('recheck', true))
const KEY = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

function readProgress() {
  if (!existsSync(PROGRESS_PATH)) return null
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'))
  } catch {
    return null
  }
}

const progressBefore = readProgress()
if (progressBefore && Number(progressBefore.remainingWork) === 0) {
  console.log(
    JSON.stringify(
      {
        complete: true,
        remainingWork: 0,
        message: 'Gemini corpus scan already complete — skip daily slice and stop the timer.',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (!KEY) {
  console.error('Missing GEMINI_API_KEY — cannot run daily slice.')
  console.error('Add it as a Cursor Runtime Secret, then start a new agent.')
  process.exit(2)
}

function run(cmd, cmdArgs) {
  console.log('>', cmd, cmdArgs.join(' '))
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    env: { ...process.env, GEMINI_API_KEY: KEY },
    stdio: 'inherit',
    shell: false,
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

console.log(
  JSON.stringify(
    {
      studyDayCards: STUDY_DAY_CARDS,
      days: DAYS,
      limit: LIMIT,
      rpm: RPM,
      recheck: RECHECK,
      etaMin: Math.ceil(LIMIT / RPM) + 2,
    },
    null,
    2,
  ),
)

const batchArgs = [
  'scripts/batch-gemini-fix.mjs',
  '--resume',
  `--limit=${LIMIT}`,
  `--rpm=${RPM}`,
  '--apply',
]
if (RECHECK) batchArgs.push('--recheck')

run('node', batchArgs)
run('npm', ['run', 'postprocess:vocab'])
run('npm', ['run', 'apply:grammar-overrides'])
run('node', ['scripts/build-content-updates.mjs', '--from-batch-today', '--only-new'])
run('node', ['scripts/sync-gemini-progress.mjs', `--daily-quota=${LIMIT}`])

const progressAfter = readProgress()
const remainingWork = Number(progressAfter?.remainingWork)
const estimatedDaysLeft = Number(progressAfter?.estimatedDaysLeft)
console.log(
  JSON.stringify(
    {
      sliceDays: DAYS,
      sliceLimit: LIMIT,
      remainingWork,
      needsRecheck: progressAfter?.needsRecheck,
      remaining: progressAfter?.remaining,
      currentPromptDone: progressAfter?.currentPromptDone,
      estimatedDaysLeft,
      complete: remainingWork === 0,
      next:
        remainingWork === 0
          ? 'STOP daily Gemini timer (unsubscribe gemini-daily-small-slice).'
          : 'Bump CONTENT_VERSION, regen audio for FIX, build & deploy; keep daily timer.',
    },
    null,
    2,
  ),
)

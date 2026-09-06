#!/usr/bin/env node
/**
 * One daily Gemini slice: resume scan → apply FIX → content-updates (today only) → progress.
 *
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --limit=800
 *   GEMINI_API_KEY=... node scripts/run-daily-gemini-slice.mjs --recheck
 *
 * Free tier: prefer flash-lite (~800–1000/day). Stops early on hard 429 RPD.
 * With --recheck: refresh cards stamped with an older promptVersion first, then never-scanned.
 */

import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
function flag(name, fallback = null) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return fallback
  if (hit === `--${name}`) return true
  return hit.slice(name.length + 3)
}

const LIMIT = Number(flag('limit', 800)) || 800
const RPM = Number(flag('rpm', 12)) || 12
const RECHECK = Boolean(flag('recheck', false))
const KEY = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

if (!KEY) {
  console.error('Missing GEMINI_API_KEY — cannot run daily slice.')
  console.error('Paste the key in chat (or set env), then ask me to resume.')
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
run('node', ['scripts/sync-gemini-progress.mjs'])

console.log('Daily slice complete. Bump CONTENT_VERSION, build, and deploy to publish.')

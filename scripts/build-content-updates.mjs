#!/usr/bin/env node
/**
 * Build public/data/content-updates.json from overrides / Gemini batch results.
 *
 *   node scripts/build-content-updates.mjs
 *   node scripts/build-content-updates.mjs --day=2026-09-06
 *   node scripts/build-content-updates.mjs --from-batch
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/data/content-updates.json')
const VOCAB_OVERRIDES = join(ROOT, 'scripts/vocab-overrides.json')
const GRAMMAR_OVERRIDES = join(ROOT, 'data/grammar-overrides.json')
const BATCH = join(ROOT, 'data/gemini-batch-results.json')
const CONFIG = join(ROOT, 'src/data/config.js')

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

function readContentVersion() {
  const src = readFileSync(CONFIG, 'utf8')
  const m = src.match(/CONTENT_VERSION\s*=\s*(\d+)/)
  return m ? Number(m[1]) : 1
}

function todayKey() {
  const forced = flag('day')
  if (forced && forced !== true) return String(forced)
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function main() {
  const contentVersion = readContentVersion()
  const day = todayKey()
  const prev = loadJson(OUT, { days: {}, ids: [] })
  const days = { ...(prev.days || {}) }

  const ids = new Set()

  if (flag('from-batch-today', false) || flag('from-batch', false)) {
    const batch = loadJson(BATCH, { items: {} })
    const onlyToday = Boolean(flag('from-batch-today', false))
    for (const row of Object.values(batch.items || {})) {
      if (row?.status !== 'done' || row?.verdict !== 'FIX' || !row?.id) continue
      if (onlyToday) {
        const at = String(row.at || '').slice(0, 10)
        if (at !== day) continue
      }
      ids.add(String(row.id))
    }
  } else {
    const vocab = loadJson(VOCAB_OVERRIDES, {})
    const grammar = loadJson(GRAMMAR_OVERRIDES, {})
    for (const id of Object.keys(vocab)) ids.add(id)
    for (const id of Object.keys(grammar)) ids.add(id)
  }

  const onlyNew = flag('only-new', false)
  if (onlyNew) {
    const prevSet = new Set([...(prev.ids || []), ...Object.values(prev.days || {}).flat()])
    for (const id of [...ids]) {
      if (prevSet.has(id)) ids.delete(id)
    }
  }

  const list = [...ids].sort()
  days[day] = [...new Set([...(days[day] || []), ...list])].sort()

  const out = {
    contentVersion,
    updatedAt: new Date().toISOString(),
    days,
    ids: [...new Set([...(prev.ids || []), ...list])].sort(),
    note: 'Cards fixed in this content version; client marks them and skips duplicate Gemini checks.',
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log(
    JSON.stringify(
      { contentVersion, day, todayCount: days[day].length, versionCount: out.ids.length, out: OUT },
      null,
      2,
    ),
  )
}

main()

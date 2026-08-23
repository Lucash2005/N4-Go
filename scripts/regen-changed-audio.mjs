#!/usr/bin/env node
/**
 * Regenerate Neural MP3s for cards listed in data/vocab-changed-ids.json
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGED = join(ROOT, 'data/vocab-changed-ids.json')

if (!existsSync(CHANGED)) {
  console.error('Missing', CHANGED, '— run enrich:vocab first')
  process.exit(1)
}

const ids = JSON.parse(readFileSync(CHANGED, 'utf8'))
if (!ids.length) {
  console.log('No changed IDs')
  process.exit(0)
}

console.log(`Regenerating audio for ${ids.length} cards…`)

const child = spawn(
  'node',
  ['scripts/generate-audio.mjs'],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      FORCE: '1',
      IDS: ids.join(','),
      CONCURRENCY: process.env.CONCURRENCY || '8',
    },
    stdio: 'inherit',
  },
)

child.on('exit', (code) => process.exit(code ?? 1))

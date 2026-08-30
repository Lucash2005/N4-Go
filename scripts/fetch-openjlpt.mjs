#!/usr/bin/env node
/**
 * Download OpenJLPT vocab JSON (evanclan/OpenJLPT, CC BY-SA 4.0).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'data/openjlpt')
const BASE =
  'https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab'

const LEVELS = ['n5', 'n4', 'n3', 'n2']

async function fetchLevel(level) {
  const url = `${BASE}/${level}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  const data = await res.json()
  const path = join(OUT_DIR, `${level}.json`)
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
  console.log(`${level}: ${data.length} entries → ${path}`)
  return data.length
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  let total = 0
  for (const level of LEVELS) {
    total += await fetchLevel(level)
  }
  console.log(`Done. ${total} total entries in ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectReviewFlags } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const vocab = JSON.parse(
  readFileSync(join(ROOT, 'public/data/vocabulary.json'), 'utf8'),
)

const issues = []
for (const card of vocab) {
  for (const flag of detectReviewFlags(card)) {
    issues.push({ id: card.id, word: card.word, flag })
  }
}

const byFlag = {}
for (const item of issues) {
  byFlag[item.flag] = (byFlag[item.flag] || 0) + 1
}

console.log(`Cards: ${vocab.length}`)
console.log('Flag counts:', byFlag)
const hard = issues.filter((i) =>
  ['mt_artifact', 'level_invalid', 'reading_invalid'].includes(i.flag),
)
if (hard.length) {
  console.error(`Hard failures: ${hard.length}`)
  process.exit(1)
}
console.log(issues.length ? 'Soft flags remain' : 'Validation OK')

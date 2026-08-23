#!/usr/bin/env node
/**
 * Validate vocabulary.js — reading, levels, example match, MT artifacts.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import { detectReviewFlags } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const vocabUrl = pathToFileURL(join(ROOT, 'src/data/vocabulary.js')).href

async function main() {
  const { vocabulary } = await import(vocabUrl)
  const issues = []

  for (const card of vocabulary) {
    const flags = detectReviewFlags(card)
    const stored = card.reviewFlags || []
    for (const flag of flags) {
      issues.push({ id: card.id, word: card.word, flag })
    }
    const missing = flags.filter((f) => !stored.includes(f))
    if (missing.length) {
      issues.push({ id: card.id, word: card.word, missingFlags: missing })
    }
  }

  const byFlag = {}
  for (const item of issues) {
    if (!item.flag) continue
    byFlag[item.flag] = (byFlag[item.flag] || 0) + 1
  }

  console.log(`Cards: ${vocabulary.length}`)
  console.log('Flag counts:', byFlag)

  const flaggedIds = [...new Set(issues.filter((i) => i.flag).map((i) => i.id))]
  console.log(`Cards with issues: ${flaggedIds.length}`)

  const hardFail = issues.filter((i) =>
    ['mt_artifact', 'level_invalid', 'reading_invalid'].includes(i.flag),
  )
  if (hardFail.length) {
    console.error(`Hard failures: ${hardFail.length}`)
    process.exit(1)
  }

  console.log(flaggedIds.length ? 'Soft flags remain' : 'Validation OK')
}

main()

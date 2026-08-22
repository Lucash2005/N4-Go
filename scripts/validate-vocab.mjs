#!/usr/bin/env node
/**
 * Validate vocabulary.js — reading, levels, example match, MT artifacts.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseExistingVocab, detectReviewFlags } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_PATH = join(ROOT, 'src/data/vocabulary.js')

function main() {
  const cards = parseExistingVocab(VOCAB_PATH)
  const issues = []

  for (const card of cards) {
    const flags = detectReviewFlags(card)
    const stored = card.reviewFlags || []
    const missing = flags.filter((f) => !stored.includes(f))
    const extra = stored.filter((f) => !flags.includes(f))

    if (missing.length || extra.length) {
      issues.push({
        id: card.id,
        word: card.word,
        missingFlags: missing,
        extraFlags: extra,
      })
    }

    for (const flag of flags) {
      issues.push({ id: card.id, word: card.word, flag })
    }
  }

  const byFlag = {}
  for (const item of issues) {
    if (!item.flag) continue
    byFlag[item.flag] = (byFlag[item.flag] || 0) + 1
  }

  console.log(`Cards: ${cards.length}`)
  console.log('Flag counts:', byFlag)

  const flaggedIds = [...new Set(issues.filter((i) => i.flag).map((i) => i.id))]
  console.log(`Cards with issues: ${flaggedIds.length}`)

  if (flaggedIds.length) {
    const sample = issues.filter((i) => i.flag).slice(0, 15)
    console.log('Sample:')
    for (const s of sample) {
      console.log(`  ${s.id} ${s.word}: ${s.flag}`)
    }
  }

  const stale = issues.filter((i) => i.missingFlags?.length || i.extraFlags?.length)
  if (stale.length) {
    console.warn(`Stale reviewFlags on ${stale.length} cards — run build:vocab`)
  }

  const hardFail = issues.filter((i) =>
    ['mt_artifact', 'level_invalid', 'reading_invalid'].includes(i.flag),
  )
  if (hardFail.length) {
    console.error(`Hard failures: ${hardFail.length}`)
    process.exit(1)
  }

  console.log('Validation OK (soft flags may remain)')
}

main()

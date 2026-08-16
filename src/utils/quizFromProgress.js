import { grammar } from '../data/grammar'
import { GRAMMAR_MEMORY } from '../data/memory'
import { quizQuestions, shuffle, withShuffledOptions } from '../data/quiz'
import { vocabulary } from '../data/vocabulary'
import { normalizeEntry } from './srs'
import { todayKey } from './storage'

const ALL_VOCAB = vocabulary
const ALL_GRAMMAR = grammar

function cardPriority(card, cardProgress, planIds, today) {
  const entry = normalizeEntry(cardProgress[card.id], today)
  let score = 1
  if (planIds.has(card.id)) score += 100
  if (!entry) return score
  if (entry.due <= today) score += 60
  if (entry.status === 'review') score += 40
  else if (entry.status === 'learning') score += 25
  else if (entry.status === 'learned') score += 12
  if (entry.repetitions > 0) score += Math.min(15, entry.repetitions)
  return score
}

function weightedPick(cards, count, rand) {
  const pool = [...cards]
  const picked = []
  while (pool.length && picked.length < count) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0)
    let roll = rand() * total
    let idx = 0
    for (; idx < pool.length; idx += 1) {
      roll -= pool[idx].weight
      if (roll <= 0) break
    }
    idx = Math.min(idx, pool.length - 1)
    picked.push(pool[idx].card)
    pool.splice(idx, 1)
  }
  return picked
}

function distractors(correct, pool, field, count, rand) {
  const correctVal = correct[field]
  const others = shuffle(
    pool.filter((c) => c.id !== correct.id && c[field] && c[field] !== correctVal),
  )
  // Prefer same category when possible
  const sameCat = others.filter((c) => c.category === correct.category)
  const rest = others.filter((c) => c.category !== correct.category)
  const ordered = [...sameCat, ...rest]
  const values = []
  const seen = new Set([correctVal])
  for (const card of ordered) {
    const val = card[field]
    if (seen.has(val)) continue
    seen.add(val)
    values.push(val)
    if (values.length >= count) break
  }
  // Fill from any remaining if still short
  if (values.length < count) {
    for (const card of shuffle([...ALL_VOCAB, ...ALL_GRAMMAR])) {
      if (card.type !== correct.type) continue
      const val = card[field]
      if (!val || seen.has(val)) continue
      seen.add(val)
      values.push(val)
      if (values.length >= count) break
    }
  }
  return values.slice(0, count)
}

function buildMcq({ id, type, prompt, correct, options, explanation, vocabId, grammarId }) {
  const allOptions = shuffle([correct, ...options]).slice(0, 4)
  // Ensure correct is present
  if (!allOptions.includes(correct)) {
    allOptions[allOptions.length - 1] = correct
  }
  while (allOptions.length < 4) {
    allOptions.push(`（選項${allOptions.length + 1}）`)
  }
  const answer = allOptions.indexOf(correct)
  const q = {
    id,
    type,
    prompt,
    options: allOptions,
    answer: answer < 0 ? 0 : answer,
    explanation,
    vocabId,
    grammarId,
  }
  if (grammarId && GRAMMAR_MEMORY[grammarId]) {
    const m = GRAMMAR_MEMORY[grammarId]
    q.memoryUseWhen = m.useWhen
    q.memoryForm = m.form
    q.memoryCompare = m.compare
    q.memoryTip = m.tip
  }
  return q
}

function blankExample(example, target) {
  if (!example || !target) return null
  const bare = target.replace(/^〜/, '').replace(/（.*?）/g, '').trim()
  if (!bare || bare.length < 2) return null
  if (!example.includes(bare)) return null
  return example.replace(bare, '（　）')
}

function vocabQuestionsFor(card, pool, rand) {
  const qs = []
  const meaningOpts = distractors(card, pool, 'meaning', 3, rand)
  if (meaningOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-meaning`,
        type: 'vocab',
        vocabId: card.id,
        prompt: `「${card.word}」の意味として最も適当なものを選んでください。`,
        correct: card.meaning,
        options: meaningOpts,
        explanation: `「${card.word}（${card.reading}）」＝${card.meaning}。`,
      }),
    )
  }

  const wordOpts = distractors(card, pool, 'word', 3, rand)
  if (wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-word`,
        type: 'vocab',
        vocabId: card.id,
        prompt: `次の意味に合う言葉を選んでください。\n${card.meaning}`,
        correct: card.word,
        options: wordOpts,
        explanation: `「${card.meaning}」對應「${card.word}（${card.reading}）」。`,
      }),
    )
  }

  if (card.reading && /[\u4e00-\u9fff]/.test(card.word)) {
    const readingOpts = distractors(card, pool, 'reading', 3, rand)
    if (readingOpts.length >= 3) {
      qs.push(
        buildMcq({
          id: `dyn-${card.id}-reading`,
          type: 'vocab',
          vocabId: card.id,
          prompt: `「${card.word}」の読み方はどれですか。`,
          correct: card.reading,
          options: readingOpts,
          explanation: `「${card.word}」讀作「${card.reading}」，意思是${card.meaning}。`,
        }),
      )
    }
  }

  const blanked = blankExample(card.example, card.word)
  if (blanked && wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-blank`,
        type: 'vocab',
        vocabId: card.id,
        prompt: `空欄に入る最も適当な言葉を選んでください。\n${blanked}`,
        correct: card.word,
        options: wordOpts,
        explanation: `正解是「${card.word}」。例句意思：${card.exampleMeaning}`,
      }),
    )
  }

  return qs
}

function grammarQuestionsFor(card, pool, rand) {
  const qs = []
  const meaningOpts = distractors(card, pool, 'meaning', 3, rand)
  if (meaningOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-meaning`,
        type: 'grammar',
        grammarId: card.id,
        prompt: `「${card.word}」の意味として最も適当なものを選んでください。`,
        correct: card.meaning,
        options: meaningOpts,
        explanation: `「${card.word}」＝${card.meaning}。句型：${card.pattern}`,
      }),
    )
  }

  const wordOpts = distractors(card, pool, 'word', 3, rand)
  if (wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-word`,
        type: 'grammar',
        grammarId: card.id,
        prompt: `次の意味に合う文法を選んでください。\n${card.meaning}`,
        correct: card.word,
        options: wordOpts,
        explanation: `「${card.meaning}」用「${card.word}」。`,
      }),
    )
  }

  const bare = card.word.replace(/^〜/, '')
  const blanked = blankExample(card.example, bare)
  if (blanked && wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-blank`,
        type: 'grammar',
        grammarId: card.id,
        prompt: `空欄に入る最も適当なものを選んでください。\n${blanked}`,
        correct: card.word,
        options: wordOpts,
        explanation: `正解是「${card.word}」。例句意思：${card.exampleMeaning}`,
      }),
    )
  }

  return qs
}

function mulberryRand(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a quiz set from learning progress.
 * Prioritizes today's plan + due/review cards; falls back to curated bank.
 */
export function pickAdaptiveQuiz({
  count = 10,
  type = 'all',
  cardProgress = {},
  dailyPlan = {},
  today = todayKey(),
} = {}) {
  const rand = mulberryRand((Date.now() ^ (Math.random() * 1e9)) >>> 0)
  const planIds = new Set([
    ...(dailyPlan.vocabIds || []),
    ...(dailyPlan.grammarIds || []),
    ...(dailyPlan.reviewIds || []),
  ])

  const wantVocab = type === 'all' || type === 'vocab'
  const wantGrammar = type === 'all' || type === 'grammar'
  const wantReading = type === 'all' || type === 'reading'

  const vocabWeighted = wantVocab
    ? ALL_VOCAB.map((card) => ({
        card,
        weight: cardPriority(card, cardProgress, planIds, today),
      }))
    : []
  const grammarWeighted = wantGrammar
    ? ALL_GRAMMAR.map((card) => ({
        card,
        weight: cardPriority(card, cardProgress, planIds, today),
      }))
    : []

  // Pick source cards first (more than needed so templates vary)
  const vocabTargets = weightedPick(vocabWeighted, Math.max(count, 12), rand)
  const grammarTargets = weightedPick(grammarWeighted, Math.max(Math.ceil(count / 2), 6), rand)

  const generated = []
  for (const card of vocabTargets) {
    const variants = vocabQuestionsFor(card, ALL_VOCAB, rand)
    if (variants.length) generated.push(variants[Math.floor(rand() * variants.length)])
  }
  for (const card of grammarTargets) {
    const variants = grammarQuestionsFor(card, ALL_GRAMMAR, rand)
    if (variants.length) generated.push(variants[Math.floor(rand() * variants.length)])
  }

  let pool = shuffle(generated)

  if (wantReading) {
    const readingBank = shuffle(quizQuestions.filter((q) => q.type === 'reading'))
    const readingCount = type === 'reading' ? count : Math.min(2, readingBank.length)
    pool = [...readingBank.slice(0, readingCount), ...pool]
  }

  // Curated fallback / spice for modes that still need fill
  if (pool.length < count) {
    const curated = quizQuestions.filter((q) => {
      if (type === 'all') return true
      return q.type === type
    })
    const used = new Set(pool.map((q) => q.id))
    for (const q of shuffle(curated)) {
      if (used.has(q.id)) continue
      pool.push(q)
      if (pool.length >= count * 2) break
    }
  }

  // Prefer progress-linked questions when mixing
  pool = shuffle(pool).slice(0, Math.min(count, pool.length))

  return pool.map((q) => {
    const enriched =
      q.grammarId && GRAMMAR_MEMORY[q.grammarId] && !q.memoryTip
        ? {
            ...q,
            memoryUseWhen: GRAMMAR_MEMORY[q.grammarId].useWhen,
            memoryForm: GRAMMAR_MEMORY[q.grammarId].form,
            memoryCompare: GRAMMAR_MEMORY[q.grammarId].compare,
            memoryTip: GRAMMAR_MEMORY[q.grammarId].tip,
          }
        : q
    return withShuffledOptions(enriched)
  })
}

export function describeQuizSource(questions = []) {
  const dynamic = questions.filter((q) => String(q.id).startsWith('dyn-')).length
  const curated = questions.length - dynamic
  return { dynamic, curated, total: questions.length }
}

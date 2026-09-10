#!/usr/bin/env node
/**
 * Batch Gemini review (+ optional auto-fix) for ALL vocab & grammar cards.
 *
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --limit=20
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --apply
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --only=vocab
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --only=grammar
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --ids=v1140,g001
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --resume
 *   GEMINI_API_KEY=... node scripts/batch-gemini-fix.mjs --resume --recheck
 *     (--recheck: re-run cards whose promptVersion != CURRENT, then never-scanned;
 *      prefer outdated done cards first so old-prompt results get refreshed)
 *
 * Default pace ~12 RPM (safe for free tier). Override with --rpm=30
 * Results → data/gemini-batch-results.json
 * --apply writes scripts/vocab-overrides.json + data/grammar-overrides.json
 * --apply-only reapplies from saved results (no API calls)
 *
 * After apply:
 *   npm run postprocess:vocab
 *   npm run apply:grammar-overrides
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { grammarBase } from '../src/data/grammar.js'

/** Bump when the review prompt criteria change; --recheck refreshes outdated rows. */
const GEMINI_PROMPT_VERSION = 2

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VOCAB_PATH = join(ROOT, 'public/data/vocabulary.json')
const RESULTS_PATH = join(ROOT, 'data/gemini-batch-results.json')
const VOCAB_OVERRIDES_PATH = join(ROOT, 'scripts/vocab-overrides.json')
const GRAMMAR_OVERRIDES_PATH = join(ROOT, 'data/grammar-overrides.json')

const MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
]
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const PROGRESS_PATH = join(ROOT, 'public/data/gemini-scan-progress.json')

const args = process.argv.slice(2)
function flag(name, fallback = null) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return fallback
  if (hit === `--${name}`) return true
  return hit.slice(name.length + 3)
}

const APPLY = Boolean(flag('apply', false))
const APPLY_ONLY = Boolean(flag('apply-only', false))
const RESUME = Boolean(flag('resume', false))
const RECHECK = Boolean(flag('recheck', false))
const ONLY = String(flag('only', 'all'))
const LIMIT = Number(flag('limit', 0)) || 0
const RPM = Math.max(1, Number(flag('rpm', 12)) || 12)
const DELAY_MS = Math.ceil(60000 / RPM)
const IDS = String(flag('ids', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const API_KEY = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function dayKey(iso = new Date().toISOString()) {
  return String(iso).slice(0, 10)
}

function isCurrentPrompt(row) {
  return Number(row?.promptVersion) === GEMINI_PROMPT_VERSION
}

function writeScanProgress(items, queueTotal) {
  const rows = Object.values(items || {})
  const doneRows = rows.filter((x) => x.status === 'done')
  const errorRows = rows.filter((x) => x.status === 'error')
  const ok = doneRows.filter((x) => x.verdict === 'OK').length
  const fix = doneRows.filter((x) => x.verdict === 'FIX').length
  const done = doneRows.length
  const total = queueTotal || 1580
  const remaining = Math.max(0, total - done)
  const needsRecheck = doneRows.filter((x) => !isCurrentPrompt(x)).length
  const currentPromptDone = doneRows.filter((x) => isCurrentPrompt(x)).length
  const remainingWork = remaining + needsRecheck
  const dailyQuota = 75
  const days = {}
  for (const row of rows) {
    const day = dayKey(row.at || '') || 'unknown'
    if (!days[day]) days[day] = { scanned: 0, ok: 0, fix: 0, error: 0 }
    days[day].scanned += 1
    if (row.status === 'error') days[day].error += 1
    else if (row.verdict === 'OK') days[day].ok += 1
    else if (row.verdict === 'FIX') days[day].fix += 1
  }
  const today = dayKey()
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
    estimatedDaysLeft: remainingWork === 0 ? 0 : Math.ceil(remainingWork / dailyQuota),
    today,
    todayScanned: days[today]?.scanned || 0,
    todayFix: days[today]?.fix || 0,
    todayOk: days[today]?.ok || 0,
    updatedAt: new Date().toISOString(),
    days,
    note:
      'Gemini 全庫掃描進度。remaining = 尚未檢查；needsRecheck = 舊版 prompt 已審核、待用現行標準重審；remainingWork = 兩者合計。每日額度用完後等太平洋時間午夜重置。',
  }
  saveJson(PROGRESS_PATH, out)
  return out
}

function vocabPrompt(card) {
  return `你是日語教師。用繁體中文檢查這張 JLPT N5/N4 學習字卡。只回傳 JSON，不要 markdown。
重點：① 中文／字義是否正確貼切 ② 例句是否自然、語意正確 ③ 是否適合 N5～N4（勿過難或過偏）④ 例句中文翻譯是否正確。
此為單字卡，請確認字義與例句是否適合 JLPT N5～N4（常用、自然、好記）。

字卡：
{"id":"${card.id}","word":${JSON.stringify(card.word)},"reading":${JSON.stringify(card.reading)},"kanji":${JSON.stringify(card.kanji || '')},"meaning":${JSON.stringify(card.meaning)},"example":${JSON.stringify(card.example)},"exampleMeaning":${JSON.stringify(card.exampleMeaning)}}

若詞頭是假名且有對應漢字，FIX 時填 kanji（必須符合此字義，勿用同音別字）。沒問題 verdict=OK；否則 FIX 並給完整替換欄位（不要只寫說明）。

回傳 JSON：
{"verdict":"OK"|"FIX","issues":["..."],"meaning":"...","example":"...","exampleMeaning":"...","kanji":"..."}`
}

function grammarPrompt(card) {
  return `你是日語教師。用繁體中文檢查這張 JLPT N5/N4 學習字卡。只回傳 JSON，不要 markdown。
重點：① 中文／字義是否正確貼切 ② 例句是否自然、語意正確 ③ 是否適合 N5～N4（勿過難或過偏）④ 例句中文翻譯是否正確。
此為文法卡，請一併確認接續／句型是否正確，例句是否清楚示範此文法。

文法卡：
{"id":"${card.id}","word":${JSON.stringify(card.word)},"reading":${JSON.stringify(card.reading)},"meaning":${JSON.stringify(card.meaning)},"pattern":${JSON.stringify(card.pattern || '')},"example":${JSON.stringify(card.example)},"exampleMeaning":${JSON.stringify(card.exampleMeaning)}}

沒問題 verdict=OK；否則 FIX 並給完整替換欄位（meaning / pattern / example / exampleMeaning）。

回傳 JSON：
{"verdict":"OK"|"FIX","issues":["..."],"meaning":"...","pattern":"...","example":"...","exampleMeaning":"..."}`
}

function extractJson(text = '') {
  const raw = String(text || '').trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1].trim() : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no_json')
  return JSON.parse(body.slice(start, end + 1))
}

async function callModel(model, prompt) {
  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let body = await res.text()
  // Some models reject responseMimeType; retry plain text JSON.
  if (!res.ok && /responseMimeType|Unknown name|INVALID_ARGUMENT/i.test(body)) {
    delete payload.generationConfig.responseMimeType
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    body = await res.text()
  }
  return { res, body, model }
}

async function reviewOne(card) {
  const prompt = card.type === 'grammar' ? grammarPrompt(card) : vocabPrompt(card)
  let lastErr = ''
  for (const model of MODEL_CANDIDATES) {
    const { res, body } = await callModel(model, prompt)
    if (res.status === 404) {
      lastErr = `404 ${model}`
      continue
    }
    if (!res.ok) throw new Error(`http_${res.status}: ${body.slice(0, 220)}`)
    const data = JSON.parse(body)
    const parts = data?.candidates?.[0]?.content?.parts || []
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('')
      .trim()
    if (!text) throw new Error('empty_response')
    const parsed = extractJson(text)
    return { ...parsed, _model: model }
  }
  throw new Error(lastErr || 'no_model')
}

function normalizeVerdict(v) {
  const s = String(v || '').toUpperCase()
  if (s.includes('OK') || s.includes('PASS') || s.includes('通過')) return 'OK'
  return 'FIX'
}

function toVocabOverride(card, review) {
  const patch = {}
  if (review.meaning && review.meaning !== card.meaning) patch.meaning = String(review.meaning).trim()
  if (review.example && review.example !== card.example) {
    patch.example = String(review.example).trim()
    // Do NOT blank exampleFurigana here — postprocess regenerates it after apply.
    // Leaving an empty string in overrides would wipe furigana on every postprocess pass.
  }
  if (review.exampleMeaning && review.exampleMeaning !== card.exampleMeaning) {
    patch.exampleMeaning = String(review.exampleMeaning).trim()
  }
  if (review.kanji && String(review.kanji).trim()) {
    const k = String(review.kanji).trim()
    if (k !== card.word && /[\u4e00-\u9fff]/.test(k)) patch.kanji = k
  }
  return patch
}

function toGrammarOverride(card, review) {
  const patch = {}
  if (review.meaning && review.meaning !== card.meaning) patch.meaning = String(review.meaning).trim()
  if (review.pattern && review.pattern !== card.pattern) patch.pattern = String(review.pattern).trim()
  if (review.example && review.example !== card.example) {
    patch.example = String(review.example).trim()
    // Furigana is regenerated in postprocess — do not persist blank override.
  }
  if (review.exampleMeaning && review.exampleMeaning !== card.exampleMeaning) {
    patch.exampleMeaning = String(review.exampleMeaning).trim()
  }
  return patch
}

function buildQueue() {
  const vocab = JSON.parse(readFileSync(VOCAB_PATH, 'utf8')).map((c) => ({
    ...c,
    type: 'vocab',
  }))
  const grams = grammarBase.map((c) => ({ ...c, type: 'grammar' }))
  let all = []
  if (ONLY === 'vocab' || ONLY === 'all') all = all.concat(vocab)
  if (ONLY === 'grammar' || ONLY === 'all') all = all.concat(grams)
  if (IDS.length) all = all.filter((c) => IDS.includes(c.id))
  return all
}

function applyResults(items) {
  const vocabCards = Object.fromEntries(
    JSON.parse(readFileSync(VOCAB_PATH, 'utf8')).map((c) => [c.id, c]),
  )
  const grammarCards = Object.fromEntries(grammarBase.map((c) => [c.id, c]))
  const vocabOverrides = loadJson(VOCAB_OVERRIDES_PATH, {})
  const grammarOverrides = loadJson(GRAMMAR_OVERRIDES_PATH, {})
  let vPatch = 0
  let gPatch = 0

  for (const row of Object.values(items)) {
    if (row.status !== 'done' || row.verdict !== 'FIX') continue
    if (row.type === 'vocab') {
      const card = vocabCards[row.id]
      if (!card) continue
      const patch = toVocabOverride(card, row.review || {})
      if (!Object.keys(patch).length) continue
      vocabOverrides[row.id] = { ...(vocabOverrides[row.id] || {}), ...patch }
      vPatch += 1
    } else if (row.type === 'grammar') {
      const card = grammarCards[row.id]
      if (!card) continue
      const patch = toGrammarOverride(card, row.review || {})
      if (!Object.keys(patch).length) continue
      grammarOverrides[row.id] = { ...(grammarOverrides[row.id] || {}), ...patch }
      gPatch += 1
    }
  }

  saveJson(VOCAB_OVERRIDES_PATH, vocabOverrides)
  saveJson(GRAMMAR_OVERRIDES_PATH, grammarOverrides)
  console.log(JSON.stringify({ appliedVocab: vPatch, appliedGrammar: gPatch }, null, 2))
  console.log('Next: npm run postprocess:vocab && npm run apply:grammar-overrides && npm run build:content-updates')
  return { vPatch, gPatch }
}

async function main() {
  if (APPLY_ONLY) {
    const prev = loadJson(RESULTS_PATH, null)
    if (!prev?.items) {
      console.error(`No results at ${RESULTS_PATH}. Run a batch review first.`)
      process.exit(1)
    }
    applyResults(prev.items)
    return
  }

  if (!API_KEY) {
    console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY).')
    console.error('Example: GEMINI_API_KEY=AIza... node scripts/batch-gemini-fix.mjs --limit=5')
    process.exit(1)
  }

  const queue = buildQueue()
  const prev = RESUME || RECHECK ? loadJson(RESULTS_PATH, { items: {} }) : { items: {} }
  const items = { ...(prev.items || {}) }
  let pending = queue.filter((c) => {
    const hit = items[c.id]
    if (!hit || hit.status === 'error') return true
    if (hit.status === 'done') {
      // Recheck only rows stamped with an older / missing prompt version.
      if (RECHECK && !isCurrentPrompt(hit)) return true
      return false
    }
    if (!RESUME && !RECHECK) return true
    return false
  })
  // Prefer outdated done cards first, then never-scanned / errors.
  if (RECHECK) {
    pending = [...pending].sort((a, b) => {
      const da = items[a.id]?.status === 'done' && !isCurrentPrompt(items[a.id]) ? 0 : 1
      const db = items[b.id]?.status === 'done' && !isCurrentPrompt(items[b.id]) ? 0 : 1
      return da - db
    })
  }
  const work = LIMIT > 0 ? pending.slice(0, LIMIT) : pending
  const needsRecheck = Object.values(items).filter(
    (x) => x.status === 'done' && !isCurrentPrompt(x),
  ).length

  console.log(
    JSON.stringify(
      {
        total: queue.length,
        alreadyDone: Object.values(items).filter((x) => x.status === 'done').length,
        needsRecheck,
        promptVersion: GEMINI_PROMPT_VERSION,
        todo: work.length,
        recheck: RECHECK,
        rpm: RPM,
        delayMs: DELAY_MS,
        apply: APPLY,
        only: ONLY,
      },
      null,
      2,
    ),
  )

  let ok = 0
  let fix = 0
  let err = 0
  const started = Date.now()

  for (let i = 0; i < work.length; i += 1) {
    const card = work[i]
    const n = i + 1
    try {
      const review = await reviewOne(card)
      const verdict = normalizeVerdict(review.verdict)
      items[card.id] = {
        id: card.id,
        type: card.type,
        word: card.word,
        status: 'done',
        promptVersion: GEMINI_PROMPT_VERSION,
        verdict,
        issues: Array.isArray(review.issues) ? review.issues : [],
        review: {
          meaning: review.meaning || '',
          pattern: review.pattern || '',
          example: review.example || '',
          exampleMeaning: review.exampleMeaning || '',
          kanji: review.kanji || '',
        },
        model: review._model || '',
        at: new Date().toISOString(),
      }
      if (verdict === 'OK') ok += 1
      else fix += 1
      console.log(
        `[${n}/${work.length}] ${card.id} ${card.word} → ${verdict}` +
          (verdict === 'FIX' && review.issues?.[0]
            ? ` (${String(review.issues[0]).slice(0, 40)})`
            : ''),
      )
    } catch (e) {
      err += 1
      items[card.id] = {
        id: card.id,
        type: card.type,
        word: card.word,
        status: 'error',
        error: String(e.message || e).slice(0, 300),
        at: new Date().toISOString(),
      }
      console.error(`[${n}/${work.length}] ${card.id} ERROR ${e.message || e}`)
      if (/429|RESOURCE_EXHAUSTED|rate/i.test(String(e.message || e))) {
        console.error('Rate limited — sleeping 65s')
        await sleep(65000)
      }
    }

    if (n % 10 === 0 || n === work.length) {
      saveJson(RESULTS_PATH, {
        updatedAt: new Date().toISOString(),
        promptVersion: GEMINI_PROMPT_VERSION,
        counts: {
          done: Object.values(items).filter((x) => x.status === 'done').length,
          fix: Object.values(items).filter((x) => x.verdict === 'FIX').length,
          ok: Object.values(items).filter((x) => x.verdict === 'OK').length,
          error: Object.values(items).filter((x) => x.status === 'error').length,
          needsRecheck: Object.values(items).filter(
            (x) => x.status === 'done' && !isCurrentPrompt(x),
          ).length,
        },
        items,
      })
      writeScanProgress(items, queue.length)
    }

    if (i < work.length - 1) await sleep(DELAY_MS)
  }

  saveJson(RESULTS_PATH, {
    updatedAt: new Date().toISOString(),
    promptVersion: GEMINI_PROMPT_VERSION,
    counts: {
      done: Object.values(items).filter((x) => x.status === 'done').length,
      fix: Object.values(items).filter((x) => x.verdict === 'FIX').length,
      ok: Object.values(items).filter((x) => x.verdict === 'OK').length,
      error: Object.values(items).filter((x) => x.status === 'error').length,
      needsRecheck: Object.values(items).filter(
        (x) => x.status === 'done' && !isCurrentPrompt(x),
      ).length,
    },
    items,
  })
  const progress = writeScanProgress(items, queue.length)

  if (APPLY) applyResults(items)

  const elapsedMin = ((Date.now() - started) / 60000).toFixed(1)
  console.log(
    JSON.stringify(
      { ok, fix, err, elapsedMin, remaining: progress.remaining, results: RESULTS_PATH },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

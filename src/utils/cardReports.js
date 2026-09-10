import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const STORAGE_KEY = 'reported-cards'

export const REPORT_REASONS = [
  { id: 'meaning', label: '字義有誤／疑慮' },
  { id: 'audio_reading', label: '音檔與音標問題' },
]

const LEGACY_REASON_MAP = {
  audio: 'audio_reading',
  furigana: 'audio_reading',
  reading: 'audio_reading',
  translation: 'meaning',
  example: 'meaning',
  ui: 'meaning',
  other: 'meaning',
}

const REASON_MAP = new Map(REPORT_REASONS.map((r) => [r.id, r]))

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: raw.contentVersion || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function normalizeReasonIds(reasonIds) {
  const list = Array.isArray(reasonIds) ? reasonIds : reasonIds ? [reasonIds] : []
  const seen = new Set()
  const out = []
  for (const id of list) {
    const mapped = REASON_MAP.has(id) ? id : LEGACY_REASON_MAP[id]
    if (!mapped || !REASON_MAP.has(mapped) || seen.has(mapped)) continue
    seen.add(mapped)
    out.push(mapped)
  }
  return out.length ? out : ['meaning']
}

function labelsFor(reasonIds) {
  return reasonIds.map((id) => REASON_MAP.get(id)?.label || id)
}

function cardSnapshot(card = {}) {
  return {
    word: card.word || '',
    reading: card.reading || '',
    kanji: card.kanji || '',
    meaning: card.meaning || '',
    meaningEn: card.meaningEn || '',
    example: card.example || '',
    exampleMeaning: card.exampleMeaning || '',
    exampleFurigana: card.exampleFurigana || '',
    level: card.level || '',
    pos: card.pos || '',
  }
}

/** Pull only actionable Gemini suggestion lines for compact export. */
export function compactFixHint(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const lines = raw
    .replace(/\*\*/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const keep = lines.filter((l) =>
    /^(建議字義|建議例句|建議譯文|建議接續|建議中文|問題)\s*[：:]/.test(l),
  )
  const picked = (keep.length ? keep : lines).slice(0, 4).join('｜')
  return picked.slice(0, 280)
}

/** Load reported cards — persists across content updates until user manually clears. */
export function loadReportedCards() {
  const store = normalizeStore(loadJSON(STORAGE_KEY, null))
  if (store.contentVersion !== CONTENT_VERSION) {
    const next = { ...store, contentVersion: CONTENT_VERSION }
    saveJSON(STORAGE_KEY, next)
    return next
  }
  return store
}

export function saveReportedCards(store) {
  saveJSON(STORAGE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function reportedIdSet(store = loadReportedCards()) {
  return new Set(Object.keys(store.items || {}))
}

export function isCardReported(id, store = loadReportedCards()) {
  return Boolean(id && store.items?.[id])
}

/**
 * @param {object} card
 * @param {string|string[]} reasonIds - one or more reason ids (multi-select)
 * @param {string} note
 * @param {object} store
 * @param {{ geminiAnalysis?: string }} [extra]
 */
export function reportCard(card, reasonIds, note = '', store = loadReportedCards(), extra = {}) {
  if (!card?.id) return store
  const reasons = normalizeReasonIds(reasonIds)
  const reasonLabels = labelsFor(reasons)
  const geminiAnalysis = String(extra.geminiAnalysis || '').trim().slice(0, 1200)
  const next = {
    contentVersion: CONTENT_VERSION,
    items: {
      ...store.items,
      [card.id]: {
        id: card.id,
        word: card.word || card.reading || card.id,
        type: card.type || 'vocab',
        level: card.level || '',
        reason: reasons[0],
        reasonLabel: reasonLabels.join('、'),
        reasons,
        reasonLabels,
        note: String(note || '').trim().slice(0, 1200),
        geminiAnalysis,
        snapshot: cardSnapshot(card),
        at: new Date().toISOString(),
        contentVersion: CONTENT_VERSION,
      },
    },
  }
  saveReportedCards(next)
  return next
}

export function unreportCard(id, store = loadReportedCards()) {
  if (!id || !store.items?.[id]) return store
  const items = { ...store.items }
  delete items[id]
  const next = { contentVersion: CONTENT_VERSION, items }
  saveReportedCards(next)
  return next
}

export function clearAllReports() {
  const next = { contentVersion: CONTENT_VERSION, items: {} }
  saveReportedCards(next)
  return next
}

export function filterOutReported(cards, store = loadReportedCards()) {
  const hidden = reportedIdSet(store)
  if (!hidden.size) return cards
  return cards.filter((c) => !hidden.has(c.id))
}

/**
 * Compact export for pasting to the coding agent — ids + reasons + short fix hint only.
 * Agent should load full card text from the repo by id (saves tokens).
 */
export function exportReportsCompact(store = loadReportedCards()) {
  const items = Object.values(store.items || {})
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
    .map((item) => {
      const fix = compactFixHint(item.note) || compactFixHint(item.geminiAnalysis)
      const row = {
        id: item.id,
        word: item.word || '',
        type: item.type || 'vocab',
        reasons: Array.isArray(item.reasons) ? item.reasons : [item.reason || 'meaning'],
      }
      if (fix) row.fix = fix
      return row
    })
  return JSON.stringify(
    {
      format: 'n4-go-reports-v2',
      contentVersion: store.contentVersion || CONTENT_VERSION,
      count: items.length,
      forAgent:
        'Load each id from public/data/vocabulary.json or grammar.js; apply meaning/example/exampleMeaning/kanji fixes. Ignore missing fields. Prefer row.fix suggestions when present.',
      items,
    },
    null,
    2,
  )
}

/** @deprecated Prefer exportReportsCompact for agent handoff. */
export function exportReportsJson(store = loadReportedCards()) {
  return exportReportsCompact(store)
}

export function importReportsJson(jsonText, store = loadReportedCards()) {
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { ok: false, error: 'invalid_json', store }
  }
  const incoming = Array.isArray(parsed?.items) ? parsed.items : []
  const items = { ...(store.items || {}) }
  for (const item of incoming) {
    if (!item?.id) continue
    items[item.id] = {
      ...item,
      contentVersion: CONTENT_VERSION,
    }
  }
  const next = { contentVersion: CONTENT_VERSION, items }
  saveReportedCards(next)
  return { ok: true, merged: incoming.length, store: next }
}

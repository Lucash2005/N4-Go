/**
 * Gemini-powered situational clustering for today's SRS due cards.
 * Does not alter card IDs or SRS schedules — only adds shared-context sentences.
 */
import { CONTENT_VERSION } from '../data/config'
import { generateGeminiText } from './geminiReview'
import { loadJSON, saveJSON, todayKey } from './storage'

const CACHE_KEY = 'review-cluster-cache'
const PROMPT_VERSION = 1
const MAX_CARDS = 30

/**
 * @param {Array<{ id?: string, word?: string, reading?: string, meaning?: string, kanji?: string, type?: string }>} cards
 */
export function cardsToClusterInput(cards = []) {
  return (Array.isArray(cards) ? cards : [])
    .filter((c) => c?.id && c?.word)
    .slice(0, MAX_CARDS)
    .map((c) => ({
      id: String(c.id),
      word: String(c.word || '').trim(),
      reading: String(c.reading || '').trim(),
      meaning: String(c.meaning || '').trim(),
      kanji: String(c.kanji || '').trim() || undefined,
    }))
}

export function clusterFingerprint(cards = []) {
  const ids = cardsToClusterInput(cards)
    .map((c) => c.id)
    .sort()
  return `${todayKey()}|v${PROMPT_VERSION}|${ids.join(',')}`
}

export function buildReviewClusterPrompt(cards = []) {
  const input = cardsToClusterInput(cards)
  return `你是一位精通日語教學與認知記憶心理學的專家，同時也是 SRS（間隔重複系統）字卡輔助引擎。
任務：將下列今日到期複習單字「情境分群（Clustering）」，並為每個分群撰寫自然且極易記憶的「共用串聯故事句」。

【原則】
1. SRS 獨立性：不要變更任何單字 id；只輸出共用句子與該字在句中的挖空標記。
2. 難易度：句子必須簡短直覺、符合日常語感。若組合會超過約 35 字、文法過難或情境牽強，立刻降階為超簡單短句，或拆成兩個短句；difficulty_level 填 "easy"。一般可填 "normal"。
3. 防止干擾：優先「名詞＋動詞＋形容詞/副詞」等有因果或時間順序的組合；不要把 3 個以上同類純名詞硬塞同一句。
4. 找不到合理串聯的放入 unclustered_card_ids，不要強行湊數。
5. 每群建議 2～4 字；共用句用自然日語（可常體）。
6. shared_sentence_jp／zh／reading 必須是「完整句、沒有挖空」；只有各卡的 cloze_sentence_* 才用「[ ？？？ ]」取代該目標詞在句中的形式。
7. 嚴格只輸出一個 JSON 物件，不要 Markdown、不要開場白。

【輸出 schema】
{"groups":[{"group_id":"g_01","theme":"情境主題","shared_sentence_jp":"完整句無挖空","shared_sentence_reading":"全句假名（可含空格）","shared_sentence_zh":"繁中翻譯（完整）","difficulty_level":"easy|normal","target_cards":[{"card_id":"與輸入 id 完全相同","word":"…","cloze_sentence_jp":"…[ ？？？ ]…","cloze_sentence_zh":"…[ ？？？ ]…"}]}],"unclustered_card_ids":["…"]}

【今日到期單字】
${JSON.stringify(input, null, 2)}`
}

function extractJsonObject(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return null
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1].trim() : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

function normalizeClusterResult(parsed, inputCards = []) {
  const byId = new Map(inputCards.map((c) => [c.id, c]))
  const seen = new Set()
  const groups = []
  const rawGroups = Array.isArray(parsed?.groups) ? parsed.groups : []

  for (let i = 0; i < rawGroups.length; i += 1) {
    const g = rawGroups[i] || {}
    const targetsIn = Array.isArray(g.target_cards) ? g.target_cards : []
    const target_cards = []
    for (const t of targetsIn) {
      const card_id = String(t?.card_id || t?.id || '').trim()
      if (!card_id || !byId.has(card_id) || seen.has(card_id)) continue
      seen.add(card_id)
      const word = String(t?.word || byId.get(card_id)?.word || '').trim()
      target_cards.push({
        card_id,
        word,
        cloze_sentence_jp: String(t?.cloze_sentence_jp || '').trim(),
        cloze_sentence_zh: String(t?.cloze_sentence_zh || '').trim(),
      })
    }
    if (target_cards.length < 2) {
      // Singleton "groups" are not useful — treat as unclustered later
      for (const t of target_cards) seen.delete(t.card_id)
      continue
    }
    groups.push({
      group_id: String(g.group_id || `g_${String(i + 1).padStart(2, '0')}`),
      theme: String(g.theme || '日常情境').trim() || '日常情境',
      shared_sentence_jp: String(g.shared_sentence_jp || '').trim(),
      shared_sentence_reading: String(g.shared_sentence_reading || '').trim(),
      shared_sentence_zh: String(g.shared_sentence_zh || '').trim(),
      difficulty_level: g.difficulty_level === 'normal' ? 'normal' : 'easy',
      target_cards,
    })
  }

  const unclustered = []
  const rawUn = Array.isArray(parsed?.unclustered_card_ids) ? parsed.unclustered_card_ids : []
  for (const id of rawUn) {
    const s = String(id || '').trim()
    if (s && byId.has(s) && !seen.has(s)) {
      seen.add(s)
      unclustered.push(s)
    }
  }
  for (const c of inputCards) {
    if (!seen.has(c.id)) unclustered.push(c.id)
  }

  return { groups, unclustered_card_ids: unclustered }
}

function loadCacheStore() {
  const raw = loadJSON(CACHE_KEY, null)
  if (!raw || typeof raw !== 'object') {
    return { contentVersion: CONTENT_VERSION, items: {} }
  }
  return {
    contentVersion: Number(raw.contentVersion) || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function saveCacheStore(store) {
  saveJSON(CACHE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function getCachedReviewCluster(fingerprint) {
  if (!fingerprint) return null
  const store = loadCacheStore()
  if (store.contentVersion !== CONTENT_VERSION) return null
  const hit = store.items?.[fingerprint]
  if (!hit?.result) return null
  return hit
}

export function setCachedReviewCluster(fingerprint, result, meta = {}) {
  if (!fingerprint || !result) return
  const store = loadCacheStore()
  const items = store.contentVersion === CONTENT_VERSION ? { ...store.items } : {}
  items[fingerprint] = {
    result,
    at: new Date().toISOString(),
    model: meta.model || '',
  }
  // Keep last 8 fingerprints
  const keys = Object.keys(items)
  if (keys.length > 8) {
    keys
      .sort((a, b) => String(items[a].at).localeCompare(String(items[b].at)))
      .slice(0, keys.length - 8)
      .forEach((k) => delete items[k])
  }
  saveCacheStore({ contentVersion: CONTENT_VERSION, items })
}

export function clearCachedReviewCluster(fingerprint) {
  if (!fingerprint) return
  const store = loadCacheStore()
  if (!store.items?.[fingerprint]) return
  const items = { ...store.items }
  delete items[fingerprint]
  saveCacheStore({ contentVersion: store.contentVersion || CONTENT_VERSION, items })
}

/**
 * @param {object[]} cards
 * @param {string} apiKey
 * @param {{ signal?: AbortSignal, force?: boolean }} [opts]
 */
export async function clusterReviewCardsWithGemini(cards, apiKey, opts = {}) {
  const input = cardsToClusterInput(cards)
  if (input.length < 2) {
    return {
      ok: false,
      error: 'need_at_least_2_cards',
      result: { groups: [], unclustered_card_ids: input.map((c) => c.id) },
    }
  }
  const fp = clusterFingerprint(input)
  if (!opts.force) {
    const cached = getCachedReviewCluster(fp)
    if (cached?.result) {
      return { ok: true, cached: true, fingerprint: fp, result: cached.result, model: cached.model }
    }
  }

  const prompt = buildReviewClusterPrompt(input)
  const gen = await generateGeminiText(prompt, apiKey, {
    signal: opts.signal,
    maxChars: 16000,
    maxOutputTokens: 8192,
    temperature: 0.4,
  })
  if (!gen.ok) {
    return { ok: false, error: gen.error || 'generate_failed', fingerprint: fp }
  }

  const parsed = extractJsonObject(gen.text)
  if (!parsed) {
    return { ok: false, error: 'invalid_cluster_json', fingerprint: fp, raw: gen.text?.slice(0, 400) }
  }

  const result = normalizeClusterResult(parsed, input)
  setCachedReviewCluster(fp, result, { model: gen.model })
  return { ok: true, cached: false, fingerprint: fp, result, model: gen.model }
}

/** Find group + cloze target for a card id. */
export function findClusterTarget(result, cardId) {
  if (!result?.groups || !cardId) return null
  for (const g of result.groups) {
    const t = (g.target_cards || []).find((x) => x.card_id === cardId)
    if (t) return { group: g, target: t }
  }
  return null
}

/**
 * Order cards: clustered groups first (group order), then unclustered.
 * SRS IDs unchanged — study order only.
 */
export function orderCardsByCluster(cards = [], result) {
  if (!result?.groups?.length) return cards
  const byId = new Map(cards.map((c) => [c.id, c]))
  const out = []
  const used = new Set()
  for (const g of result.groups) {
    for (const t of g.target_cards || []) {
      const c = byId.get(t.card_id)
      if (c && !used.has(c.id)) {
        out.push(c)
        used.add(c.id)
      }
    }
  }
  for (const c of cards) {
    if (!used.has(c.id)) out.push(c)
  }
  return out
}

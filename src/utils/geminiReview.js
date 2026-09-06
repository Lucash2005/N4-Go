/**
 * Ask Gemini whether a vocab/grammar card’s meaning + example usage is sound.
 * API key is device-local (settings); never invent a key server-side.
 */

/** Prefer Flash models; include lite / latest for 503 failover. */
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
]

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const RETRYABLE = new Set([429, 500, 502, 503, 504])

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function shortError(status, body = '') {
  const raw = String(body || '')
  let message = ''
  try {
    const parsed = JSON.parse(raw)
    message = String(parsed?.error?.message || '')
  } catch {
    message = raw
  }
  if (/high demand|unavailable|try again later/i.test(message)) {
    return `伺服器忙碌（${status}），請稍後再試`
  }
  if (status === 429) return '請求太頻繁（429），請稍後再試'
  const clipped = message.replace(/\s+/g, ' ').slice(0, 80)
  return clipped ? `http_${status}: ${clipped}` : `http_${status}`
}

function cardSnapshot(card = {}) {
  return {
    id: card.id || '',
    type: card.type || 'vocab',
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

export function buildGeminiReviewPrompt(card = {}) {
  const snap = cardSnapshot(card)
  return `你是日語教師。用繁體中文檢查這張 JLPT N5/N4 字卡：字義是否貼切、例句是否自然、中文翻譯是否正確。不要寫長文。

【字卡】
詞頭：${snap.word}
讀音：${snap.reading}
漢字：${snap.kanji || snap.word}
中文意思：${snap.meaning}
英文意思：${snap.meaningEn || '（無）'}
例句：${snap.example}
例句中文：${snap.exampleMeaning}

請嚴格依下列格式完整輸出（每項一行，總長約 150～250 字，必須寫完所有欄位）：
結論：OK 或 需修正
問題：無 或 1. … 2. …
建議字義：…
建議例句：…
建議譯文：…
同音注意：無 或 …`
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || []
  const visible = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('')
    .trim()
  if (visible) return visible
  return parts
    .map((p) => p.text || '')
    .join('')
    .trim()
}

async function callGeminiModel(model, key, prompt, signal, { useThinkingConfig = true } = {}) {
  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`
  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: 2048,
  }
  if (useThinkingConfig) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
  })
  const body = await res.text().catch(() => '')
  return { res, body }
}

/**
 * @param {object} card
 * @param {string} apiKey
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<{ ok: boolean, text: string, error?: string, model?: string }>}
 */
export async function reviewCardWithGemini(card, apiKey, opts = {}) {
  const key = String(apiKey || '').trim()
  if (!key) {
    return {
      ok: false,
      text: '',
      error: 'missing_key',
    }
  }

  const prompt = buildGeminiReviewPrompt(card)
  let lastError = ''

  try {
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        let { res, body } = await callGeminiModel(model, key, prompt, opts.signal)

        // Some models reject thinkingConfig — retry once without it.
        if (!res.ok && /thinkingConfig|Unknown name/i.test(body)) {
          ;({ res, body } = await callGeminiModel(model, key, prompt, opts.signal, {
            useThinkingConfig: false,
          }))
        }

        if (res.status === 404) {
          lastError = shortError(404, body)
          break // next model
        }

        if (RETRYABLE.has(res.status)) {
          lastError = shortError(res.status, body)
          // brief backoff then retry same model once; else next model
          if (attempt === 0) {
            await sleep(700 + attempt * 500)
            continue
          }
          break
        }

        if (!res.ok) {
          lastError = shortError(res.status, body)
          // Non-retryable for this model — try next model anyway
          break
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          lastError = 'invalid_json'
          break
        }

        const text = extractText(data)
        if (!text) {
          lastError = 'empty_response'
          break
        }
        return { ok: true, text: text.slice(0, 1200), model }
      }
    }

    return {
      ok: false,
      text: '',
      error: lastError || 'no_available_model',
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, text: '', error: 'aborted' }
    }
    return { ok: false, text: '', error: String(err?.message || err || 'network_error') }
  }
}

export { cardSnapshot }

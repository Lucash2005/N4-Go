/**
 * Ask Gemini whether a vocab/grammar card’s meaning + example usage is sound.
 * API key is device-local (settings); never invent a key server-side.
 */

/** Prefer current Flash models; try fallbacks if one ID is retired. */
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
]

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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

async function callGeminiModel(model, key, prompt, signal) {
  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        // 2.5 Flash thinking tokens count against this budget; keep headroom.
        maxOutputTokens: 2048,
        // Prefer visible answer over long internal thinking.
        thinkingConfig: { thinkingBudget: 0 },
      },
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
      const { res, body } = await callGeminiModel(model, key, prompt, opts.signal)
      if (res.status === 404) {
        lastError = `http_404: ${body.slice(0, 180)}`
        continue
      }
      // Some models reject thinkingConfig — retry once without it.
      if (!res.ok && /thinkingConfig|Unknown name/i.test(body)) {
        const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`
        const retry = await fetch(url, {
          method: 'POST',
          signal: opts.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        })
        const retryBody = await retry.text().catch(() => '')
        if (!retry.ok) {
          if (retry.status === 404) {
            lastError = `http_404: ${retryBody.slice(0, 180)}`
            continue
          }
          return {
            ok: false,
            text: '',
            error: `http_${retry.status}${retryBody ? `: ${retryBody.slice(0, 180)}` : ''}`,
          }
        }
        let data
        try {
          data = JSON.parse(retryBody)
        } catch {
          return { ok: false, text: '', error: 'invalid_json' }
        }
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim() || ''
        if (!text) return { ok: false, text: '', error: 'empty_response', model }
        return { ok: true, text: text.slice(0, 1200), model }
      }
      if (!res.ok) {
        return {
          ok: false,
          text: '',
          error: `http_${res.status}${body ? `: ${body.slice(0, 180)}` : ''}`,
        }
      }

      let data
      try {
        data = JSON.parse(body)
      } catch {
        return { ok: false, text: '', error: 'invalid_json' }
      }

      // Prefer visible text parts; ignore thought parts if present.
      const parts = data?.candidates?.[0]?.content?.parts || []
      const text = parts
        .filter((p) => !p.thought && p.text)
        .map((p) => p.text)
        .join('')
        .trim()

      if (!text) {
        // Fallback: any text field
        const fallback = parts
          .map((p) => p.text || '')
          .join('')
          .trim()
        if (!fallback) return { ok: false, text: '', error: 'empty_response', model }
        return { ok: true, text: fallback.slice(0, 1200), model }
      }

      return { ok: true, text: text.slice(0, 1200), model }
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

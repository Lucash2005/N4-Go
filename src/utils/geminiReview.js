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
  return `你是日語教師，請用繁體中文檢查這張 JLPT 字卡是否合理（字義、讀音、例句用法、中文翻譯是否一致）。

【字卡】
- id: ${snap.id}
- 詞頭: ${snap.word}
- 讀音: ${snap.reading}
- 漢字寫法: ${snap.kanji || '（無／同詞頭）'}
- 詞性: ${snap.pos || '（未標）'}
- 等級: ${snap.level || '（未標）'}
- 中文意思: ${snap.meaning}
- 英文意思: ${snap.meaningEn || '（無）'}
- 例句: ${snap.example}
- 例句中文: ${snap.exampleMeaning}
- 例句振り仮名: ${snap.exampleFurigana || '（無）'}

請用繁體中文回答，格式固定如下（精簡，總長不超過 400 字）：
結論：OK／需修正
問題：（若 OK 寫「無」；否則條列 1～3 點）
建議字義：
建議例句（日文）：
建議例句翻譯：
同音異義注意：（無關則寫「無」）`
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
        maxOutputTokens: 512,
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

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || ''

      if (!text) {
        return { ok: false, text: '', error: 'empty_response', model }
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

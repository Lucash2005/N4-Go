/**
 * Ask Gemini whether a vocab/grammar card’s meaning + example usage is sound.
 * API key is device-local (settings); never invent a key server-side.
 */

/** Prefer Flash models; include lite / latest for 503 failover. */
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
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
  const word = String(card.word || '').trim()
  const reading = String(card.reading || '').trim()
  const kanji = String(card.kanji || '').trim()
  // Prefer explicit kanji field; else word when it contains kanji.
  const displayKanji = kanji || (/[\u4e00-\u9fff]/.test(word) ? word : '')
  return {
    id: card.id || '',
    type: card.type || 'vocab',
    word,
    reading,
    kanji: displayKanji,
    meaning: card.meaning || '',
    meaningEn: card.meaningEn || '',
    // Plain Japanese only — never bracket furigana (avoids 漢字音標黏在一起／重複).
    example: String(card.example || '').trim(),
    exampleMeaning: String(card.exampleMeaning || '').trim(),
    level: card.level || '',
    pos: card.pos || '',
    pattern: card.pattern || '',
  }
}

/**
 * Shared review instructions (API + copy-to-chat).
 * Kanji and reading are always on separate lines.
 */
export function buildGeminiReviewPrompt(card = {}) {
  const snap = cardSnapshot(card)
  const levelHint =
    snap.type === 'grammar'
      ? '此為文法卡，請一併檢查接續／用法是否適合 JLPT N5～N4。'
      : '此為單字卡，請確認字義與例句是否適合 JLPT N5～N4（常用、自然、好記）。'

  const headLines = [
    snap.kanji ? `漢字：${snap.kanji}` : null,
    snap.reading ? `讀音（假名）：${snap.reading}` : null,
    snap.word && snap.word !== snap.kanji ? `詞頭顯示：${snap.word}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `你是日語教師。用繁體中文檢查這張 JLPT N5/N4 學習字卡。
重點：① 中文／字義是否正確貼切 ② 例句是否自然、語意正確 ③ 是否適合 N5～N4（勿過難或過偏）④ 例句中文翻譯是否正確。
${levelHint}

【字卡】
編號：${snap.id || '（無）'}
類型：${snap.type === 'grammar' ? '文法' : '單字'}
${headLines}
中文意思：${snap.meaning || '（無）'}
英文意思：${snap.meaningEn || '（無）'}
${snap.pattern ? `接續／句型：${snap.pattern}\n` : ''}例句（日文）：${snap.example || '（無）'}
例句中文：${snap.exampleMeaning || '（無）'}

請嚴格依下列格式完整輸出（每項一行，總長約 150～250 字，必須寫完所有欄位）：
結論：OK 或 需修正
問題：無 或 1. … 2. …
建議字義：…（若無需改寫「同原文」；若需修正請寫完整替換文字，不要只寫說明）
建議例句：…（同上，寫完整日文例句）
建議譯文：…（同上，寫完整中文翻譯）
建議接續：…（僅文法卡；單字卡寫「無」）
同音注意：無 或 …`
}

/** Prompt criteria version — keep in sync with scripts/batch-gemini-fix.mjs GEMINI_PROMPT_VERSION. */
export const GEMINI_PROMPT_VERSION = 2

/** Same prompt text for pasting into Gemini / ChatGPT web chat (no API). */
export function buildChatCopyPrompt(card = {}) {
  return buildGeminiReviewPrompt(card)
}

/**
 * Parse the structured Gemini review reply into a patch.
 * @returns {{
 *   verdict: 'OK'|'FIX'|'UNKNOWN',
 *   issues: string,
 *   meaning: string,
 *   example: string,
 *   exampleMeaning: string,
 *   pattern: string,
 *   note: string,
 *   hasPatch: boolean,
 * }}
 */
export function parseGeminiReviewText(text = '') {
  const raw = String(text || '').trim()
  // Prefer embedded JSON if the model returned batch-style output.
  const jsonHit = raw.match(/\{[\s\S]*"verdict"\s*:\s*"(OK|FIX)"[\s\S]*\}/i)
  if (jsonHit) {
    try {
      const obj = JSON.parse(jsonHit[0])
      const useless = (v) =>
        v == null ||
        !String(v).trim() ||
        /^(…|\.\.\.|無|同原文|不變|維持原樣|N\/A)$/i.test(String(v).trim())
      const patch = {}
      if (!useless(obj.meaning)) patch.meaning = String(obj.meaning).trim()
      if (!useless(obj.example)) patch.example = String(obj.example).trim()
      if (!useless(obj.exampleMeaning)) patch.exampleMeaning = String(obj.exampleMeaning).trim()
      if (!useless(obj.pattern)) patch.pattern = String(obj.pattern).trim()
      if (!useless(obj.kanji)) patch.kanji = String(obj.kanji).trim()
      const verdictRaw = String(obj.verdict || '')
      let verdict = 'UNKNOWN'
      if (/FIX|需修正|NG/i.test(verdictRaw)) verdict = 'FIX'
      else if (/OK/i.test(verdictRaw)) verdict = 'OK'
      const issues = Array.isArray(obj.issues)
        ? obj.issues.filter(Boolean).join('；')
        : String(obj.issues || '').trim()
      return {
        verdict,
        issues: useless(issues) ? '' : issues,
        meaning: patch.meaning || '',
        example: patch.example || '',
        exampleMeaning: patch.exampleMeaning || '',
        pattern: patch.pattern || '',
        note: raw.slice(0, 800),
        hasPatch: Object.keys(patch).length > 0,
        patch,
      }
    } catch {
      /* fall through to line parser */
    }
  }

  const normalized = raw
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\r\n/g, '\n')

  const lineOf = (label) => {
    const re = new RegExp(`^\\s*${label}\\s*[：:]\\s*(.*)$`, 'im')
    const m = normalized.match(re)
    return m ? String(m[1] || '').trim() : ''
  }
  const verdictRaw = lineOf('結論')
  let verdict = 'UNKNOWN'
  if (/需修正|要修正|FIX|NG|錯誤/i.test(verdictRaw)) verdict = 'FIX'
  else if (/^OK|通過|正確|無誤/i.test(verdictRaw) || /結論\s*[：:]\s*OK/i.test(normalized))
    verdict = 'OK'

  const meaning = lineOf('建議字義') || lineOf('建議中文') || lineOf('建議意思')
  const example = lineOf('建議例句') || lineOf('建議日文例句')
  const exampleMeaning = lineOf('建議譯文') || lineOf('建議翻譯') || lineOf('建議例句中文')
  const pattern = lineOf('建議接續') || lineOf('建議句型')
  const issues = lineOf('問題')

  const useless = (v) =>
    !v ||
    v === '…' ||
    v === '...' ||
    v === '無' ||
    v === '同原文' ||
    v === '不變' ||
    v === '維持原樣' ||
    /^（?無）?$/.test(v)

  const patch = {}
  if (!useless(meaning)) patch.meaning = meaning
  if (!useless(example)) patch.example = example
  if (!useless(exampleMeaning)) patch.exampleMeaning = exampleMeaning
  if (!useless(pattern)) patch.pattern = pattern

  return {
    verdict,
    issues: useless(issues) ? '' : issues,
    meaning: patch.meaning || '',
    example: patch.example || '',
    exampleMeaning: patch.exampleMeaning || '',
    pattern: patch.pattern || '',
    note: raw.slice(0, 800),
    hasPatch: Object.keys(patch).length > 0,
    patch,
  }
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

async function callGeminiModel(model, key, prompt, signal, { useThinkingConfig = false } = {}) {
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

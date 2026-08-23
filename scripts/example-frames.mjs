/**
 * Shared example-sentence helpers for vocab postprocess.
 * Prefer natural frames; never emit bare「單字。」or raw「X/Yがあります」。
 */

/** Prefer the first writing when OpenJLPT gives 川/河 etc. */
export function primaryWriting(word = '') {
  const raw = String(word || '').trim()
  if (!raw) return raw
  return raw.split(/[/／]/)[0].replace(/\s+/g, '').trim() || raw
}

export function isWeakTemplateExample(example = '', word = '') {
  const ex = String(example || '').trim()
  if (!ex) return true
  if (/[/／]/.test(ex)) return true
  if (/^もう一度.+。$/.test(ex)) return true
  if (new RegExp(`^${escapeRe(word)}があります。$`).test(ex)) return true
  if (new RegExp(`^ここに${escapeRe(word)}があります。$`).test(ex)) return false
  if (/があります。$/.test(ex) && /[/／]/.test(word)) return true
  if (/^ここは.+です。$/.test(ex) && /[/／]/.test(ex)) return true
  return false
}

function escapeRe(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a study example from POS. `surface` should already be primaryWriting(word).
 */
export function buildFallbackExample(card, surface) {
  const w = surface || primaryWriting(card.word)
  const meaning = (card.meaning || '').split(/[；;]/)[0].trim() || '…'
  const pos = `${card.pos || ''} ${card.meaningEn || ''}`.toLowerCase()
  const en = (card.meaningEn || '').toLowerCase()

  if (w === '足' && card.reading === 'あし') {
    return { example: '右の足が痛いです。', exampleMeaning: '右腳痛。' }
  }
  if (w === '立てる') {
    return { example: '旗を立てます。', exampleMeaning: '把旗子豎起來。' }
  }
  if (w === '建てる') {
    return { example: '家を建てます。', exampleMeaning: '蓋房子。' }
  }
  if (w === '川' || w === '河') {
    return { example: '大きな川があります。', exampleMeaning: '有一條大河。' }
  }
  if (w === 'ちゃん' || w === 'くん' || w === 'さん' || /^suffix for familiar/i.test(en)) {
    return {
      example: `太郎${w}は学生です。`,
      exampleMeaning: '太郎（親暱／敬稱）是學生。',
    }
  }
  if (/noun, used as a suffix|used as a suffix/i.test(pos) && w.length <= 2) {
    return {
      example: `この${w}を見てください。`,
      exampleMeaning: `請看這個${meaning}。`,
    }
  }
  if (w === 'お互い' || card.reading === 'おたがい') {
    return {
      example: 'お互いに助け合います。',
      exampleMeaning: '彼此互相幫忙。',
    }
  }
  if (/i-adjective|い形容|keiyoushi/.test(pos) || (/い$/.test(w) && /adjective|形容/.test(pos))) {
    return {
      example: `とても${w}です。`,
      exampleMeaning: `非常${meaning}。`,
    }
  }
  if (/na-adjective|な形容|keiyodoshi/.test(pos)) {
    return {
      example: `${w}な人です。`,
      exampleMeaning: `是${meaning}的人。`,
    }
  }
  if (/adverb|副詞|fukushi/.test(pos)) {
    if (/ぜひ|つまり|きっと|やはり|やっぱり|たぶん/.test(w)) {
      return { example: `${w}行きます。`, exampleMeaning: `${meaning}會去。` }
    }
    if (/っと$|んと$|り$/.test(w) || /onomatopoeic|mimetic/i.test(pos)) {
      return { example: `${w}した。`, exampleMeaning: `${meaning}。` }
    }
    if (/じゃ|じゃあ|けれど/.test(w)) {
      return { example: `${w}、行きましょう。`, exampleMeaning: `${meaning}，我們走吧。` }
    }
    return {
      example: `${w}話してください。`,
      exampleMeaning: `請${meaning}地說。`,
    }
  }
  if (/suru verb/.test(pos) || /する$/.test(w)) {
    const base = w.replace(/する$/, '')
    return {
      example: `${base}します。`,
      exampleMeaning: `要${meaning}。`,
    }
  }
  // Verbs: dictionary form is OK inside「〜ことができます」
  if (en.startsWith('to ') || /verb|動詞/.test(pos)) {
    return {
      example: `${w}ことができます。`,
      exampleMeaning: `可以${meaning}。`,
    }
  }
  // Counters / units
  if (/キロ|グラム|メートル|円|歳|人|本|冊/.test(w)) {
    return {
      example: `${w}ください。`,
      exampleMeaning: `請給我${meaning}。`,
    }
  }
  // People / family-ish nouns
  if (/伯父|叔父|伯母|叔母|先輩|先生|友達|家族/.test(w)) {
    return {
      example: `私の${w}です。`,
      exampleMeaning: `是我的${meaning}。`,
    }
  }
  // Default noun
  return {
    example: `ここに${w}があります。`,
    exampleMeaning: `這裡有${meaning}。`,
  }
}

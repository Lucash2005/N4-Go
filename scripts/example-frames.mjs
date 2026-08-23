/**
 * Example sentence frames + OpenJLPT restore helpers.
 *
 * Source priority (highest first):
 *  1. vocab-overrides.json          → exampleSource: "override"
 *  2. OpenJLPT examples (CC BY-SA) → exampleSource: "openjlpt"
 *  3. Safe POS frames (limited)     → exampleSource: "template"
 *  4. None                          → exampleSource: "missing" (+ reviewFlags)
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeKey, isExampleValidForCard } from './vocab-shared.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPENJLPT_DIR = join(ROOT, 'data/openjlpt')

/** Prefer the first writing when OpenJLPT gives 川/河 etc. */
export function primaryWriting(word = '') {
  const raw = String(word || '').trim()
  if (!raw) return raw
  return raw.split(/[/／]/)[0].replace(/\s+/g, '').trim() || raw
}

function escapeRe(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Naive POS frames we previously generated — always rebuild these. */
export function isWeakTemplateExample(example = '', word = '') {
  const ex = String(example || '').trim()
  if (!ex) return true
  if (/[/／]/.test(ex)) return true
  if (/^もう一度.+。$/.test(ex)) return true
  if (/^ここに.+があります。$/.test(ex)) return true
  if (/ことができます。$/.test(ex)) return true
  if (new RegExp(`^${escapeRe(word)}があります。$`).test(ex)) return true
  if (/^とても.+です。$/.test(ex)) return true
  if (/^私の.+です。$/.test(ex) && /伯父|叔父|伯母|叔母|先輩/.test(ex)) return false
  return false
}

let openJlptCache = null

export function clearOpenJlptExampleCache() {
  openJlptCache = null
}

/** Load OpenJLPT example index: makeKey(word,reading) → { ja, en, alternatives } */
export function loadOpenJlptExamples() {
  if (openJlptCache) return openJlptCache
  const byKey = new Map()
  for (const level of ['n5', 'n4', 'n3']) {
    const path = join(OPENJLPT_DIR, `${level}.json`)
    if (!existsSync(path)) continue
    const items = JSON.parse(readFileSync(path, 'utf8'))
    for (const it of items) {
      const word = primaryWriting(it.word || '')
      if (!word || !it.examples?.length) continue
      const reading = (it.reading || '').trim() || word
      const examples = it.examples.filter((e) => e?.ja)
      if (!examples.length) continue
      const payload = { examples, level }
      const key = makeKey(word, reading)
      if (!byKey.has(key)) byKey.set(key, payload)
      // OpenJLPT often leaves reading empty — also index as word\0word
      const key2 = makeKey(word, word)
      if (!byKey.has(key2)) byKey.set(key2, payload)
    }
  }
  openJlptCache = { byKey }
  return openJlptCache
}

export function findOpenJlptExample(card) {
  // bust cache if module reloaded during script runs
  const { byKey } = loadOpenJlptExamples()
  const word = primaryWriting(card.word)
  const reading = (card.reading || '').trim() || word
  const entry =
    byKey.get(makeKey(word, reading)) ||
    byKey.get(makeKey(word, word)) ||
    null
  if (!entry?.examples?.length) return null

  for (const ex of entry.examples) {
    if (isExampleValidForCard(ex.ja, word, reading)) {
      return { ja: ex.ja, en: ex.en || '', level: entry.level }
    }
  }
  return null
}

/** Concrete / countable things where「ここに〜があります」is acceptable. */
const CONCRETE_NOUN =
  /いす|椅子|机|本|鞄|かばん|傘|かさ|お金|お菓子|お茶|お酒|お皿|バス|電車|車|自転車|電話|時計|写真|手紙|新聞|辞書|ペン|鉛筆|ノート|コップ|ちゃわん|靴|服|鍵|かぎ|荷物|荷物|地図|切符|カメラ|テレビ|ラジオ|ドア|窓|まど|花|はな|木|き|山|川|海|空|そら|駅|学校|病院|銀行|公園|店|みせ/

/**
 * Last-resort safe frames. Prefer returning null over unnatural sentences
 * like「ここに病気があります。」
 */
export function buildFallbackExample(card, surface) {
  const w = surface || primaryWriting(card.word)
  const meaning = (card.meaning || '').split(/[；;]/)[0].trim() || '…'
  const pos = `${card.pos || ''} ${card.meaningEn || ''}`.toLowerCase()
  const en = (card.meaningEn || '').toLowerCase()

  if (w === '足' && card.reading === 'あし') {
    return { example: '右の足が痛いです。', exampleMeaning: '右腳痛。', exampleSource: 'template' }
  }
  if (w === '立てる') {
    return { example: '旗を立てます。', exampleMeaning: '把旗子豎起來。', exampleSource: 'template' }
  }
  if (w === '建てる') {
    return { example: '家を建てます。', exampleMeaning: '蓋房子。', exampleSource: 'template' }
  }
  if (w === '川' || w === '河') {
    return { example: '大きな川があります。', exampleMeaning: '有一條大河。', exampleSource: 'template' }
  }
  if (w === 'ちゃん' || w === 'くん' || w === 'さん' || /^suffix for familiar/i.test(en)) {
    return {
      example: `太郎${w}は学生です。`,
      exampleMeaning: '太郎（親暱／敬稱）是學生。',
      exampleSource: 'template',
    }
  }
  if (w === 'お互い' || card.reading === 'おたがい') {
    return {
      example: 'お互いに助け合います。',
      exampleMeaning: '彼此互相幫忙。',
      exampleSource: 'template',
    }
  }
  if (/i-adjective|い形容|keiyoushi/.test(pos) || (/い$/.test(w) && /adjective|形容/.test(pos))) {
    return {
      example: `とても${w}です。`,
      exampleMeaning: `非常${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/na-adjective|な形容|keiyodoshi/.test(pos)) {
    return {
      example: `あの人は${w}です。`,
      exampleMeaning: `那個人很${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/adverb|副詞|fukushi/.test(pos)) {
    if (/ぜひ|つまり|きっと|やはり|やっぱり|たぶん/.test(w)) {
      return { example: `${w}行きます。`, exampleMeaning: `${meaning}會去。`, exampleSource: 'template' }
    }
    if (/っと$|んと$|り$/.test(w) || /onomatopoeic|mimetic/i.test(pos)) {
      return { example: `${w}した。`, exampleMeaning: `${meaning}。`, exampleSource: 'template' }
    }
    return null
  }
  if (/suru verb/.test(pos) || /する$/.test(w)) {
    const base = w.replace(/する$/, '')
    return {
      example: `毎日${base}します。`,
      exampleMeaning: `每天${meaning}。`,
      exampleSource: 'template',
    }
  }
  // Concrete physical objects only — never「ここに病気／都合があります」
  if (CONCRETE_NOUN.test(w)) {
    return {
      example: `ここに${w}があります。`,
      exampleMeaning: `這裡有${meaning}。`,
      exampleSource: 'template',
    }
  }
  if (/伯父|叔父|伯母|叔母|先輩|先生|友達|家族/.test(w)) {
    return {
      example: `私の${w}です。`,
      exampleMeaning: `是我的${meaning}。`,
      exampleSource: 'template',
    }
  }
  // Verbs / abstract nouns: do NOT invent a sentence
  return null
}

export const EXAMPLE_SOURCE_LABELS = {
  openjlpt: 'OpenJLPT',
  override: '手動校正',
  template: '安全模板',
  missing: '待補例句',
}

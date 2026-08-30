/**
 * Runtime vocabulary — loaded from /data/vocabulary.json (not bundled).
 */
import { CONTENT_VERSION } from './config'
import { loadJSON, saveJSON } from '../utils/storage'

const VOCAB_VERSION_KEY = 'vocab-loaded-version'

let vocabulary = []

export function getVocabulary() {
  return vocabulary
}

export function isVocabularyLoaded() {
  return vocabulary.length > 0
}

export function getLoadedVocabVersion() {
  return loadJSON(VOCAB_VERSION_KEY, 0)
}

export function hasPendingVocabUpdate() {
  return getLoadedVocabVersion() < CONTENT_VERSION
}

export function clearVocabularyCache() {
  vocabulary = []
}

export async function loadVocabulary({ force = false } = {}) {
  if (vocabulary.length && !force) return vocabulary
  if (force) vocabulary = []

  const base = import.meta.env.BASE_URL || './'
  const url = `${base}data/vocabulary.json?v=${CONTENT_VERSION}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`無法載入詞彙資料 (${res.status})`)
  }
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) {
    throw new Error('詞彙資料格式錯誤')
  }
  vocabulary = data
  saveJSON(VOCAB_VERSION_KEY, CONTENT_VERSION)
  return vocabulary
}

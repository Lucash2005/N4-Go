/**
 * Runtime vocabulary — loaded from /data/vocabulary.json (not bundled).
 */
let vocabulary = []

export function getVocabulary() {
  return vocabulary
}

export function isVocabularyLoaded() {
  return vocabulary.length > 0
}

export async function loadVocabulary() {
  if (vocabulary.length) return vocabulary
  const base = import.meta.env.BASE_URL || './'
  const url = `${base}data/vocabulary.json`
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`無法載入詞彙資料 (${res.status})`)
  }
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) {
    throw new Error('詞彙資料格式錯誤')
  }
  vocabulary = data
  return vocabulary
}

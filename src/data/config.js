export const EXAM_DATE = new Date('2026-12-06T09:00:00+09:00')

export const TARGETS = {
  vocabulary: 1500,
  grammar: 80,
}

/** Bump when Neural mp3s are regenerated so browsers don't keep stale clips. */
export const AUDIO_CACHE_VERSION = 19

/**
 * Bump when vocab/grammar content is fixed.
 * Reported-card hides persist until manually cleared; use Dashboard to load new vocab.
 */
export const CONTENT_VERSION = 22

export const DEFAULT_TASKS = [
  { id: 'vocab-15', label: '每日單字（落後時可手動加量）', done: false },
  { id: 'grammar-2', label: '活用 2 題＋文法 2 條（本月路線）', done: false },
  { id: 'listening-15', label: '聽力練習 15 分鐘', done: false },
  { id: 'review-10', label: 'SRS 到期複習（評分）', done: false },
]

/** Default target exam date — update as needed */
export const EXAM_DATE = new Date('2026-11-15T09:00:00+08:00')

export const TARGETS = {
  vocabulary: 800,
  reading: 40,
  listening: 40,
  speaking: 20,
  writing: 20,
}

export const DEFAULT_TASKS = [
  { id: 'vocab-20', label: '單字 SRS 20 張', done: false },
  { id: 'reading-1', label: '閱讀練習 1 篇', done: false },
  { id: 'listening-1', label: '聽力練習 1 題組', done: false },
  { id: 'speaking-or-writing', label: '口說或寫作 1 題', done: false },
]

export const DAILY_QUOTA = {
  vocab: 20,
  review: 15,
}

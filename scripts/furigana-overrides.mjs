// Regex-based furigana overrides applied after Kuroshiro conversion.
// Goal: reduce "memorize wrong reading" for known high-risk words.

export const FURIGANA_OVERRIDES = [
  // 茄子：兩種都正確（なす／なすび）；同時顯示避免使用者覺得「標錯」
  {
    pattern: /茄子\[(?:なす|なすび)\]/g,
    replace: '茄子[なす/なすび]',
  },
  // 下面幾筆是之前已修正過、屬於高風險誤標的固定覆寫
  { pattern: /大丈夫\[おっと\]/g, replace: '大丈夫[だいじょうぶ]' },
  { pattern: /卯\[う\]年\[ねん\]/g, replace: '卯年[うどし]' },
  { pattern: /散歩\[さんぽする\]/g, replace: '散歩[さんぽ]' },
  { pattern: /出\[しゅつ\]ろ/g, replace: '出[で]ろ' },
  { pattern: /出席\[しゅっせきする\]/g, replace: '出席[しゅっせき]' },
  { pattern: /大勢\[たいせい\]/g, replace: '大勢[おおぜい]' },
  { pattern: /一番乗\[いちばんの\]/g, replace: '一番[いちばん]乗[の]り' },
]

export function applyFuriganaOverrides(text) {
  let out = String(text ?? '')
  for (const rule of FURIGANA_OVERRIDES) {
    out = out.replace(rule.pattern, rule.replace)
  }
  return out
}


import { grammar } from './grammar'

/** Bump to rebuild today's plan after path changes. */
export const GRAMMAR_PATH_VERSION = 3

/**
 * Sequential N4 grammar unlocks through Dec 2026.
 * New cards only come from months ≤ current; earlier months are caught up first.
 */
export const GRAMMAR_MONTH_PATH = [
  {
    month: '2026-08',
    label: '8 月',
    title: 'て形・授受・義務',
    focus: '先會て形接續，再分清誰為誰做、必須／不必／禁止／可以。',
    howTo: '翻面前先改 3 個動詞的て形／ない形，再對照あげる／もらう／くれる。',
    ids: [
      'g073', // てください
      'g027', // てみる
      'g026', // ておく
      'g025', // てしまう
      'g055', // てから
      'g001', // てあげる
      'g002', // てもらう
      'g003', // てくれる
      'g031', // てほしい
      'g004', // なければならない
      'g005', // なくてもいい
      'g033', // てはいけない
      'g034', // てもいい
      'g006', // ほうがいい
      'g035', // ないで
      'g072', // てよかった
      'g028', // ていく
      'g029', // てくる
      'g030', // てある
      'g032', // なさい
      'g007', // つもり
      'g008', // 予定
      'g009', // そうだ樣態
      'g010', // そうだ傳聞
      'g074', // ませんか
      'g075', // ましょうか
      'g038', // ので
      'g054', // まえに
      'g053', // あとで
      'g070', // たことがある
      'g022', // すぎる
      'g023', // やすい／にくい
    ],
  },
  {
    month: '2026-09',
    label: '9 月',
    title: '樣態傳聞・條件時態',
    focus: '看懂「好像／聽說」與「如果／之後／明明卻」。',
    howTo: '每條先對照最容易混的那句（そうだ樣態／傳聞、ば／たら／と）。',
    ids: [
      'g011', // らしい
      'g012', // ようだ
      'g013', // かもしれない
      'g058', // みたいだ
      'g044', // はずだ
      'g014', // ば
      'g015', // たら
      'g016', // ても
      'g017', // のに
      'g051', // なら
      'g052', // と
      'g050', // 場合
      'g018', // ところだ
      'g019', // たばかり
      'g076', // によると
      'g069', // と言っていました
    ],
  },
  {
    month: '2026-10',
    label: '10 月',
    title: '目的決定・使役受身可能',
    focus: '為了／決定，以及讓人做、被做、能夠做。',
    howTo: '使役・受身・可能先分清「誰做動作」；ために／ように 先分意志與可能。',
    ids: [
      'g036', // ために
      'g037', // ように目的
      'g020', // ようにする
      'g021', // ようになる
      'g045', // ことになる
      'g046', // ことにする
      'g080', // ことにしている
      'g039', // ながら
      'g040', // たりたり
      'g041', // しし
      'g060', // させる
      'g061', // られる受身
      'g062', // られる可能
      'g047', // について
      'g048', // として
      'g079', // とおりに
    ],
  },
  {
    month: '2026-11',
    label: '11 月',
    title: '時間限定・刷題回補',
    focus: '期間／期限與「只有」，其餘時間用來刷題、少開全新句型。',
    howTo: 'まで／までに、間／間に 各寫一句自己的 deadline 與期間。',
    ids: [
      'g024', // 間に
      'g056', // 間
      'g057', // うちに
      'g049', // 中
      'g064', // まで
      'g065', // までに
      'g042', // だけ
      'g043', // しかない
    ],
  },
  {
    month: '2026-12',
    label: '12 月',
    title: '收尾・模考',
    focus: '只補最後幾條，其餘做模考與錯題。',
    howTo: '新句型點到即可；時間花在測驗與到期複習。',
    ids: [
      'g063', // かどうか
      'g066', // 方
      'g067', // がする
      'g068', // という
      'g071', // ることがある
      'g059', // たがる
      'g077', // おかげで
      'g078', // せいで
    ],
  },
]

const ALL_GRAMMAR_IDS = grammar.map((g) => g.id)

export function pathMonthKey(dateStr = '') {
  const ym = String(dateStr).slice(0, 7)
  if (!ym || ym < '2026-08') return '2026-08'
  if (ym > '2026-12') return '2026-12'
  return ym
}

export function getGrammarPath(dateStr = '') {
  const ym = pathMonthKey(dateStr)
  const afterPlan = String(dateStr).slice(0, 7) > '2026-12'
  const currentIndex = GRAMMAR_MONTH_PATH.findIndex((m) => m.month === ym)
  const idx = currentIndex < 0 ? 0 : currentIndex
  const current = GRAMMAR_MONTH_PATH[idx]
  const unlockedIds = afterPlan
    ? [...ALL_GRAMMAR_IDS]
    : GRAMMAR_MONTH_PATH.slice(0, idx + 1).flatMap((m) => m.ids)

  return {
    month: current.month,
    label: current.label,
    title: current.title,
    focus: current.focus,
    howTo: current.howTo,
    newIds: current.ids,
    unlockedIds,
    months: GRAMMAR_MONTH_PATH,
    currentIndex: idx,
  }
}

export function monthGrammarProgress(learnedIdSet, dateStr = '') {
  const path = getGrammarPath(dateStr)
  const learned = path.newIds.filter((id) => learnedIdSet.has(id)).length
  const nextIds = path.newIds.filter((id) => !learnedIdSet.has(id)).slice(0, 4)
  return {
    learned,
    total: path.newIds.length,
    nextIds,
    label: path.label,
    title: path.title,
    focus: path.focus,
    howTo: path.howTo,
    month: path.month,
  }
}

export function grammarUnlockRank(id, dateStr = '') {
  const ym = pathMonthKey(dateStr)
  const idx = GRAMMAR_MONTH_PATH.findIndex((m) => m.month === ym)
  const unlocked = GRAMMAR_MONTH_PATH.slice(0, Math.max(0, idx) + 1)
  for (let i = 0; i < unlocked.length; i += 1) {
    const pos = unlocked[i].ids.indexOf(id)
    if (pos >= 0) return i * 100 + pos
  }
  return 10_000
}

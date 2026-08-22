/**
 * 基礎加強題庫：易混句型、短文填空。
 * 獨立於每日 1500 字／80 文法進度，專補 N4 考前易錯點。
 */

/** @typedef {'confusable' | 'passage' | 'particle'} DrillKind */

/**
 * @typedef {{
 *   id: string,
 *   kind: DrillKind,
 *   theme: string,
 *   prompt?: string,
 *   passage?: string,
 *   options: string[],
 *   answer: number,
 *   explanation: string,
 *   memoryTip?: string,
 *   memoryCompare?: string,
 *   passageId?: string,
 *   blankLabel?: string,
 * }} DrillQuestion
 */

/** @type {DrillQuestion[]} */
export const drillQuestions = [
  // ── 讀解填空同型（JLPT 四格短文範例）──
  {
    id: 'drill-passage-travel-2',
    kind: 'passage',
    theme: 'てから／から',
    passageId: 'passage-travel',
    blankLabel: '2',
    passage:
      '私は先週、山田さんと北海道へ旅行に行きました。キムさんもいっしょに行きました。\n帰るとき、空港でチェックイン（　）、山田さんと買い物に行きました。\nお菓子やお酒などを買いました。荷物がとても重かったです（　）、大変でした。',
    prompt: '空欄 2 に入る最も適当なものを選んでください。',
    options: ['するから', 'しないから', 'してから', 'しなかったから'],
    answer: 2,
    explanation:
      'チェックインしてから、買い物に行きました＝辦完 check-in 之後才去買東西。\n\n❶ するから／❷ しないから／❹ しなかったから 都是「原因のから」（因為…），這裡要的是時間順序。\n\n口訣：Vてから＝做完 A 之後才 B；Vるから＝因為 A 所以 B。',
    memoryCompare: 'てから＝之後（順序）｜普通形から＝因為（原因）',
    memoryTip: '看到「先 A 再 B」→ 找 てから，不要选「から」結尾的因果項。',
  },
  {
    id: 'drill-passage-travel-3',
    kind: 'passage',
    theme: 'に／へ／を',
    passageId: 'passage-travel',
    blankLabel: '3',
    passage:
      '私は先週、山田さんと北海道へ旅行に行きました。キムさんもいっしょに行きました。\n帰るとき、空港でチェックインしてから、山田さんと買い物（　）行きました。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['を', 'に', 'で', 'へ'],
    answer: 1,
    explanation:
      '買い物に行く是固定搭配：「去進行購物這件事」用 に。\n\nを＝動詞受詞；へ＝去的地方（北海道へ）；で＝場所／手段。\n\n同篇第一行：旅行に行きました 也是「去做某件事」→ に。',
    memoryCompare: '場所へ行く｜活動・目的に行く（買い物に／旅行に／散歩に）',
    memoryTip: '「去逛街」死背：買い物に行く。',
  },
  {
    id: 'drill-passage-travel-1',
    kind: 'passage',
    theme: '助詞',
    passageId: 'passage-travel',
    blankLabel: '1',
    passage: 'キムさん（　）いっしょに行きました。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['が', 'を', 'も', 'に'],
    answer: 2,
    explanation: 'キムさんもいっしょに行きました＝金也一起去了。も表示「也」。',
    memoryTip: 'A も B ＝ A 也…（追加同類）',
  },
  {
    id: 'drill-passage-travel-4',
    kind: 'passage',
    theme: 'ので／から',
    passageId: 'passage-travel',
    blankLabel: '4',
    passage: '荷物がとても重かったです（　）、大変でした。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['ので', 'のに', 'ても', 'ながら'],
    answer: 0,
    explanation:
      '重かったので、大変でした＝因為行李很重，所以很辛苦。\n\nので＝客观原因；から 也可表原因但语气稍强。\n\nのに＝虽然…却；ても＝即使；ながら＝一边…一边。',
    memoryCompare: 'ので／から＝因為（原因→結果）｜のに＝明明…却',
  },

  // ── 易混句型：てから vs から ──
  {
    id: 'drill-te-kara-1',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\nご飯を食べ（　）、歯を磨きます。',
    options: ['るから', 'ないから', 'てから', 'たから'],
    answer: 2,
    explanation: '食べてから＝吃完之後才刷牙。時間順序 → Vてから。',
    memoryCompare: '食べてから（之後）｜お腹が空くから（因為肚子餓）',
    memoryTip: '「先吃再刷」→ てから。',
  },
  {
    id: 'drill-te-kara-2',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n今日は忙しい（　）、行けません。',
    options: ['てから', 'ので', 'から', 'したから'],
    answer: 2,
    explanation: '忙しいから、行けません＝因為忙，去不了。い形容詞普通形＋から表原因。',
    memoryTip: '原因・理由 → から／ので；順序 → てから。',
  },
  {
    id: 'drill-te-kara-3',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n手を洗っ（　）、ご飯を食べます。',
    options: ['たから', 'てから', 'ないから', 'するから'],
    answer: 1,
    explanation: '洗手之後吃飯 → 洗ってから（てから）。',
    memoryTip: '同一套：Vてから。',
  },

  // ── 易混：に vs へ ──
  {
    id: 'drill-ni-he-1',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n来週、京都（　）旅行に行きます。',
    options: ['を', 'に', 'へ', 'で'],
    answer: 2,
    explanation: '京都へ行く＝去京都這個地方 → へ（方向）。\n\n若整句是「京都へ旅行に行く」：へ＝地方、に＝目的活動。',
    memoryCompare: '京都へ（地方）｜旅行に（目的）',
  },
  {
    id: 'drill-ni-he-2',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n友達と映画（　）行きました。',
    options: ['へ', 'を', 'に', 'が'],
    answer: 2,
    explanation: '映画に行く＝去看電影（目的活動）→ に。',
    memoryTip: '映画に／買い物に／散歩に／旅行に',
  },
  {
    id: 'drill-ni-he-3',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n学校（　）行きます。',
    options: ['に', 'へ', 'を', 'で'],
    answer: 1,
    explanation: '学校へ行く＝去學校（方向／目的地）。に 也可但 N4 填空常考へ＋地方名。',
    memoryCompare: '学校へ＝去學校｜学校で＝在學校（動作場所）',
  },

  // ── の前に／の後で ──
  {
    id: 'drill-mae-1',
    kind: 'confusable',
    theme: 'の前に／てから',
    prompt: '空欄に入る最も適当なものを選んでください。\n出発（　）、トイレに行きました。',
    options: ['の前に', 'の後で', 'してから', 'するから'],
    answer: 0,
    explanation: '出発の前に＝出發之前。名詞＋の前に。',
    memoryCompare: 'の前に＝在…之前｜てから＝做完動詞之後',
  },
  {
    id: 'drill-mae-2',
    kind: 'confusable',
    theme: 'の前に／てから',
    prompt: '空欄に入る最も適当なものを選んでください。\nチェックイン（　）、お土産を買いました。',
    options: ['するから', 'してから', 'の前に', 'しないから'],
    answer: 2,
    explanation:
      'チェックインの前に＝check-in 之前買土產。名詞＋の前に。\n\n若選してから則是 check-in 之後買——依選項與文意判斷；此題正解の前に。',
    memoryTip: '名詞＋の前に｜動詞てから——先認詞性。',
  },

  // ── なくてもいい／なければならない ──
  {
    id: 'drill-duty-1',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\n明日は会社へ行か（　）いいです。',
    options: ['なくても', 'なければ', 'ないで', 'ないと'],
    answer: 0,
    explanation: '行かなくてもいい＝不去也可以。把 ない 整個換成 なくてもいい。',
    memoryCompare: '行かなくてもいい（不必）｜行かなければならない（必須）',
  },
  {
    id: 'drill-duty-2',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\n毎日、野菜を食べ（　）なりません。',
    options: ['なくても', 'なければ', 'ないで', 'ないと'],
    answer: 1,
    explanation: '食べなければなりません＝必須吃。ない形去掉い＋ければならない。',
    memoryTip: '必須→なければならない；不必→なくてもいい。',
  },

  // ── 授受 ──
  {
    id: 'drill-juyo-1',
    kind: 'confusable',
    theme: '授受',
    prompt: '空欄に入る最も適当なものを選んでください。\n友達に本を貸して（　）。',
    options: ['あげました', 'もらいました', 'くれました', 'しまいました'],
    answer: 0,
    explanation: '我借給朋友 → てあげる。',
    memoryCompare: 'てあげる（我為對方做）｜てもらう（請對方為我做）｜てくれる（對方為我做）',
  },

  // ── 讀解填空：日常短文 ──
  {
    id: 'drill-passage-run-1',
    kind: 'passage',
    theme: 'てから',
    passageId: 'passage-daily',
    prompt: '空欄に入る最も適当なものを選んでください。',
    passage:
      '田中さんは毎朝六時に起きます。それから公園で二キロ走ります。走っ（　）、会社へ行きます。',
    options: ['るから', 'てから', 'たから', 'ないから'],
    answer: 1,
    explanation: '跑完之後去公司 → 走ってから。',
    memoryTip: '早起→跑步→去公司：順序用 てから。',
  },
]

export const DRILL_BY_ID = Object.fromEntries(drillQuestions.map((q) => [q.id, q]))

export const DRILL_BANK_SIZE = drillQuestions.length

export function drillBankSummary() {
  const byKind = { confusable: 0, passage: 0, particle: 0 }
  for (const q of drillQuestions) {
    byKind[q.kind] = (byKind[q.kind] || 0) + 1
  }
  return { total: drillQuestions.length, byKind }
}

/** 依句型主題篩選（非依某一篇短文） */
export const DRILL_THEMES = [
  { id: 'all', label: '全部混合' },
  { id: 'te-kara', label: 'てから／から' },
  { id: 'ni-he', label: 'に／へ' },
  { id: 'duty', label: '必須／不必' },
  { id: 'juyo', label: '授受' },
]

export function filterDrillQuestions({ kind, theme, ids }) {
  let pool = drillQuestions
  if (kind && kind !== 'all') pool = pool.filter((q) => q.kind === kind)
  if (theme && theme !== 'all') {
    if (theme === 'te-kara') {
      pool = pool.filter((q) => q.theme.includes('てから') || q.theme.includes('から'))
    } else if (theme === 'ni-he') {
      pool = pool.filter((q) => q.theme.includes('に'))
    } else if (theme === 'duty') {
      pool = pool.filter((q) => q.theme.includes('義務'))
    } else if (theme === 'juyo') {
      pool = pool.filter((q) => q.theme.includes('授受'))
    }
  }
  if (ids?.length) {
    const set = new Set(ids)
    pool = pool.filter((q) => set.has(q.id))
  }
  return pool
}

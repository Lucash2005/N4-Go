/** 從現在到 2026 年 12 月 JLPT 的階段性準備時程 */

export const schedulePhases = [
  {
    id: 'phase-1',
    title: 'て形・授受・義務打底',
    period: '8 月',
    monthRange: '2026-08',
    color: 'sea',
    goal: '先會て形／ない形接續，再分清誰為誰做、必須與許可。月底約 32 條文法。',
    weeks: [
      {
        label: '第 1–2 週',
        focus: 'て形接續・授受・義務',
        tasks: [
          '先改 行く／食べる／する 的て形與ない形',
          '學完 てあげる／てくれる／てもらう',
          '必須／不必／禁止／可以：なければならない、なくてもいい、てはいけない、てもいい',
        ],
      },
      {
        label: '第 3–4 週',
        focus: 'て形延伸・開始意志傳聞',
        tasks: [
          'てみる／ておく／てしまう／てから',
          'つもり／予定、そうだ（樣態／傳聞）',
          '每天 2 條本月文法＋15 單字，例句跟讀 2 次',
        ],
      },
    ],
  },
  {
    id: 'phase-2',
    title: '看懂句子＋單字加速',
    period: '9 月〜10 月',
    monthRange: '2026-09 ~ 2026-10',
    color: 'coral',
    goal: '9 月條件與傳聞，10 月目的／使役受身；單字同步累積到 1000。',
    weeks: [
      {
        label: '9 月前半',
        focus: '樣態・傳聞・推測',
        tasks: ['らしい／ようだ／みたいだ／はずだ', 'そうだ樣態與傳聞分開記', '每日單字 15＋到期複習'],
      },
      {
        label: '9 月後半',
        focus: '條件・逆接・時態',
        tasks: ['ば／たら／と／なら／ても', 'のに、たばかり、ところだ', '週末做文法測驗'],
      },
      {
        label: '10 月前半',
        focus: '目的・決定・並列',
        tasks: ['ために／ように', 'ことにする／ことになる', 'ながら／たり／し'],
      },
      {
        label: '10 月後半',
        focus: '使役・受身・可能',
        tasks: ['先分清誰做動作', 'させる／られる（受身）／可能形', '單字衝刺並清 SRS'],
      },
    ],
  },
  {
    id: 'phase-3',
    title: '時間限定＋題庫刷題',
    period: '11 月',
    monthRange: '2026-11',
    color: 'sand',
    goal: '只補期間／期限／限定等少量新句型，其餘刷題找弱點。',
    weeks: [
      {
        label: '第 13–14 週',
        focus: '時間・限定',
        tasks: ['間／間に、まで／までに、だけ／しか〜ない', '每天 1 套測驗', '錯題進 SRS'],
      },
      {
        label: '第 15–16 週',
        focus: '讀解＋聽解節奏',
        tasks: ['閱讀計時練習', '聽力影子跟讀', '週末綜合小考'],
      },
    ],
  },
  {
    id: 'phase-4',
    title: '模擬試題衝刺',
    period: '12 月初〜考前',
    monthRange: '2026-12',
    color: 'sea-deep',
    goal: '幾乎不開新文法，完整模考調整節奏。',
    weeks: [
      {
        label: '考前 2 週',
        focus: '全真模擬',
        tasks: ['每週 1–2 次完整模考', '只補最後幾條收尾文法', '錯題快速回顧'],
      },
      {
        label: '考前 3 天',
        focus: '輕量複習',
        tasks: ['只複習到期與標記項', '瀏覽本月收尾清單', '準備准考證與路線'],
      },
    ],
  },
]

export const monthlyMilestones = [
  {
    month: '2026-08',
    label: '8 月',
    target: '文法基礎 40%',
    detail: 'て形接續、授受、義務／許可；再開始つもり／そうだ',
    vocabTarget: 300,
    grammarTarget: 32,
    quizRateTarget: null,
  },
  {
    month: '2026-09',
    label: '9 月',
    target: '單字 600／文法 60%',
    detail: '樣態傳聞與條件時態；單字與聽力穩定每日',
    vocabTarget: 600,
    grammarTarget: 48,
    quizRateTarget: 55,
  },
  {
    month: '2026-10',
    label: '10 月',
    target: '單字 1000／文法 80%',
    detail: '目的／決定與使役受身可能；單字到 1000',
    vocabTarget: 1000,
    grammarTarget: 64,
    quizRateTarget: 65,
  },
  {
    month: '2026-11',
    label: '11 月',
    target: '題庫正確率 70%+',
    detail: '補時間／限定句型，其餘刷題找弱點',
    vocabTarget: 1300,
    grammarTarget: 72,
    quizRateTarget: 70,
  },
  {
    month: '2026-12',
    label: '12 月',
    target: '模考穩定合格線',
    detail: '幾乎不開新文法，模擬測驗與錯題',
    vocabTarget: 1500,
    grammarTarget: 80,
    quizRateTarget: 75,
  },
]

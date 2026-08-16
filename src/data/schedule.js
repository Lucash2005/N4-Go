/** 從現在到 2026 年 12 月 JLPT 的階段性準備時程 */

export const schedulePhases = [
  {
    id: 'phase-1',
    title: '基礎文法打底',
    period: '8 月〜9 月中',
    monthRange: '2026-08 ~ 2026-09',
    color: 'sea',
    goal: '把 N4 核心文法句型建立起來，能看懂基本句構。',
    weeks: [
      {
        label: '第 1–2 週',
        focus: '授受表現・義務・建議',
        tasks: ['複習て形／ない形', '學完 〜てあげる／もらう／くれる', '每天 15 單字'],
      },
      {
        label: '第 3–4 週',
        focus: '意志・樣態・傳聞',
        tasks: ['つもり／予定', 'そうだ（樣態／傳聞）', '做 20 題文法選擇'],
      },
      {
        label: '第 5–6 週',
        focus: '條件・逆接・時態',
        tasks: ['ば／たら／ても／のに', 'ところだ／たばかり', '聽力日常會話 15 分'],
      },
    ],
  },
  {
    id: 'phase-2',
    title: '單字累積加速',
    period: '9 月中〜10 月底',
    monthRange: '2026-09 ~ 2026-10',
    color: 'coral',
    goal: '單字量衝刺到 1000+，熟悉常見讀音與搭配。',
    weeks: [
      {
        label: '第 7–8 週',
        focus: '生活・場所・自然單字',
        tasks: ['每日 20 單字＋複習', '用卡片標記需複習項', '聽寫練習 10 分'],
      },
      {
        label: '第 9–10 週',
        focus: '動詞・副詞・形容詞',
        tasks: ['動詞變化快速複習', '副詞搭配句練習', '閱讀短文 3 篇'],
      },
      {
        label: '第 11–12 週',
        focus: '敬語基礎與易混字',
        tasks: ['謙讓語常見詞', '易混漢字對照', '單字小考每週 2 次'],
      },
    ],
  },
  {
    id: 'phase-3',
    title: '題庫刷題',
    period: '11 月',
    monthRange: '2026-11',
    color: 'sand',
    goal: '用真題型熟悉出題模式，找出弱點並回補。',
    weeks: [
      {
        label: '第 13–14 週',
        focus: '文字語彙＋文法',
        tasks: ['每天 1 套選擇題', '錯題本整理', '弱勢文法再背'],
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
    goal: '完整模考調整節奏，維持手感並穩定心態。',
    weeks: [
      {
        label: '考前 2 週',
        focus: '全真模擬',
        tasks: ['每週 1–2 次完整模考', '錯題快速回顧', '睡眠與作息調整'],
      },
      {
        label: '考前 3 天',
        focus: '輕量複習',
        tasks: ['只複習標記項', '瀏覽高頻文法清單', '準備准考證與路線'],
      },
    ],
  },
]

export const monthlyMilestones = [
  {
    month: '2026-08',
    label: '8 月',
    target: '文法基礎 40%',
    detail: '打好て形、授受、義務句型',
    vocabTarget: 300,
    grammarTarget: 32,
    quizRateTarget: null,
  },
  {
    month: '2026-09',
    label: '9 月',
    target: '單字 600／文法 60%',
    detail: '開始穩定每日單字與聽力',
    vocabTarget: 600,
    grammarTarget: 48,
    quizRateTarget: 55,
  },
  {
    month: '2026-10',
    label: '10 月',
    target: '單字 1000／文法 80%',
    detail: '完成 N4 文法主軸，擴充單字',
    vocabTarget: 1000,
    grammarTarget: 64,
    quizRateTarget: 65,
  },
  {
    month: '2026-11',
    label: '11 月',
    target: '題庫正確率 70%+',
    detail: '刷題找弱點並回補',
    vocabTarget: 1300,
    grammarTarget: 72,
    quizRateTarget: 70,
  },
  {
    month: '2026-12',
    label: '12 月',
    target: '模考穩定合格線',
    detail: '模擬測驗與心態調整',
    vocabTarget: 1500,
    grammarTarget: 80,
    quizRateTarget: 75,
  },
]

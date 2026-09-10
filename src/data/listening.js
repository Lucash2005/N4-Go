/**
 * Listening practice bank (N4-style).
 * Audio: prefer `audioUrl` if present; otherwise speak `script` via Web Speech.
 */

/**
 * @typedef {{
 *   id: string,
 *   type: 'task_comprehension'|'point_comprehension'|'utterance_response',
 *   question: string,
 *   script: string,
 *   options: string[],
 *   answer: number,
 *   explanation: string,
 *   audioUrl?: string,
 *   imageUrl?: string,
 *   level?: string,
 * }} ListeningItem
 */

/** @type {ListeningItem[]} */
export const listeningItems = [
  {
    id: 'listen_01',
    type: 'task_comprehension',
    question: '男の人と女の人が話しています。男の人はこの後、まず何をしますか。',
    script:
      '女：すみません、この資料、コピーをお願いできますか。\n男：はい。何部ですか。\n女：まず三部お願いします。そのあと、会議室に持ってきてください。\n男：わかりました。',
    options: ['資料をコピーする', '会議室を掃除する', '電話をかける', '弁当を買う'],
    answer: 0,
    explanation: '女の人が「まず三部」コピーするよう頼んでいる。',
    level: 'N4',
  },
  {
    id: 'listen_02',
    type: 'point_comprehension',
    question: '女の人は何時に駅へ行きますか。',
    script:
      '男：明日の映画、何時に行く？\n女：映画は一時からです。でも駅で友達と会うから、十二時半に駅へ行きます。\n男：じゃあ、僕も十二時半に行くよ。',
    options: ['一時', '十二時', '十二時半', '二時'],
    answer: 2,
    explanation: '女の人は「十二時半に駅へ行きます」と言っている。',
    level: 'N4',
  },
  {
    id: 'listen_03',
    type: 'task_comprehension',
    question: '男の人はこれから何をしますか。',
    script:
      '女：雨が降ってきたね。傘、持ってる？\n男：あ、持ってない。コンビニで買ってくる。\n女：じゃあ、ここで待ってるね。',
    options: ['家へ帰る', 'コンビニで傘を買う', 'タクシーを呼ぶ', '女の人の傘を借りる'],
    answer: 1,
    explanation: '男の人は「コンビニで買ってくる」と言っている。',
    level: 'N4',
  },
  {
    id: 'listen_04',
    type: 'point_comprehension',
    question: '図書館は何時まで開いていますか。',
    script:
      '男：すみません、図書館は何時までですか。\n女：平日は午後八時までです。土曜日は六時まで、日曜日は休みです。\n男：今日は火曜日ですね。じゃ、八時までですね。',
    options: ['六時まで', '八時まで', '休み', '五時まで'],
    answer: 1,
    explanation: '今日は火曜日（平日）なので午後八時まで。',
    level: 'N4',
  },
  {
    id: 'listen_05',
    type: 'utterance_response',
    question: '正しい返事を選んでください。\n「手伝いましょうか。」',
    script: '男：荷物、多いですね。手伝いましょうか。',
    options: ['いいえ、けっこうです', 'はい、そうです', 'どういたしまして', 'おめでとうございます'],
    answer: 0,
    explanation: '申し出への丁寧な断りは「いいえ、けっこうです」。',
    level: 'N4',
  },
  {
    id: 'listen_06',
    type: 'task_comprehension',
    question: '女の人はこの後、何をしますか。',
    script:
      '男：会議室の予約、できた？\n女：まだです。今から電話します。\n男：じゃあ、お願い。三時からね。',
    options: ['会議室を片付ける', '電話で予約する', '三時に会議を始める', '資料をコピーする'],
    answer: 1,
    explanation: '女の人は「今から電話します」と言っている。',
    level: 'N4',
  },
  {
    id: 'listen_07',
    type: 'point_comprehension',
    question: 'パーティーはどこで行いますか。',
    script:
      '女：土曜日のパーティー、公園でするの？\n男：雨なら公民館だよ。晴れなら公園。天気予報は晴れだって。\n女：よかった。じゃ、公園だね。',
    options: ['公民館', '公園', '学校', 'レストラン'],
    answer: 1,
    explanation: '晴れの予報なので公園。',
    level: 'N4',
  },
  {
    id: 'listen_08',
    type: 'task_comprehension',
    question: '男の人はまず何をしますか。',
    script:
      '女：お皿を洗ってから、ゴミを出してね。\n男：わかった。先に洗うよ。\n女：ありがとう。',
    options: ['ゴミを出す', 'お皿を洗う', '料理を作る', '買い物へ行く'],
    answer: 1,
    explanation: '「先に洗う」＝先洗碗。',
    level: 'N4',
  },
]

export const LISTENING_TYPE_LABELS = {
  task_comprehension: '課題理解',
  point_comprehension: 'ポイント理解',
  utterance_response: '発話表現',
}

export function getListeningById(id) {
  return listeningItems.find((x) => x.id === id) || null
}

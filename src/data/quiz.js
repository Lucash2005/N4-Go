import { GRAMMAR_MEMORY } from './memory'

/** @typedef {{ id: string, type: 'vocab'|'grammar'|'reading', prompt: string, passage?: string, options: string[], answer: number, explanation: string, grammarId?: string, vocabId?: string }} QuizQuestion */

/** @type {QuizQuestion[]} */
export const quizQuestions = [
  {
    id: 'q001',
    type: 'vocab',
    prompt: '空欄に入る最も適当な言葉を選んでください。\n会議の（　）を変更してください。',
    options: ['予定', '景色', '気温', '親切'],
    answer: 0,
    explanation: '「予定」表示「預定／行程」。會議行程變更用「予定を変更する」。',
  },
  {
    id: 'q002',
    type: 'vocab',
    prompt: '「けいけん」の漢字はどれですか。',
    options: ['経験', '計画', '警戒', '軽減'],
    answer: 0,
    explanation: '「けいけん」的漢字是「経験」，意思是經驗。',
  },
  {
    id: 'q003',
    type: 'vocab',
    prompt: '空欄に入る言葉を選んでください。\n駅の近くに（　）があります。',
    options: ['駐車場', '試合', '返事', '成功'],
    answer: 0,
    explanation: '「駐車場（ちゅうしゃじょう）」是停車場，常出現在場所相關題。',
  },
  {
    id: 'q004',
    type: 'vocab',
    prompt: '「必ず」の読み方はどれですか。',
    options: ['かならず', 'きっと', 'ぜひ', 'ぜひとも'],
    answer: 0,
    explanation: '「必ず」讀作「かならず」，表示「一定」。',
  },
  {
    id: 'q005',
    type: 'vocab',
    prompt: '空欄に入る最も適当な言葉を選んでください。\n彼はとても（　）な人です。',
    options: ['親切', '交差点', '連絡', '十分'],
    answer: 0,
    explanation: '形容人的性格用「親切な人」。',
  },
  {
    id: 'q006',
    type: 'grammar',
    grammarId: 'g001',
    prompt: '空欄に入る最も適当なものを選んでください。\n友達に本を貸して（　）。',
    options: ['あげました', 'もらいました', 'くれました', 'しまいました'],
    answer: 0,
    explanation: '說話者為朋友做某事用「〜てあげる」。',
  },
  {
    id: 'q007',
    type: 'grammar',
    grammarId: 'g002',
    prompt: '空欄に入る最も適当なものを選んでください。\n先生に作文を直して（　）。',
    options: ['もらいました', 'あげました', 'やりました', 'しました'],
    answer: 0,
    explanation: '請對方為自己做事用「〜てもらう」。',
  },
  {
    id: 'q008',
    type: 'grammar',
    grammarId: 'g005',
    prompt: '空欄に入る最も適当なものを選んでください。\n明日は会社へ行かなくても（　）。',
    options: ['いいです', 'なりません', 'だめです', 'ほしいです'],
    answer: 0,
    explanation: '「〜なくてもいい」表示「不必…也可以」。',
  },
  {
    id: 'q009',
    type: 'grammar',
    grammarId: 'g006',
    prompt: '空欄に入る最も適当なものを選んでください。\nもっと野菜を食べた（　）いいです。',
    options: ['ほうが', 'つもりが', '予定が', 'ところ'],
    answer: 0,
    explanation: '「〜たほうがいい」是建議「最好…」。',
  },
  {
    id: 'q010',
    type: 'grammar',
    grammarId: 'g007',
    prompt: '空欄に入る最も適当なものを選んでください。\n来年日本へ留学する（　）です。',
    options: ['つもり', 'すぎ', 'ばかり', 'らしい'],
    answer: 0,
    explanation: '「〜つもりだ」表示主觀打算。',
  },
  {
    id: 'q011',
    type: 'grammar',
    grammarId: 'g009',
    prompt: '空欄に入る最も適当なものを選んでください。\nこのケーキはおいし（　）。',
    options: ['そうです', 'らしいです', 'かもしれません', 'ばかりです'],
    answer: 0,
    explanation: '樣態「〜そうだ」接在い形容詞語幹後，表示「看起來…」。',
  },
  {
    id: 'q012',
    type: 'grammar',
    grammarId: 'g015',
    prompt: '空欄に入る最も適当なものを選んでください。\n雨が降っ（　）、家にいます。',
    options: ['たら', 'ても', 'のに', 'ば'],
    answer: 0,
    explanation: '「〜たら」可表示假設條件「如果…的話」。',
  },
  {
    id: 'q013',
    type: 'grammar',
    grammarId: 'g017',
    prompt: '空欄に入る最も適当なものを選んでください。\n勉強した（　）、試験に落ちました。',
    options: ['のに', 'たら', 'ても', 'ば'],
    answer: 0,
    explanation: '「〜のに」表示「明明…卻」，帶遺憾語氣。',
  },
  {
    id: 'q014',
    type: 'grammar',
    grammarId: 'g019',
    prompt: '空欄に入る最も適当なものを選んでください。\n日本に来た（　）です。',
    options: ['ばかり', 'すぎ', 'つもり', 'そう'],
    answer: 0,
    explanation: '「〜たばかり」表示「剛剛…」。',
  },
  {
    id: 'q015',
    type: 'reading',
    prompt: 'この文の内容と合っているものを選んでください。',
    passage:
      '山田さんは来月から大阪で働きます。今、アパートを探しています。駅から近いところがいいそうです。',
    options: [
      '山田さんは今大阪で働いている',
      '山田さんは駅から近いアパートを探している',
      '山田さんは来月アパートを探す',
      '山田さんは駅から遠いところがいい',
    ],
    answer: 1,
    explanation: '文中說他正在找公寓，且希望靠近車站，因此第二項正確。',
  },
  {
    id: 'q016',
    type: 'reading',
    prompt: 'この文の内容と合っているものを選んでください。',
    passage:
      '明日は雨が降るそうです。運動会は来週に延期になりました。子どもたちは少しがっかりしています。',
    options: [
      '運動会は明日行われる',
      '運動会は来週に延期された',
      '子どもたちは喜んでいる',
      '明日は晴れそうだ',
    ],
    answer: 1,
    explanation: '「延期になりました」表示運動會延到下週。',
  },
  {
    id: 'q017',
    type: 'reading',
    prompt: 'この文の内容と合っているものを選んでください。',
    passage:
      '私は毎日日本語を勉強しています。特に漢字が難しいですが、諦めずに続けています。来年の N4 に合格したいです。',
    options: [
      '話者は漢字が簡単だと思っている',
      '話者は勉強をやめた',
      '話者は来年 N4 に合格したい',
      '話者は週に一度だけ勉強する',
    ],
    answer: 2,
    explanation: '最後一句明確寫出「来年の N4 に合格したいです」。',
  },
  {
    id: 'q018',
    type: 'vocab',
    prompt: '空欄に入る最も適当な言葉を選んでください。\n足元に（　）してください。',
    options: ['注意', '説明', '計画', '意見'],
    answer: 0,
    explanation: '「注意する」表示「注意」，常見於警示標語。',
  },
  {
    id: 'q019',
    type: 'grammar',
    grammarId: 'g021',
    prompt: '空欄に入る最も適当なものを選んでください。\n日本語が話せる（　）なりました。',
    options: ['ように', 'ために', 'ことに', 'までに'],
    answer: 0,
    explanation: '「〜ようになる」表示能力或狀態變化「變得能夠…」。',
  },
  {
    id: 'q020',
    type: 'grammar',
    grammarId: 'g022',
    prompt: '空欄に入る最も適当なものを選んでください。\n食べ（　）ました。お腹が痛いです。',
    options: ['すぎ', 'やす', 'にく', 'そう'],
    answer: 0,
    explanation: '「食べすぎる」表示「吃太多」。',
  },
  {
    id: 'q021',
    type: 'grammar',
    grammarId: 'g004',
    prompt: '空欄に入る最も適当なものを選んでください。\n明日は早く起き（　）。',
    options: ['なければなりません', 'なくてもいいです', 'たほうがいいです', 'つもりです'],
    answer: 0,
    explanation:
      '「〜なければならない」＝義務／必須。對照：なくてもいい＝不必；ほうがいい＝建議。',
  },
  {
    id: 'q022',
    type: 'grammar',
    grammarId: 'g004',
    prompt: '「行く」を「〜なければならない」の形にすると正しいのはどれですか。',
    options: [
      '行かなければならない',
      '行きなければならない',
      '行くなければならない',
      '行ったなければならない',
    ],
    answer: 0,
    explanation:
      '步驟：行く→行かない（ない形）→去掉い→行かなけれ＋ばならない＝行かなければならない。',
  },
  {
    id: 'q023',
    type: 'grammar',
    grammarId: 'g004',
    prompt: '次の文の意味に合うものを選んでください。\nパスポートを持っていかなければなりません。',
    options: ['必須帶護照去', '不必帶護照去', '最好帶護照去', '打算帶護照去'],
    answer: 0,
    explanation: 'なければならない＝「不…就不行」＝必須。口語常說「持っていかなきゃ」。',
  },
]

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Shuffle option order and remap the correct answer index. */
export function withShuffledOptions(question) {
  const indexed = question.options.map((text, index) => ({ text, index }))
  const shuffled = shuffle(indexed)
  return {
    ...question,
    options: shuffled.map((item) => item.text),
    answer: shuffled.findIndex((item) => item.index === question.answer),
  }
}

function enrichQuestion(question) {
  if (question.grammarId && GRAMMAR_MEMORY[question.grammarId]) {
    const m = GRAMMAR_MEMORY[question.grammarId]
    return {
      ...question,
      memoryUseWhen: m.useWhen,
      memoryForm: m.form,
      memoryCompare: m.compare,
      memoryTip: m.tip,
    }
  }
  return question
}

export function pickQuiz(count = 10, type = 'all') {
  const pool =
    type === 'all' ? quizQuestions : quizQuestions.filter((q) => q.type === type)
  // Fresh entropy every call so reload / retake never repeats the same order
  const entropy = `${Date.now()}-${Math.random()}`
  const ordered = shuffle(pool).map((q, i) => ({
    q,
    key: `${entropy}:${i}:${Math.random()}`,
  }))
  ordered.sort((a, b) => (a.key < b.key ? -1 : 1))
  return ordered
    .slice(0, Math.min(count, pool.length))
    .map((item) => withShuffledOptions(enrichQuestion(item.q)))
}

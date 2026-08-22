/** 動詞活用練習。不佔 80 條文法額度，每日插入 2 張。 */

const FORM_SENTENCES = {
  f001: {
    example: '早く食べてください。',
    exampleFurigana: '早[はや]く食[た]べてください。',
    exampleMeaning: '請快點吃。',
  },
  f002: {
    example: '映画を見てください。',
    exampleFurigana: '映画[えいが]を見[み]てください。',
    exampleMeaning: '請看電影。',
  },
  f003: {
    example: '7時に起きてください。',
    exampleFurigana: '7時[しちじ]に起[お]きてください。',
    exampleMeaning: '請七點起床。',
  },
  f004: {
    example: '駅前で買ってください。',
    exampleFurigana: '駅前[えきまえ]で買[か]ってください。',
    exampleMeaning: '請在車站前購買。',
  },
  f005: {
    example: 'ここで待ってください。',
    exampleFurigana: 'ここで待[ま]ってください。',
    exampleMeaning: '請在這裡等。',
  },
  f006: {
    example: '荷物を取ってください。',
    exampleFurigana: '荷物[にもつ]を取[と]ってください。',
    exampleMeaning: '請拿行李。',
  },
  f007: {
    example: '本を読んでください。',
    exampleFurigana: '本[ほん]を読[よ]んでください。',
    exampleMeaning: '請讀書。',
  },
  f008: {
    example: '信号を守ってください。',
    exampleFurigana: '信号[しんごう]を守[まも]ってください。',
    exampleMeaning: '請遵守號誌。',
  },
  f009: {
    example: '公園で遊んでください。',
    exampleFurigana: '公園[こうえん]で遊[あそ]んでください。',
    exampleMeaning: '請在公園玩。',
  },
  f010: {
    example: '名前を書いてください。',
    exampleFurigana: '名前[なまえ]を書[か]いてください。',
    exampleMeaning: '請寫名字。',
  },
  f011: {
    example: '急いでください。',
    exampleFurigana: '急[いそ]いでください。',
    exampleMeaning: '請快一點。',
  },
  f012: {
    example: '日本語で話してください。',
    exampleFurigana: '日本語[にほんご]で話[はな]してください。',
    exampleMeaning: '請用日語說話。',
  },
  f013: {
    example: '早く来てください。',
    exampleFurigana: '早[はや]く来[き]てください。',
    exampleMeaning: '請快來。',
  },
  f014: {
    example: '宿題をしてください。',
    exampleFurigana: '宿題[しゅくだい]をしてください。',
    exampleMeaning: '請做作業。',
  },
  f015: {
    example: '学校へ行ってください。',
    exampleFurigana: '学校[がっこう]へ行[い]ってください。',
    exampleMeaning: '請去學校。',
  },
  f016: {
    example: '今日は肉を食べない。',
    exampleFurigana: '今日[きょう]は肉[にく]を食[た]べない。',
    exampleMeaning: '今天不吃肉。',
    exampleUsage: '食べない＝「不吃」。後面可接 なければならない → 食べなければならない（必須吃）。',
  },
  f017: {
    example: '今日は映画を見ない。',
    exampleFurigana: '今日[きょう]は映画[えいが]を見[み]ない。',
    exampleMeaning: '今天不看電影。',
    exampleUsage: '見ない＝「不看」。後面可接 なくてもいい → 見なくてもいい（不看也可以）。',
  },
  f018: {
    example: '今日は何も買わない。',
    exampleFurigana: '今日[きょう]は何[なに]も買[か]わない。',
    exampleMeaning: '今天什麼都不買。',
    exampleUsage: '五段う結尾：買う → 買わない（不是「買うない」）。',
  },
  f019: {
    example: 'もう待たない。',
    exampleFurigana: 'もう待[ま]たない。',
    exampleMeaning: '不再等了。',
    exampleUsage: '待つ → 待たない。五段つ結尾變「たない」。',
  },
  f020: {
    example: '写真を取らないでください。',
    exampleFurigana: '写真[しゃしん]を取[と]らないでください。',
    exampleMeaning: '請不要拍照。',
    exampleUsage: '取らない 也可接 ないで → 取らないで（別做…）。',
  },
  f021: {
    example: '難しい本は読まない。',
    exampleFurigana: '難[むずか]しい本[ほん]は読[よ]まない。',
    exampleMeaning: '不看難的書。',
    exampleUsage: '読む → 読まない。五段む結尾變「まない」。',
  },
  f022: {
    example: '今日は手紙を書かない。',
    exampleFurigana: '今日[きょう]は手紙[てがみ]を書[か]かない。',
    exampleMeaning: '今天不寫信。',
    exampleUsage: '書く → 書かない。五段く結尾變「かない」。',
  },
  f023: {
    example: 'あまり話さない。',
    exampleFurigana: 'あまり話[はな]さない。',
    exampleMeaning: '不太說話。',
    exampleUsage: '話す → 話さない。五段す結尾變「さない」。',
  },
  f024: {
    example: '今日は来ない。',
    exampleFurigana: '今日[きょう]は来[こ]ない。',
    exampleMeaning: '今天不來。',
    exampleUsage: '不規則：来る → 来ない（讀こない）。',
  },
  f025: {
    example: '今日は何もしない。',
    exampleFurigana: '今日[きょう]は何[なに]もしない。',
    exampleMeaning: '今天什麼都不做。',
    exampleUsage: '不規則：する → しない。',
  },
  f026: {
    example: '今日は会社へ行かない。',
    exampleFurigana: '今日[きょう]は会社[かいしゃ]へ行[い]かない。',
    exampleMeaning: '今天不去公司。',
    exampleUsage: '行く → 行かない。可接 なくてもいい → 行かなくてもいい（不去也可以）。',
  },
}

const TE_FORM_GUIDE = {
  useWhen: 'て形用於請求（〜てください）、並列、以及 てはいけない（禁止）等文法。',
  form: '一段：去る＋て｜五段：依結尾變 って／んで／いて／して｜不規則：する→して、来る→来て、行く→行って（例外）',
  tip: '行く 的て形是 行って，不是「いいて」。',
}

const NAI_FORM_GUIDE = {
  useWhen:
    'ない形是接續文法的基礎：先把動詞改成ない形，才能接 なければならない（必須）、なくてもいい（不必）、ないで（別做…）等。',
  form: '一段：去る＋ない｜五段：う段改あ段＋ない（買う→買わない）｜不規則：する→しない、来る→来ない',
  tip: 'なければならない／なくてもいい 是把「ない」整個換掉，不是直接加在後面。',
}

export const VERB_FORMS = [
  { id: 'f001', verb: '食べる', reading: 'たべる', group: '一段', target: 'て形', answer: '食べて', answerReading: 'たべて', theme: 'て形' },
  { id: 'f002', verb: '見る', reading: 'みる', group: '一段', target: 'て形', answer: '見て', answerReading: 'みて', theme: 'て形' },
  { id: 'f003', verb: '起きる', reading: 'おきる', group: '一段', target: 'て形', answer: '起きて', answerReading: 'おきて', theme: 'て形' },
  { id: 'f004', verb: '買う', reading: 'かう', group: '五段', target: 'て形', answer: '買って', answerReading: 'かって', theme: 'て形' },
  { id: 'f005', verb: '待つ', reading: 'まつ', group: '五段', target: 'て形', answer: '待って', answerReading: 'まって', theme: 'て形' },
  { id: 'f006', verb: '取る', reading: 'とる', group: '五段', target: 'て形', answer: '取って', answerReading: 'とって', theme: 'て形' },
  { id: 'f007', verb: '読む', reading: 'よむ', group: '五段', target: 'て形', answer: '読んで', answerReading: 'よんで', theme: 'て形' },
  { id: 'f008', verb: '死ぬ', reading: 'しぬ', group: '五段', target: 'て形', answer: '死んで', answerReading: 'しんで', theme: 'て形' },
  { id: 'f009', verb: '遊ぶ', reading: 'あそぶ', group: '五段', target: 'て形', answer: '遊んで', answerReading: 'あそんで', theme: 'て形' },
  { id: 'f010', verb: '書く', reading: 'かく', group: '五段', target: 'て形', answer: '書いて', answerReading: 'かいて', theme: 'て形' },
  { id: 'f011', verb: '急ぐ', reading: 'いそぐ', group: '五段', target: 'て形', answer: '急いで', answerReading: 'いそいで', theme: 'て形' },
  { id: 'f012', verb: '話す', reading: 'はなす', group: '五段', target: 'て形', answer: '話して', answerReading: 'はなして', theme: 'て形' },
  { id: 'f013', verb: '来る', reading: 'くる', group: '不規則', target: 'て形', answer: '来て', answerReading: 'きて', theme: 'て形' },
  { id: 'f014', verb: 'する', reading: 'する', group: '不規則', target: 'て形', answer: 'して', answerReading: 'して', theme: 'て形' },
  { id: 'f015', verb: '行く', reading: 'いく', group: '不規則', target: 'て形', answer: '行って', answerReading: 'いって', theme: 'て形' },
  { id: 'f016', verb: '食べる', reading: 'たべる', group: '一段', target: 'ない形', answer: '食べない', answerReading: 'たべない', theme: 'ない形' },
  { id: 'f017', verb: '見る', reading: 'みる', group: '一段', target: 'ない形', answer: '見ない', answerReading: 'みない', theme: 'ない形' },
  { id: 'f018', verb: '買う', reading: 'かう', group: '五段', target: 'ない形', answer: '買わない', answerReading: 'かわない', theme: 'ない形' },
  { id: 'f019', verb: '待つ', reading: 'まつ', group: '五段', target: 'ない形', answer: '待たない', answerReading: 'またない', theme: 'ない形' },
  { id: 'f020', verb: '取る', reading: 'とる', group: '五段', target: 'ない形', answer: '取らない', answerReading: 'とらない', theme: 'ない形' },
  { id: 'f021', verb: '読む', reading: 'よむ', group: '五段', target: 'ない形', answer: '読まない', answerReading: 'よまない', theme: 'ない形' },
  { id: 'f022', verb: '書く', reading: 'かく', group: '五段', target: 'ない形', answer: '書かない', answerReading: 'かかない', theme: 'ない形' },
  { id: 'f023', verb: '話す', reading: 'はなす', group: '五段', target: 'ない形', answer: '話さない', answerReading: 'はなさない', theme: 'ない形' },
  { id: 'f024', verb: '来る', reading: 'くる', group: '不規則', target: 'ない形', answer: '来ない', answerReading: 'こない', theme: 'ない形' },
  { id: 'f025', verb: 'する', reading: 'する', group: '不規則', target: 'ない形', answer: 'しない', answerReading: 'しない', theme: 'ない形' },
  { id: 'f026', verb: '行く', reading: 'いく', group: '五段', target: 'ない形', answer: '行かない', answerReading: 'いかない', theme: 'ない形' },
]

export function formRule(item) {
  if (!item) return ''
  if (item.target === 'て形') {
    if (item.verb === '行く') return '例外：行く → 行って（不是「いいて」）'
    if (item.group === '一段') return '一段：去掉「る」，加「て」'
    if (item.verb === '来る') return '不規則：来る → 来て'
    if (item.verb === 'する') return '不規則：する → して'
    const end = item.reading.slice(-1)
    if (end === 'う' || end === 'つ' || end === 'る') return '五段う・つ・る：て形變「って」'
    if (end === 'む' || end === 'ぬ' || end === 'ぶ') return '五段む・ぬ・ぶ：て形變「んで」'
    if (end === 'く') return '五段く：て形變「いて」'
    if (end === 'ぐ') return '五段ぐ：て形變「いで」'
    if (end === 'す') return '五段す：て形變「して」'
    return '先判斷一段／五段／不規則，再改て形'
  }
  if (item.verb === '来る') return '不規則：来る → 来ない'
  if (item.verb === 'する') return '不規則：する → しない'
  if (item.group === '一段') return '一段：去掉「る」，加「ない」'
  const end = item.reading.slice(-1)
  if (end === 'う') return '五段う：ない形是「わない」（買わない）'
  if (end === 'つ') return '五段つ：ない形是「たない」'
  if (end === 'る') return '五段る：ない形是「らない」'
  if (end === 'む') return '五段む：ない形是「まない」'
  if (end === 'く') return '五段く：ない形是「かない」'
  if (end === 'す') return '五段す：ない形是「さない」'
  return '五段：う段改あ段，再加ない'
}

export function formToCard(item) {
  const promptZh =
    item.target === 'て形'
      ? `把「${item.verb}」改成て形`
      : `把「${item.verb}」改成ない形`
  const sentence = FORM_SENTENCES[item.id] || {}
  const guide = item.target === 'ない形' ? NAI_FORM_GUIDE : TE_FORM_GUIDE
  return {
    id: item.id,
    type: 'form',
    word: item.verb,
    reading: item.reading,
    meaning: promptZh,
    example: sentence.example || `${item.answer}。`,
    exampleFurigana: sentence.exampleFurigana,
    exampleMeaning: sentence.exampleMeaning || `正確：${item.answer}（${item.answerReading}）`,
    exampleUsage: sentence.exampleUsage,
    useWhen: guide.useWhen,
    form: guide.form,
    tip: guide.tip,
    category: item.target,
    pattern: `${item.group}｜${item.target}`,
    formDrill: item,
  }
}

export const FORM_CARDS = VERB_FORMS.map(formToCard)

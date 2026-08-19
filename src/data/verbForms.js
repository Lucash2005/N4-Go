/** 動詞活用練習。不佔 80 條文法額度，每日插入 2 張。 */
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
  return {
    id: item.id,
    type: 'form',
    word: item.verb,
    reading: item.reading,
    meaning: promptZh,
    example: item.answerReading,
    exampleMeaning: `正確：${item.answer}（${item.answerReading}）`,
    category: item.target,
    pattern: `${item.group}｜${item.target}`,
    formDrill: item,
  }
}

export const FORM_CARDS = VERB_FORMS.map(formToCard)

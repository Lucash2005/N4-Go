export const quizQuestions = [
  {
    id: 'q001',
    section: 'vocab',
    prompt: 'Choose the best meaning of “significant”.',
    options: ['colorful', 'important / notable', 'temporary', 'silent'],
    answer: 1,
    explanation: 'significant = 重要的、顯著的。',
  },
  {
    id: 'q002',
    section: 'vocab',
    prompt: '“The results ____ a clear pattern.”',
    options: ['indicate', 'decorate', 'ignore', 'borrow'],
    answer: 0,
    explanation: 'indicate = 顯示／指出。',
  },
  {
    id: 'q003',
    section: 'reading',
    prompt: 'In academic reading, the main idea is usually…',
    options: [
      'a minor example in the last sentence only',
      'the central point the passage develops',
      'any date mentioned in the text',
      'the longest sentence',
    ],
    answer: 1,
    explanation: '主旨是全文圍繞展開的核心觀點。',
  },
  {
    id: 'q004',
    section: 'listening',
    prompt: 'In campus listening, detail questions often ask about…',
    options: [
      'the student’s favorite color',
      'reasons, times, requirements, or opinions stated',
      'grammar rules',
      'the professor’s age',
    ],
    answer: 1,
    explanation: '校園聽力常考原因、時間、規定與態度。',
  },
  {
    id: 'q005',
    section: 'speaking',
    prompt: 'For independent speaking, a strong response usually…',
    options: [
      'avoids taking a position',
      'states a clear opinion and supports it with reasons',
      'lists 10 unrelated ideas',
      'reads the question aloud only',
    ],
    answer: 1,
    explanation: '獨立口說要立場清楚＋理由／例子。',
  },
  {
    id: 'q006',
    section: 'writing',
    prompt: 'In integrated writing, you should…',
    options: [
      'only give personal opinions',
      'explain how the lecture relates to / challenges the reading',
      'ignore the lecture',
      'copy the reading word for word',
    ],
    answer: 1,
    explanation: '整合寫作重點是 lecture 如何對應或反駁 reading。',
  },
  {
    id: 'q007',
    section: 'vocab',
    prompt: 'Which word means “about / roughly”?',
    options: ['precise', 'approximately', 'essential', 'complex'],
    answer: 1,
    explanation: 'approximately = 大約。',
  },
  {
    id: 'q008',
    section: 'vocab',
    prompt: '“Several factors ____ to the problem.”',
    options: ['contribute', 'contrast', 'decline', 'obtain'],
    answer: 0,
    explanation: 'contribute to = 促成／造成。',
  },
  {
    id: 'q009',
    section: 'strategy',
    prompt: 'A useful daily TOEFL habit is…',
    options: [
      'only cramming the night before',
      'short daily practice across sections + vocabulary review',
      'memorizing one essay and reusing it forever',
      'skipping listening entirely',
    ],
    answer: 1,
    explanation: '分散練習＋單字複習比考前猛Ｋ更有效。',
  },
  {
    id: 'q010',
    section: 'vocab',
    prompt: '“Emphasize” is closest in meaning to…',
    options: ['hide', 'stress / highlight', 'borrow', 'delay'],
    answer: 1,
    explanation: 'emphasize = 強調。',
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

export function withShuffledOptions(question) {
  const indexed = question.options.map((text, index) => ({ text, index }))
  const shuffled = shuffle(indexed)
  return {
    ...question,
    options: shuffled.map((item) => item.text),
    answer: shuffled.findIndex((item) => item.index === question.answer),
  }
}

export function pickQuiz(count = 8, section = 'all') {
  const pool =
    section === 'all' ? quizQuestions : quizQuestions.filter((q) => q.section === section)
  const entropy = `${Date.now()}-${Math.random()}`
  return shuffle(pool)
    .map((q, i) => ({ q, key: `${entropy}:${i}:${Math.random()}` }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .slice(0, Math.min(count, pool.length))
    .map((item) => withShuffledOptions(item.q))
}

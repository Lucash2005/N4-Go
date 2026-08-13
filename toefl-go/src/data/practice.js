/** Reading / Listening / Speaking / Writing practice items */

export const readingPassages = [
  {
    id: 'r001',
    title: 'Urban Green Spaces',
    level: 'Medium',
    passage: `Cities around the world are investing in green spaces such as parks, community gardens, and tree-lined streets. Researchers argue that these areas do more than improve appearance. Access to nature can reduce stress, encourage physical activity, and even support local biodiversity.

However, not all neighborhoods benefit equally. In many cities, wealthier districts have more parks, while denser, lower-income areas have fewer trees and open spaces. Planners now discuss “green equity,” the idea that every community should have fair access to nature.

Some cities require new buildings to include rooftop gardens or public plazas. Others protect existing trees during construction. Although these policies can raise costs, supporters claim the long-term health and environmental benefits outweigh the expense.`,
    questions: [
      {
        prompt: 'What is the main idea of the passage?',
        options: [
          'Green spaces mainly decorate cities.',
          'Green spaces have health and equity benefits beyond appearance.',
          'Rooftop gardens are cheaper than parks.',
          'Only wealthy cities can afford parks.',
        ],
        answer: 1,
        explanation: '全文強調綠地不只美觀，還有健康、活動與公平分配等效益。',
      },
      {
        prompt: 'What does “green equity” refer to?',
        options: [
          'Equal access to nature across communities',
          'Equal property prices near parks',
          'Equal numbers of rooftop gardens on every building',
          'Equal government budgets for all cities',
        ],
        answer: 0,
        explanation: '文中定義為每個社區都應公平取得自然空間。',
      },
    ],
  },
  {
    id: 'r002',
    title: 'Sleep and Learning',
    level: 'Easy',
    passage: `Sleep plays a critical role in learning and memory. During deep sleep, the brain consolidates information gathered during the day, strengthening important connections and discarding weaker ones. Students who sleep fewer than six hours often perform worse on tests, even if they spend more time studying.

Naps can help as well. A short afternoon nap may improve alertness and problem-solving. Still, experts caution that naps should not replace a regular nighttime sleep schedule. Consistency matters: going to bed and waking up at similar times helps the body maintain a healthy rhythm.`,
    questions: [
      {
        prompt: 'According to the passage, why is deep sleep important?',
        options: [
          'It increases appetite.',
          'It consolidates memory.',
          'It replaces studying.',
          'It shortens class time.',
        ],
        answer: 1,
        explanation: '文中說深層睡眠會鞏固白天學到的資訊。',
      },
      {
        prompt: 'What do experts say about naps?',
        options: [
          'They should replace night sleep.',
          'They are never helpful.',
          'They can help but should not replace night sleep.',
          'They only help athletes.',
        ],
        answer: 2,
        explanation: '午睡有幫助，但不能取代規律夜間睡眠。',
      },
    ],
  },
]

export const listeningSets = [
  {
    id: 'l001',
    title: 'Campus Conversation: Library Hours',
    script: `Student: Excuse me, are the library group rooms open on weekends?
Librarian: Yes. On Saturdays they open at 10 a.m., but you need to reserve a room online.
Student: Can I reserve one for Sunday evening?
Librarian: Sunday rooms close at 6 p.m., so evening bookings after that aren’t available.
Student: Got it. I’ll book a Saturday morning slot instead.`,
    questions: [
      {
        prompt: 'What must the student do to use a group room on Saturday?',
        options: [
          'Pay a fee at the desk',
          'Reserve online',
          'Bring a professor’s note',
          'Arrive before 8 a.m.',
        ],
        answer: 1,
        explanation: '館員說週末使用需線上預約。',
      },
      {
        prompt: 'Why can’t the student book Sunday evening?',
        options: [
          'The library is closed all day Sunday.',
          'Group rooms close at 6 p.m. on Sunday.',
          'Only professors may book evenings.',
          'Online booking is down.',
        ],
        answer: 1,
        explanation: '週日房間 6 點關閉，之後無法預約。',
      },
    ],
  },
  {
    id: 'l002',
    title: 'Lecture Clip: Bee Communication',
    script: `Professor: Honeybees communicate the location of food through a dance. When a bee returns to the hive, it performs movements that indicate both direction and distance. Other bees observe the dance and then fly out to find the same flowers. This system is remarkably efficient for a small insect society.`,
    questions: [
      {
        prompt: 'What does the bee dance communicate?',
        options: [
          'The weather in the hive',
          'The location of food',
          'The age of the queen',
          'The color of the hive',
        ],
        answer: 1,
        explanation: '教授說明舞蹈傳達食物位置。',
      },
    ],
  },
]

export const speakingPrompts = [
  {
    id: 's001',
    type: 'Independent',
    prepSeconds: 15,
    speakSeconds: 45,
    prompt:
      'Some people prefer to study alone. Others prefer to study with a group. Which do you prefer and why? Use details and examples.',
    tips: ['先表明立場', '給 1–2 個具體理由', '各用一個短例子'],
  },
  {
    id: 's002',
    type: 'Independent',
    prepSeconds: 15,
    speakSeconds: 45,
    prompt:
      'Do you agree or disagree with the following statement? “It is better to take risks than to always play it safe.” Explain your answer.',
    tips: ['清楚說 agree/disagree', '用校園或生活例子', '結尾重申立場'],
  },
  {
    id: 's003',
    type: 'Campus',
    prepSeconds: 30,
    speakSeconds: 60,
    prompt:
      'Reading: The university will extend dining hall hours until midnight during finals week.\nConversation: The woman supports the change because students study late; the man worries about staffing costs.\nQuestion: Explain the man’s opinion and his reason.',
    tips: ['先講男方立場', '再說理由', '不必加入自己看法'],
  },
]

export const writingPrompts = [
  {
    id: 'w001',
    type: 'Independent',
    minutes: 30,
    prompt:
      'Do you agree or disagree with the following statement?\n“Teachers should assign homework every day.”\nUse specific reasons and examples to support your answer.',
    outline: ['Introduction + thesis', 'Reason 1 + example', 'Reason 2 + example', 'Conclusion'],
  },
  {
    id: 'w002',
    type: 'Integrated',
    minutes: 20,
    prompt:
      'Reading summarizes three benefits of remote work: flexibility, less commuting, and wider hiring.\nLecture challenges each point: blurred work-life boundaries, home distractions, and weaker teamwork.\nQuestion: Summarize the lecture and explain how it challenges the reading.',
    outline: ['一句總述 lecture 反對 reading', '三點對應反駁', '不要寫個人意見'],
  },
]

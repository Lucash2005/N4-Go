/**
 * 基礎加強題庫：易混句型、短文填空。
 * 獨立於每日 1500 字／80 文法進度，專補 N4 考前易錯點。
 *
 * 約 50 題：每個易混組 3–5 題變體，配合錯題 SRS 才夠「找回感覺」。
 */

/** @typedef {'confusable' | 'passage' | 'particle'} DrillKind */

/**
 * @typedef {{
 *   id: string,
 *   kind: DrillKind,
 *   theme: string,
 *   prompt?: string,
 *   passage?: string,
 *   passageZh?: string,
 *   options: string[],
 *   answer: number,
 *   explanation: string,
 *   exampleZh?: string,
 *   memoryTip?: string,
 *   memoryCompare?: string,
 *   passageId?: string,
 *   blankLabel?: string,
 * }} DrillQuestion
 */

/** @type {DrillQuestion[]} */
export const drillQuestions = [
  // ═══════════════ 讀解填空同型 ═══════════════
  {
    id: 'drill-passage-travel-2',
    kind: 'passage',
    theme: 'てから／から',
    passageId: 'passage-travel',
    blankLabel: '2',
    passage:
      '私は先週、山田さんと北海道へ旅行に行きました。キムさんもいっしょに行きました。\n帰るとき、空港でチェックイン（　）、山田さんと買い物に行きました。\nお菓子やお酒などを買いました。荷物がとても重かったです（　）、大変でした。',
    passageZh:
      '我上週和山田先生去北海道旅行了。金也一起去了。\n回去時，在機場辦完 check-in（　）後，和山田先生去逛街。\n買了點心和酒等。行李非常重（　），所以很辛苦。',
    prompt: '空欄 2 に入る最も適当なものを選んでください。',
    options: ['するから', 'しないから', 'してから', 'しなかったから'],
    answer: 2,
    exampleZh: '正解句：チェックインしてから、買い物に行きました。＝辦完 check-in 之後，才去逛街。',
    explanation:
      '正解是「してから」。\n\n・てから＝做完 A 之後才做 B（時間順序）\n・するから／しないから＝因為…（原因），這句不是在講「因為要／不要 check-in」\n\n口訣：先 A 再 B → てから；因為 A 所以 B → から／ので。',
    memoryCompare: 'てから＝之後｜普通形＋から＝因為',
    memoryTip: '看到「先 A 再 B」→ 找 てから。',
  },
  {
    id: 'drill-passage-travel-3',
    kind: 'passage',
    theme: 'に／へ／を',
    passageId: 'passage-travel',
    blankLabel: '3',
    passage:
      '帰るとき、空港でチェックインしてから、山田さんと買い物（　）行きました。',
    passageZh: '回去時，在機場辦完 check-in 後，和山田先生去（　）逛街。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['を', 'に', 'で', 'へ'],
    answer: 1,
    exampleZh: '正解句：買い物に行きました。＝去逛街／去購物。',
    explanation:
      '正解是「に」。\n\n・買い物に行く＝去做「購物」這件事（目的）\n・へ＝去某個地方（例：北海道へ）\n・を＝動詞的受詞（買東西：お菓子を買う）\n・で＝動作發生的場所（店で買う）\n\n同型：旅行に行く、散歩に行く、映画に行く。',
    memoryCompare: '地方へ行く｜活動・目的に行く',
    memoryTip: '死背：買い物に行く。',
  },
  {
    id: 'drill-passage-travel-1',
    kind: 'passage',
    theme: '助詞',
    passageId: 'passage-travel',
    blankLabel: '1',
    passage: 'キムさん（　）いっしょに行きました。',
    passageZh: '金（　）一起去了。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['が', 'を', 'も', 'に'],
    answer: 2,
    exampleZh: '正解句：キムさんもいっしょに行きました。＝金也一起去了。',
    explanation: '正解是「も」＝也。前句已說和山田去旅行，這裡補「金也一起去」。',
    memoryTip: 'A も＝A 也…',
  },
  {
    id: 'drill-passage-travel-4',
    kind: 'passage',
    theme: 'ので／から',
    passageId: 'passage-travel',
    blankLabel: '4',
    passage: '荷物がとても重かったです（　）、大変でした。',
    passageZh: '行李非常重（　），所以很辛苦。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['ので', 'のに', 'ても', 'ながら'],
    answer: 0,
    exampleZh: '正解句：重かったですので、大変でした。＝因為很重，所以很辛苦。',
    explanation:
      '正解是「ので」＝因為（原因→結果），語氣較委婉。\n\n・のに＝明明…卻（轉折）\n・ても＝即使…也\n・ながら＝一邊…一邊',
    memoryCompare: 'ので／から＝因為｜のに＝明明卻',
  },
  {
    id: 'drill-passage-run-1',
    kind: 'passage',
    theme: 'てから',
    passageId: 'passage-daily',
    passage:
      '田中さんは毎朝六時に起きます。それから公園で二キロ走ります。走っ（　）、会社へ行きます。',
    passageZh: '田中每天早上六點起床。然後在公園跑兩公里。跑完（　），去公司。',
    prompt: '空欄に入る最も適当なものを選んでください。',
    options: ['るから', 'てから', 'たから', 'ないから'],
    answer: 1,
    exampleZh: '正解句：走ってから、会社へ行きます。＝跑完之後，去公司。',
    explanation: '正解是「てから」＝做完跑步之後才去公司（時間順序）。',
    memoryTip: '早起→跑步→上班：每一步用 てから 連。',
  },
  {
    id: 'drill-passage-shop-1',
    kind: 'passage',
    theme: 'で／に',
    passageId: 'passage-shop',
    passage: '駅の前の店（　）お弁当を買いました。それから公園（　）食べました。',
    passageZh: '在車站前的店（　）買了便當。然後在公園（　）吃了。',
    prompt: '一つ目の空欄に入るものはどれですか。',
    options: ['に', 'で', 'を', 'へ'],
    answer: 1,
    exampleZh: '正解句：店でお弁当を買いました。＝在店裡買了便當。',
    explanation:
      '正解是「で」＝動作發生的場所。\n買／吃／學／工作等「在哪裡做」→ で。\n\nに 多表存在或到達點（公園にいる、学校に行く）。',
    memoryCompare: '場所で＋動作｜場所に＋存在／到達',
  },

  // ═══════════════ てから／から ═══════════════
  {
    id: 'drill-te-kara-1',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\nご飯を食べ（　）、歯を磨きます。',
    options: ['るから', 'ないから', 'てから', 'たから'],
    answer: 2,
    exampleZh: '正解句：ご飯を食べてから、歯を磨きます。＝吃完飯之後，再刷牙。',
    explanation: '正解是「てから」＝吃完之後才刷牙（順序）。不是「因為吃飯所以刷牙」。',
    memoryCompare: '食べてから（之後）｜お腹が空くから（因為餓）',
    memoryTip: '先吃再刷 → てから。',
  },
  {
    id: 'drill-te-kara-2',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n今日は忙しい（　）、行けません。',
    options: ['てから', 'ので', 'から', 'したから'],
    answer: 2,
    exampleZh: '正解句：今日は忙しいから、行けません。＝因為今天忙，所以去不了。',
    explanation:
      '正解是「から」＝因為（原因）。い形容詞普通形直接＋から。\n（ので 也常可，但選項中「から」最直接。）',
    memoryTip: '原因 → から／ので；順序 → てから。',
  },
  {
    id: 'drill-te-kara-3',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n手を洗っ（　）、ご飯を食べます。',
    options: ['たから', 'てから', 'ないから', 'するから'],
    answer: 1,
    exampleZh: '正解句：手を洗ってから、ご飯を食べます。＝洗完手之後再吃飯。',
    explanation: '正解是「てから」。洗って（て形）＋から＝之後。',
  },
  {
    id: 'drill-te-kara-4',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n宿題をし（　）、ゲームをします。',
    options: ['たから', 'てから', 'るから', 'ないから'],
    answer: 1,
    exampleZh: '正解句：宿題をしてから、ゲームをします。＝做完作業之後再打遊戲。',
    explanation: '正解是「てから」＝做完作業之後。',
  },
  {
    id: 'drill-te-kara-5',
    kind: 'confusable',
    theme: 'てから／から',
    prompt: '空欄に入る最も適当なものを選んでください。\n雨が降っている（　）、出かけません。',
    options: ['てから', 'から', 'のに', 'ながら'],
    answer: 1,
    exampleZh: '正解句：雨が降っているから、出かけません。＝因為在下雨，所以不出門。',
    explanation: '正解是「から」＝因為在下雨（原因）。てから 是「之後」，這裡沒有「先下雨再出門」的順序。',
  },

  // ═══════════════ に／へ／を／で ═══════════════
  {
    id: 'drill-ni-he-1',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n来週、京都（　）旅行に行きます。',
    options: ['を', 'に', 'へ', 'で'],
    answer: 2,
    exampleZh: '正解句：京都へ旅行に行きます。＝去京都旅行。',
    explanation:
      '正解是「へ」＝去的地方（京都）。\n整句：京都へ（地方）＋旅行に（目的活動）行く。',
    memoryCompare: '京都へ（地方）｜旅行に（目的）',
  },
  {
    id: 'drill-ni-he-2',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n友達と映画（　）行きました。',
    options: ['へ', 'を', 'に', 'が'],
    answer: 2,
    exampleZh: '正解句：映画に行きました。＝去看電影。',
    explanation: '正解是「に」＝去做「看電影」這件事。',
    memoryTip: '映画に／買い物に／散歩に／旅行に',
  },
  {
    id: 'drill-ni-he-3',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n学校（　）行きます。',
    options: ['に', 'へ', 'を', 'で'],
    answer: 1,
    exampleZh: '正解句：学校へ行きます。＝去學校。',
    explanation: '正解是「へ」＝方向／目的地。學校是「地方」，不是「活動名稱」。',
    memoryCompare: '学校へ＝去學校｜学校で＝在學校（做某事）',
  },
  {
    id: 'drill-ni-he-4',
    kind: 'particle',
    theme: 'に／へ',
    prompt: '空欄に入る最も適当なものを選んでください。\n週末は公園（　）散歩に行きます。',
    options: ['を', 'で', 'へ', 'が'],
    answer: 2,
    exampleZh: '正解句：公園へ散歩に行きます。＝去公園散步。',
    explanation: '正解是「へ」＝去公園（地方）。散歩に＝去散步（目的）。',
  },
  {
    id: 'drill-wo-1',
    kind: 'particle',
    theme: 'を／に',
    prompt: '空欄に入る最も適当なものを選んでください。\n本（　）読みます。',
    options: ['に', 'を', 'で', 'へ'],
    answer: 1,
    exampleZh: '正解句：本を読みます。＝讀書。',
    explanation: '正解是「を」＝動詞受詞（讀的對象是書）。',
  },
  {
    id: 'drill-de-1',
    kind: 'particle',
    theme: 'で／に',
    prompt: '空欄に入る最も適当なものを選んでください。\n図書館（　）勉強します。',
    options: ['に', 'を', 'で', 'へ'],
    answer: 2,
    exampleZh: '正解句：図書館で勉強します。＝在圖書館讀書。',
    explanation: '正解是「で」＝在哪裡做動作。圖書館是學習發生的場所。',
  },
  {
    id: 'drill-de-2',
    kind: 'particle',
    theme: 'で／に',
    prompt: '空欄に入る最も適当なものを選んでください。\nバス（　）学校へ行きます。',
    options: ['に', 'を', 'で', 'が'],
    answer: 2,
    exampleZh: '正解句：バスで学校へ行きます。＝搭公車去學校。',
    explanation: '正解是「で」＝手段／交通工具。',
  },

  // ═══════════════ の前に／の後で ═══════════════
  {
    id: 'drill-mae-1',
    kind: 'confusable',
    theme: 'の前に／てから',
    prompt: '空欄に入る最も適当なものを選んでください。\n出発（　）、トイレに行きました。',
    options: ['の前に', 'の後で', 'してから', 'するから'],
    answer: 0,
    exampleZh: '正解句：出発の前に、トイレに行きました。＝出發之前去了洗手間。',
    explanation: '正解是「の前に」。名詞＋の前に＝在…之前。',
    memoryCompare: 'の前に＝之前｜てから＝做完動詞之後',
  },
  {
    id: 'drill-mae-2',
    kind: 'confusable',
    theme: 'の前に／てから',
    prompt: '空欄に入る最も適当なものを選んでください。\nチェックイン（　）、お土産を買いました。',
    options: ['するから', 'してから', 'の前に', 'しないから'],
    answer: 2,
    exampleZh: '正解句：チェックインの前に、お土産を買いました。＝check-in 之前買了土產。',
    explanation: '正解是「の前に」。名詞「チェックイン」＋の前に。',
    memoryTip: '名詞＋の前に｜動詞て形＋てから',
  },
  {
    id: 'drill-ato-1',
    kind: 'confusable',
    theme: 'の前に／てから',
    prompt: '空欄に入る最も適当なものを選んでください。\n食事（　）、薬を飲みます。',
    options: ['の前に', 'の後で', 'てから', 'するから'],
    answer: 1,
    exampleZh: '正解句：食事の後で、薬を飲みます。＝吃飯之後吃藥。',
    explanation: '正解是「の後で」＝名詞之後。若用動詞則是「食べてから」。',
  },

  // ═══════════════ 義務・許可・禁止 ═══════════════
  {
    id: 'drill-duty-1',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\n明日は会社へ行か（　）いいです。',
    options: ['なくても', 'なければ', 'ないで', 'ないと'],
    answer: 0,
    exampleZh: '正解句：行かなくてもいいです。＝不去也可以（不必去）。',
    explanation:
      '正解是「なくても」。把ない形的「ない」整個換成「なくてもいい」。\n⚠ 不是「行かない＋なくてもいい」（會出現兩個否定）。',
    memoryCompare: 'なくてもいい＝不必｜なければならない＝必須',
  },
  {
    id: 'drill-duty-2',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\n毎日、野菜を食べ（　）なりません。',
    options: ['なくても', 'なければ', 'ないで', 'ないと'],
    answer: 1,
    exampleZh: '正解句：食べなければなりません。＝必須吃蔬菜。',
    explanation: '正解是「なければ」。ない形去掉い → なければ＋なりません。',
    memoryTip: '必須→なければならない；不必→なくてもいい',
  },
  {
    id: 'drill-duty-3',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\nここで写真を撮っ（　）いけません。',
    options: ['ても', 'ては', 'てから', 'たら'],
    answer: 1,
    exampleZh: '正解句：撮ってはいけません。＝不可以在這裡拍照。',
    explanation: '正解是「ては」。て形＋はいけない＝禁止。',
    memoryCompare: 'てはいけない＝不可｜てもいい＝可以',
  },
  {
    id: 'drill-duty-4',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\nこの本、借り（　）いいですか。',
    options: ['ては', 'ても', 'てから', 'なくて'],
    answer: 1,
    exampleZh: '正解句：借りてもいいですか。＝可以借這本書嗎？',
    explanation: '正解是「ても」。て形＋もいい＝許可／可以嗎。',
  },
  {
    id: 'drill-duty-5',
    kind: 'confusable',
    theme: '義務・許可',
    prompt: '空欄に入る最も適当なものを選んでください。\nもっと早く寝た（　）いいです。',
    options: ['つもりが', 'ほうが', '予定が', 'ところ'],
    answer: 1,
    exampleZh: '正解句：寝たほうがいいです。＝最好早點睡（建議）。',
    explanation: '正解是「ほうが」。た形／ない形＋ほうがいい＝建議。',
  },

  // ═══════════════ 授受 ═══════════════
  {
    id: 'drill-juyo-1',
    kind: 'confusable',
    theme: '授受',
    prompt: '空欄に入る最も適当なものを選んでください。\n友達に本を貸して（　）。',
    options: ['あげました', 'もらいました', 'くれました', 'しまいました'],
    answer: 0,
    exampleZh: '正解句：友達に本を貸してあげました。＝我把書借給朋友了。',
    explanation: '正解是「あげました」。我為對方做 → てあげる。',
    memoryCompare: 'てあげる（我→對方）｜てもらう（請對方→我）｜てくれる（對方→我）',
  },
  {
    id: 'drill-juyo-2',
    kind: 'confusable',
    theme: '授受',
    prompt: '空欄に入る最も適当なものを選んでください。\n先生に作文を直して（　）。',
    options: ['あげました', 'もらいました', 'くれました', 'みました'],
    answer: 1,
    exampleZh: '正解句：先生に作文を直してもらいました。＝請老師幫我改了作文。',
    explanation: '正解是「もらいました」。請對方為我做 → てもらう。',
  },
  {
    id: 'drill-juyo-3',
    kind: 'confusable',
    theme: '授受',
    prompt: '空欄に入る最も適当なものを選んでください。\n母が料理を作って（　）。',
    options: ['あげました', 'もらいました', 'くれました', 'おきました'],
    answer: 2,
    exampleZh: '正解句：母が料理を作ってくれました。＝媽媽（為我）做了料理。',
    explanation: '正解是「くれました」。對方為我／我們做 → てくれる。',
  },

  // ═══════════════ 條件・逆接 ═══════════════
  {
    id: 'drill-cond-1',
    kind: 'confusable',
    theme: '条件・逆接',
    prompt: '空欄に入る最も適当なものを選んでください。\n雨が降っ（　）、試合は中止です。',
    options: ['ても', 'たら', 'のに', 'ながら'],
    answer: 1,
    exampleZh: '正解句：雨が降ったら、試合は中止です。＝如果下雨，比賽就取消。',
    explanation: '正解是「たら」＝如果…的話／…之後。',
  },
  {
    id: 'drill-cond-2',
    kind: 'confusable',
    theme: '条件・逆接',
    prompt: '空欄に入る最も適当なものを選んでください。\n勉強した（　）、試験に落ちました。',
    options: ['たら', 'のに', 'ても', 'ので'],
    answer: 1,
    exampleZh: '正解句：勉強したのに、試験に落ちました。＝明明讀了書，卻考砸了。',
    explanation: '正解是「のに」＝明明…卻（遺憾／意外）。',
  },
  {
    id: 'drill-cond-3',
    kind: 'confusable',
    theme: '条件・逆接',
    prompt: '空欄に入る最も適当なものを選んでください。\n高く（　）、買います。',
    options: ['ても', 'たら', 'のに', 'ので'],
    answer: 0,
    exampleZh: '正解句：高くても、買います。＝即使貴，也要買。',
    explanation: '正解是「ても」＝即使…也。',
  },

  // ═══════════════ 樣態・傳聞 ═══════════════
  {
    id: 'drill-sou-1',
    kind: 'confusable',
    theme: 'そうだ',
    prompt: '空欄に入る最も適当なものを選んでください。\nこのケーキはおいし（　）。',
    options: ['そうです', 'らしいです', 'かもしれません', 'ばかりです'],
    answer: 0,
    exampleZh: '正解句：おいしそうです。＝看起來很好吃（樣態）。',
    explanation: '正解是「そうです」。い形容詞去掉い＋そうだ＝看起來…。',
  },
  {
    id: 'drill-sou-2',
    kind: 'confusable',
    theme: 'そうだ',
    prompt: '空欄に入る最も適当なものを選んでください。\n明日雨が降る（　）。',
    options: ['そうです', 'みたいです', 'ばかりです', 'すぎます'],
    answer: 0,
    exampleZh: '正解句：雨が降るそうです。＝聽說明天會下雨（傳聞）。',
    explanation:
      '正解是「そうです」（傳聞）。普通形＋そうだ＝聽說…。\n樣態そうだ：おいしそうです（看起來好吃）／降りそうです（看起來要下）。',
  },

  // ═══════════════ つもり／予定 ═══════════════
  {
    id: 'drill-tsumori-1',
    kind: 'confusable',
    theme: 'つもり／予定',
    prompt: '空欄に入る最も適当なものを選んでください。\n来年日本へ留学する（　）です。',
    options: ['つもり', 'すぎ', 'ばかり', 'らしい'],
    answer: 0,
    exampleZh: '正解句：留学するつもりです。＝打算明年去日本留學。',
    explanation: '正解是「つもり」＝主觀打算。予定だ較偏客觀行程。',
  },
  {
    id: 'drill-yotei-1',
    kind: 'confusable',
    theme: 'つもり／予定',
    prompt: '空欄に入る最も適当なものを選んでください。\n来週会議をする（　）です。',
    options: ['つもり', '予定', 'ばかり', 'ところ'],
    answer: 1,
    exampleZh: '正解句：会議をする予定です。＝預定下週開會。',
    explanation: '正解是「予定」＝預定／行程（較客觀）。',
  },

  // ═══════════════ てみる／ておく／てしまう ═══════════════
  {
    id: 'drill-te-1',
    kind: 'confusable',
    theme: 'てみる／ておく／てしまう',
    prompt: '空欄に入る最も適当なものを選んでください。\nこの服、着て（　）。',
    options: ['みます', 'おきます', 'しまいます', 'きます'],
    answer: 0,
    exampleZh: '正解句：着てみます。＝試穿看看。',
    explanation: '正解是「みます」。てみる＝試試看。',
  },
  {
    id: 'drill-te-2',
    kind: 'confusable',
    theme: 'てみる／ておく／てしまう',
    prompt: '空欄に入る最も適当なものを選んでください。\n旅行の前に、切符を買って（　）。',
    options: ['みます', 'おきます', 'しまいます', 'あります'],
    answer: 1,
    exampleZh: '正解句：切符を買っておきます。＝事先把票買好。',
    explanation: '正解是「おきます」。ておく＝事先做好準備。',
  },
  {
    id: 'drill-te-3',
    kind: 'confusable',
    theme: 'てみる／ておく／てしまう',
    prompt: '空欄に入る最も適当なものを選んでください。\n宿題を忘れて（　）。',
    options: ['みました', 'おきました', 'しまいました', 'ありました'],
    answer: 2,
    exampleZh: '正解句：忘れてしまいました。＝（不小心）把作業忘了。',
    explanation: '正解是「しまいました」。てしまう＝完成／遺憾地發生了。',
  },

  // ═══════════════ ながら／たり ═══════════════
  {
    id: 'drill-nagara-1',
    kind: 'confusable',
    theme: 'ながら／たり',
    prompt: '空欄に入る最も適当なものを選んでください。\n音楽を聞き（　）、勉強します。',
    options: ['てから', 'ながら', 'たり', 'のに'],
    answer: 1,
    exampleZh: '正解句：聞きながら、勉強します。＝一邊聽音樂一邊讀書。',
    explanation: '正解是「ながら」＝一邊…一邊…（ます形去掉ます＋ながら）。',
  },
  {
    id: 'drill-tari-1',
    kind: 'confusable',
    theme: 'ながら／たり',
    prompt: '空欄に入る最も適当なものを選んでください。\n週末は映画を見（　）、買い物をしたりします。',
    options: ['ながら', 'たり', 'てから', 'のに'],
    answer: 1,
    exampleZh: '正解句：見たり、買い物をしたりします。＝週末看看電影、逛逛街之類的。',
    explanation: '正解是「たり」。た形＋り … たりする＝列舉活動。',
  },

  // ═══════════════ かもしれない／はず ═══════════════
  {
    id: 'drill-kamo-1',
    kind: 'confusable',
    theme: 'かもしれない',
    prompt: '空欄に入る最も適当なものを選んでください。\n彼は来ない（　）。',
    options: ['かもしれません', 'はずです', 'ところです', 'ばかりです'],
    answer: 0,
    exampleZh: '正解句：来ないかもしれません。＝他也許不會來。',
    explanation: '正解是「かもしれません」＝也許…（不確定）。はず＝理應如此。',
  },

  // ═══════════════ ために／ように ═══════════════
  {
    id: 'drill-tame-1',
    kind: 'confusable',
    theme: 'ために／ように',
    prompt: '空欄に入る最も適当なものを選んでください。\n日本語の先生になる（　）、毎日勉強しています。',
    options: ['ように', 'ために', 'のに', 'から'],
    answer: 1,
    exampleZh: '正解句：先生になるために、勉強しています。＝為了成為日語老師而每天學習。',
    explanation:
      '正解是「ために」＝為了…（意志性目的，主語可控制）。\nように 多接可能形／非意志（聞こえるように）。',
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

/** 依句型主題篩選 */
export const DRILL_THEMES = [
  { id: 'all', label: '全部混合' },
  { id: 'te-kara', label: 'てから／から' },
  { id: 'ni-he', label: '助詞（に／へ／を／で）' },
  { id: 'duty', label: '必須／不必／禁止' },
  { id: 'juyo', label: '授受' },
  { id: 'cond', label: '條件・逆接' },
  { id: 'te-aux', label: 'てみる／ておく／てしまう' },
]

export function filterDrillQuestions({ kind, theme, ids }) {
  let pool = drillQuestions
  if (kind && kind !== 'all') pool = pool.filter((q) => q.kind === kind)
  if (theme && theme !== 'all') {
    if (theme === 'te-kara') {
      pool = pool.filter(
        (q) =>
          q.theme.includes('てから') ||
          q.theme.includes('から') ||
          q.theme.includes('の前に'),
      )
    } else if (theme === 'ni-he') {
      pool = pool.filter(
        (q) =>
          q.theme.includes('に') ||
          q.theme.includes('を') ||
          q.theme.includes('で') ||
          q.theme.includes('助詞'),
      )
    } else if (theme === 'duty') {
      pool = pool.filter((q) => q.theme.includes('義務'))
    } else if (theme === 'juyo') {
      pool = pool.filter((q) => q.theme.includes('授受'))
    } else if (theme === 'cond') {
      pool = pool.filter((q) => q.theme.includes('条件') || q.theme.includes('逆接'))
    } else if (theme === 'te-aux') {
      pool = pool.filter((q) => q.theme.includes('てみる'))
    }
  }
  if (ids?.length) {
    const set = new Set(ids)
    pool = pool.filter((q) => set.has(q.id))
  }
  return pool
}

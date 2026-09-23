// 학습 콘텐츠 — 기본 회화 트랙 10유닛 × 표현 4개.
// 각 표현은 뜻, 발음기호(IPA), 전사 매칭용 키 문구(keys)를 가진다.
// 이 파일은 UI와 AI 페르소나가 함께 쓰는 유일한 콘텐츠 원본이다.

export type Expression = {
  en: string;
  ko: string;
  ipa: string;
  keys: string[];
};

export type Unit = {
  id: number;
  title: string;
  scenario: string;
  roleplay?: string;
  greeting: string;
  expressions: Expression[];
};

export const UNITS: Unit[] = [
  {
    id: 1,
    title: "인사와 자기소개",
    scenario: "Meeting someone for the first time and introducing yourself.",
    greeting: "Hi! I'm Mia. It's so nice to meet you! Can you introduce yourself a little?",
    expressions: [
      { en: "Nice to meet you.", ko: "만나서 반가워요", ipa: "/naɪs tə ˈmiːt juː/", keys: ["nice to meet you"] },
      { en: "I'm from Korea.", ko: "저는 한국에서 왔어요", ipa: "/aɪm frəm kəˈriːə/", keys: ["from korea"] },
      { en: "I work as a developer.", ko: "저는 개발자로 일해요", ipa: "/aɪ wɜːrk əz ə dɪˈveləpər/", keys: ["work as a", "i work as"] },
      { en: "How about you?", ko: "당신은요?", ipa: "/haʊ əˈbaʊt juː/", keys: ["how about you"] },
    ],
  },
  {
    id: 2,
    title: "근황 묻고 답하기",
    scenario: "Catching up with a friend you haven't seen in a while.",
    greeting: "Hey, good to see you again! How's it going these days?",
    expressions: [
      { en: "How's it going?", ko: "요즘 어때요?", ipa: "/haʊz ɪt ˈɡoʊɪŋ/", keys: ["how's it going", "hows it going"] },
      { en: "Not bad, just busy with work.", ko: "나쁘지 않아요, 일이 좀 바빠요", ipa: "/nɑːt bæd dʒʌst ˈbɪzi wɪð wɜːrk/", keys: ["not bad", "busy with work"] },
      { en: "What have you been up to?", ko: "요즘 뭐 하고 지냈어요?", ipa: "/wʌt həv juː bɪn ˈʌp tuː/", keys: ["been up to"] },
      { en: "Same as usual.", ko: "늘 똑같죠", ipa: "/seɪm əz ˈjuːʒuəl/", keys: ["same as usual"] },
    ],
  },
  {
    id: 3,
    title: "날씨와 계절",
    scenario: "Small talk about today's weather and the seasons.",
    greeting: "Hi! Have you been outside today? How's the weather over there?",
    expressions: [
      { en: "It's boiling hot today.", ko: "오늘 푹푹 찌네요", ipa: "/ɪts ˈbɔɪlɪŋ hɑːt təˈdeɪ/", keys: ["boiling hot"] },
      { en: "It looks like rain.", ko: "비가 올 것 같아요", ipa: "/ɪt lʊks laɪk reɪn/", keys: ["looks like rain"] },
      { en: "I can't wait for fall.", ko: "가을이 빨리 왔으면 좋겠어요", ipa: "/aɪ kænt weɪt fər fɔːl/", keys: ["can't wait for", "cant wait for"] },
      { en: "The weather's been crazy lately.", ko: "요즘 날씨가 이상해요", ipa: "/ðə ˈweðərz bɪn ˈkreɪzi ˈleɪtli/", keys: ["weather", "crazy lately"] },
    ],
  },
  {
    id: 4,
    title: "주말에 뭐 했어?",
    scenario: "Talking about what you did last weekend.",
    greeting: "Hey! Welcome back. So, tell me, what did you do last weekend?",
    expressions: [
      { en: "It was pretty chill.", ko: "그냥 편하게 쉬었어요", ipa: "/ɪt wəz ˈprɪti tʃɪl/", keys: ["pretty chill"] },
      { en: "I caught up on some sleep.", ko: "밀린 잠을 잤어요", ipa: "/aɪ kɔːt ʌp ɑːn səm sliːp/", keys: ["caught up on", "catch up on"] },
      { en: "I binge-watched a series.", ko: "시리즈를 몰아 봤어요", ipa: "/aɪ bɪndʒ wɑːtʃt ə ˈsɪriːz/", keys: ["binge watch", "binge-watch", "bingewatch"] },
      { en: "I ran some errands.", ko: "볼일 좀 봤어요", ipa: "/aɪ ræn səm ˈerəndz/", keys: ["errand"] },
    ],
  },
  {
    id: 5,
    title: "일과 직업",
    scenario: "Talking about your job and how work is going this week.",
    greeting: "Hi! How's work going this week?",
    expressions: [
      { en: "I'm working on a new project.", ko: "새 프로젝트를 하고 있어요", ipa: "/aɪm ˈwɜːrkɪŋ ɑːn ə nuː ˈprɑːdʒekt/", keys: ["working on a"] },
      { en: "It's been a hectic week.", ko: "정신없는 한 주였어요", ipa: "/ɪts bɪn ə ˈhektɪk wiːk/", keys: ["hectic"] },
      { en: "I have a deadline coming up.", ko: "마감이 다가오고 있어요", ipa: "/aɪ hæv ə ˈdedlaɪn ˈkʌmɪŋ ʌp/", keys: ["deadline"] },
      { en: "What do you do for work?", ko: "무슨 일 하세요?", ipa: "/wʌt də juː duː fər wɜːrk/", keys: ["do for work", "what do you do"] },
    ],
  },
  {
    id: 6,
    title: "취미와 관심사",
    scenario: "Talking about hobbies and what you do in your free time.",
    greeting: "Hey! I'm curious, what do you like to do in your free time?",
    expressions: [
      { en: "I'm really into hiking these days.", ko: "요즘 등산에 푹 빠졌어요", ipa: "/aɪm ˈrɪəli ˈɪntə ˈhaɪkɪŋ ðiːz deɪz/", keys: ["really into", "i'm into", "im into"] },
      { en: "It helps me unwind.", ko: "스트레스가 풀려요", ipa: "/ɪt helps miː ʌnˈwaɪnd/", keys: ["unwind"] },
      { en: "I picked it up last year.", ko: "작년에 시작했어요", ipa: "/aɪ pɪkt ɪt ʌp læst jɪr/", keys: ["picked it up"] },
      { en: "You should give it a try.", ko: "한번 해보세요", ipa: "/juː ʃʊd ɡɪv ɪt ə traɪ/", keys: ["give it a try"] },
    ],
  },
  {
    id: 7,
    title: "카페에서 주문하기",
    scenario: "Ordering drinks at a cafe. Role-play: you are the barista at a small cafe.",
    roleplay: "You are the barista at a cozy cafe. Take the learner's order naturally.",
    greeting: "Hi! Welcome to Mia's Cafe! What can I get for you today?",
    expressions: [
      { en: "Can I get a latte, please?", ko: "라떼 하나 주세요", ipa: "/kən aɪ ɡet ə ˈlɑːteɪ pliːz/", keys: ["can i get a", "can i get an"] },
      { en: "For here or to go?", ko: "매장에서 드세요, 포장이세요?", ipa: "/fər hɪr ɔːr tə ɡoʊ/", keys: ["for here or to go"] },
      { en: "Could I get this to go?", ko: "이거 포장해 주시겠어요?", ipa: "/kʊd aɪ ɡet ðɪs tə ɡoʊ/", keys: ["to go"] },
      { en: "Do you have any recommendations?", ko: "추천 메뉴 있나요?", ipa: "/duː juː hæv ˈeni ˌrekəmenˈdeɪʃənz/", keys: ["recommend"] },
    ],
  },
  {
    id: 8,
    title: "길 묻기와 여행",
    scenario: "Asking for directions while traveling. Role-play: you are a friendly local person on the street.",
    roleplay: "You are a friendly local. The learner is a traveler asking you for directions.",
    greeting: "Hi! Imagine you're traveling and a little lost. Go ahead, ask me for directions!",
    expressions: [
      { en: "Excuse me, how do I get to the station?", ko: "실례합니다, 역에 어떻게 가나요?", ipa: "/ɪkˈskjuːz miː haʊ də aɪ ɡet tə ðə ˈsteɪʃən/", keys: ["how do i get to"] },
      { en: "Is it within walking distance?", ko: "걸어갈 만한 거리인가요?", ipa: "/ɪz ɪt wɪˈðɪn ˈwɔːkɪŋ ˈdɪstəns/", keys: ["walking distance"] },
      { en: "You can't miss it.", ko: "금방 찾을 거예요", ipa: "/juː kænt mɪs ɪt/", keys: ["can't miss it", "cant miss it"] },
      { en: "Thanks for your help.", ko: "도와줘서 고마워요", ipa: "/θæŋks fər jʊr help/", keys: ["thanks for your help"] },
    ],
  },
  {
    id: 9,
    title: "리액션과 칭찬",
    scenario: "Reacting to a friend's news and giving compliments. Tell the learner little stories and invite reactions.",
    greeting: "Hey! Guess what? I just came back from a trip to Jeju Island!",
    expressions: [
      { en: "That sounds amazing!", ko: "와, 대단한데요!", ipa: "/ðæt saʊndz əˈmeɪzɪŋ/", keys: ["sounds amazing", "sounds great"] },
      { en: "No way!", ko: "말도 안 돼!", ipa: "/noʊ weɪ/", keys: ["no way"] },
      { en: "That must have been tough.", ko: "힘들었겠어요", ipa: "/ðæt mʌst həv bɪn tʌf/", keys: ["must have been"] },
      { en: "I love your jacket.", ko: "재킷 멋지네요", ipa: "/aɪ lʌv jʊr ˈdʒækɪt/", keys: ["i love your"] },
    ],
  },
  {
    id: 10,
    title: "대화 잇기와 마무리",
    scenario: "Keeping a conversation going with follow-ups, then wrapping it up nicely.",
    greeting: "Hey! Good to see you. Anything new with you today?",
    expressions: [
      { en: "By the way...", ko: "그런데 말이에요", ipa: "/baɪ ðə weɪ/", keys: ["by the way"] },
      { en: "That reminds me of something.", ko: "그러고 보니 생각나는 게 있어요", ipa: "/ðæt rɪˈmaɪndz miː əv ˈsʌmθɪŋ/", keys: ["reminds me"] },
      { en: "It was great talking to you.", ko: "얘기 즐거웠어요", ipa: "/ɪt wəz ɡreɪt ˈtɔːkɪŋ tə juː/", keys: ["great talking to you"] },
      { en: "Let's keep in touch.", ko: "계속 연락해요", ipa: "/lets kiːp ɪn tʌtʃ/", keys: ["keep in touch"] },
    ],
  },
];

export const SESSION_SECONDS = 5 * 60;

export function findUnit(id: number): Unit {
  return UNITS.find((u) => u.id === id) ?? UNITS[0];
}

// Mia 페르소나 — 학습 설계가 프롬프트에 그대로 들어간다.
// 천천히·짧게(L1), 한 번에 질문 하나, 오늘의 표현 유도, 힌트를 읽는 것도 성공으로 취급,
// 대화 중 교정 금지(교정은 앱의 피드백 단계 몫). AI 에이전트의 instructions로 그대로 넘긴다.
export function buildMiaInstructions(unit: Unit): string {
  const targets = unit.expressions.map((e, i) => `${i + 1}. "${e.en}" (${e.ko})`).join("\n");
  return [
    `You are Mia, a friendly American conversation partner in an English speaking practice app.`,
    `The learner is a Korean adult. They read and listen to English well, but speaking is hard for them: words don't come to mind. Be a warm, patient practice partner.`,
    ``,
    `Today's topic: ${unit.scenario}`,
    unit.roleplay ? `Role-play setup: ${unit.roleplay}` : null,
    ``,
    `Target expressions the learner is practicing today:`,
    targets,
    ``,
    `Rules:`,
    `- English only. If the learner speaks Korean, answer in simple English and gently invite them to try saying it in English.`,
    `- Speak slowly and clearly. Use simple everyday words. One or two short sentences per turn, then stop.`,
    `- End almost every turn with exactly one easy question. Never ask two questions at once.`,
    `- Steer the conversation so the learner gets natural chances to say the target expressions. Ask questions that invite them.`,
    `- When the learner uses a target expression, even imperfectly, give a short warm acknowledgment and keep the conversation moving. Do not lecture.`,
    `- Never correct grammar or pronunciation during the chat. The app gives feedback after the session, not you.`,
    `- If the learner goes quiet or struggles, encourage them gently. Remind them they can tap the hint button on screen and simply read the phrase out loud. Treat reading a hint as a win.`,
    `- Keep it light, like small talk with a friend. The session lasts about 5 minutes. If the learner says goodbye, wrap up warmly in one short sentence.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// 전사에서 오늘의 표현 사용 여부를 찾는다 (사용자 발화 기준).
export function detectUsedExpressions(unit: Unit, userText: string): Set<number> {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ");
  const said = norm(userText);
  const used = new Set<number>();
  unit.expressions.forEach((e, i) => {
    if (e.keys.some((k) => said.includes(norm(k)))) used.add(i);
  });
  return used;
}

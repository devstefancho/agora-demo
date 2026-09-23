// 학습 콘텐츠: 기본 회화 10유닛 × 표현 4개.
// 보조 화면(오늘의 표현)과 Mia 페르소나(lib/mia.ts)가 함께 쓰는 유일한 콘텐츠 원본이다.

export type Expression = {
  en: string;
  ko: string;
  ipa: string;
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
      { en: "Nice to meet you.", ko: "만나서 반가워요", ipa: "/naɪs tə ˈmiːt juː/" },
      { en: "I'm from Korea.", ko: "저는 한국에서 왔어요", ipa: "/aɪm frəm kəˈriːə/" },
      { en: "I work as a developer.", ko: "저는 개발자로 일해요", ipa: "/aɪ wɜːrk əz ə dɪˈveləpər/" },
      { en: "How about you?", ko: "당신은요?", ipa: "/haʊ əˈbaʊt juː/" },
    ],
  },
  {
    id: 2,
    title: "근황 묻고 답하기",
    scenario: "Catching up with a friend you haven't seen in a while.",
    greeting: "Hey, good to see you again! How's it going these days?",
    expressions: [
      { en: "How's it going?", ko: "요즘 어때요?", ipa: "/haʊz ɪt ˈɡoʊɪŋ/" },
      { en: "Not bad, just busy with work.", ko: "나쁘지 않아요, 일이 좀 바빠요", ipa: "/nɑːt bæd dʒʌst ˈbɪzi wɪð wɜːrk/" },
      { en: "What have you been up to?", ko: "요즘 뭐 하고 지냈어요?", ipa: "/wʌt həv juː bɪn ˈʌp tuː/" },
      { en: "Same as usual.", ko: "늘 똑같죠", ipa: "/seɪm əz ˈjuːʒuəl/" },
    ],
  },
  {
    id: 3,
    title: "날씨와 계절",
    scenario: "Small talk about today's weather and the seasons.",
    greeting: "Hi! Have you been outside today? How's the weather over there?",
    expressions: [
      { en: "It's boiling hot today.", ko: "오늘 푹푹 찌네요", ipa: "/ɪts ˈbɔɪlɪŋ hɑːt təˈdeɪ/" },
      { en: "It looks like rain.", ko: "비가 올 것 같아요", ipa: "/ɪt lʊks laɪk reɪn/" },
      { en: "I can't wait for fall.", ko: "가을이 빨리 왔으면 좋겠어요", ipa: "/aɪ kænt weɪt fər fɔːl/" },
      { en: "The weather's been crazy lately.", ko: "요즘 날씨가 이상해요", ipa: "/ðə ˈweðərz bɪn ˈkreɪzi ˈleɪtli/" },
    ],
  },
  {
    id: 4,
    title: "주말에 뭐 했어?",
    scenario: "Talking about what you did last weekend.",
    greeting: "Hey! Welcome back. So, tell me, what did you do last weekend?",
    expressions: [
      { en: "It was pretty chill.", ko: "그냥 편하게 쉬었어요", ipa: "/ɪt wəz ˈprɪti tʃɪl/" },
      { en: "I caught up on some sleep.", ko: "밀린 잠을 잤어요", ipa: "/aɪ kɔːt ʌp ɑːn səm sliːp/" },
      { en: "I binge-watched a series.", ko: "시리즈를 몰아 봤어요", ipa: "/aɪ bɪndʒ wɑːtʃt ə ˈsɪriːz/" },
      { en: "I ran some errands.", ko: "볼일 좀 봤어요", ipa: "/aɪ ræn səm ˈerəndz/" },
    ],
  },
  {
    id: 5,
    title: "일과 직업",
    scenario: "Talking about your job and how work is going this week.",
    greeting: "Hi! How's work going this week?",
    expressions: [
      { en: "I'm working on a new project.", ko: "새 프로젝트를 하고 있어요", ipa: "/aɪm ˈwɜːrkɪŋ ɑːn ə nuː ˈprɑːdʒekt/" },
      { en: "It's been a hectic week.", ko: "정신없는 한 주였어요", ipa: "/ɪts bɪn ə ˈhektɪk wiːk/" },
      { en: "I have a deadline coming up.", ko: "마감이 다가오고 있어요", ipa: "/aɪ hæv ə ˈdedlaɪn ˈkʌmɪŋ ʌp/" },
      { en: "What do you do for work?", ko: "무슨 일 하세요?", ipa: "/wʌt də juː duː fər wɜːrk/" },
    ],
  },
  {
    id: 6,
    title: "취미와 관심사",
    scenario: "Talking about hobbies and what you do in your free time.",
    greeting: "Hey! I'm curious, what do you like to do in your free time?",
    expressions: [
      { en: "I'm really into hiking these days.", ko: "요즘 등산에 푹 빠졌어요", ipa: "/aɪm ˈrɪəli ˈɪntə ˈhaɪkɪŋ ðiːz deɪz/" },
      { en: "It helps me unwind.", ko: "스트레스가 풀려요", ipa: "/ɪt helps miː ʌnˈwaɪnd/" },
      { en: "I picked it up last year.", ko: "작년에 시작했어요", ipa: "/aɪ pɪkt ɪt ʌp læst jɪr/" },
      { en: "You should give it a try.", ko: "한번 해보세요", ipa: "/juː ʃʊd ɡɪv ɪt ə traɪ/" },
    ],
  },
  {
    id: 7,
    title: "카페에서 주문하기",
    scenario: "Ordering drinks at a cafe. Role-play: you are the barista at a small cafe.",
    roleplay: "You are the barista at a cozy cafe. Take the learner's order naturally.",
    greeting: "Hi! Welcome to Mia's Cafe! What can I get for you today?",
    expressions: [
      { en: "Can I get a latte, please?", ko: "라떼 하나 주세요", ipa: "/kən aɪ ɡet ə ˈlɑːteɪ pliːz/" },
      { en: "For here or to go?", ko: "매장에서 드세요, 포장이세요?", ipa: "/fər hɪr ɔːr tə ɡoʊ/" },
      { en: "Could I get this to go?", ko: "이거 포장해 주시겠어요?", ipa: "/kʊd aɪ ɡet ðɪs tə ɡoʊ/" },
      { en: "Do you have any recommendations?", ko: "추천 메뉴 있나요?", ipa: "/duː juː hæv ˈeni ˌrekəmenˈdeɪʃənz/" },
    ],
  },
  {
    id: 8,
    title: "길 묻기와 여행",
    scenario: "Asking for directions while traveling. Role-play: you are a friendly local person on the street.",
    roleplay: "You are a friendly local. The learner is a traveler asking you for directions.",
    greeting: "Hi! Imagine you're traveling and a little lost. Go ahead, ask me for directions!",
    expressions: [
      { en: "Excuse me, how do I get to the station?", ko: "실례합니다, 역에 어떻게 가나요?", ipa: "/ɪkˈskjuːz miː haʊ də aɪ ɡet tə ðə ˈsteɪʃən/" },
      { en: "Is it within walking distance?", ko: "걸어갈 만한 거리인가요?", ipa: "/ɪz ɪt wɪˈðɪn ˈwɔːkɪŋ ˈdɪstəns/" },
      { en: "You can't miss it.", ko: "금방 찾을 거예요", ipa: "/juː kænt mɪs ɪt/" },
      { en: "Thanks for your help.", ko: "도와줘서 고마워요", ipa: "/θæŋks fər jʊr help/" },
    ],
  },
  {
    id: 9,
    title: "리액션과 칭찬",
    scenario: "Reacting to a friend's news and giving compliments. Tell the learner little stories and invite reactions.",
    greeting: "Hey! Guess what? I just came back from a trip to Jeju Island!",
    expressions: [
      { en: "That sounds amazing!", ko: "와, 대단한데요!", ipa: "/ðæt saʊndz əˈmeɪzɪŋ/" },
      { en: "No way!", ko: "말도 안 돼!", ipa: "/noʊ weɪ/" },
      { en: "That must have been tough.", ko: "힘들었겠어요", ipa: "/ðæt mʌst həv bɪn tʌf/" },
      { en: "I love your jacket.", ko: "재킷 멋지네요", ipa: "/aɪ lʌv jʊr ˈdʒækɪt/" },
    ],
  },
  {
    id: 10,
    title: "대화 잇기와 마무리",
    scenario: "Keeping a conversation going with follow-ups, then wrapping it up nicely.",
    greeting: "Hey! Good to see you. Anything new with you today?",
    expressions: [
      { en: "By the way...", ko: "그런데 말이에요", ipa: "/baɪ ðə weɪ/" },
      { en: "That reminds me of something.", ko: "그러고 보니 생각나는 게 있어요", ipa: "/ðæt rɪˈmaɪndz miː əv ˈsʌmθɪŋ/" },
      { en: "It was great talking to you.", ko: "얘기 즐거웠어요", ipa: "/ɪt wəz ɡreɪt ˈtɔːkɪŋ tə juː/" },
      { en: "Let's keep in touch.", ko: "계속 연락해요", ipa: "/lets kiːp ɪn tʌtʃ/" },
    ],
  },
];

export function findUnit(id: number): Unit {
  return UNITS.find((u) => u.id === id) ?? UNITS[0];
}

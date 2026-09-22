# AI 파트너와 음성 대화 웹 프로젝트 생성 스펙

이 디렉토리의 정본 문서(SSOT)다. 현재 구현이 무엇인지, 그리고 코딩 에이전트에 넣으면 같은 프로젝트가 나오도록 어떤 순서로 만드는지를 한 곳에 적는다. 구현을 바꾸면 이 문서를 같이 고친다. 경로는 따로 적지 않으면 `voice-ai-web/` 기준이다.

## 요약

- 만드는 것: 하루 5분 영어 말하기 연습 앱. 브라우저에서 AI 파트너 Mia 와 5분 동안 영어로 스몰토크를 한다. Mia 는 Agora Conversational AI Engine 이 채널에 들여보내는 에이전트이고, 내 말을 듣고(ASR) 생각하고(LLM) 말한다(TTS). 모델은 Agora 가 관리해서 이 앱에는 벤더 키가 없다.
- 만드는 순서는 둘이다. [단계 A](#stage-a) 껍데기(화면·계약·도구 전부, 목소리만 없음)를 만들고 커밋한다. [단계 B](#stage-b) Agora 통합을 중간 승인 없이 한 번에 한다(`/integrate-voice`).
- Agora 코드는 파일 셋에만 있다: `lib/agora/convoai.ts`(브라우저), `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts`(서버).
- 완성 판정은 [검증](#verify)의 명령과 사람 확인 목록이다.

## 넣는 법

이 문서 말고 이 레포에서 그대로 복사해 입력으로 두는 파일이 있다.

| 복사해 두는 파일 | 이유 |
|---|---|
| `docs/spec.md` (이 문서), `docs/design.md` | 스펙과 디자인 규칙 정본 |
| `.claude/commands/integrate-voice.md`, `.mcp.json` | 명령과 MCP 설정 |
| `.claude/skills/agora/` | 공식 skill 1.8.1 (준비물 표 참고) |

그 디렉토리를 git 저장소로 만들고 에이전트에게 이렇게 준다.

```
docs/spec.md 를 읽고 단계 A 를 만든 뒤 커밋해. 커밋이 끝나면 단계 B 를 1번부터 5번까지 한 번에 수행해. 단계마다 완료 조건을 통과시킨 뒤 넘어가.
```

단계 A 와 B 사이의 커밋은 빠뜨리면 안 된다. `scripts/check-integration.mjs` 가 `git diff HEAD` 로 "통합이 화면 코드를 건드리지 않았는지"를 보기 때문이다.

## 준비물

| 무엇 | 어디서 |
|---|---|
| Node 22 이상, pnpm 11 | 시스템 |
| Next.js 16.3.4, React 19.2.8, Tailwind 4, TypeScript 5, ESLint 9 | `pnpm create next-app voice-ai-web` (App Router, `app/`, alias `@/*`) |
| Agora 공식 skill 1.8.1 | `AgoraIO/skills` 의 `agora` 폴더를 `.claude/skills/agora/` 로 복사. 고치지 않는다 |
| `agora` CLI | `curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh \| sh` → `agora login` |
| Conversational AI 가 켜진 Agora 프로젝트 | `agora project doctor` 에 `convoai enabled`. 꺼져 있으면 `agora project feature enable convoai` |
| 공식 Next.js quickstart | 단계 B 2번에서 레포 바깥에 클론한다. 통합 코드의 원본이다 |
| 갈무리 픽셀 글꼴 | npm `galmuri` (OFL-1.1) |
| cloudflared (선택) | `brew install cloudflared`. 폰 브라우저로 열 때 HTTPS 터널(마이크는 HTTPS 에서만 열린다) |

에이전트가 채널에 들어와 있는 시간만큼 Conversational AI 사용량이 쌓인다. 요금과 무료 사용량은 Agora 요금 문서를 본다.

## 디렉토리 구조

```
voice-ai-web/                   Next.js 앱이 이 디렉토리 자체다
  AGENTS.md                     에이전트 규칙 정본 (CLAUDE.md 는 "@AGENTS.md" 한 줄)
  README.md                     따라 하기 · 구조
  .mcp.json                     agora-docs-mcp(http https://mcp.agora.io) · agora-cli(stdio "agora mcp serve")
  .claude/
    skills/agora/               공식 skill 복사본
    commands/integrate-voice.md frontmatter description + "docs/spec.md 의 단계 B 를 1번부터 5번까지 한 번에 수행해. 중간에 승인을 묻지 말고, 막히면 5번 보고 형식으로 멈춰."
  scripts/
    doctor.mjs                  준비 점검
    check-integration.mjs       통합 결과 기계 검증
  docs/
    design.md                   디자인 규칙 (토큰·타이포·부품·Mia 구슬·대화 화면)
    spec.md                     이 문서 (SSOT)
  next.config.ts                allowedDevOrigins: ["*.trycloudflare.com"]
  pnpm-workspace.yaml           allowBuilds: sharp false, unrs-resolver false
  app/
    layout.tsx                  갈무리 localFont(--font-pixel), lang="ko", title "하루 5분 영어 말하기"
    page.tsx                    <PracticeApp /> 하나
    globals.css                 토큰 · 모눈 바탕 · .screen-enter · .orb
    api/agora/
      token/route.ts            RTC+RTM 토큰 발급 (Agora 서버 코드 1)
      agent/route.ts            에이전트 start·stop (Agora 서버 코드 2)
  components/
    PracticeApp.tsx             화면 상태머신
    MiaOrb.tsx                  Mia 구슬과 상태 문구
    ui.tsx                      Button · Card · Label · Chip · Shell
    screens/                    Home · Warmup · Talk · Done
  content/units.ts              10유닛 × 표현 4개, Mia 지시문
  lib/
    voice.ts                    음성 대화 계약
    storage.ts                  localStorage 세션 기록
    speech.ts                   Web Speech 발음 듣기
    agora/convoai.ts            Conversational AI 클라이언트 (Agora 클라이언트 코드)
  public/.gitkeep
```

`.gitignore` 에 반드시 넣는다: `.env*`, `node_modules/`, `.next/`, `.agora/`, `.claude/worktrees/`, `next-env.d.ts`, `*.tsbuildinfo`.

<a id="stage-a"></a>
## 단계 A. 껍데기

화면·콘텐츠·계약·도구를 전부 만들고, Agora 를 부르는 자리만 비워 둔다. 끝나면 앱은 뜨고 대화 화면의 구슬 아래에 "Mia에게 아직 목소리가 없어요" 가 보인다.

### 화면 흐름 (`components/PracticeApp.tsx`)

- 클라이언트 전용. `useSyncExternalStore` 로 마운트 여부를 보고 서버 렌더에서는 아무것도 그리지 않는다.
- `home → warmup → talk → done`.
- 오늘의 유닛은 `UNITS[지금까지 세션 수 % 10]`. 홈에서 다른 유닛을 고를 수 있다.
- 대화가 끝나면 `TalkResult { transcript, hints, durationSec, connected, reason? }`(`Talk.tsx` 가 export) 를 받는다. `connected` 일 때만 `SessionRecord` 를 저장한다.

### 화면 넷

| 화면 | 내용 |
|---|---|
| `Home` | 제목 "영어 말하기", 연속 일수 문구, 배지 "L1 · 5분". 오늘의 세션 카드(유닛 제목, "Mia와 5분 대화 · 오늘의 표현 4개", 표현 4개, 버튼 "Mia와 대화"). 유닛 10개 2열 선택. 통계 셋(완료한 세션·연속·최근 힌트) |
| `Warmup` | 표현 한 장씩 영어·뜻·IPA, "🔊 발음 듣기", 이전·다음, 마지막은 "대화 시작". "건너뛰고 바로 대화 시작" |
| `Talk` | 아래 [대화 화면](#talk-screen) |
| `Done` | "세션 완료" 또는 "아직 대화 전"(연결 전에 끝나면 "Mia와 연결되기 전에 끝났어요. 다시 대화해 보세요"). 오늘의 표현 칩(내 전사 기준 사용 여부), 사용한 표현 n/4 · 대화 시간 · 힌트, 접히는 "대화 기록 보기"(나·Mia 차례로), "홈으로" |

<a id="talk-screen"></a>
### 대화 화면 (`components/screens/Talk.tsx`)

- 위: 유닛 제목, 오른쪽에 5분 타이머(36px). 타이머는 `live` 동안만 흐르고 30초 남으면 warn 색, 0 이면 "시간이 다 됐어요" 로 끝낸다.
- 가운데: `MiaOrb`(168px 픽셀 구슬 + "Mia" + 상태 문구). 상태가 `unavailable` 이면 "화면은 다 있는데 목소리가 없어요. Mia의 목소리는 `lib/agora/convoai.ts` 의 `createConvoAiVoice()` 한 곳에서 들어옵니다" 카드.
- 자막 카드(`connecting`·`live` 이거나 전사가 있을 때): Mia 의 마지막 말, 나의 마지막 말. 비어 있으면 "…".
- 오늘의 표현 카드: 칩 넷. 내 전사에 키 문구가 나오면 `done`.
- accent 버튼 "💡 단어가 안 떠올라요": 가운데 힌트 카드(표현을 차례로 하나씩, "🔊 듣기"·"읽었어요", Esc, "Mia는 기다리고 있어요"). 누른 횟수가 힌트 수다.
- 맨 아래 ghost 버튼 "대화 끝내기".
- 상태 문구: idle "준비 중", connecting "Mia를 부르는 중이에요…", live "Mia와 대화 중 · 편하게 말해보세요", agent-left "Mia가 자리를 비웠어요", ended "대화가 끝났어요", unavailable "Mia에게 아직 목소리가 없어요", error "연결에 문제가 생겼어요"(사유가 오면 사유).
- 세션은 `useRef(createVoiceSession())`. effect 정리에서 `stop()` 을 부른다(개발 모드 effect 두 번 실행 대비). "대화 끝내기"·시간 종료도 `stop()` 을 부르고 그 반환 전사로 `TalkResult` 를 만든다. 그래서 `stop()` 은 여러 번 불려도 된다.

### 계약 `lib/voice.ts`

화면은 이 파일만 안다. SDK 를 import 하지 않는다.

```ts
export type VoiceStatus = "idle" | "connecting" | "live" | "agent-left" | "ended" | "unavailable" | "error";
export type TranscriptTurn = { role: "user" | "agent"; text: string };
export type VoiceStartOptions = {
  unit: Unit;
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onTranscript?: (turns: TranscriptTurn[]) => void; // 매번 전체 누적
};
export interface VoiceSession {
  start(options: VoiceStartOptions): Promise<void>;
  stop(): Promise<{ transcript: TranscriptTurn[] }>;
}
export function createVoiceSession(): VoiceSession; // ?preview=live 면 previewSession(), 아니면 createConvoAiVoice()
```

`previewSession()` 은 목소리 없이 connecting → live(1.2초) 를 흉내 내고, 2.2초부터 1.8초 간격으로 Mia 인사 → 내 말(오늘의 첫 표현) → Mia 대답을 전사로 보낸다. 파일 머리 주석에 start·stop 의 순서를 적는다(단계 B 가 그 주석을 따른다).

### 껍데기 파일

첫 줄에 표식 주석 `// 껍데기: 통합 단계가 이 파일을 채운다.` 를 둔다. 통합이 끝나면 이 줄이 사라져야 한다.

| 파일 | 껍데기 본문 |
|---|---|
| `lib/agora/convoai.ts` | `export function createConvoAiVoice(): VoiceSession`. `start({ onStatus })` 가 `onStatus("unavailable", "Mia에게 아직 목소리가 없어요")`, `stop()` 은 `{ transcript: [] }` |
| `app/api/agora/token/route.ts` | `GET` 이 `Response.json({ error: "아직 껍데기" }, { status: 501 })`. 머리 주석에 계약 `GET ?channel=&uid=` → `{ appId, channel, uid, token }`(RTC+RTM 통합 토큰) |
| `app/api/agora/agent/route.ts` | `POST`·`DELETE` 가 같은 501. 머리 주석에 계약 `POST { channel, uid, unitId }` → `{ agentId, agentUid }`, `DELETE ?agentId=` → `{ ok: true }` |

### 콘텐츠 `content/units.ts`

- `Expression { en, ko, ipa, keys }`(keys 는 전사 매칭용 소문자 키 문구), `Unit { id, title, scenario, roleplay?, greeting, expressions }`. 유닛마다 표현 4개.
- 유닛 제목 10개: 인사와 자기소개 · 근황 묻고 답하기 · 날씨와 계절 · 주말에 뭐 했어? · 일과 직업 · 취미와 관심사 · 카페에서 주문하기 · 길 묻기와 여행 · 리액션과 칭찬 · 대화 잇기와 마무리. `scenario` 는 영어 한 문장, `greeting` 은 Mia 의 첫마디(영어, 질문 하나로 끝남).
- `buildMiaInstructions(unit)`: 에이전트 지시문(영어). Mia 는 친근한 미국인 대화 상대, 학습자는 듣기·읽기는 되지만 말이 안 나오는 한국 성인. 오늘의 주제·역할극·목표 표현 넷을 넣고, 규칙: 영어만, 천천히 짧게(한 턴 한두 문장), 거의 매 턴 쉬운 질문 하나로 끝냄, 목표 표현을 말할 기회를 만듦, 쓰면 짧게 반기고 넘어감, 대화 중 문법·발음 교정 금지, 막히면 화면의 힌트 버튼을 읽어도 된다고 격려, 약 5분 스몰토크, 작별 인사면 한 문장으로 마무리.
- `detectUsedExpressions(unit, userText)`: 소문자·따옴표 정규화 후 키 문구 포함 여부로 사용한 표현 번호 집합.
- `SESSION_SECONDS = 300`, `findUnit(id)`(없으면 첫 유닛).

### 나머지 lib

- `lib/storage.ts`: 키 `practice.sessions`, `SessionRecord { date(YYYY-MM-DD), unitId, hints, durationSec }`, `loadSessions`·`saveSession`·`streak`(오늘 없으면 어제부터 연속 일수)·`today`·`formatClock(m:ss)`.
- `lib/speech.ts`: `speak(text)` 은 영어 목소리(Samantha 나 Google US English 우선) rate 0.85, `stopSpeaking()`.

### 디자인

`docs/design.md` 가 정본이다. 핵심만: 모눈종이 위의 픽셀. 토큰 paper `#f5f2ea` · paper-deep `#ebe6da` · card `#fffdf8` · ink `#1f1c17` · ink-soft `#4a463f` · muted `#7d786d` · line `#e0dbcf` · line-strong `#c9c2b2` · accent `#d8542a`/`#b5431f` · good `#2e7a4d`/`#e3f0e7` · warn `#b3401e` · grid `#e9e4d8`(24px 모눈). 글꼴은 갈무리 하나, 크기는 6의 배수만(12·18·24·30·36·42). 모서리 각지게, 테두리 2px, 그림자는 흐림 0(`shadow-px` 4px, `shadow-px-sm` 2px). 다크 모드 없음. 모션은 `steps()` 뿐이고 `prefers-reduced-motion` 을 존중한다. Mia 구슬 `.orb` 는 계단 모서리 `clip-path` 168px, 쉬는 색 `#dcd2bd`, `live` 면 accent 로 1.6초마다 한 칸 커졌다 돌아온다. 모든 화면은 가운데 560px 컬럼(`Shell`) 하나라 폰 브라우저에서도 그대로 쓴다.

### 도구

- `scripts/doctor.mjs`: ✓/✗/△ 로 Node 22+, `agora version`, `agora auth status --json`, `agora project doctor --json` 의 `convoai_enabled`, `.env.local` 의 `NEXT_PUBLIC_AGORA_APP_ID`·`NEXT_AGORA_APP_CERTIFICATE`(값은 출력하지 않고 "설정됨"만), cloudflared(△). ✗ 마다 고치는 명령을 한 줄 붙인다. 끝 문구 "준비 끝. 통합을 시작할 차례예요."
- `scripts/check-integration.mjs voice`: (a) 화면 코드 보존: `git diff HEAD` 와 untracked 에 `components/`·`content/`·`app/page.tsx`·`app/layout.tsx`·`app/globals.css`·`lib/voice.ts`·`lib/storage.ts`·`lib/speech.ts`·`scripts/`·`docs/` 가 없다 (b) SDK import 격리: `agora-rtc-sdk-ng`·`agora-rtm`·`agora-agent-client-toolkit` 은 `lib/agora/` 안, `agora-token`·`agora-agents` 는 `app/api/agora/` 안 (c) 껍데기 표식 소멸(파일 셋) (d) token route `GET`, agent route `POST`·`DELETE` 존재와 "아직 껍데기" 없음 (e) `lib/`·`components/` 에 `APP_CERTIFICATE` 와 32자 hex 없음 (f) `pnpm lint`·`pnpm build`. 그리고 필수 문자열: `convoai.ts` 에 `createConvoAiVoice`·`/api/agora/token`·`/api/agora/agent`·SDK 셋, token route 에 `buildTokenWithRtm`, agent route 에 `agora-agents`·`buildMiaInstructions`·`findUnit`·`enable_rtm`·`data_channel`·`stopAgent`. 실패가 있으면 `아직 "된다"고 말하지 마세요.`, 없으면 "기계 검증 통과. 이제 사람이 확인할 차례예요."

### 단계 A 완료 조건

- `pnpm lint`·`pnpm build` 통과.
- `node scripts/check-integration.mjs voice` 가 껍데기 항목(표식·route 501)에서만 실패한다.
- `/?preview=live` 에서 주황 구슬, 자막 세 줄, 오늘의 첫 표현 칩 체크가 보인다.
- 커밋한다.

<a id="stage-b"></a>
## 단계 B. Agora 통합

단계 A 의 껍데기에 Mia 의 목소리를 붙인다. 목소리는 Agora Conversational AI Engine, 내 마이크와 Mia 의 소리는 RTC, 전사는 Signaling(RTM)으로 온다. `/integrate-voice` 명령이 이 절을 가리킨다. 1번부터 5번까지 한 번에 수행하고 중간에 승인을 묻지 않는다. 막히면 그 자리에서 멈추고 5번 보고 형식으로 어디서 막혔는지 적는다.

전제: 단계 A 가 커밋돼 있고 `git status` 가 깨끗하다. 완성본에서 다시 돌리지 않는다.

### 1. 규칙

- Agora 판단은 전부 `.claude/skills/agora/SKILL.md` 와 그 참조로 한다. 웹 검색·기억 금지. 스킬 자동 로드가 없는 에이전트도 이 파일들을 직접 읽는다.
- 이 요청은 스킬의 ConvoAI **integration** 경로다(이미 있는 앱에 붙인다). 읽는 순서: `references/conversational-ai/README.md` → `quickstarts.md` → `integration-from-quickstart.md` → `architecture.md` → `server-sdks.md` → `agent-toolkit.md` → `references/server/tokens.md` → `references/integration-patterns.md`(RTC+RTM identity 절). 공식 Next.js quickstart 소스를 원본으로 삼는다. 새 앱을 만들거나 이 앱의 구조를 바꾸지 않는다.
- 파이프라인은 quickstart 기본값 그대로다: Agora 관리 모델(ASR·LLM·TTS), 벤더 키 없음, 언어 `en`. BYOK·MLLM·커스텀 LLM 을 쓰지 않는다. 지시문과 첫 인사만 이 앱 것(`buildMiaInstructions`·`unit.greeting`)으로 바꾼다.
- 고쳐도 되는 파일: `lib/agora/convoai.ts`, `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts`, `package.json`·`pnpm-lock.yaml`. 그 밖은 읽기만 한다. 특히 계약 `lib/voice.ts`, `components/**`, `content/**`, `scripts/**`, `docs/**`.
- import 격리: `agora-rtc-sdk-ng`·`agora-rtm`·`agora-agent-client-toolkit` 은 `convoai.ts` 안에만, `agora-token` 은 token route 안에만, `agora-agents` 는 agent route 안에만.
- App Certificate(`NEXT_AGORA_APP_CERTIFICATE`)는 `app/api/agora/` 에서만 읽는다. `.env.local` 을 열거나 셸 명령에 넣지 않는다. 존재 확인은 `node scripts/doctor.mjs` 로만. 토큰 응답을 화면·로그에 찍지 않는다.
- 이 앱과 quickstart 의 dev 서버를 한 디렉토리에서 둘 띄우지 않는다. 녹음 파일·가짜 마이크로 검증하지 않는다. 실제 목소리 확인은 사람이 한다.

### 2. 준비 점검

1. `node scripts/doctor.mjs`. ✗ 가 있으면 적힌 명령을 실행하고 다시 본다. `.env.local` 이 없으면 이 디렉토리에서 `agora project env write --template nextjs`(값을 손으로 옮기지 않는다). △(cloudflared)는 넘어간다.
2. `lib/voice.ts` 를 읽는다. 상태 이름과 순서, `VoiceStartOptions`, `VoiceSession` 이 계약이다. `createConvoAiVoice` 는 이름과 시그니처를 그대로 둔다. `content/units.ts` 의 `findUnit`·`buildMiaInstructions`·`Unit.greeting` 을 확인한다.
3. 공식 Next.js quickstart 를 이 레포 바깥에 확보한다. 레포의 부모 디렉토리에 `agent-quickstart-nextjs` 가 이미 있으면 그것을 쓴다. 없으면 부모 디렉토리에서 `agora quickstart create agent-quickstart-nextjs --template nextjs --json` 으로 클론하고 `agora quickstart env write <그 경로> --json` 으로 env 를 쓴다(`quickstart create` 가 문서화된 오류 코드로 실패할 때만 `quickstarts.md` 에 적힌 repo 를 `git clone`). `pnpm install`(`ERR_PNPM_IGNORED_BUILDS` 는 경고라 넘어간다) → quickstart README 의 dev 명령을 그대로 한 번 띄워 HTTP 응답을 확인하고 끈다. baseline gate 네 칸 중 `quickstart_repo_cloned`·`official_start_command_run` 을 채운다. 나머지 둘(`agent_join_verified`·`rtc_client_connected`)은 사람이 말해 봐야 채워지므로 5번 사람 확인으로 넘긴다.
4. quickstart 소스를 읽고 copy map 을 만든다. 형식은 `integration-from-quickstart.md` 대로(소스 파일 → 이 앱 파일 → 바꿀 점). 최소 다섯 줄: 토큰 route → `app/api/agora/token/route.ts`, 에이전트 start → `app/api/agora/agent/route.ts` `POST`, 에이전트 stop → 같은 파일 `DELETE`, 에이전트 uid 상수 → agent route 안 상수(값은 아래 3번), 클라이언트 연결·오디오·전사 → `lib/agora/convoai.ts`. 표는 5번 보고에 넣는다. 승인은 기다리지 않는다.
5. 스킬 참조를 읽고 네 가지를 한 줄씩 메모한다(5번 보고에 쓴다): 에이전트 세션의 `remoteUids` 에 내 uid 를 넣는 이유, RTM login 의 userId 가 토큰 identity 와 같아야 하는 이유, 전사가 브라우저까지 오는 길(`enable_rtm`·`data_channel`·툴킷), Next.js 에서 클라이언트 SDK 를 브라우저에서만 불러오는 방법.

### 3. 적용

1. 의존성: `pnpm add agora-rtc-sdk-ng agora-rtm agora-token agora-agents agora-agent-client-toolkit`. 버전은 quickstart `package.json` 과 같은 메이저·마이너로 고정한다(`pnpm add agora-agents@<그 버전>` 처럼). `pnpm add` 가 최신 메이저를 끌어오면 API 가 달라진다.
2. token route: `GET ?channel=&uid=` → `{ appId, channel, uid, token }`. channel 이 없거나 uid 가 1~2^32-1 정수가 아니면 400, env 가 없으면 500("agora project env write --template nextjs 를 실행하세요"). 토큰은 `RtcTokenBuilder.buildTokenWithRtm(appId, cert, channel, String(uid), RtcRole.PUBLISHER, 3600, 3600)`. RTC 는 숫자 uid 로 join 하고 RTM 은 `String(uid)` 로 login 해도 되는 근거를 설치된 `node_modules/agora-token/src/RtcTokenBuilder2.js`(`buildTokenWithUid` 가 `buildTokenWithUserAccount` 로 위임)와 `AccessToken2.js`(`ServiceRtc` 생성자)에서 직접 읽고 메모에 한 줄 적는다. 다르면 멈추고 보고한다. 껍데기의 501·"아직 껍데기"·표식 주석을 지운다.
3. agent route:
   - 에이전트 uid 는 이 파일의 상수 `AGENT_UID = "9000001"` 이다. 클라이언트 uid 범위(1~1,000,000) 밖이라 겹치지 않는다. 클라이언트는 이 값을 따로 갖지 않고 `POST` 응답의 `agentUid` 로 Mia 를 알아본다.
   - `POST` body `{ channel, uid, unitId }`. channel 이 없거나 uid 가 정수가 아니면 400, env 가 없으면 500. `unit = findUnit(Number(unitId))`, 지시문 `buildMiaInstructions(unit)`, 첫 인사 `unit.greeting`. 클라이언트는 `unitId` 만 보내고 지시문은 서버가 만든다.
   - `agora-agents` 의 `AgoraClient`(quickstart 와 같은 area, appId, appCertificate)와 `Agent`. 턴 감지·`advancedFeatures`(`enable_rtm: true`)·`parameters`(`data_channel: "rtm"` 등)·STT·LLM·TTS 는 quickstart 값을 그대로 옮기고, STT 언어는 `en`, 실패 문구는 영어 한 문장.
   - 세션은 `channel`, 에이전트 uid, `remoteUids: [String(uid)]`, 유휴 종료·만료는 quickstart 값. `start()` 가 준 id 로 `{ agentId, agentUid }` 를 돌려준다. 실패는 500 과 사유(시크릿 없이).
   - `DELETE ?agentId=` → `client.stopAgent(agentId)` → `{ ok: true }`. agentId 가 없으면 400. 404 이거나 "이미 종료 중" 오류(quickstart 의 stop route 가 판정하는 것)는 성공으로 본다.
   - 껍데기의 501·"아직 껍데기"·표식 주석을 지운다.
4. `convoai.ts`: `createConvoAiVoice(): VoiceSession`. SDK 는 모두 `start()` 안에서 `await import(...)`(모듈 최상위 import 금지).
   - `start({ unit, onStatus, onTranscript })`: `onStatus("connecting")` → 채널 `talk-` + 소문자·숫자 6자, uid 1~1,000,000 난수 → `GET /api/agora/token` → `agora-rtc-sdk-ng` 불러오기(quickstart 가 publish 전에 하는 모듈 설정이 있으면 그대로) → `createClient({ mode: "rtc", codec: "vp8" })` → 핸들러 등록(join 전): `user-published` audio 면 subscribe 후 `play()`, `user-left` 가 에이전트 uid 면 `onStatus("agent-left")` → `join(appId, channel, token, uid)` → `createMicrophoneAudioTrack()` → `publish` → `agora-rtm` 으로 `new RTM(appId, String(uid))` → `login({ token })` → `subscribe(channel)` → 툴킷(`agora-agent-client-toolkit`)을 RTC·RTM 엔진으로 초기화하고 전사 갱신 이벤트를 구독(quickstart 방식) → `POST /api/agora/agent { channel, uid, unitId: unit.id }` → agentId·agentUid 기억 → `onStatus("live")`.
   - 전사: 툴킷이 주는 전체 목록을 매번 `TranscriptTurn[]` 로 바꿔 `onTranscript` 에 넘긴다. 항목의 uid 가 `POST` 응답의 `agentUid` 와 같으면 `agent`, 아니면 `user`. 빈 문자열은 뺀다. quickstart 가 문장부호 뒤 띄어쓰기를 보정하면 그것도 옮긴다. 에이전트 uid 를 받기 전에 온 목록은 다음 갱신 때 다시 매긴다.
   - `stop()`: 진행 중인 start 를 멈춘다(세대 번호. start 는 await 마다 세대를 확인하고, 바뀌었으면 자기가 만든 것을 정리하고 끝낸다. 에이전트를 이미 만들었으면 그것도 멈춘다). 그다음 `DELETE /api/agora/agent?agentId=` → 툴킷 구독 해제 → RTM unsubscribe·logout → 마이크 트랙 stop·close → `leave()` → `onStatus("ended")` → `{ transcript }`. 여러 번 불려도 한 번만 정리하고, 정리 중 실패는 삼킨다. 다시 `start()` 할 수 있어야 한다(개발 모드).
   - 실패는 만든 것을 정리한 뒤 `onStatus("error", 사유)`. 마이크 권한 거부는 "마이크를 허용해 주세요".
   - 껍데기의 `onStatus("unavailable", ...)` 줄과 표식 주석을 지운다.

### 4. 기계 검증

1. `pnpm lint`·`pnpm build`, `node scripts/check-integration.mjs voice`.
2. 서버 프로브(Conversational AI 사용량 30초 안쪽): `pnpm dev` 를 띄우고(3000 이 쓰이고 있으면 `pnpm dev --port <빈 포트>`) 다른 셸에서 `POST /api/agora/agent` 에 `{"channel":"probe-<소문자·숫자 6자>","uid":777,"unitId":4}` 를 보낸다. HTTP 200 이고 응답에 `agentId`·`agentUid` 가 있으면 바로 `DELETE /api/agora/agent?agentId=<그 id>` 를 보내 `{ ok: true }` 를 확인하고 dev 서버를 끈다. 응답은 HTTP 코드와 키 이름만 본다. 토큰 route 는 부르지 않는다(응답에 토큰 원문이 있다). 이 프로브는 서버에서 에이전트 start·stop 이 통하는지만 본다. 목소리와 자막은 사람이 확인한다.
3. 실패하면 고치고 다시 돌린다. 같은 항목이 세 번 고쳐도 실패하면 멈추고 보고에 적는다.

### 5. 보고

- `git diff --stat` 과 바뀐 파일. 1번 허용 목록 밖의 파일이 바뀌었으면 왜인지 한 줄.
- copy map 표, baseline gate 네 칸의 현재 값, 4-2 프로브 결과(HTTP 코드 둘).
- 2-5 의 메모 네 줄과 토큰 근거 한 줄.
- [검증](#verify) 절의 "사람 확인" 목록을 그대로 붙인다. "된다"·"동작한다" 고 쓰지 않는다.

<a id="verify"></a>
## 검증

기계 검증(`voice-ai-web/` 에서):

```bash
pnpm lint && pnpm build
node scripts/doctor.mjs
node scripts/check-integration.mjs voice
```

사람 확인(녹음 파일·가짜 마이크로 대신하지 않는다. 헤드폰을 쓴다):

1. `pnpm dev` → 데스크톱 Chrome 에서 `http://localhost:3000` → "Mia와 대화" → 워밍업 → "대화 시작". 마이크를 허용한다. 구슬이 주황으로 숨 쉬고 Mia 의 첫 인사가 들린다.
2. 두세 턴 말한다. 자막 카드에 Mia 의 말과 내 말이 뜨고, 오늘의 표현을 말하면 그 칩이 체크된다.
3. Mia 가 말하는 중에 끼어든다. Mia 가 멈추고 내 말을 듣는다.
4. "💡 단어가 안 떠올라요" → 표현을 소리 내어 읽는다. Mia 가 받아서 이어 간다.
5. "대화 끝내기" → 완료 화면에 사용한 표현·대화 시간·힌트, "대화 기록 보기" 에 나와 Mia 의 말이 차례로 있다.
6. 폰(선택): 다른 터미널에서 `cloudflared tunnel --url http://localhost:3000`. 나온 `https://….trycloudflare.com` 을 폰 브라우저로 열어 1~5 를 반복한다.
7. 한 번 확인은 5분 안쪽으로. 에이전트가 채널에 있는 동안 사용량이 쌓인다.

## 지키는 규칙

- 시크릿은 `.env.local`(CLI `agora project env write --template nextjs` 가 쓴다)에만 있고 gitignore 다. 값을 로그·채팅에 출력하지 않는다.
- 클라이언트 SDK 는 `lib/agora/` 안에서만, 브라우저에서만(함수 안 동적 import) 불러온다. 서버 SDK 는 `app/api/agora/` 안에서만.
- 화면·계약·콘텐츠는 통합 때 바꾸지 않는다. 새 추상화를 만들지 않는다.
- UI 문구·주석은 한국어, 영어 표현과 Mia 의 말은 원문. em-dash 를 쓰지 않는다. 앱에 고유 이름을 붙이지 않는다("이 앱", "연습 앱"). 이름이 있는 것은 AI 파트너 Mia 뿐이다.

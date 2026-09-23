# AI 아바타 대화 웹 프로젝트 생성 스펙

이 디렉토리의 정본 문서(SSOT)다. 현재 구현이 무엇인지, 그리고 코딩 에이전트에 넣으면 같은 프로젝트가 나오도록 어떤 순서로 만드는지를 한 곳에 적는다. 구현을 바꾸면 이 문서를 같이 고친다. 경로는 따로 적지 않으면 `avatar-ai-web/` 기준이다.

## 요약

- 만드는 것: 하루 5분 영어 말하기 연습 앱. 데스크톱 웹에서 AI 아바타 Mia 와 5분 동안 영어로 스몰토크를 한다. 화상 튜터 자리에 AI 아바타가 앉는 구도다. Mia 의 얼굴이 무대에 뜨고, 목소리로 대답하고, 입 모양이 목소리와 맞는다.
- Agora 부품: Conversational AI Engine(Agora 관리 음성 인식·LLM·음성 합성) + 아바타(`agora-agents` 의 `.withAvatar()`) + RTC(목소리·얼굴 영상) + RTM(전사).
- 만드는 순서는 둘이다. [단계 A](#stage-a) 껍데기(화면·계약·도구 전부, Mia 만 없음)를 만들고 커밋한다. [단계 B](#stage-b) Agora 통합을 중간 승인 없이 한 번에 한다(`/integrate-avatar`).
- Agora 코드는 파일 셋에만 있다: `lib/agora/convoai.ts`, `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts`. 아바타에 해당하는 코드는 agent route 의 `.withAvatar()` 몇 줄과 convoai.ts 의 원격 비디오 재생 몇 줄이다.
- 아바타 벤더 키가 없으면 Mia 는 얼굴 없이 목소리로만 대화한다(무대에 Mia 구슬). 벤더 키를 `.env.local` 에 넣으면 같은 코드로 얼굴이 붙는다.
- 완성 판정은 [검증](#verify)의 명령과 사람 확인 목록이다.

## 넣는 법

이 문서 말고 이 레포에서 그대로 복사해 입력으로 두는 파일이 있다.

| 복사해 두는 파일 | 이유 |
|---|---|
| `docs/spec.md` (이 문서), `docs/design.md` | 스펙과 디자인 규칙 정본 |
| `.claude/commands/integrate-avatar.md`, `.mcp.json` | 명령과 MCP 설정 |
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
| Next.js 16.3.4, React 19.2.8, Tailwind 4, TypeScript 5, ESLint 9 | `pnpm create next-app avatar-ai-web` (App Router, `app/`, alias `@/*`) |
| Agora 공식 skill 1.8.1 | `AgoraIO/skills` 의 `agora` 폴더를 `.claude/skills/agora/` 로 복사. 고치지 않는다 |
| `agora` CLI | `curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh \| sh` → `agora login`. Agora 프로젝트에 Conversational AI 가 켜져 있어야 한다(`agora project doctor` 의 기능 목록) |
| 갈무리 픽셀 글꼴 | npm `galmuri` (OFL-1.1) |
| 아바타 벤더 계정 (선택) | LiveAvatar 또는 Anam 콘솔에서 API 키와 스톡 아바타 ID. 없으면 목소리로만 대화한다 |

## 디렉토리 구조

Next.js 앱이 이 디렉토리 바로 아래에 있다(`web/` 층을 두지 않는다. 웹 하나뿐이고, 레포 루트부터 디렉토리 다섯 단계 안에 들어오게 하기 위해서다).

```
avatar-ai-web/
  AGENTS.md                     에이전트 규칙 정본 (CLAUDE.md 는 "@AGENTS.md" 한 줄). 맨 위에 next dev 가 관리하는 블록
  CLAUDE.md
  README.md                     따라 하기 · 구조 · 비용
  .mcp.json                     agora-docs-mcp(http https://mcp.agora.io) · agora-cli(stdio "agora mcp serve")
  .claude/
    skills/agora/               공식 skill 복사본
    commands/integrate-avatar.md  frontmatter description + "docs/spec.md 의 단계 B 를 1번부터 5번까지 한 번에 수행해. 중간에 승인을 묻지 말고, 막히면 5번 보고 형식으로 멈춰."
  scripts/
    doctor.mjs                  준비 점검
    check-integration.mjs       통합 결과 기계 검증
  docs/
    design.md                   디자인 규칙 (토큰·타이포·부품·화면별 규칙)
    spec.md                     이 문서 (SSOT)
  package.json · pnpm-lock.yaml · pnpm-workspace.yaml (allowBuilds: sharp false, unrs-resolver false)
  next.config.ts · tsconfig.json · eslint.config.mjs · postcss.config.mjs
  app/
    layout.tsx                  갈무리 localFont(--font-pixel), lang="ko", title "하루 5분 영어 말하기"
    page.tsx                    <PracticeApp /> 하나
    globals.css                 토큰 · 모눈 바탕 · .screen-enter · .pixel-icon · .orb(Mia 구슬)
    api/agora/
      token/route.ts            학습자 토큰 발급 (Agora 서버 코드 1)
      agent/route.ts            에이전트 start·stop + 아바타 (Agora 서버 코드 2)
  components/
    PracticeApp.tsx             화면 상태머신
    TalkStage.tsx               대화 무대 부품 (Mia 구슬·이름표·상태 알약·툴바·픽셀 아이콘)
    ui.tsx                      Button · Card · Label · Chip · Shell
    screens/                    Home · Warmup · Talk · Done
  content/units.ts              10유닛 × 표현 4개, Mia 첫 인사, 페르소나
  lib/
    talk.ts                     대화 계약
    storage.ts                  localStorage 세션 기록
    speech.ts                   Web Speech 발음 듣기
    agora/
      convoai.ts                Conversational AI 클라이언트 (Agora 클라이언트 코드)
  public/
```

레포 루트 `.gitignore` 에 반드시 넣는다: `.env*`, `node_modules/`, `.next/`, `.agora/`, `.claude/worktrees/`, `CLAUDE.local.md`.

<a id="stage-a"></a>
## 단계 A. 껍데기

화면·콘텐츠·계약·도구를 전부 만들고, Agora 를 부르는 자리만 비워 둔다. 끝나면 앱은 뜨고 대화 화면은 무대에 Mia 구슬과 "Mia가 아직 연결되지 않았어요" 를 보여 준다.

### 화면 흐름 (`components/PracticeApp.tsx`)

- 클라이언트 전용. `useSyncExternalStore` 로 마운트 여부를 보고 서버 렌더에서는 아무것도 그리지 않는다.
- `home → warmup → talk → done`.
- 오늘의 유닛은 `UNITS[지금까지 세션 수 % 10]`. 홈에서 다른 유닛을 고를 수 있다.
- 대화가 끝나면 `TalkResult { transcript, hints, durationSec, connected, reason? }`(`Talk.tsx` 가 export) 를 받는다. `connected` 일 때만 `SessionRecord` 를 저장한다.

### 화면 넷

| 화면 | 내용 |
|---|---|
| `Home` | 제목 "영어 말하기", 연속 일수 문구, 배지 "L1 · 5분". 오늘의 세션 카드(유닛 제목, 표현 4개, 버튼 "Mia와 대화"). 유닛 10개 2열 선택. 통계 셋(완료한 세션·연속·최근 힌트) |
| `Warmup` | 표현 한 장씩 영어·뜻·IPA, "🔊 발음 듣기", 이전·다음, 마지막은 "대화 시작". "건너뛰고 바로 대화 시작" |
| `Talk` | 아래 [대화 화면](#talk-screen) |
| `Done` | "세션 완료" 또는 "아직 대화 전"(연결 전에 끝나면 "Mia와 연결되기 전에 끝났어요. 다시 시작해 보세요"). 오늘의 표현 칩(전사에서 쓴 것은 good), 사용한 표현 수·대화 시간·힌트, 접힌 "대화 기록 보기", "홈으로" |

<a id="talk-screen"></a>
### 대화 화면 (`components/screens/Talk.tsx`)

- 위: 유닛 제목 · "Mia와 대화", 오른쪽에 5분 타이머(36px). 타이머는 `live` 동안만 흐르고 30초 남으면 warn 색, 0 이면 "시간이 다 됐어요" 로 끝낸다.
- 무대(`.stage`, `#221f1a`): 아래 88px 툴바를 뺀 자리가 아바타 비디오 컨테이너(`avatarRef`)다. `onAvatar(true)` 전에는 가운데에 `MiaOrb`(구슬 168px, "Mia", 상태 문구). `onAvatar(true)` 뒤에는 구슬을 숨기고 좌상단 초록 점 상태 알약, 좌하단 이름표 "Mia · AI 아바타".
- 툴바: 마이크 아이콘 버튼이 가운데(`setMic`), 오른쪽에 warn 색 "대화 끝내기".
- 오른쪽 패널(360px, 1024px 아래에서는 무대 아래): 상태가 `unavailable` 이면 "Mia의 목소리와 얼굴은 `lib/agora/convoai.ts` 의 `createConvoAiTalk()` 한 곳에서 들어옵니다" 카드. 자막 카드(Mia·나 마지막 한 줄씩). 오늘의 표현 카드(대화 중이면 strong, 쓴 표현은 앞에 ✓). 맨 아래 accent 버튼 "💡 단어가 안 떠올라요".
- 힌트는 모달이 아니라 무대 아래쪽 560px 자막 카드로 뜬다. 표현을 차례로 하나씩, "🔊 듣기"·"읽었어요", Esc 로 닫는다.
- 상태 문구: connecting "Mia를 부르는 중이에요…", live "Mia와 대화 중 · 편하게 말해보세요", agent-left "Mia가 자리를 비웠어요", ended "대화가 끝났어요", unavailable "Mia가 아직 연결되지 않았어요", error "연결에 문제가 생겼어요".
- 세션은 `useRef(createTalkSession())`. effect 정리에서 `stop()` 을 부른다(개발 모드 effect 두 번 실행 대비).

### 계약 `lib/talk.ts`

화면은 이 파일만 안다. SDK 를 import 하지 않는다.

```ts
export type TalkStatus = "idle" | "connecting" | "live" | "agent-left" | "ended" | "unavailable" | "error";
export type TranscriptTurn = { role: "user" | "agent"; text: string };
export type TalkStartOptions = {
  unit: Unit;
  avatarContainer: HTMLElement;
  onStatus: (status: TalkStatus, detail?: string) => void;
  onTranscript?: (turns: TranscriptTurn[]) => void;   // 전체 누적
  onAvatar?: (on: boolean) => void;                    // 아바타 비디오가 무대에 붙으면 true
};
export interface TalkSession {
  start(options: TalkStartOptions): Promise<void>;
  setMic(on: boolean): Promise<void>;
  stop(): Promise<{ transcript: TranscriptTurn[] }>;
}
export function createTalkSession(): TalkSession; // ?preview=live 면 previewTalk(), 아니면 createConvoAiTalk()
```

`previewTalk()` 은 목소리·얼굴 없이 connecting → live(1.2초) 를 흉내 내고 2.2초부터 1.8초 간격으로 전사 세 줄(Mia 첫 인사, 내가 표현 하나, Mia 맞장구)을 보낸다. 파일 머리 주석에 start·setMic·stop 의 순서를 적는다(단계 B 가 그 주석을 따른다).

### 껍데기 파일

첫 줄에 표식 주석 `// 껍데기: 통합 단계가 이 파일을 채운다.` 를 둔다. 통합이 끝나면 이 줄이 사라져야 한다.

| 파일 | 껍데기 본문 |
|---|---|
| `lib/agora/convoai.ts` | `export function createConvoAiTalk(): TalkSession`. `start({ onStatus })` 가 `onStatus("unavailable", "Mia가 아직 연결되지 않았어요")`, `setMic` 은 빈 async, `stop` 은 `{ transcript: [] }` |
| `app/api/agora/token/route.ts` | `GET` 이 `Response.json({ error: "아직 껍데기" }, { status: 501 })` |
| `app/api/agora/agent/route.ts` | `POST`·`DELETE` 가 같은 501 |

### 콘텐츠 `content/units.ts`

- `Expression { en, ko, ipa, keys }`(keys 는 전사 매칭용 소문자 문구), `Unit { id, title, scenario, roleplay?, greeting, expressions }`. 유닛마다 표현 4개.
- 유닛 제목 10개: 인사와 자기소개 · 근황 묻고 답하기 · 날씨와 계절 · 주말에 뭐 했어? · 일과 직업 · 취미와 관심사 · 카페에서 주문하기 · 길 묻기와 여행 · 리액션과 칭찬 · 대화 잇기와 마무리. 카페와 길 묻기는 `roleplay` 가 있다.
- `buildMiaInstructions(unit)`: 에이전트 instructions 로 그대로 넘기는 영어 프롬프트. Mia 는 친근한 미국인 대화 상대, 학습자는 듣기·읽기는 되는데 말이 안 나오는 한국 성인. 영어만, 천천히 짧게(한두 문장), 거의 매 턴 쉬운 질문 하나, 오늘의 표현을 말할 기회를 만든다, 표현을 쓰면 짧게 칭찬하고 넘어간다, 대화 중 문법·발음 교정 금지, 막히면 화면의 힌트 버튼을 읽어도 된다고 격려한다, 5분 스몰토크.
- `detectUsedExpressions(unit, userText)`: 사용자 발화 전사를 소문자·기호 정리 후 `keys` 포함 여부로 쓴 표현 번호 집합을 돌려준다.
- `SESSION_SECONDS = 300`, `findUnit(id)`(없으면 첫 유닛).

### 나머지 lib

- `lib/storage.ts`: 키 `practice.sessions`, `SessionRecord { date(YYYY-MM-DD), unitId, hints, durationSec }`, `loadSessions`·`saveSession`·`streak`(오늘 없으면 어제부터 연속 일수)·`today`·`formatClock(m:ss)`.
- `lib/speech.ts`: `speak(text)` 은 영어 목소리(Samantha 나 Google US English 우선) rate 0.85, `stopSpeaking()`.

### 디자인

`docs/design.md` 가 정본이다. 핵심만: 모눈종이 위의 픽셀. 토큰 paper `#f5f2ea` · paper-deep `#ebe6da` · card `#fffdf8` · ink `#1f1c17` · ink-soft `#4a463f` · muted `#7d786d` · line `#e0dbcf` · line-strong `#c9c2b2` · accent `#d8542a`/`#b5431f` · good `#2e7a4d`/`#e3f0e7` · warn `#b3401e` · grid `#e9e4d8`(24px 모눈). 글꼴은 갈무리 하나, 크기는 6의 배수만(12·18·24·30·36·42). 모서리 각지게, 테두리 2px, 그림자는 흐림 0. 다크 모드 없음. 모션은 `steps()` 뿐이고 `prefers-reduced-motion` 을 존중한다. Mia 구슬(`.orb`)은 계단 테두리의 168px 픽셀 원, connecting 깜빡임, live 는 accent 로 숨쉼. 아이콘은 `TalkStage.tsx` 의 16×16 픽셀 격자(마이크·전화 끊기), 꺼짐은 같은 그림에 빗금.

### 도구

- `scripts/doctor.mjs`: ✓/✗/△ 로 Node 22+, `agora version`, `agora auth status --json`, `.env.local` 의 `NEXT_PUBLIC_AGORA_APP_ID`·`NEXT_AGORA_APP_CERTIFICATE`(값은 출력하지 않고 "설정됨"만), `AVATAR_VENDOR`(비면 △ "목소리로만 대화", `liveavatar`·`anam` 밖이면 ✗), `AVATAR_API_KEY`(벤더가 있는데 비면 ✗, 둘 다 비면 △), `AVATAR_ID`(△). ✗ 마다 고치는 명령을 한 줄 붙인다. 끝 문구 "준비 끝. 통합을 시작할 차례예요."
- `scripts/check-integration.mjs avatar`: (a) 화면 코드 보존: `git diff HEAD` 와 untracked 에 `components/`·`content/`·`app/page.tsx`·`app/layout.tsx`·`app/globals.css`·`lib/talk.ts`·`lib/storage.ts`·`lib/speech.ts`·`scripts/`·`docs/` 가 없다 (b) SDK import 격리: `agora-token`·`agora-agents` 는 `app/api/agora/` 안, 그 밖의 Agora 패키지는 `lib/agora/` 안 (c) 껍데기 표식 소멸(convoai.ts·두 route) (d) route 메서드(token `GET`, agent `POST`·`DELETE`)와 "아직 껍데기" 없음 (e) 필수 문자열: convoai.ts 에 `export function createConvoAiTalk`·`user-published`·`onAvatar`·`setMic`·`/api/agora/agent`, token route 에 `buildTokenWithRtm`, agent route 에 `withAvatar`·`buildMiaInstructions`·`AVATAR_VENDOR` (f) 아바타 함정: agent route 의 remoteUids 에 `"*"` 없음, `LiveAvatarAvatar` 가 있으면 `OpenAITTS` 또는 `24000` 도 있다 (g) `lib/`·`components/` 에 `APP_CERTIFICATE` 와 32자 hex 없음 (h) `pnpm lint`·`pnpm build`. 실패가 있으면 `아직 "된다"고 말하지 마세요.`, 없으면 "기계 검증 통과. 이제 사람이 확인할 차례예요."

### 단계 A 완료 조건

- `pnpm lint`·`pnpm build` 통과.
- `node scripts/check-integration.mjs avatar` 가 껍데기 항목(표식·route 501)에서만 실패한다.
- `/?preview=live` 에서 대화 중 상태(구슬 숨쉼, 자막 세 줄, 첫 표현 ✓)가 보인다.
- 커밋한다.

<a id="stage-b"></a>
## 단계 B. Agora 통합

단계 A 의 껍데기에 Mia 를 붙인다. 대화는 Agora Conversational AI Engine, 얼굴은 그 에이전트에 붙인 아바타다. `/integrate-avatar` 명령이 이 절을 가리킨다. 1번부터 5번까지 한 번에 수행하고 중간에 승인을 묻지 않는다. 막히면 그 자리에서 멈추고 5번 보고 형식으로 어디서 막혔는지 적는다.

전제: 단계 A 가 커밋돼 있고 `git status` 가 깨끗하다. 완성본에서 다시 돌리지 않는다.

### 1. 규칙

- Agora 판단은 전부 `.claude/skills/agora/SKILL.md` 와 그 참조로 한다. 웹 검색·기억 금지. 스킬 자동 로드가 없는 에이전트도 이 파일들을 직접 읽는다.
- 스킬의 Conversational AI **integration** 경로다(기존 앱에 붙이기). 빈 앱을 새로 만들지 않는다. 읽는 순서: `references/conversational-ai/README.md` → `integration-from-quickstart.md` → `quickstarts.md` → `architecture.md` → `server-sdks.md`(「Avatar + TTS Sample Rate」 절까지) → `agent-toolkit.md`(웹 전사) → `agent-samples.md`(「React Video Client (react-video-client-avatar)」) → `references/rtc/web.md`(원격 비디오 subscribe) → `rtc/nextjs.md` → `server/tokens.md`.
- 공식 Next.js quickstart(`quickstarts.md` 가 가리키는 `agent-quickstart-nextjs`)를 **이 레포 바깥** 임시 디렉토리에 클론해 소스로 읽는다. 편집하기 전에 copy map(quickstart 파일 → 이 앱의 파일, 가져올 것과 버릴 것)을 만들어 5번 보고에 넣는다. quickstart 를 이 레포 안에 복사하지 않는다.
- 아바타 벤더 클래스와 필드 이름은 설치된 `agora-agents` 의 타입 선언(`node_modules/agora-agents/dist/esm/agentkit/vendors/avatar.d.mts`, `tts.d.mts`, `Agent.d.mts`)에서 확인한다. 로컬에 없는 벤더 설정만 스킬의 `references/doc-fetching.md` 절차로 문서를 읽는다.
- 고쳐도 되는 파일: `lib/agora/convoai.ts`, `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts`, `package.json`·`pnpm-lock.yaml`. 타입이나 작은 도우미가 꼭 필요하면 `lib/agora/`·`app/api/agora/` 안에만 새 파일을 둔다. 그 밖은 읽기만 한다. 특히 계약 `lib/talk.ts`, `components/**`, `content/**`, `scripts/**`, `docs/**`.
- import 격리: 클라이언트 SDK(`agora-rtc-sdk-ng`, `agora-rtm`, `agora-agent-client-toolkit` 등)는 `lib/agora/` 안에만, 서버 SDK(`agora-agents`, `agora-token`)는 `app/api/agora/` 안에만. 의존성은 `pnpm add` 로 넣고 버전은 quickstart 의 `package.json` 과 맞춘다(아바타 클래스 `LiveAvatarAvatar`·`AnamAvatar` 가 없는 버전이면 있는 버전으로 올리고 보고에 적는다).
- 파이프라인은 Agora 관리 모델만 쓴다. STT·LLM·TTS 벤더 키를 넣지 않는다. MLLM(실시간 음성 모델)을 쓰지 않는다(아바타는 cascade 에서만 된다).
- App Certificate(`NEXT_AGORA_APP_CERTIFICATE`)와 `AVATAR_API_KEY` 는 `app/api/agora/` 안에서만 읽는다. `.env.local` 을 열거나 셸 명령에 넣지 않는다. 존재 확인은 `node scripts/doctor.mjs` 로만. 토큰·키 원문을 로그·보고에 찍지 않는다. `agora project show` 는 App Certificate 원문을 찍으므로 실행하지 않는다(프로젝트 확인은 `agora project doctor`).
- 녹화 클립·가짜 마이크(chromium 플래그)로 검증하지 않는다. 실제 목소리·얼굴 확인은 사람이 한다.
- **아바타 함정 셋.** (1) 에이전트의 `remoteUids` 는 학습자 uid 하나(`[String(uid)]`)만. `"*"` 를 쓰면 아바타 uid 의 소리가 에이전트 입력으로 되돌아온다. (2) 아바타가 붙을 때는 끼어들기를 끄고 뒤에 이어 붙인다: `Agent` 의 `interruption` 설정(`InterruptionConfig`)에서 REST 의 `interruption: { enable: false, disabled_config: { strategy: "append" } }` 와 같은 뜻이 되게 한다. 타입에 같은 뜻의 필드가 없으면 멈추고 보고한다. (3) TTS 샘플레이트를 벤더에 맞춘다. LiveAvatar 는 24000Hz 만 받는다. Agora 관리 OpenAI TTS(`tts-1`)는 24kHz 고정이라 그대로 맞는다. 불일치는 `session.start()` 에서 아바타 설정 오류처럼 보이지만 원인은 TTS 다.

### 2. 준비 점검

1. `node scripts/doctor.mjs`. ✗ 가 있으면 적힌 명령을 실행하고 다시 본다. `.env.local` 이 없으면 이 디렉토리에서 `agora project env write --template nextjs`(값을 손으로 옮기지 않는다). `AVATAR_*` 가 △ 면 넘어간다. 그때 아바타는 목소리 전용으로 떨어지는 경로만 검증된다.
2. `lib/talk.ts` 를 읽는다. 상태 이름과 순서, `TalkStartOptions`, `TalkSession` 이 계약이다. `createConvoAiTalk` 는 이름과 시그니처를 그대로 둔다.
3. 스킬 참조와 quickstart 를 읽고 다섯 가지를 한 줄씩 메모한다(5번 보고에 쓴다): 에이전트 start 가 서버에 있어야 하는 이유, 전사가 브라우저에 오는 경로(RTM), 이벤트 핸들러를 join 전에 등록하는 이유, 아바타 비디오를 어느 uid 에서 받는지(LiveAvatar 는 별도 uid 로 publish, Anam 은 SDK 타입 주석대로), Next.js 에서 SDK 를 브라우저에서만 불러오는 방법.

### 3. 적용

1. 의존성: quickstart 와 같은 버전으로 `pnpm add agora-agents agora-token agora-rtc-sdk-ng agora-rtm agora-agent-client-toolkit`(quickstart 가 전사에 다른 패키지를 쓰면 그것으로). React 전용 UI 킷은 넣지 않는다. 화면은 이미 있다.
2. uid 는 셋이다. 학습자는 클라이언트가 1~1,000,000 난수. 에이전트 `1000001`, 아바타 `1000002`(학습자 범위 밖, 서버 상수).
3. 토큰 route: `GET ?channel=&uid=&rtm=1` → `{ appId, channel, uid, token }`. channel 없거나 uid 가 1~2^32-1 정수가 아니면 400, env 가 없으면 500. `RtcTokenBuilder.buildTokenWithRtm(appId, cert, channel, String(uid), PUBLISHER, 3600, 3600)`. 껍데기의 501·"아직 껍데기"·표식 주석을 지운다.
4. agent route `POST { channel, uid, unitId }`:
   - `AgoraClient`(App ID·Certificate, 인증은 SDK 가 요청마다 토큰을 만든다) → `new Agent({ instructions: buildMiaInstructions(unit), greeting: unit.greeting, ... })`. 전사를 브라우저로 보내는 설정(RTM)은 quickstart 와 같게.
   - `.withStt(new DeepgramSTT({ model: "nova-3", language: "en" }))` · `.withLlm(new OpenAI({ model: "gpt-4o-mini", ... }))` · `.withTts(new OpenAITTS({ voice: "nova" }))`. 셋 다 키 없는 Agora 관리 모델이다. TTS 는 아바타가 없어도 같은 것을 써서 목소리가 바뀌지 않게 한다.
   - env `AVATAR_VENDOR` 가 `liveavatar` 면 `.withAvatar(new LiveAvatarAvatar({ apiKey: AVATAR_API_KEY, quality: "high", agoraUid: "1000002", avatarId: AVATAR_ID }))`, `anam` 이면 `.withAvatar(new AnamAvatar({ apiKey, avatarId, additionalParams: { agora_uid: "1000002", agora_token, sample_rate: 24000 } }))`. Agora 문서의 Anam 설정은 `agora_uid`·`agora_token` 이 필수인데 SDK 는 LiveAvatar 토큰만 만들어 주므로, Anam 토큰은 이 route 에서 `RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, 1000002, PUBLISHER, 3600, 3600)` 로 만든다. 아바타가 붙으면 함정 (2) 의 끼어들기 설정을 더한다. `AVATAR_VENDOR` 가 비어 있으면 아바타 없이 시작한다. 다른 값이거나 키가 비어 있으면 500 과 사유.
   - `agent.createSession({ channel, agentUid: "1000001", remoteUids: [String(uid)], idleTimeout: 30 })` → `start()` → `{ agentId, avatar: true | false }`. 실패는 500 과 SDK 오류 문구(키 값은 넣지 않는다).
   - `DELETE ?agentId=` → `client.stopAgent(agentId)`. 이미 멈춘 것(404)은 성공으로 본다.
   - 껍데기 줄과 표식 주석을 지운다.
5. `convoai.ts`(`createConvoAiTalk()`):
   - `start()` 안에서만 SDK 를 동적 import 한다(모듈 최상위 import 금지). 학습자 uid 난수 → 토큰(`rtm=1`) → RTC 클라이언트 생성(`mode: "rtc"`, `codec: "vp8"`) → 핸들러 등록(join 전) → `join` → 마이크 트랙 생성·`publish` → 전사 수신 시작(quickstart 방식, RTM) → `POST /api/agora/agent` → `onStatus("live")`.
   - `user-published`: subscribe. audio 면 `play()`(Mia 목소리). video 면 `track.play(avatarContainer)` 후 `onAvatar(true)`. 비디오를 보내는 uid 가 아바타다(학습자 자신이 아닌 원격 video).
   - `user-unpublished`(video)·`user-left`(아바타 uid) 면 비디오를 멈추고 `onAvatar(false)`. `user-left` 가 에이전트 uid 면 `onStatus("agent-left")`.
   - 전사: 에이전트·사용자 발화를 `TranscriptTurn[]` 로 누적해 `onTranscript(전체)`. 진행 중 문장은 마지막 항목을 덮어쓴다.
   - `setMic(on)`: 마이크 트랙 `setEnabled(on)`. 채널에서 나가지 않는다.
   - `stop()`: `DELETE /api/agora/agent?agentId=` → 전사 수신 정리 → 트랙 stop·close → `leave` → `onAvatar(false)`·`onStatus("ended")` → `{ transcript }`. `start` 진행 중에 `stop` 이 오면 세대 번호로 그 start 를 멈추고, 이미 만든 에이전트가 있으면 stop 한다(개발 모드 effect 두 번 실행에서 에이전트가 두 개 남지 않게).
   - 실패는 `onStatus("error", 사유)`. 껍데기 줄과 표식 주석을 지운다.

### 4. 기계 검증

1. `pnpm lint`·`pnpm build`, `node scripts/check-integration.mjs avatar`. 실패하면 고치고 다시 돌린다. 같은 항목이 세 번 고쳐도 실패하면 멈추고 보고에 적는다.
2. 에이전트 기동 확인: `pnpm dev` 를 띄우고 `curl -s -X POST localhost:3000/api/agora/agent -H 'content-type: application/json' -d '{"channel":"check-<난수>","uid":123,"unitId":4}'` 의 응답에서 `agentId` 존재와 `avatar` 값만 확인한다(응답 전문을 찍지 않는다). 곧바로 같은 agentId 로 `DELETE`. 토큰 route 응답은 찍지 않는다. 이 확인은 한 번만 한다(Conversational AI 사용 시간과 아바타 크레딧을 쓴다).

### 5. 보고

- `git diff --stat` 과 바뀐 파일. 1번 허용 목록 밖의 파일이 바뀌었으면 왜인지 한 줄.
- copy map, 2-3 의 메모 다섯 줄, 설치한 패키지 버전.
- 아바타 벤더(`AVATAR_VENDOR` 값, 키 값 없이)와 TTS 샘플레이트, 끼어들기 설정을 무엇으로 했는지. 4-2 의 `avatar` 값.
- [검증](#verify) 절의 "사람 확인" 목록을 그대로 붙인다. "된다"·"동작한다" 고 쓰지 않는다.

<a id="verify"></a>
## 검증

기계 검증(이 디렉토리에서):

```bash
pnpm lint && pnpm build
node scripts/doctor.mjs
node scripts/check-integration.mjs avatar
```

사람 확인(가짜 마이크·녹화 클립으로 대신하지 않는다. 맥은 헤드폰):

1. `pnpm dev` → 데스크톱 Chrome 에서 `http://localhost:3000` → "Mia와 대화" → 워밍업 → 대화 화면. 마이크를 허용하면 구슬이 깜빡이다가 Mia 의 첫 인사가 헤드폰으로 들리고 자막에 뜬다.
2. `AVATAR_*` 를 넣었으면: 몇 초 안에 무대에 Mia 얼굴이 뜨고 구슬이 사라진다. 첫 인사의 입 모양이 목소리와 맞는다.
3. 두세 턴 말한다. 오늘의 표현을 쓰면 오른쪽 목록에 ✓ 가 붙는다. 막히면 힌트 → 소리 내어 읽기 → Mia 가 이어 받는다. 얼굴이 끊기지 않는다.
4. 마이크를 끄면 Mia 가 내 말을 듣지 못한다. 다시 켜면 이어진다.
5. "대화 끝내기" → 얼굴이 사라지고 완료 화면에 쓴 표현·대화 시간·대화 기록이 남는다.
6. 비용: 세션을 자주 껐다 켜지 않는다. Conversational AI 사용 시간과 아바타 벤더 크레딧이 같이 줄고, LiveAvatar 는 연속 접속에 쿨다운이 있다.

## 지키는 규칙

- 시크릿은 `.env.local` 에만 있다(App ID·Certificate 는 CLI `agora project env write --template nextjs` 가, `AVATAR_*` 는 사람이 쓴다). gitignore 다. 값을 로그·채팅에 출력하지 않는다.
- 클라이언트 SDK 는 `lib/agora/` 안에서만, 브라우저에서만(함수 안 동적 import) 불러온다. 서버 SDK 는 `app/api/agora/` 안에서만.
- 화면·계약·콘텐츠는 통합 때 바꾸지 않는다. 새 추상화를 만들지 않는다.
- 아바타 얼굴은 벤더의 스톡 아바타를 벤더 라이선스대로 쓴다. 실제 사람 얼굴을 클론하지 않는다.
- UI 문구·주석은 한국어, 영어 표현은 원문. em-dash 를 쓰지 않는다. 앱에 고유 이름을 붙이지 않는다("이 앱", "연습 앱"). Mia 는 예외.

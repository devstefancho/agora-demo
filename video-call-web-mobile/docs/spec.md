# 영상통화 웹+모바일 프로젝트 생성 스펙

이 디렉토리의 정본 문서(SSOT)다. 현재 구현이 무엇인지, 그리고 코딩 에이전트에 넣으면 같은 프로젝트가 나오도록 어떤 순서로 만드는지를 한 곳에 적는다. 구현을 바꾸면 이 문서를 같이 고친다. 경로는 따로 적지 않으면 `video-call-web-mobile/` 기준이다.

## 요약

- 만드는 것: 하루 5분 영어 말하기 연습 앱. 데스크톱 웹에서 파트너와 5분 영상통화를 하고, 파트너는 폰 브라우저(초대 링크) 또는 iOS 앱으로 들어온다.
- 만드는 순서는 셋이다. [단계 A](#stage-a) 껍데기(화면·계약·도구 전부, 통화만 없음)를 만들고 커밋한다. [단계 B](#stage-b) Agora 통합을 중간 승인 없이 한 번에 한다(`/integrate-video-call`). [단계 C](#stage-c) 화면 공유와 대기실 마이크 선택을 더한다.
- Agora 코드는 파일 넷에만 있다: `web/lib/agora/rtc.ts`, `web/lib/agora/rtm.ts`, `web/app/api/agora/token/route.ts`, `mobile/Partner/PartnerSession.swift`.
- 완성 판정은 [검증](#verify)의 명령과 사람 확인 목록이다.

## 넣는 법

이 문서 말고 이 레포에서 그대로 복사해 입력으로 두는 파일이 있다.

| 복사해 두는 파일 | 이유 |
|---|---|
| `docs/spec.md` (이 문서), `docs/design.md` | 스펙과 디자인 규칙 정본 |
| `.claude/commands/integrate-video-call.md`, `.mcp.json` | 명령과 MCP 설정 |
| `.claude/skills/agora/` | 공식 skill 1.8.1 (준비물 표 참고) |

그 디렉토리를 git 저장소로 만들고 에이전트에게 이렇게 준다.

```
docs/spec.md 를 읽고 단계 A 를 만든 뒤 커밋해. 커밋이 끝나면 단계 B 를 1번부터 5번까지 한 번에 수행하고, 이어서 단계 C 를 적용해. 단계마다 완료 조건을 통과시킨 뒤 넘어가.
```

단계 A 와 B 사이의 커밋은 빠뜨리면 안 된다. `scripts/check-integration.mjs` 가 `git diff HEAD` 로 "통합이 화면 코드를 건드리지 않았는지"를 보기 때문이다.

## 준비물

| 무엇 | 어디서 |
|---|---|
| Node 22 이상, pnpm 11 | 시스템 |
| Next.js 16.3.4, React 19.2.8, Tailwind 4, TypeScript 5, ESLint 9 | `pnpm create next-app web` (App Router, `app/`, alias `@/*`) |
| Agora 공식 skill 1.8.1 | `AgoraIO/skills` 의 `agora` 폴더를 `.claude/skills/agora/` 로 복사. 고치지 않는다 |
| `agora` CLI | `curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh \| sh` → `agora login` |
| 갈무리 픽셀 글꼴 | npm `galmuri` (웹), 같은 ttf 두 개를 iOS 에 번들 (OFL-1.1, 라이선스 파일 같이) |
| cloudflared (선택) | `brew install cloudflared`. 폰 브라우저 접속용 HTTPS 터널 |
| XcodeGen, Xcode (선택) | `brew install xcodegen`. iOS 파트너 앱 |

## 디렉토리 구조

```
video-call-web-mobile/
  AGENTS.md                     에이전트 규칙 정본 (CLAUDE.md 는 "@AGENTS.md" 한 줄)
  README.md                     따라 하기 · 구조 · 비용
  .mcp.json                     agora-docs-mcp(http https://mcp.agora.io) · agora-cli(stdio "agora mcp serve")
  .claude/
    skills/agora/               공식 skill 복사본
    commands/integrate-video-call.md  frontmatter description + "docs/spec.md 의 단계 B 를 1번부터 5번까지 한 번에 수행해. 중간에 승인을 묻지 말고, 막히면 5번 보고 형식으로 멈춰."
  scripts/
    doctor.mjs                  준비 점검
    check-integration.mjs       통합 결과 기계 검증
    ios.sh                      iOS 터미널 빌드
  docs/
    design.md                   디자인 규칙 (토큰·타이포·부품·화면별 규칙)
    spec.md                     이 문서 (SSOT)
  web/
    AGENTS.md · CLAUDE.md       "../AGENTS.md 를 먼저 읽는다"
    next.config.ts              allowedDevOrigins: ["*.trycloudflare.com"]
    pnpm-workspace.yaml         allowBuilds: sharp false, unrs-resolver false
    app/
      layout.tsx                갈무리 localFont(--font-pixel), lang="ko", title "하루 5분 영어 말하기"
      page.tsx                  <PracticeApp /> 하나
      globals.css               토큰 · 모눈 바탕 · .screen-enter · .pixel-icon
      api/agora/
        token/route.ts          토큰 발급 (Agora 서버 코드)
    components/
      PracticeApp.tsx           화면 상태머신
      CallStage.tsx             통화 무대 부품 (아이콘·이름표·툴바·대기·카메라 꺼짐)
      ui.tsx                    Button · Card · Label · Chip · Shell
      screens/                  Home · Warmup · Call · Partner · Done
    content/units.ts            10유닛 × 표현 4개
    lib/
      call.ts                   영상통화 계약
      storage.ts                localStorage 세션 기록
      speech.ts                 Web Speech 발음 듣기
      agora/
        rtc.ts                  RTC 클라이언트 (Agora 클라이언트 코드 1)
        rtm.ts                  RTM 상태 채널 (Agora 클라이언트 코드 2)
    public/.gitkeep
  mobile/
    project.yml                 XcodeGen 정의 (.xcodeproj 는 생성물)
    Signing.xcconfig.example    DEVELOPMENT_TEAM = (비움)
    Partner/
      PartnerApp.swift · ContentView.swift · Theme.swift · PixelIcon.swift
      Config.swift              webBaseURL (기본 http://localhost:3000), appId = AppIdConfig.value
      AppIdConfig.swift.example ios.sh gen 이 AppIdConfig.swift 를 만든다
      PartnerSession.swift      통화 경계 (Agora iOS 코드)
      Info.plist · Fonts/       갈무리 ttf 둘 + Galmuri-OFL.txt
```

레포 루트 `.gitignore` 에 반드시 넣는다: `.env*`, `node_modules/`, `.next/`, `.agora/`, `.claude/worktrees/`, `*/mobile/*.xcodeproj`, `*/mobile/.derived/`, `*/mobile/Signing.xcconfig`, `*/mobile/Partner/AppIdConfig.swift`, `*/mobile/device.local`, `CLAUDE.local.md`.

<a id="stage-a"></a>
## 단계 A. 껍데기

화면·콘텐츠·계약·도구를 전부 만들고, Agora 를 부르는 자리만 비워 둔다. 끝나면 앱은 뜨고 통화 화면은 "아직 통화가 연결되지 않아요" 를 보여 준다.

### 화면 흐름 (`components/PracticeApp.tsx`)

- 클라이언트 전용. `useSyncExternalStore` 로 마운트 여부를 보고 서버 렌더에서는 아무것도 그리지 않는다.
- URL 에 `?room=<코드>` 가 있으면 홈 대신 `Partner` 화면을 그린다. 이 기기가 파트너다.
- 그 밖에는 `home → warmup → call → done`.
- 오늘의 유닛은 `UNITS[지금까지 세션 수 % 10]`. 홈에서 다른 유닛을 고를 수 있다.
- 통화가 끝나면 `CallResult { hints, durationSec, connected, reason? }`(`Call.tsx` 가 export) 를 받는다. `connected` 일 때만 `SessionRecord` 를 저장한다.

### 화면 다섯

| 화면 | 내용 |
|---|---|
| `Home` | 제목 "영어 말하기", 연속 일수 문구, 배지 "L1 · 5분". 오늘의 세션 카드(유닛 제목, 표현 4개, 버튼 "파트너와 통화"). 유닛 10개 2열 선택. 통계 셋(완료한 세션·연속·최근 힌트) |
| `Warmup` | 표현 한 장씩 영어·뜻·IPA, "🔊 발음 듣기", 이전·다음, 마지막은 "대화 시작". "건너뛰고 바로 대화 시작" |
| `Call` | 데스크톱 통화. 아래 [통화 화면](#call-screen) |
| `Partner` | 폰 브라우저 파트너. 아래 [폰 파트너 화면](#partner-screen) |
| `Done` | "세션 완료" 또는 "아직 통화 전"(연결 전에 끝나면 "파트너와 연결되기 전에 끝났어요. 다시 통화해 보세요"). 오늘의 표현 목록, 통화 시간·힌트, "홈으로" |

<a id="call-screen"></a>
### 통화 화면 (`components/screens/Call.tsx`)

- 방 코드는 `newRoomCode()`(`call-` + 4자), 초대 링크는 `${origin}/?room=<코드>`. 데스크톱이 방을 만든다.
- 위: 유닛 제목 · "파트너와 통화", 오른쪽에 5분 타이머(36px). 타이머는 `connected` 동안만 흐르고 30초 남으면 warn 색, 0 이면 "시간이 다 됐어요" 로 끝낸다.
- 무대(`.stage`, `#221f1a`): 상대 영상이 크게(아래 88px 툴바 제외), 우상단 내 PIP(md 224×140, 흰 테두리 20%). 상대가 없으면 `WaitingTile` 에 상태 문구. 연결되면 좌상단 초록 점 상태 알약, 좌하단 이름표 "파트너 · 폰". 상대 카메라가 꺼지면 `CameraOffTile`.
- 툴바: 마이크·카메라(와 단계 C 의 화면 공유) 아이콘 버튼이 가운데, 오른쪽에 warn 색 "통화 끝내기".
- 오른쪽 패널(360px, 1024px 아래에서는 무대 아래): 상태가 `unavailable` 이면 "통화는 `lib/agora/rtc.ts` 의 `createRtcCall()` 한 곳에서 들어옵니다" 카드. `waiting`·`partner-left` 이면 초대 카드(QR 152px `qrcode.react`, 방 코드, "초대 링크 복사", localhost 로 열었으면 "cloudflared 터널 주소로 여세요"). 오늘의 표현 카드(연결 중이면 strong). 맨 아래 accent 버튼 "💡 단어가 안 떠올라요".
- 힌트는 모달이 아니라 무대 아래쪽 560px 자막 카드로 뜬다. 표현을 차례로 하나씩, "🔊 듣기"·"읽었어요", Esc 로 닫는다.
- 상태 문구: connecting "통화방에 들어가는 중이에요…", waiting "파트너를 기다리는 중이에요", connected "통화 중 · 오늘의 표현을 써보세요", partner-left "파트너가 나갔어요", ended "통화가 끝났어요", unavailable "아직 통화가 연결되지 않아요", error "연결에 문제가 생겼어요".
- 세션은 `useRef(createCallSession())`. effect 정리에서 `stop()` 을 부른다(개발 모드 effect 두 번 실행 대비).

<a id="partner-screen"></a>
### 폰 파트너 화면 (`components/screens/Partner.tsx`)

- 들어가기: 제목 "파트너", "데스크톱에서 보낸 초대예요", 방 코드 카드, 마이크 켜고/끄고 들어가기 토글, 검정 "들어가기", 권한 안내 한 줄. 표현과 힌트는 없다.
- 통화: 전체 화면 무대. 상대 전체, 우상단 내 카메라 96×128(가로 128×96), 좌상단 이름표 "데스크톱", 아래 마이크·카메라·"나가기". safe-area 를 지킨다.
- 세션은 통화 화면이 그려진 뒤(`phase === "call"` effect) 시작한다. 나가면 들어가기 화면으로 돌아가고 "통화가 끝났어요. 다시 들어갈 수 있어요." 를 보여 준다.

### 계약 `lib/call.ts`

화면은 이 파일만 안다. SDK 를 import 하지 않는다.

```ts
export type CallStatus = "idle" | "connecting" | "waiting" | "connected" | "partner-left" | "ended" | "unavailable" | "error";
export type PartnerState = { mic: boolean; camera: boolean };
export type ScreenState = { mine: boolean; partner: boolean };
export const SCREEN_UID_OFFSET = 1_000_000;
export const screenUidOf = (uid: number) => uid + SCREEN_UID_OFFSET;
export const isScreenUid = (uid: number) => uid > SCREEN_UID_OFFSET;
export type CallStartOptions = {
  channel: string; unit: Unit; mic?: boolean;
  localContainer: HTMLElement | null; remoteContainer: HTMLElement;
  onStatus: (status: CallStatus, detail?: string) => void;
  onPartner?: (state: PartnerState) => void;
  screenContainer?: HTMLElement | null;
  onScreen?: (state: ScreenState) => void;
};
export interface CallSession {
  start(options: CallStartOptions): Promise<void>;
  setMic(on: boolean): Promise<void>;
  setCamera(on: boolean): Promise<void>;
  setScreenShare(on: boolean): Promise<void>;
  stop(): Promise<void>;
}
export function newRoomCode(): string;
export function createCallSession(): CallSession; // ?preview=connected 면 previewCall(), 아니면 createRtcCall()
```

`previewCall()` 은 영상 없이 connecting → waiting(0.9초) → connected(2.4초, 자리표시 그림) 를 흉내 내고, 6초·9.5초·13초에 상대 마이크 꺼짐 → 카메라 꺼짐 → 둘 다 켜짐을 보낸다. 파일 머리 주석에 start·setMic·setCamera·setScreenShare·stop 의 순서를 적는다(단계 B·C 가 그 주석을 따른다).

### 껍데기 파일

첫 줄에 표식 주석 `// 껍데기: 통합 단계가 이 파일을 채운다.` 를 둔다. 통합이 끝나면 이 줄이 사라져야 한다.

| 파일 | 껍데기 본문 |
|---|---|
| `web/lib/agora/rtc.ts` | `export function createRtcCall(): CallSession`. `start({ onStatus })` 가 `onStatus("unavailable", "아직 통화가 연결되지 않아요")`, 나머지 메서드는 빈 async |
| `web/lib/agora/rtm.ts` | `StateChannelOptions { appId, channel, userId, token, state, onPartner }`, `StateChannel { setState, leave }`. `joinStateChannel()` 은 어디에도 붙지 않고, `setState` 는 빈 함수, `leave` 는 `onPartner({ mic: true, camera: true })` 만 부른다 |
| `web/app/api/agora/token/route.ts` | `GET` 이 `Response.json({ error: "아직 껍데기" }, { status: 501 })` |
| `mobile/Partner/PartnerSession.swift` | 아래 iOS 절의 인터페이스 그대로, `join` 이 `status = .unavailable` |

### 콘텐츠 `content/units.ts`

- `Expression { en, ko, ipa }`, `Unit { id, title, expressions }`. 유닛마다 표현 4개.
- 유닛 제목 10개: 인사와 자기소개 · 근황 묻고 답하기 · 날씨와 계절 · 주말에 뭐 했어? · 일과 직업 · 취미와 관심사 · 카페에서 주문하기 · 길 묻기와 여행 · 리액션과 칭찬 · 대화 잇기와 마무리.
- `SESSION_SECONDS = 300`, `findUnit(id)`(없으면 첫 유닛).

### 나머지 lib

- `lib/storage.ts`: 키 `practice.sessions`, `SessionRecord { date(YYYY-MM-DD), unitId, hints, durationSec }`, `loadSessions`·`saveSession`·`streak`(오늘 없으면 어제부터 연속 일수)·`today`·`formatClock(m:ss)`.
- `lib/speech.ts`: `speak(text)` 은 영어 목소리(Samantha 나 Google US English 우선) rate 0.85, `stopSpeaking()`.

### 디자인

`docs/design.md` 가 정본이다. 핵심만: 모눈종이 위의 픽셀. 토큰 paper `#f5f2ea` · paper-deep `#ebe6da` · card `#fffdf8` · ink `#1f1c17` · ink-soft `#4a463f` · muted `#7d786d` · line `#e0dbcf` · line-strong `#c9c2b2` · accent `#d8542a`/`#b5431f` · good `#2e7a4d`/`#e3f0e7` · warn `#b3401e` · grid `#e9e4d8`(24px 모눈). 글꼴은 갈무리 하나, 크기는 6의 배수만(12·18·24·30·36·42). 모서리 각지게, 테두리 2px, 그림자는 흐림 0(`shadow-px` 4px, `shadow-px-sm` 2px). 다크 모드 없음. 모션은 `steps()` 뿐이고 `prefers-reduced-motion` 을 존중한다. 아이콘은 `CallStage.tsx` 의 16×16 픽셀 격자(마이크·카메라·화면·전화 끊기·사람), 꺼짐은 같은 그림에 빗금.

### 도구

- `scripts/doctor.mjs`: ✓/✗/△ 로 Node 22+, `agora version`, `agora auth status --json`, `web/.env.local` 의 `NEXT_PUBLIC_AGORA_APP_ID`·`NEXT_AGORA_APP_CERTIFICATE`(값은 출력하지 않고 "설정됨"만), cloudflared(△). ✗ 마다 고치는 명령을 한 줄 붙인다. 끝 문구 "준비 끝. 통합을 시작할 차례예요."
- `scripts/check-integration.mjs <call|ios>`: `call` 모드는 (a) 화면 코드 보존: `git diff HEAD` 와 untracked 에 `components/`·`content/`·`app/page.tsx`·`app/layout.tsx`·`app/globals.css`·`lib/call.ts`·`lib/storage.ts`·`lib/speech.ts`·`../scripts/`·`../docs/` 가 없다 (b) SDK import 격리: `agora-rtc-sdk-ng`·`agora-rtm` 는 `lib/agora/` 안, `agora-token` 은 `app/api/agora/` 안 (c) 껍데기 표식 소멸 (d) route 메서드 존재와 "아직 껍데기" 없음 (e) `lib/`·`components/` 에 `APP_CERTIFICATE` 와 32자 hex 없음 (f) `pnpm lint`·`pnpm build`. 그리고 `rtc.ts`·`rtm.ts` 표식 소멸과 `createRtcCall`·`joinStateChannel`·`presence`·`buildTokenWithRtm` 문자열을 본다. `ios` 모드는 화면 파일 보존, `import AgoraRtcKit`·`AgoraRtmKit`, `/api/agora/token`·`rtm=1`, `partnerMicOn`·`partnerCameraOn`, 시뮬레이터 `xcodebuild`. 실패가 있으면 `아직 "된다"고 말하지 마세요.`, 없으면 "기계 검증 통과. 이제 사람이 확인할 차례예요."
- `scripts/ios.sh <doctor|gen|sim|build|device>`: Xcode GUI 없이. `gen` 은 `web/.env.local` 의 App ID 로 `AppIdConfig.swift` 를 쓰고 `Signing.xcconfig` 가 없으면 example 을 복사한 뒤 `xcodegen generate`. `device` 는 `IOS_DEVICE` → `mobile/device.local` 첫 줄 → 연결된 첫 iPhone 순서로 기기를 고른다. 시뮬레이터도 코드 서명을 끄지 않는다(끄면 Agora 프레임워크가 dyld 에서 죽는다).

### iOS 파트너 앱 (`mobile/`)

- `project.yml`: 이름 Partner, iOS 17.0, SwiftPM `AgoraRtcEngine_iOS` from 4.5.0(product `RtcBasic`), `AgoraRtm_iOS` from 2.2.0(product `AgoraRTM`). `configFiles` 는 `Signing.xcconfig`. Info: 표시 이름 "파트너", `UIAppFonts` 갈무리 둘, 세로와 가로 좌우, 카메라·마이크 사용 설명, `NSAllowsLocalNetworking`. 설정 `ENABLE_DEBUG_DYLIB: NO`, `LD_RUNPATH_SEARCH_PATHS: $(inherited) @executable_path/Frameworks`.
- `ContentView.swift`: 화면 둘. 들어가기는 제목 "미팅방 입장", 안내 "데스크톱 화면에 보이는 미팅 코드를 넣어 주세요.", 미팅 코드 입력(자리표시 `call-xxxx`), "마이크 켜고/끄고 들어가기" 토글, 검정 "미팅 참여하기"(코드가 비면 비활성). 통화는 세로일 때 위에서부터 머리줄(방 코드와 상태 줄) · 무대 · 버튼 줄이고, 가로로 눕히면 무대가 왼쪽을 다 쓰고 머리줄과 버튼이 오른쪽 180pt 세로 줄로 간다. 무대 안 내 카메라는 우하단 96×128(가로 128×96). 버튼은 "마이크 끄기/켜기" · "카메라 끄기/켜기" · warn 색 "나가기". 상태 줄은 연결 중이면 "상대 마이크 꺼짐 · 상대 카메라 꺼짐 · 화면 공유 중" 을 해당하는 것만 이어 쓴다. 영상 `UIView` 는 옮기지 않고 크기와 zIndex 만 바꾼다(옮기면 Agora 렌더가 끊긴다). 라이트 모드 고정, 모눈 바탕 `GridPaper`, 카드·버튼 `PixelFrame`.
- `PartnerSession.swift` 인터페이스: `@MainActor final class PartnerSession: NSObject, ObservableObject`. `@Published status: PartnerStatus`(idle·connecting·waiting·connected·partnerLeft·ended·unavailable·error(String)), `micOn`, `cameraOn`, `partnerMicOn`, `partnerCameraOn`, `partnerSharing`. 뷰 `remoteView`·`localView`·`screenView`. `func join(code:micOn:) async`, `func setMic(_:)`, `func setCamera(_:)`, `func leave()`. `screenUidOffset = 1_000_000`.

### 단계 A 완료 조건

- `web/` 에서 `pnpm lint`·`pnpm build` 통과.
- `node scripts/check-integration.mjs call` 이 껍데기 항목(표식·route 501)에서만 실패한다.
- `/?preview=connected` 에서 연결된 통화 화면과 상대 마이크·카메라 표시 변화가 보인다.
- 커밋한다.

<a id="stage-b"></a>
## 단계 B. Agora 통합

단계 A 의 껍데기에 통화를 붙인다. 영상·소리는 Agora RTC(Video SDK), 상대 마이크·카메라 상태는 Agora Signaling(RTM)이다. `/integrate-video-call` 명령이 이 절을 가리킨다. 1번부터 5번까지 한 번에 수행하고 중간에 승인을 묻지 않는다. 막히면 그 자리에서 멈추고 5번 보고 형식으로 어디서 막혔는지 적는다.

전제: 단계 A 가 커밋돼 있고 `git status` 가 깨끗하다. 완성본에서 다시 돌리지 않는다.

### 1. 규칙

- Agora 판단은 전부 `.claude/skills/agora/SKILL.md` 와 그 참조로 한다. 웹 검색·기억 금지. 스킬 자동 로드가 없는 에이전트도 이 파일들을 직접 읽는다.
- 스킬의 "video call + chat → RTC first, then RTM" 경로다. 읽는 순서: `references/rtc/README.md` → `rtc/web.md` → `rtc/nextjs.md` → `server/tokens.md` → `rtm/README.md` → `rtm/web.md`(Presence State 절까지) → `integration-patterns.md`(RTC+RTM identity 절). iOS 를 하면 `rtc/ios.md`, `rtc/cross-platform-coordination.md`, `rtm/ios.md` 도.
- 고쳐도 되는 파일: `web/lib/agora/rtc.ts`, `web/lib/agora/rtm.ts`, `web/app/api/agora/token/route.ts`, `web/package.json`·`web/pnpm-lock.yaml`. iOS 를 하면 `mobile/Partner/PartnerSession.swift`, `mobile/project.yml`(패키지 버전 충돌 때만). 그 밖은 읽기만 한다. 특히 계약 `web/lib/call.ts`, `components/**`, `content/**`, `scripts/**`, `docs/**`.
- import 격리: `agora-rtc-sdk-ng` 는 `rtc.ts` 안에만, `agora-rtm` 은 `rtm.ts` 안에만, `agora-token` 은 토큰 route 안에만. 의존성은 `pnpm add` 로 넣고 lockfile 버전을 그대로 쓴다.
- App Certificate(`NEXT_AGORA_APP_CERTIFICATE`)는 토큰 route 에서만 읽는다. `.env.local` 을 열거나 셸 명령에 넣지 않는다. 존재 확인은 `node scripts/doctor.mjs` 로만.
- 녹화 클립·가짜 카메라(chromium 플래그)·컬러바로 검증하지 않는다. 실제 카메라·마이크 확인은 사람이 한다.

### 2. 준비 점검

1. `node scripts/doctor.mjs`. ✗ 가 있으면 적힌 명령을 실행하고 다시 본다. `.env.local` 이 없으면 `web/` 에서 `agora project env write --template nextjs`(값을 손으로 옮기지 않는다). △(cloudflared)는 넘어간다.
2. `web/lib/call.ts` 를 읽는다. 상태 이름과 순서, `CallStartOptions`, `PartnerState`, `CallSession` 이 계약이다. `createRtcCall`, `joinStateChannel`·`StateChannelOptions`·`StateChannel` 은 이름과 시그니처를 그대로 둔다.
3. 스킬 참조를 읽고 네 가지를 한 줄씩 메모한다(5번 보고에 쓴다): 이벤트 핸들러를 join 전에 등록하는 이유, `user-published` 가 두 번 오는 이유, Next.js 에서 SDK 를 브라우저에서만 불러오는 방법, RTM login 의 userId 가 토큰 identity 와 같아야 하는 이유.

### 3. 적용

1. 의존성: `pnpm add agora-rtc-sdk-ng agora-rtm agora-token`. 화면용 `qrcode.react`·`galmuri` 는 단계 A 에서 이미 넣었다.
2. 토큰 route: `GET ?channel=&uid=[&rtm=1]` → `{ appId, channel, uid, token }`. channel 없거나 uid 가 1~2^32-1 정수가 아니면 400, env 가 없으면 500. `rtm=1` 이면 `RtcTokenBuilder.buildTokenWithRtm(appId, cert, channel, String(uid), PUBLISHER, 3600, 3600)`, 아니면 `buildTokenWithUid(…, uid, PUBLISHER, 3600, 3600)`. RTC 는 숫자 uid 로 join 하고 RTM 은 `String(uid)` 로 login 해도 되는 근거를 설치된 `node_modules/agora-token/src/RtcTokenBuilder2.js`(`buildTokenWithUid` 가 `buildTokenWithUserAccount` 로 위임)와 `AccessToken2.js`(`ServiceRtc` 생성자)에서 직접 읽고 메모에 한 줄 적는다. 다르면 멈추고 보고한다. 껍데기의 501·"아직 껍데기"·표식 주석을 지운다.
3. `rtc.ts`: `start()` 안에서 `await import("agora-rtc-sdk-ng")`(모듈 최상위 import 금지). uid 는 1~1,000,000 난수 → 토큰(`rtm=1`) → `createClient({ mode: "rtc", codec: "vp8" })` → 핸들러 등록(join 전) → `join` → `createMicrophoneAndCameraTracks()` → `publish` → 로컬 `play(localContainer)` → `joinStateChannel({ userId: String(uid), token, state, onPartner })`(onPartner 가 없어도 내 상태를 알려야 하므로 늘 연다) → 상대가 아직 없으면 `waiting`. `user-published` 는 subscribe 후 video 를 `remoteContainer` 에(첫 video 에 `connected`), audio 는 `play()`. `user-unpublished` video 면 컨테이너를 비운다. `user-left` 면 `partner-left`. `token-privilege-will-expire` 에서 `renewToken`. `setMic`/`setCamera` 는 `setEnabled` 뒤 상태 채널 `setState`. `stop()` 은 상태 채널 leave → 트랙 stop·close → `leave` → `ended`. `start` 진행 중에 `stop` 이 오면 세대 번호로 그 start 를 멈춘다(한 탭이 같은 채널에 두 번 들어가 자기 자신을 상대로 보는 것을 막는다). 실패는 `error` 와 사유. 껍데기 줄과 표식 주석을 지운다.
4. `rtm.ts`: `await import("agora-rtm")` → `new RTM(appId, userId)` → `presence` 리스너(login 전) → `login({ token })` → `subscribe(channel, { withMessage: false, withPresence: true })` → `presence.setState(channel, "MESSAGE", { mic: "on"|"off", camera: "on"|"off" })`. `SNAPSHOT` 은 내가 아닌 사람의 states, `REMOTE_STATE_CHANGED` 는 publisher 가 내가 아닐 때 `onPartner`. 값이 `"off"` 일 때만 false, 키가 없으면 이전 값 유지. 상대가 나가는 것은 RTC 가 `partner-left` 로 낸다. `leave()` 는 unsubscribe → logout. 표식 주석을 지운다.
5. iOS(선택, `scripts/ios.sh doctor` 에 ✗ 가 없을 때만. ✗ 가 있으면 건너뛰고 보고에 이유를 적는다): `PartnerSession.swift` 본문. 코드가 비었거나 App ID 가 없거나 카메라·마이크 권한이 없으면 `.error`. uid 는 1~1,000,000 난수, 토큰은 `Config.webBaseURL` 의 `/api/agora/token?channel=<code>&uid=<uid>&rtm=1`. RTC 는 엔진 생성 때 delegate 등록, communication 프로필, 비디오 640×360 24fps, 스피커로 출력(`setDefaultAudioRouteToSpeakerphone(true)`, 이 프로필의 기본은 수화기다), 로컬 미리보기, broadcaster 로 숫자 uid join. 상대 첫 프레임 디코딩에 `.connected`, 상대가 나가면(`didOfflineOfUid`) `.partnerLeft`, 토큰 만료 전 `renewToken`. `setMic` 은 `muteLocalAudioStream`, `setCamera` 는 `enableLocalVideo`(캡처 자체를 멈춘다) 뒤 presence 갱신. RTM 은 `AgoraRtmClientKit`(userId `String(uid)`), 같은 토큰으로 login, presence subscribe, `setState`. 상대 `.snapshot`·`.remoteStateChanged` 로 `partnerMicOn`·`partnerCameraOn`. `leave()` 는 RTM unsubscribe·logout·destroy → 미리보기 멈춤·leaveChannel·엔진 destroy → `.ended`. `status = .unavailable` 줄을 지운다. Xcode GUI 를 열지 않고 `scripts/ios.sh gen` → `scripts/ios.sh sim` 이 통과해야 한다.

### 4. 기계 검증

`web/` 에서 `pnpm lint`·`pnpm build`, `video-call-web-mobile/` 에서 `node scripts/check-integration.mjs call`(iOS 를 했으면 `ios` 도). 실패하면 고치고 다시 돌린다. 같은 항목이 세 번 고쳐도 실패하면 멈추고 보고에 적는다.

### 5. 보고

- `git diff --stat` 과 바뀐 파일. 3번 허용 목록 밖의 파일이 바뀌었으면 왜인지 한 줄.
- 2-3 의 메모 네 줄과 토큰 근거 한 줄.
- iOS 를 했는지, 건너뛰었으면 이유.
- [검증](#verify) 절의 "사람 확인" 목록을 그대로 붙인다. "된다"·"동작한다" 고 쓰지 않는다.

<a id="stage-c"></a>
## 단계 C. 손으로 더한 기능

통합 뒤에 손으로 더한 것이다. 계약(`lib/call.ts`)은 단계 A 에서 이미 이 모양이므로 `rtc.ts`·화면·iOS 만 채운다.

- 대기실 마이크 선택: `start({ mic })` 가 false 면 오디오 트랙을 `setEnabled(false)` 로 만들고 비디오만 publish 한다. 꺼진 트랙은 publish 할 수 없으므로(`TRACK_IS_DISABLED`) 처음 켤 때 publish 한다. presence 도 `mic: "off"` 로 시작한다. `Partner.tsx` 는 들어가기 순간의 값을 ref 로 넘겨 통화 중 토글이 세션을 다시 시작하지 않게 한다.
- 화면 공유(데스크톱 Chrome 만, 스킬 `rtc/web.md` 의 Dual-Client Pattern): `setScreenShare(true)` 는 `createScreenVideoTrack({ encoderConfig: { width: 1920, height: 1080, frameRate: 15 }, optimizationMode: "detail" }, "disable")` 로 소리 없는 화면 트랙을 만들고, 두 번째 클라이언트가 같은 채널에 `screenUidOf(uid)` 로 들어가 그 트랙만 publish 한다(토큰은 `rtm` 없이). 창 고르기 취소(`PERMISSION_DENIED`)는 조용히 끝낸다. `track-ended`(브라우저의 "공유 중지")도 같은 정리로 간다. 받는 쪽은 `isScreenUid` 인 참가자의 video 를 `screenContainer` 에 `{ fit: "contain" }` 으로 재생하고 `onScreen({ partner: true })`. 화면 uid 는 `connected`·`partner-left` 판단에 쓰지 않는다. `stop()` 은 화면 공유부터 정리한다.
- 화면: `Call.tsx` 툴바에 `getDisplayMedia` 가 있을 때만 "화면 공유"/"공유 중지" 버튼, 공유 중 상태 알약 "내 화면을 공유하는 중 · 파트너 폰에 보여요", 실패는 머리줄에 warn 색. `Partner.tsx` 는 공유가 시작되면 공유 화면을 크게, 데스크톱 얼굴을 왼쪽 위에 작게 두고 작은 쪽을 누르면 서로 바뀐다("눌러서 크게"). 이름표 "데스크톱 · 화면 공유 중". 폰을 눕히면 `landscape:` 배치. iOS 는 참가자가 들어올 때(`didJoinedOfUid`) 화면 uid 면 `screenView` 에 `.fit`, 아니면 `remoteView` 에 `.hidden` 캔버스를 붙이고, 화면 uid 영상이 decoding 이면 `partnerSharing` 을 켜고 stopped 나 나감이면 끈다. 공유가 시작되면 공유 화면을 크게 둔다. 폰은 공유하지 않는다.

<a id="verify"></a>
## 검증

기계 검증(`video-call-web-mobile/` 에서):

```bash
cd web && pnpm lint && pnpm build && cd ..
node scripts/doctor.mjs
node scripts/check-integration.mjs call
node scripts/check-integration.mjs ios   # iOS 를 했으면
```

사람 확인(가짜 카메라·녹화 클립으로 대신하지 않는다):

1. `web/` 에서 `pnpm dev`, 다른 터미널에서 `cloudflared tunnel --url http://localhost:3000`. 나온 `https://….trycloudflare.com` 을 데스크톱 Chrome 에서 열고 "파트너와 통화" → 워밍업 → 통화 화면에 내 얼굴과 QR 이 뜬다.
2. 폰 카메라로 QR 을 찍어 폰 브라우저 "파트너" 화면에서 들어간다. 양쪽에 상대 영상이 뜨고 폰에서 한 말이 데스크톱 헤드폰으로 들린다.
3. 한쪽에서 마이크나 카메라를 끄면 상대 이름표에 빗금이나 카메라 아이콘이 붙는다(RTM).
4. 폰이 나가면 "파트너가 나갔어요" 와 QR 이 다시 뜨고, 다시 들어오면 붙는다. "통화 끝내기" 는 완료 화면으로 간다.
5. 데스크톱에서 화면을 공유하면 폰에 공유 화면이 크게 뜨고, 작은 쪽을 누르면 바뀌고, 폰을 눕히면 가로 배치가 되고, 공유를 멈추면 얼굴로 돌아온다.
6. iOS 를 했으면: `mobile/Partner/Config.swift` 의 `webBaseURL` 을 맥 LAN IP 의 `http://<IP>:3000` 으로 바꾸고(커밋하지 않는다) `pnpm dev` + `scripts/ios.sh device`. 데스크톱은 `http://localhost:3000` 으로 열고 방 코드를 폰 앱에 넣어 2~5 를 반복한다. 상대 마이크·카메라 꺼짐은 폰 앱 위쪽 상태 줄에 글자로 보인다.

## 지키는 규칙

- 시크릿은 `web/.env.local`(CLI `agora project env write --template nextjs` 가 쓴다), `mobile/Signing.xcconfig`, `mobile/Partner/AppIdConfig.swift` 에만 있고 셋 다 gitignore 다. 레포에는 `.example` 만 둔다. 값을 로그·채팅에 출력하지 않는다.
- 클라이언트 SDK 는 `web/lib/agora/` 안에서만, 브라우저에서만(함수 안 동적 import) 불러온다. 서버 SDK 는 `web/app/api/agora/` 안에서만.
- 화면·계약·콘텐츠는 통합 때 바꾸지 않는다. 새 추상화를 만들지 않는다.
- UI 문구·주석은 한국어, 영어 표현은 원문. em-dash 를 쓰지 않는다. 앱에 고유 이름을 붙이지 않는다("이 앱", "연습 앱", "파트너 앱").

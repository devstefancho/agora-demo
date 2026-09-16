# 파트너와 영상통화 (웹 + 폰)

하루 5분 영어 말하기 연습 앱의 영상통화 구현이다. 데스크톱 웹에서 파트너와 5분 영상통화를 하고, 폰은 초대 링크(브라우저) 또는 iOS 앱으로 들어온다.
Agora Video SDK(RTC)로 영상·소리를, Signaling(RTM)으로 상대 마이크·카메라 상태를 나른다.
데스크톱 Chrome 은 화면을 공유할 수 있고(화면 전용 RTC 클라이언트, uid = 카메라 uid + 1,000,000), 폰(브라우저·iOS 앱)은 보기만 한다. 폰에서는 공유 화면과 상대 카메라 중 누른 쪽이 크게 나오고 가로모드를 지원한다.
앱에 고유 이름을 붙이지 않는다. 화면·문서에서는 "이 앱"·"연습 앱"·"파트너 앱"으로만 부른다.

이 파일은 에이전트 규칙이다. 무엇이 구현돼 있고 어떻게 만드는지의 정본(SSOT)은 `docs/spec.md` 하나다. 구현을 바꾸면 그 문서를 같이 고친다. 레포 전체 규칙은 루트 `AGENTS.md`.
Claude Code는 `CLAUDE.md`가 이 파일을 가리키고, grok·codex·cursor는 이 파일을 직접 읽는다.

## 디렉토리

에이전트는 이 디렉토리에서 실행한다. skill·명령·MCP 설정이 이 안에 있다.

| 경로 (이 디렉토리 기준) | 무엇 |
|---|---|
| `web/` | Next.js 웹 앱. 데스크톱 통화 화면, 폰 브라우저 파트너 화면, 토큰 서버 |
| `mobile/` | 파트너 iOS 앱 (선택. XcodeGen `project.yml`, SwiftUI) |
| `scripts/` | `doctor.mjs`(준비 점검) · `check-integration.mjs`(결과 검증) · `ios.sh`(iOS 터미널 빌드). 이 디렉토리에서 실행한다 |
| `docs/` | `spec.md`(SSOT: 구현 명세와 만드는 순서, 통합 절차 포함) · `design.md`(디자인 규칙) |
| `.claude/skills/agora` · `.claude/commands/` · `.mcp.json` | Agora 공식 skill, `/integrate-video-call` 명령, Agora 문서·CLI MCP. 에이전트는 이 디렉토리에서 실행한다 |

| 통합 | 통합 절차 | 채우는 파일 (`web/`·`mobile/` 기준) | 스킬 경로 | 검증 |
|---|---|---|---|---|
| 파트너와 통화 (+ 선택: 폰 앱) | `docs/spec.md` 단계 B (`/integrate-video-call`) | `web/lib/agora/rtc.ts`, `web/lib/agora/rtm.ts`, `web/app/api/agora/token/route.ts` (선택: `mobile/Partner/PartnerSession.swift`) | RTC + RTM (`references/rtc/*`, `references/rtm/*`, `server/tokens.md`) | `node scripts/check-integration.mjs call` (선택: `ios`) |

## web/ 구조

| 경로 (`web/` 기준) | 역할 | 통합 때 |
|---|---|---|
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | 페이지 하나, 폰트, 디자인 토큰 | 건드리지 않는다 |
| `components/PracticeApp.tsx` | 화면 상태머신: 홈 → 워밍업 → 통화 → 완료. 초대 링크(`?room=`)로 열리면 폰 파트너 화면 | 건드리지 않는다 |
| `components/screens/*`, `components/CallStage.tsx`, `components/ui.tsx` | 화면 다섯(홈·워밍업·통화·완료·폰 파트너), 통화 무대 부품(이름표·툴바·픽셀 아이콘), 공용 UI | 건드리지 않는다 |
| `content/units.ts` | 10유닛 × 표현 4개, `findUnit(id)` | 건드리지 않는다 |
| `lib/call.ts` | **영상통화 계약.** 타입·상태 이름·`onPartner`(상대 마이크·카메라)·preview 만. `createCallSession()` 은 `lib/agora/rtc.ts` 에 위임한다 | 건드리지 않는다 |
| `lib/agora/rtc.ts` · `rtm.ts` | **Agora 클라이언트.** 영상·소리는 RTC, 상대 마이크·카메라 상태는 RTM. 클라이언트 SDK import 는 여기서만. 껍데기는 `onStatus("unavailable")` | 통합이 채운다 |
| `app/api/agora/token/route.ts` | **Agora 서버 (Route Handler).** 토큰 발급(`rtm=1` 이면 RTC+RTM 통합 토큰). App Certificate 는 여기서만 읽는다. 껍데기는 501 | 통합이 채운다 |
| `lib/storage.ts`, `lib/speech.ts` | localStorage 기록, 발음 듣기(Web Speech) | 건드리지 않는다 |

`mobile/` 은 `Partner/PartnerSession.swift` 가 경계다. 화면(`ContentView.swift`)·테마(`Theme.swift`·`PixelIcon.swift`)·`Config.swift` 는 통합 때 건드리지 않는다. `.xcodeproj` 는 생성물이다.

## Agora 규칙 (모든 에이전트 공통)

1. Agora 관련 판단은 전부 이 디렉토리의 `.claude/skills/agora/SKILL.md` 와 그 아래 `references/` 로 한다.
   스킬 자동 로드가 없는 에이전트는 **작업 시작 전에 그 파일을 직접 읽고** 거기 적힌 라우팅을 따른다.
   웹 검색이나 기억으로 Agora API 를 쓰지 않는다.
2. 이 앱의 통화는 스킬의 **RTC** 경로에 **RTM**(presence state 로 상대 마이크·카메라 상태)을 더한 것이다. 상대는 폰 브라우저로 초대 링크(`?room=`)를 열어 파트너 화면에 들어온다(iOS 앱은 선택).
3. 서버 코드는 `web/app/api/agora/*` Route Handler 에만 둔다. App Certificate 는 서버에만 있다.
4. **Agora 패키지 import 격리.** 클라이언트 SDK(`agora-rtc-sdk-ng`, `agora-rtm`)는
   `web/lib/agora/` 안에서만, 서버 SDK(`agora-token`)는 `web/app/api/agora/` 안에서만 import 한다.
   계약 파일(`lib/call.ts`)과 화면은 SDK 를 모른다. `check-integration` 이 잡는다.
5. env 는 `web/.env.local`. 값은 `web/` 에서 `agora` CLI(`agora project env write --template nextjs`)가 쓴다.
   iOS 는 `scripts/ios.sh gen` 이 그 env 에서 `mobile/Partner/AppIdConfig.swift` 를 만들고, 서명 Team ID 는 `mobile/Signing.xcconfig` 에만 둔다. 둘 다 gitignore.
   시크릿 값을 채팅이나 로그에 출력하지 않는다. 레포에는 `.example` 만 커밋한다.
6. "된다"는 실제 브라우저·폰·기기에서 사람이 확인한 뒤에만 말한다. 통합 보고는 "사람 확인" 목록으로 끝난다.
7. 검증에 녹화 클립·가짜 카메라(chromium 플래그)·컬러바를 쓰지 않는다. 실제 카메라·마이크·기기로만 한다.

## 도구

- `agora` CLI: 로그인·프로젝트·env·doctor. MCP 가 없어도 셸에서 직접 부르면 된다 (`--json` 권장).
- `.mcp.json` (Claude Code): Agora 문서 MCP(`agora-docs-mcp`) + CLI MCP(`agora mcp serve`). 없어도 위 CLI 와 로컬 참조로 충분하다.
- `cloudflared`: 폰 브라우저로 확인할 때 HTTPS 터널 (`cloudflared tunnel --url http://localhost:3000`). README 「따라 하기」.
- 명령: `web/` 에서 `pnpm dev`(기본 3000) · `pnpm build` · `pnpm lint`. 이 디렉토리에서 `node scripts/doctor.mjs` · `node scripts/check-integration.mjs call|ios` · `scripts/ios.sh <명령>`

## 문체

- UI 문구·주석·문서는 한국어, 영어 표현은 원문 그대로. em-dash 는 쓰지 않는다.
- 컴포넌트 이름과 파일 구조를 그대로 유지한다. 새 추상화를 만들지 않는다.

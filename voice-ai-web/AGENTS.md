# AI 파트너와 음성 대화 (웹)

하루 5분 영어 말하기 연습 앱의 음성 대화 구현이다. 브라우저에서 AI 파트너 Mia 와 5분 동안 영어로 스몰토크를 한다.
Mia 는 Agora Conversational AI Engine 이 채널에 들여보내는 에이전트다. 내 마이크와 Mia 의 목소리는 RTC, 자막(전사)은 Signaling(RTM)으로 오고, 에이전트 start·stop 은 서버의 `agora-agents` SDK 가 한다. 모델(ASR·LLM·TTS)은 Agora 관리라 벤더 키가 없다.
앱에 고유 이름을 붙이지 않는다. 화면·문서에서는 "이 앱"·"연습 앱"으로만 부른다. 이름이 있는 것은 Mia 뿐이다.

이 파일은 에이전트 규칙이다. 무엇이 구현돼 있고 어떻게 만드는지의 정본(SSOT)은 `docs/spec.md` 하나다. 구현을 바꾸면 그 문서를 같이 고친다. 레포 전체 규칙은 루트 `AGENTS.md`.
Claude Code는 `CLAUDE.md`가 이 파일을 가리키고, grok·codex·cursor는 이 파일을 직접 읽는다.

## 디렉토리

에이전트는 이 디렉토리에서 실행한다. Next.js 앱이 이 디렉토리 자체이고, skill·명령·MCP 설정도 이 안에 있다.

| 경로 | 무엇 |
|---|---|
| `app/`, `components/`, `content/`, `lib/` | Next.js 앱 (아래 구조 표) |
| `scripts/` | `doctor.mjs`(준비 점검) · `check-integration.mjs`(결과 검증) |
| `docs/` | `spec.md`(SSOT: 구현 명세와 만드는 순서, 통합 절차 포함) · `design.md`(디자인 규칙) |
| `.claude/skills/agora` · `.claude/commands/` · `.mcp.json` | Agora 공식 skill, `/integrate-voice` 명령, Agora 문서·CLI MCP |

| 통합 | 통합 절차 | 채우는 파일 | 스킬 경로 | 검증 |
|---|---|---|---|---|
| Mia 와 음성 대화 | `docs/spec.md` 단계 B (`/integrate-voice`) | `lib/agora/convoai.ts`, `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts` | Conversational AI integration (`references/conversational-ai/*`, `server/tokens.md`) | `node scripts/check-integration.mjs voice` |

## 앱 구조

| 경로 | 역할 | 통합 때 |
|---|---|---|
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | 페이지 하나, 폰트, 디자인 토큰, Mia 구슬 | 건드리지 않는다 |
| `components/PracticeApp.tsx` | 화면 상태머신: 홈 → 워밍업 → 대화 → 완료 | 건드리지 않는다 |
| `components/screens/*`, `components/MiaOrb.tsx`, `components/ui.tsx` | 화면 넷(홈·워밍업·대화·완료), Mia 구슬, 공용 UI | 건드리지 않는다 |
| `content/units.ts` | 10유닛 × 표현 4개, `findUnit(id)`, Mia 지시문 `buildMiaInstructions(unit)`, 표현 사용 판정 | 건드리지 않는다 |
| `lib/voice.ts` | **음성 대화 계약.** 타입·상태 이름·preview 만. `createVoiceSession()` 은 `lib/agora/convoai.ts` 에 위임한다 | 건드리지 않는다 |
| `lib/agora/convoai.ts` | **Agora 클라이언트.** 마이크·Mia 목소리는 RTC, 전사는 RTM + 에이전트 툴킷. 클라이언트 SDK import 는 여기서만. 껍데기는 `onStatus("unavailable")` | 통합이 채운다 |
| `app/api/agora/token/route.ts` | **Agora 서버.** RTC+RTM 통합 토큰 발급. App Certificate 를 읽는다. 껍데기는 501 | 통합이 채운다 |
| `app/api/agora/agent/route.ts` | **Agora 서버.** 에이전트 start(`POST`)·stop(`DELETE`), `agora-agents` SDK. 껍데기는 501 | 통합이 채운다 |
| `lib/storage.ts`, `lib/speech.ts` | localStorage 기록, 발음 듣기(Web Speech) | 건드리지 않는다 |

## Agora 규칙 (모든 에이전트 공통)

1. Agora 관련 판단은 전부 이 디렉토리의 `.claude/skills/agora/SKILL.md` 와 그 아래 `references/` 로 한다.
   스킬 자동 로드가 없는 에이전트는 **작업 시작 전에 그 파일을 직접 읽고** 거기 적힌 라우팅을 따른다.
   웹 검색이나 기억으로 Agora API 를 쓰지 않는다.
2. 이 앱은 스킬의 **Conversational AI integration** 경로다. 공식 Next.js quickstart 를 레포 바깥에 두고 소스로 삼아 copy map 을 만든 뒤, 위 세 파일에만 옮긴다. 파이프라인은 quickstart 기본값(Agora 관리 모델, 벤더 키 없음)이다.
3. 서버 코드는 `app/api/agora/*` Route Handler 에만 둔다. App Certificate 는 서버에만 있다.
4. **Agora 패키지 import 격리.** 클라이언트 SDK(`agora-rtc-sdk-ng`, `agora-rtm`, `agora-agent-client-toolkit`)는 `lib/agora/` 안에서만, 서버 SDK(`agora-token`, `agora-agents`)는 `app/api/agora/` 안에서만 import 한다. 계약 파일(`lib/voice.ts`)과 화면은 SDK 를 모른다. `check-integration` 이 잡는다.
5. env 는 이 디렉토리의 `.env.local`. 값은 `agora` CLI(`agora project env write --template nextjs`)가 쓴다. 시크릿 값을 채팅이나 로그에 출력하지 않는다.
6. "된다"는 실제 브라우저에서 사람이 Mia 와 말해 본 뒤에만 말한다. 통합 보고는 "사람 확인" 목록으로 끝난다.
7. 검증에 녹음 파일·가짜 마이크를 쓰지 않는다. 에이전트를 띄우면 Conversational AI 사용량이 쌓이므로, 확인은 짧게 하고 끝나면 에이전트를 멈춘다.

## 도구

- `agora` CLI: 로그인·프로젝트·env·doctor·quickstart. MCP 가 없어도 셸에서 직접 부르면 된다 (`--json` 권장).
- `.mcp.json` (Claude Code): Agora 문서 MCP(`agora-docs-mcp`) + CLI MCP(`agora mcp serve`). 없어도 위 CLI 와 로컬 참조로 충분하다.
- `cloudflared`: 폰 브라우저로 확인할 때 HTTPS 터널 (`cloudflared tunnel --url http://localhost:3000`).
- 명령: `pnpm dev`(기본 3000) · `pnpm build` · `pnpm lint` · `node scripts/doctor.mjs` · `node scripts/check-integration.mjs voice`

## 문체

- UI 문구·주석·문서는 한국어, 영어 표현과 Mia 의 말은 원문 그대로. em-dash 는 쓰지 않는다.
- 컴포넌트 이름과 파일 구조를 그대로 유지한다. 새 추상화를 만들지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI 아바타와 대화 (웹)

하루 5분 영어 말하기 연습 앱에서 AI 아바타 Mia 와 5분 동안 영어로 대화한다. 데스크톱 웹(Chrome)에서 Mia 의 얼굴이 무대에 뜨고, 목소리로 대답하고, 입 모양이 목소리와 맞는다.
Agora Conversational AI Engine 이 음성 인식·LLM·음성 합성을 돌리고, 아바타 벤더가 만든 얼굴 영상이 채널의 참가자로 들어온다.
앱에 고유 이름을 붙이지 않는다. 화면·문서에서는 "이 앱"·"연습 앱"으로만 부른다. AI 파트너 캐릭터 Mia 는 예외다.

이 파일은 에이전트 규칙이다. 무엇이 구현돼 있고 어떻게 만드는지의 정본(SSOT)은 `docs/spec.md` 하나다. 구현을 바꾸면 그 문서를 같이 고친다. 레포 전체 규칙은 루트 `AGENTS.md`.
Claude Code는 `CLAUDE.md`가 이 파일을 가리키고, grok·codex·cursor는 이 파일을 직접 읽는다.

## 디렉토리

에이전트는 이 디렉토리에서 실행한다. skill·명령·MCP 설정이 이 안에 있다. Next.js 앱도 이 디렉토리가 루트다(`web/` 층 없음).

| 경로 (이 디렉토리 기준) | 무엇 |
|---|---|
| `app/`, `components/`, `content/`, `lib/` | Next.js 웹 앱. 홈 · 워밍업 · 대화 · 완료 화면, 토큰·에이전트 서버 |
| `scripts/` | `doctor.mjs`(준비 점검) · `check-integration.mjs`(결과 검증) |
| `docs/` | `spec.md`(SSOT: 구현 명세와 만드는 순서, 통합 절차 포함) · `design.md`(디자인 규칙) |
| `.claude/skills/agora` · `.claude/commands/` · `.mcp.json` | Agora 공식 skill, `/integrate-avatar` 명령, Agora 문서·CLI MCP |

| 통합 | 통합 절차 | 채우는 파일 | 스킬 경로 | 검증 |
|---|---|---|---|---|
| AI 아바타와 대화 | `docs/spec.md` 단계 B (`/integrate-avatar`) | `lib/agora/convoai.ts`, `app/api/agora/token/route.ts`, `app/api/agora/agent/route.ts` | Conversational AI integration (`references/conversational-ai/*`) + 원격 비디오(`references/rtc/web.md`) + `server/tokens.md` | `node scripts/check-integration.mjs avatar` |

## 앱 구조

| 경로 | 역할 | 통합 때 |
|---|---|---|
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | 페이지 하나, 폰트, 디자인 토큰, Mia 구슬 | 건드리지 않는다 |
| `components/PracticeApp.tsx` | 화면 상태머신: 홈 → 워밍업 → 대화 → 완료 | 건드리지 않는다 |
| `components/screens/*`, `components/TalkStage.tsx`, `components/ui.tsx` | 화면 넷, 대화 무대 부품(구슬·이름표·툴바·픽셀 아이콘), 공용 UI | 건드리지 않는다 |
| `content/units.ts` | 10유닛 × 표현 4개, Mia 첫 인사, `buildMiaInstructions()`, `detectUsedExpressions()` | 건드리지 않는다 |
| `lib/talk.ts` | **대화 계약.** 타입·상태 이름·`onTranscript`·`onAvatar`·preview 만. `createTalkSession()` 은 `lib/agora/convoai.ts` 에 위임한다 | 건드리지 않는다 |
| `lib/agora/convoai.ts` | **Agora 클라이언트.** 채널 참가, 마이크, Mia 목소리, 전사, 아바타 비디오. 클라이언트 SDK import 는 `lib/agora/` 안에서만. 껍데기는 `onStatus("unavailable")` | 통합이 채운다 |
| `app/api/agora/token/route.ts` | **Agora 서버.** 학습자 토큰(RTC+RTM). App Certificate 는 `app/api/agora/` 안에서만 읽는다. 껍데기는 501 | 통합이 채운다 |
| `app/api/agora/agent/route.ts` | **Agora 서버.** 에이전트 start·stop, 아바타 벤더 설정. 서버 SDK import 는 `app/api/agora/` 안에서만. 껍데기는 501 | 통합이 채운다 |
| `lib/storage.ts`, `lib/speech.ts` | localStorage 기록, 발음 듣기(Web Speech) | 건드리지 않는다 |

## Agora 규칙 (모든 에이전트 공통)

1. Agora 관련 판단은 전부 이 디렉토리의 `.claude/skills/agora/SKILL.md` 와 그 아래 `references/` 로 한다.
   스킬 자동 로드가 없는 에이전트는 **작업 시작 전에 그 파일을 직접 읽고** 거기 적힌 라우팅을 따른다.
   웹 검색이나 기억으로 Agora API 를 쓰지 않는다. 로컬 참조에 없는 벤더 필드는 설치된 `agora-agents` 의 타입 선언(`node_modules/agora-agents/dist/**/*.d.mts`)과 스킬의 `references/doc-fetching.md` 절차로 확인한다.
2. 파이프라인은 Agora 관리 모델(음성 인식·LLM·음성 합성)이다. STT·LLM·TTS 벤더 키를 넣지 않는다. 아바타만 벤더 키가 필요하다.
3. 서버 코드는 `app/api/agora/*` Route Handler 에만 둔다. App Certificate 와 아바타 키는 서버에만 있다.
4. **Agora 패키지 import 격리.** 서버 SDK(`agora-token`, `agora-agents`)는 `app/api/agora/` 안에서만, 그 밖의 Agora 패키지(클라이언트 SDK)는 `lib/agora/` 안에서만 import 한다. 계약 파일(`lib/talk.ts`)과 화면은 SDK 를 모른다. `check-integration` 이 잡는다.
5. env 는 `.env.local`. App ID·Certificate 는 이 디렉토리에서 `agora` CLI(`agora project env write --template nextjs`)가 쓴다. 아바타 값(`AVATAR_VENDOR`·`AVATAR_API_KEY`·`AVATAR_ID`)은 사람이 직접 넣는다.
   시크릿 값을 채팅이나 로그에 출력하지 않는다. 레포에 env 파일을 커밋하지 않는다. `agora project show` 는 App Certificate 원문을 찍으므로 실행하지 않는다(프로젝트 확인은 `agora project doctor`).
6. "된다"는 실제 브라우저에서 사람이 목소리·얼굴을 확인한 뒤에만 말한다. 통합 보고는 "사람 확인" 목록으로 끝난다.
7. 검증에 녹화 클립·가짜 마이크(chromium 플래그)를 쓰지 않는다. 실제 마이크로만 한다.

## 도구

- `agora` CLI: 로그인·프로젝트·env·doctor. MCP 가 없어도 셸에서 직접 부르면 된다 (`--json` 권장).
- `.mcp.json` (Claude Code): Agora 문서 MCP(`agora-docs-mcp`) + CLI MCP(`agora mcp serve`). 없어도 위 CLI 와 로컬 참조로 충분하다.
- 명령: 이 디렉토리에서 `pnpm dev`(기본 3000) · `pnpm build` · `pnpm lint` · `node scripts/doctor.mjs` · `node scripts/check-integration.mjs avatar`

## 문체

- UI 문구·주석·문서는 한국어, 영어 표현은 원문 그대로. em-dash 는 쓰지 않는다.
- 컴포넌트 이름과 파일 구조를 그대로 유지한다. 새 추상화를 만들지 않는다.

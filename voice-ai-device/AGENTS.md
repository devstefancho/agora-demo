# 스피커 기기에서 Mia 와 대화 (IoT)

하루 5분 영어 말하기 연습 앱의 AI 파트너 Mia 를 화면 없는 스피커 기기에 올린 구현이다. 기기(마이크·스피커가 달린 리눅스 기기)가 Agora IoT SDK 로 채널에 들어오고, 웹 서버가 Agora Conversational AI Engine 의 에이전트를 같은 채널에 넣는다. 기기의 버튼(Enter)으로 Mia 를 부르고 보낸다.
앱에 고유 이름을 붙이지 않는다. 화면·문서에서는 "이 앱"·"연습 앱"으로만 부른다. AI 파트너 이름 Mia 는 예외다.

이 파일은 에이전트 규칙이다. 무엇이 구현돼 있고 어떻게 만드는지의 정본(SSOT)은 `docs/spec.md` 하나다. 구현을 바꾸면 그 문서를 같이 고친다. 레포 전체 규칙은 루트 `AGENTS.md`.
Claude Code는 `CLAUDE.md`가 이 파일을 가리키고, grok·codex·cursor는 이 파일을 직접 읽는다.

## 디렉토리

에이전트는 이 디렉토리에서 실행한다. skill·명령·MCP 설정이 이 안에 있다.

| 경로 (이 디렉토리 기준) | 무엇 |
|---|---|
| `device/` | 기기 프로그램(C). `speaker.c` 본체, `agora_link.h`·`agora_link.c` 채널 경계, `Makefile`, `sdk.sh`. 기기에서 빌드한다 |
| `web/` | Next.js. 기기 토큰·에이전트 route 와 스피커 옆 보조 화면 |
| `scripts/` | `doctor.mjs`(준비 점검) · `check-integration.mjs`(결과 검증). 개발 맥에서 이 디렉토리에서 실행한다 |
| `docs/` | `spec.md`(SSOT: 구현 명세와 만드는 순서, 통합 절차 포함) |
| `.claude/skills/agora` · `.claude/commands/` · `.mcp.json` | Agora 공식 skill, `/integrate-device` 명령, Agora 문서·CLI MCP |

| 통합 | 통합 절차 | 채우는 파일 | 정본 | 검증 |
|---|---|---|---|---|
| 스피커에서 Mia 와 대화 | `docs/spec.md` 단계 B (`/integrate-device`) | `device/agora_link.c`, `web/app/api/token/route.ts`, `web/app/api/agent/route.ts` | ConvoAI 는 skill(`references/conversational-ai/*`) + 공식 Next.js quickstart. 기기는 IoT SDK 패키지와 Agora IoT·Device Kit 문서 | `node scripts/check-integration.mjs device` + 기기에서 `make` |

## 경계

| 경로 | 역할 | 통합 때 |
|---|---|---|
| `device/speaker.c` | 인자·버튼·마이크/스피커(ALSA)·서버 호출(libcurl). `agora_link.h` 만 안다 | 건드리지 않는다 |
| `device/agora_link.h` | **채널 계약.** `link_start`·`link_send`·`link_stop`, 16kHz 모노 20ms | 건드리지 않는다 |
| `device/agora_link.c` | **Agora IoT SDK.** SDK 헤더 include 는 여기서만. 껍데기는 `link_start` 가 -1 | 통합이 채운다 |
| `web/app/api/token/route.ts` · `agent/route.ts` | **Agora 서버.** 기기 토큰 발급, Mia 에이전트 start·stop. App Certificate 는 여기서만 읽는다. 껍데기는 501 | 통합이 채운다 |
| `web/content/units.ts`, `web/lib/mia.ts` | 10유닛 × 표현 4개, Mia 페르소나 문장 | 읽기만. 에이전트 instructions 로 넘긴다 |
| `web/app/page.tsx`, `web/components/SpeakerPanel.tsx` | 보조 화면(오늘의 표현, 자막 자리) | 건드리지 않는다 |

## Agora 규칙 (모든 에이전트 공통)

1. ConvoAI 판단은 이 디렉토리의 `.claude/skills/agora/SKILL.md` 와 그 아래 `references/` 로 한다. 스킬의 HARD GATE 대로 공식 Next.js quickstart 를 이 레포 바깥에 받아 소스로 삼는다. 웹 검색이나 기억으로 Agora API 를 쓰지 않는다.
2. 스킬 1.8.1 에는 IoT 경로가 없다. 기기 쪽은 `device/sdk.sh` 가 받은 IoT SDK 패키지(`sdk/include/agora_rtc_api.h`, `sdk/example/hello_rtsa.c`)와 `docs/spec.md` 단계 B 에 적힌 Agora 문서 URL 이 정본이다.
3. 파이프라인은 Agora 관리 모델(ASR·LLM·TTS), 벤더 키 없음. 언어는 영어. 기기와 에이전트는 숫자 uid(기기 2001, Mia 1001)와 G.722 로 만난다.
4. **import 격리.** `agora_rtc_api.h` 는 `device/agora_link.c` 에서만, `agora-agents`·`agora-token` 은 `web/app/api/` 안에서만. `check-integration` 이 잡는다.
5. env 는 `web/.env.local`. 값은 `web/` 에서 `agora project env write --template nextjs` 가 쓴다. 기기에는 App Certificate 가 없고, 서버에서 채널 하나짜리 토큰만 받는다. 시크릿·토큰 값을 채팅·로그에 출력하지 않는다.
6. "된다"는 실제 기기에서 사람이 말하고 들은 뒤에만 말한다. 통합 보고는 "사람 확인" 목록으로 끝난다.
7. 검증에 녹음 파일을 마이크 대신 흘리지 않는다. 실제 마이크·스피커로만 한다.

## 도구

- `agora` CLI: 로그인·프로젝트·env·doctor (`--json` 권장).
- `.mcp.json` (Claude Code): Agora 문서 MCP(`agora-docs-mcp`) + CLI MCP(`agora mcp serve`).
- 개발 맥: `web/` 에서 `pnpm dev -H 0.0.0.0` · `pnpm build` · `pnpm lint`. 이 디렉토리에서 `node scripts/doctor.mjs` · `node scripts/check-integration.mjs device`.
- 기기: `device/` 에서 `./sdk.sh` · `make` · `./speaker --server http://<맥 IP>:3000`.

## 문체

- UI 문구·주석·기기 출력은 한국어, 영어 표현은 원문 그대로. em-dash 는 쓰지 않는다.
- 파일 구조를 그대로 유지한다. 새 추상화를 만들지 않는다.

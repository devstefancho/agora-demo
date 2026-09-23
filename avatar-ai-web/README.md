# AI 아바타와 대화 (웹)

데스크톱 웹에서 AI 아바타 Mia 와 5분 동안 영어로 스몰토크를 한다. 화상 튜터 자리에 AI 아바타가 앉는 구도다.
Mia 의 얼굴이 무대에 뜨고, 목소리로 대답하고, 오늘의 표현을 쓰면 오른쪽 목록에 ✓ 가 붙는다. 막히면 힌트가 무대 아래에 뜬다.

- Agora: Conversational AI Engine(Agora 관리 음성 인식·LLM·음성 합성) + 아바타(`.withAvatar()`). 목소리·얼굴은 RTC, 전사는 RTM 으로 온다.
- Agora 코드는 `lib/agora/convoai.ts`(클라이언트)와 `app/api/agora/`(서버: 토큰, 에이전트 start·stop) 에만 있다.
- STT·LLM·TTS 벤더 키는 필요 없다. 아바타 벤더(LiveAvatar 또는 Anam) 키가 있으면 얼굴이 붙고, 없으면 Mia 는 목소리로만 대화한다.

## 따라 하기

준비물: Node 22+, pnpm, [Agora 계정](https://console.agora.io)(프로젝트에 Conversational AI 켜기). 얼굴까지 보려면 아바타 벤더 계정.

```bash
git clone https://github.com/devstefancho/agora-demo
cd agora-demo/avatar-ai-web
pnpm install

# Agora CLI 설치 + 로그인 + 이 앱에 App ID·Certificate 쓰기 (.env.local)
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh
agora login
agora project env write --template nextjs

node scripts/doctor.mjs   # 빠진 게 있으면 알려준다. △ 는 없어도 되는 것
pnpm dev                  # http://localhost:3000
```

### 얼굴 붙이기 (선택)

벤더 콘솔에서 API 키와 스톡 아바타 ID 를 받아 `.env.local` 에 직접 넣는다. 다시 `node scripts/doctor.mjs` 로 확인한다.

```
AVATAR_VENDOR=liveavatar     # liveavatar 또는 anam
AVATAR_API_KEY=...
AVATAR_ID=...
```

LiveAvatar 는 24kHz 음성만 받는다. 이 앱의 음성 합성(Agora 관리 OpenAI TTS)은 24kHz 고정이라 따로 맞출 것이 없다.

## 어떻게 만들었나

이 디렉토리의 Agora 코드는 통합 절차 한 번으로 만들었다: `docs/spec.md` 의 단계 B (Claude Code 를 이 디렉토리에서 실행하고 `/integrate-avatar`).
에이전트는 이 디렉토리에 든 Agora 공식 skill(`.claude/skills/agora`)과 공식 Next.js quickstart 를 읽고 `lib/agora/convoai.ts` 와 두 route 를 채웠다. 화면 코드는 건드리지 않았다.
규칙은 `AGENTS.md`, 기계 검증은 `node scripts/check-integration.mjs avatar`.

## 구조

```
app/                        App Router (페이지 하나)
app/api/agora/token/        서버: 학습자 토큰. App Certificate 는 app/api/agora/ 안에서만
app/api/agora/agent/        서버: 에이전트 start·stop, 아바타 벤더 설정
components/                 화면 넷(홈·워밍업·대화·완료) + 대화 무대 부품 + 공용 UI
content/units.ts            10유닛 × 표현 4개, Mia 첫 인사와 페르소나
lib/talk.ts                 대화 계약. 화면은 이것만 안다
lib/agora/convoai.ts        Agora 클라이언트. SDK import 는 lib/agora/ 안에서만
scripts/                    doctor(준비 점검) · check-integration(결과 검증)
docs/                       spec.md(정본: 구현 명세와 만드는 순서) · design.md(디자인 규칙)
.claude/skills/agora        Agora 공식 skill (에이전트 공통 참조)
.claude/commands/           Claude Code 용 /integrate-avatar
.mcp.json                   Agora 문서 MCP · CLI MCP
```

## 비용

Conversational AI 와 RTC 는 Agora 요금표를 따르고, 아바타는 그 위에 벤더 요금이 붙는다. 대화 세션을 자주 껐다 켜지 않는다.

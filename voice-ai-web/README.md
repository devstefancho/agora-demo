# AI 파트너와 음성 대화 (웹)

브라우저에서 AI 파트너 Mia 와 5분 동안 영어로 스몰토크를 한다. Mia 가 묻고, 내가 답하고, 막히면 힌트 카드를 소리 내어 읽는다. 내가 한 말과 Mia 의 말은 자막으로 뜨고, 오늘의 표현을 말하면 체크된다.

- Agora: Conversational AI Engine 이 에이전트(Mia)를 채널에 들여보낸다. 내 마이크와 Mia 의 목소리는 RTC, 자막(전사)은 Signaling(RTM)으로 온다.
- Agora 코드는 `lib/agora/convoai.ts`(브라우저)와 `app/api/agora/`(서버: 토큰, 에이전트 start·stop) 두 곳에만 있다.
- 벤더 API 키는 필요 없다. 음성 인식·언어 모델·음성 합성은 Agora 가 관리하는 모델을 쓴다. App Certificate 는 서버에만 있다.

## 따라 하기

준비물: Node 22+, pnpm, [Agora 계정](https://console.agora.io)(Conversational AI 가 켜진 프로젝트). 헤드폰을 쓰면 Mia 의 목소리가 마이크로 되돌아가지 않는다.

```bash
git clone https://github.com/devstefancho/agora-demo
cd agora-demo/voice-ai-web
pnpm install

# Agora CLI 설치 + 로그인 + 이 앱에 App ID·Certificate 쓰기 (.env.local)
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh
agora login
agora project env write --template nextjs

node scripts/doctor.mjs   # 빠진 게 있으면 알려준다. Conversational AI 가 꺼져 있으면 켜는 명령도
pnpm dev                  # http://localhost:3000
```

"Mia와 대화" → 워밍업 → "대화 시작" → 마이크 허용. 구슬이 주황으로 숨 쉬면 Mia 가 먼저 말을 건다.

### 폰 브라우저로 열기 (HTTPS)

브라우저는 HTTPS 에서만 마이크를 연다(localhost 예외). 폰에서 열려면 cloudflared quick tunnel 을 쓴다. 계정은 필요 없다.

1. `brew install cloudflared` (한 번).
2. 터미널 1: `pnpm dev`. 터미널 2: `cloudflared tunnel --url http://localhost:3000`. 출력에 `https://….trycloudflare.com` 주소가 뜬다.
3. 1~2분 기다린 뒤 폰 브라우저로 그 주소를 연다. 화면은 한 줄 컬럼이라 폰에서도 그대로 쓴다.
4. 터널 주소는 실행마다 바뀐다. 끝나면 터미널 2 를 닫는다. 터널이 열린 동안 dev 서버가 외부에서 보인다.

## 어떻게 만들었나

이 디렉토리의 Agora 코드는 통합 절차 한 번으로 만들었다: `docs/spec.md` 의 단계 B (Claude Code 를 이 디렉토리에서 실행하고 `/integrate-voice`).
에이전트는 이 디렉토리에 든 Agora 공식 skill(`.claude/skills/agora`)을 읽고, 공식 Next.js quickstart 를 원본으로 삼아 `lib/agora/convoai.ts` 와 서버 route 둘을 채웠다. 화면 코드는 건드리지 않았다.
규칙은 `AGENTS.md`, 기계 검증은 `node scripts/check-integration.mjs voice`.

## 구조

```
app/                        App Router (페이지 하나)
app/api/agora/token/        서버: RTC+RTM 토큰 발급. App Certificate 는 여기서만
app/api/agora/agent/        서버: Mia(에이전트) start·stop. agora-agents SDK
components/                 화면 넷(홈·워밍업·대화·완료) + Mia 구슬 + 공용 UI
content/units.ts            10유닛 × 표현 4개 + Mia 지시문
lib/voice.ts                음성 대화 계약. 화면은 이것만 안다
lib/agora/convoai.ts        Agora 클라이언트. SDK import 는 여기서만
scripts/                    doctor(준비 점검) · check-integration(결과 검증)
docs/                       spec.md(정본: 구현 명세와 만드는 순서) · design.md(디자인 규칙)
.claude/skills/agora        Agora 공식 skill (에이전트 공통 참조)
.claude/commands/           Claude Code 용 /integrate-voice
.mcp.json                   Agora 문서 MCP · CLI MCP
```

## 비용

Mia 가 채널에 있는 시간만큼 Conversational AI 사용량이 쌓인다. 요금과 무료 사용량은 Agora 요금 문서를 본다. 대화를 끝내면 에이전트도 멈춘다.

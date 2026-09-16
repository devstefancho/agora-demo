# 파트너와 영상통화 (웹 + 폰)

데스크톱 웹에서 파트너와 5분 영어 영상통화를 한다. 폰은 QR(초대 링크)로 브라우저 파트너 화면에 들어오거나, iOS 파트너 앱으로 들어온다.
오늘의 표현은 오른쪽 패널에, 막히면 힌트가 무대 아래에 뜬다.

- Agora: Video SDK(RTC)로 영상·소리, Signaling(RTM)으로 상대 마이크·카메라 상태.
- Agora 코드는 `web/lib/agora/`(클라이언트)와 `web/app/api/agora/`(서버), 폰 앱은 `mobile/Partner/PartnerSession.swift` 에만 있다.
- 벤더 API 키는 필요 없다. App Certificate 는 토큰 서버에만 있다.

## 따라 하기

준비물: Node 22+, pnpm, [Agora 계정](https://console.agora.io). 폰 브라우저로 확인하려면 cloudflared, 폰 앱은 Xcode.

```bash
git clone https://github.com/devstefancho/agora-demo
cd agora-demo/video-call-web-mobile/web
pnpm install

# Agora CLI 설치 + 로그인 + 이 앱에 App ID·Certificate 쓰기 (web/.env.local)
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh
agora login
agora project env write --template nextjs

node ../scripts/doctor.mjs   # 빠진 게 있으면 알려준다. △ 는 다른 편에서만 필요한 것
pnpm dev                     # http://localhost:3000
```

### 폰 브라우저로 들어오기 (HTTPS)

Agora Web SDK 는 HTTPS 에서만 카메라·마이크를 연다(localhost 예외). 폰 브라우저가 초대 링크를 열려면 HTTPS 주소가 필요하다.
cloudflared quick tunnel 을 쓴다. 계정은 필요 없다.

1. `brew install cloudflared` (한 번).
2. 터미널 1: `web/` 에서 `pnpm dev`. 터미널 2: `cloudflared tunnel --url http://localhost:3000`. 출력에 `https://….trycloudflare.com` 주소가 뜬다.
3. 1~2분 기다린 뒤 데스크톱 Chrome 에서 그 주소를 연다. "파트너와 통화" 로 들어가면 오른쪽 카드에 QR 과 방 코드가 뜬다. `localhost` 로 열면 QR 도 localhost 라 폰에서 열리지 않는다.
4. 폰 카메라로 QR 을 찍는다(또는 "초대 링크 복사" → 폰 Safari 주소창에 붙여넣기). 폰 브라우저의 파트너 화면에서 "들어가기". 카메라·마이크 허용.
5. 터널 주소는 실행마다 바뀐다. 끝나면 터미널 2 를 닫는다. 터널이 열린 동안 dev 서버가 외부에서 보인다.

`web/next.config.ts` 의 `allowedDevOrigins` 가 그 주소에서 오는 dev 자산 요청을 허용한다.

### 폰 앱(iOS)으로 들어오기 (선택)

Xcode GUI 없이 이 디렉토리에서 `scripts/ios.sh doctor` → `gen` → `sim`(시뮬레이터) 또는 `device`(실기기, `mobile/Signing.xcconfig` 에 Team ID 필요).
폰이 여러 대 연결돼 있으면 `mobile/device.local` 에 설치할 기기 이름을 한 줄 적는다(예 `iPhone 15 Pro Max`, gitignore). 없으면 연결된 첫 기기에 설치한다.
폰 앱은 HTTPS 가 필요 없다. `mobile/Partner/Config.swift` 의 `webBaseURL` 을 맥의 LAN IP(`http://<IP>:3000`)로 바꾼다.
데스크톱에 뜬 방 코드를 폰 앱의 "미팅 코드" 칸에 넣는다.

## 어떻게 만들었나

이 디렉토리의 Agora 코드는 통합 절차 한 번으로 만들었다: `docs/spec.md` 의 단계 B (Claude Code 를 이 디렉토리에서 실행하고 `/integrate-video-call`).
에이전트는 이 디렉토리에 든 Agora 공식 skill(`.claude/skills/agora`)을 읽고 `web/lib/agora/rtc.ts`·`rtm.ts` 와 토큰 route 를 채웠다. 화면 코드는 건드리지 않았다. 화면 공유와 대기실 마이크 선택은 그 뒤에 더했다(같은 문서의 단계 C).
규칙은 `AGENTS.md`, 기계 검증은 `node scripts/check-integration.mjs call|ios`.

## 구조

```
web/                        Next.js 웹 앱
  app/                      App Router (페이지 하나)
  app/api/agora/token/      서버: 토큰 발급. App Certificate 는 여기서만
  components/               화면 다섯(폰 파트너 포함) + 통화 무대 부품 + 공용 UI
  content/units.ts          10유닛 × 표현 4개
  lib/call.ts               영상통화 계약. 화면은 이것만 안다
  lib/agora/                Agora 클라이언트. rtc.ts·rtm.ts. SDK import 는 여기서만
mobile/                     파트너 iOS 앱 (XcodeGen. PartnerSession.swift 가 경계)
scripts/                    doctor(준비 점검) · check-integration(결과 검증) · ios.sh
docs/                       spec.md(정본: 구현 명세와 만드는 순서) · design.md(디자인 규칙)
.claude/skills/agora        Agora 공식 skill (에이전트 공통 참조)
.claude/commands/           Claude Code 용 /integrate-video-call
.mcp.json                   Agora 문서 MCP · CLI MCP
```

## 비용

영상통화(RTC)와 Signaling(RTM)은 Agora 요금표를 따른다. 개발·테스트 규모는 무료 사용량 안이다.

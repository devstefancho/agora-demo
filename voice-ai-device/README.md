# 스피커 기기에서 Mia 와 영어 말하기

하루 5분 영어 말하기 연습 앱의 AI 파트너 Mia 를 화면 없는 스피커 기기에 올린 예제다. 기기 버튼을 누르면 Mia 가 스피커로 인사하고, 기기 마이크에 대고 영어로 대화한다.

- 기기: 마이크·스피커가 달린 리눅스 기기(라즈베리파이 같은 보드, 리눅스 노트북). Agora IoT SDK(C)로 채널에 들어간다.
- 대화: Agora Conversational AI Engine. ASR·LLM·TTS 는 Agora 관리 모델이라 벤더 키가 필요 없다.
- 서버: Next.js route 둘. 기기에 토큰을 주고, Mia 에이전트를 기기 채널에 넣고 뺀다.

```
[기기] 마이크 → IoT SDK ═ RTC 채널 ═ Mia (ASR → LLM → TTS)
       스피커 ←           (G.722)
       버튼 ─ HTTP → [웹 서버] /api/token · /api/agent → ConvoAI REST
```

## 따라 하기

1. 개발 맥: `agora login`, 이 디렉토리에서 `node scripts/doctor.mjs`. `web/` 에서 `pnpm install`, `agora project env write --template nextjs`, `pnpm dev -H 0.0.0.0`.
2. 기기: `device/README.md` 대로 `./sdk.sh && make`, `./speaker --server http://<맥 IP>:3000`.
3. 기기에서 Enter. Mia 가 인사하면 영어로 대답한다. 다시 Enter 로 보낸다.
4. 스피커 옆 노트북에서 `http://localhost:3000/?name=<기기 이름>` 을 열면 오늘의 표현이 보인다.

## 구조

| 경로 | 무엇 |
|---|---|
| `device/speaker.c` | 버튼·마이크·스피커·서버 호출. Agora 를 모른다 |
| `device/agora_link.c` | 채널 경계. Agora IoT SDK 는 이 파일에서만 부른다 |
| `web/app/api/token/route.ts` | 기기 토큰 발급 |
| `web/app/api/agent/route.ts` | Mia 에이전트 시작·정지 |
| `web/content/units.ts`, `web/lib/mia.ts` | 오늘의 유닛과 Mia 페르소나 |
| `docs/spec.md` | 구현 명세와 만드는 순서 (정본) |

## 비용

ConvoAI 는 분 단위 과금이고 매달 무료 분량이 있다. IoT SDK 패키지에는 개발용 테스트 라이선스가 들어 있다. 요금과 라이선스는 Agora 공식 문서를 기준으로 확인한다.

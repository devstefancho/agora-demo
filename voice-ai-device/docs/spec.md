# 스피커 기기에서 Mia 와 대화 프로젝트 스펙

이 디렉토리의 정본 문서(SSOT)다. 무엇이 구현돼 있고, 코딩 에이전트에 넣으면 같은 프로젝트가 나오도록 어떤 순서로 만드는지를 한 곳에 적는다. 구현을 바꾸면 이 문서를 같이 고친다. 경로는 따로 적지 않으면 `voice-ai-device/` 기준이다.

## 요약

- 만드는 것: 하루 5분 영어 말하기 연습 앱의 AI 파트너 Mia 를 화면 없는 스피커 기기에 올린다. 기기의 버튼을 누르면 Mia 가 스피커로 인사하고, 기기 마이크에 대고 영어로 대화한다. 다시 누르면 끝난다.
- 기기는 마이크와 스피커가 달린 리눅스 기기다(라즈베리파이 같은 보드, 리눅스 노트북). Agora IoT SDK(C, 리눅스용 RTSA Lite)로 채널에 들어간다. 대화는 클라우드의 Agora Conversational AI Engine 이 한다.
- 웹(Next.js)은 두 가지를 한다. 기기에 토큰을 주고 Mia 에이전트를 기기 채널에 넣는 서버, 그리고 스피커 옆에 띄워 두는 보조 화면(오늘의 표현, 단계 C 에서 실시간 자막).
- 만드는 순서는 셋이다. [단계 A](#stage-a) 껍데기(기기 프로그램·서버·화면·도구 전부, Agora 만 없음)를 만들고 커밋한다. [단계 B](#stage-b) Agora 통합을 중간 승인 없이 한 번에 한다(`/integrate-device`). [단계 C](#stage-c) 보조 화면에 실시간 자막을 붙인다(선택).
- Agora 코드는 파일 셋에만 있다: `device/agora_link.c`, `web/app/api/token/route.ts`, `web/app/api/agent/route.ts` (단계 C 를 하면 `web/lib/agora/captions.ts` 하나 더).
- 완성 판정은 [검증](#verify)의 명령과 사람 확인 목록이다.

## 구조 한 장

```
 [기기]  마이크 ─ PCM 16kHz ─┐                       ┌─ Agora Conversational AI Engine
         스피커 ← PCM ────────┤ Agora IoT SDK ═ RTC 채널 ═╡   ASR → LLM → TTS (Agora 관리 모델)
         버튼(Enter)          │  (G.722)          │     └─ 에이전트 Mia (uid 1001)
           │ HTTP             │                   │
           ▼                  │                   │
 [웹 서버] GET /api/token ────┘                   │
           POST /api/agent ── REST /join ─────────┘
           DELETE /api/agent ─ REST /leave
 [보조 화면] 오늘의 표현 · (단계 C) 자막 ← RTM
```

- 기기는 켜지면 서버에서 토큰을 받아 채널 `speaker-<이름>` 에 uid 2001 로 들어가 기다린다.
- 버튼을 누르면 기기가 `POST /api/agent` 를 부르고, 서버가 Mia 를 같은 채널에 넣는다. Mia 는 기기 uid 하나만 듣는다.
- 기기와 에이전트 사이 음성은 G.722(16kHz)다. 기기는 PCM 만 다루고 인코딩·디코딩은 SDK 가 한다.

## 넣는 법

이 문서 말고 이 레포에서 그대로 복사해 입력으로 두는 파일이 있다.

| 복사해 두는 파일 | 이유 |
|---|---|
| `docs/spec.md` (이 문서) | 스펙 정본 |
| `.claude/commands/integrate-device.md`, `.mcp.json` | 명령과 MCP 설정 |
| `.claude/skills/agora/` | 공식 skill 1.8.1 (준비물 표 참고) |

그 디렉토리를 git 저장소로 만들고 에이전트에게 이렇게 준다.

```
docs/spec.md 를 읽고 단계 A 를 만든 뒤 커밋해. 커밋이 끝나면 단계 B 를 1번부터 5번까지 한 번에 수행해. 단계마다 완료 조건을 통과시킨 뒤 넘어가.
```

단계 A 와 B 사이의 커밋은 빠뜨리면 안 된다. `scripts/check-integration.mjs` 가 `git diff HEAD` 로 "통합이 경계 밖 파일을 건드리지 않았는지"를 보기 때문이다.

## 준비물

| 무엇 | 어디서 |
|---|---|
| Node 22 이상, pnpm 11 | 개발 맥(또는 PC). 웹 서버를 돌린다 |
| Next.js 16.3.4, React 19.2.8, Tailwind 4, TypeScript 5, ESLint 9 | `pnpm create next-app web` (App Router, `app/`, alias `@/*`) |
| Agora 공식 skill 1.8.1 | `AgoraIO/skills` 의 `agora` 폴더를 `.claude/skills/agora/` 로 복사. 고치지 않는다 |
| `agora` CLI | `curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh \| sh` → `agora login`. 프로젝트에 ConvoAI 가 켜져 있어야 한다(`agora project doctor`) |
| 리눅스 기기 | x86_64 또는 aarch64(ARMv8) 리눅스, 마이크·스피커, 개발 맥과 같은 네트워크. `gcc`, `make`, `libasound2-dev`, `libcurl4-openssl-dev` |
| Agora IoT SDK (RTSA Lite) 1.9.7 | `device/sdk.sh` 가 기기 아키텍처에 맞는 패키지를 `device/sdk/` 에 받는다. 패키지 안의 테스트 라이선스로 개발한다 |
| 갈무리 픽셀 글꼴 | npm `galmuri` (보조 화면) |

## 디렉토리 구조

```
voice-ai-device/
  AGENTS.md                     에이전트 규칙 정본 (CLAUDE.md 는 "@AGENTS.md" 한 줄)
  README.md                     따라 하기 · 구조
  .mcp.json                     agora-docs-mcp(http https://mcp.agora.io) · agora-cli(stdio "agora mcp serve")
  .claude/
    skills/agora/               공식 skill 복사본
    commands/integrate-device.md  "docs/spec.md 의 단계 B 를 1번부터 5번까지 한 번에 수행해. 중간에 승인을 묻지 말고, 막히면 5번 보고 형식으로 멈춰."
  scripts/
    doctor.mjs                  준비 점검 (개발 맥)
    check-integration.mjs       통합 결과 기계 검증 (개발 맥)
  docs/
    spec.md                     이 문서 (SSOT)
  device/                       기기 프로그램 (C). 기기에서 빌드한다
    Makefile                    speaker 를 빌드. SDK 는 sdk/ 에서 찾는다
    sdk.sh                      IoT SDK 받기 (x86_64 | aarch64)
    speaker.c                   본체: 인자 · 버튼 · 마이크/스피커(ALSA) · 서버 호출(libcurl)
    agora_link.h                채널 경계 계약
    agora_link.c                채널 경계 구현 (Agora IoT SDK 는 여기서만)
    README.md                   기기에서 빌드·실행하는 법
  web/
    AGENTS.md · CLAUDE.md       "../AGENTS.md 를 먼저 읽는다"
    app/
      layout.tsx                갈무리 localFont(--font-pixel), lang="ko", title "스피커와 영어 말하기"
      page.tsx                  보조 화면
      globals.css               토큰 · 모눈 바탕
      api/
        token/route.ts          기기 토큰 발급 (Agora 서버 코드 1)
        agent/route.ts          Mia 에이전트 시작·정지 (Agora 서버 코드 2)
    components/SpeakerPanel.tsx 보조 화면 본문
    content/units.ts            10유닛 × 표현 4개, 유닛별 대화 주제·첫 인사
    lib/
      mia.ts                    Mia 페르소나 문장 buildMiaInstructions(unit)
      captions.ts               자막 계약 (단계 C)
      agora/captions.ts         자막 구현 (단계 C, Agora 클라이언트 코드)
```

루트부터 디렉토리 5단계를 넘지 않는다. 그래서 route 는 `app/api/agora/` 가 아니라 `app/api/` 바로 아래에 둔다(이 웹에는 Agora route 만 있다).

레포 루트 `.gitignore` 에 반드시 넣는다: `*/device/sdk/`, `*/device/speaker`, `*/device/*.o`, `*/device/io.agora.rtc_sdk/`. `.env*` 는 이미 있다.

<a id="stage-a"></a>
## 단계 A. 껍데기

기기 프로그램·서버·화면·도구를 전부 만들고, Agora 를 부르는 자리만 비워 둔다. 끝나면 기기에서 `./speaker` 가 돌고, 버튼을 누르면 서버의 501 을 받아 "아직 Mia 를 부를 수 없어요" 를 찍는다.

### 기기 계약 `device/agora_link.h`

`speaker.c` 는 이 헤더만 안다. Agora SDK 헤더를 include 하지 않는다.

```c
typedef void (*link_audio_cb)(const int16_t *pcm, size_t samples); // 상대 음성, 16kHz 모노
typedef void (*link_event_cb)(const char *event, uint32_t uid);    // "joined" | "remote-joined" | "remote-left" | "lost" | "error"

typedef struct {
  const char *app_id, *token, *channel;
  uint32_t uid;
  link_audio_cb on_audio;
  link_event_cb on_event;
} link_options_t;

#define LINK_SAMPLE_RATE 16000
#define LINK_FRAME_SAMPLES 320   // 20ms

int  link_start(const link_options_t *opt);            // 0 성공, 음수 실패. 채널 입장은 비동기로 on_event("joined")
int  link_send(const int16_t *pcm, size_t samples);    // 20ms 한 프레임
void link_stop(void);
```

껍데기 `agora_link.c` 는 첫 줄에 표식 `/* 껍데기: 통합 단계가 이 파일을 채운다. */` 를 두고, `link_start` 가 `fprintf(stderr, "아직 채널에 연결되지 않아요\n")` 뒤 `-1`, `link_send` 는 `0`, `link_stop` 은 빈 함수다.

### 기기 본체 `device/speaker.c`

- 인자: `--server <URL>`(필수, 예 `http://192.168.0.10:3000`), `--name <이름>`(기본 호스트 이름, 채널은 `speaker-<이름>`), `--unit <1~10>`(기본 4), `--alsa <장치>`(기본 `default`).
- 시작하면 `GET {server}/api/token?channel=&uid=2001` 로 `{ appId, token }` 을 받는다. 실패하면 이유를 찍고 끝낸다. 성공하면 `link_start`. 껍데기에서는 여기서 "아직 채널에 연결되지 않아요" 를 찍고, 버튼 루프는 계속 돈다(서버 호출은 확인할 수 있게).
- 마이크: ALSA 캡처 S16_LE 모노 16kHz, 20ms(320 샘플)씩 읽어 `link_send`. 에이전트가 없을 때도 보낸다(채널에 들어가 있는 동안).
- 스피커: `on_audio` 로 받은 PCM 을 ALSA 재생에 쓴다. 콜백 스레드를 막지 않도록 링 버퍼(1초) + 재생 스레드. 언더런이면 `snd_pcm_prepare` 후 계속.
- 버튼: 표준입력 Enter. 꺼져 있으면 `POST {server}/api/agent` body `{ "channel", "uid": 2001, "unitId" }` → 응답 `{ agentId }` 를 기억하고 "Mia 를 불렀어요" 를 찍는다. 켜져 있으면 `DELETE {server}/api/agent?agentId=` → "Mia 가 쉬러 갔어요". 서버가 501 이면 "아직 Mia 를 부를 수 없어요". `q` + Enter 나 Ctrl+C 는 켜져 있는 Mia 를 정지하고 `link_stop` 뒤 끝낸다.
- JSON 은 라이브러리 없이 `"key":"value"` 문자열 값 하나를 꺼내는 함수 하나로 읽는다.
- 상태 줄은 한국어 한 줄씩: "채널에 들어왔어요 · speaker-<이름>", "Mia 가 들어왔어요", "Mia 가 나갔어요", "연결이 끊겼어요".
- 시크릿(토큰)은 찍지 않는다.

### 빌드 `device/Makefile`, `device/sdk.sh`

- `sdk.sh [x86_64|aarch64]`: 인자가 없으면 `uname -m` 으로 고른다. 아래 두 패키지 중 하나를 받아 `sdk/` 에 `include/`, `lib/` 만 풀어 둔다. 이미 있으면 건너뛴다.
  - `https://download.agora.io/rtsasdk/release/Agora-RTSALite-RmRdRcAcAjCF-x86_64-linux-gnu-v1.9.7-20251127_103054-992914.tgz`
  - `https://download.agora.io/rtsasdk/release/Agora-RTSALite-RmRdRcAcAjCF-aarch64-linux-gnu-v1.9.7-20251127_103054-992914.tgz`
- `Makefile`: `speaker` 를 `speaker.c agora_link.c` 로 빌드. `-lasound -lcurl -lpthread`. `sdk/lib` 이 있으면 `-Isdk/include -Lsdk/lib -lagora-rtc-sdk -Wl,-rpath,'$$ORIGIN/sdk/lib'` 를 더한다(껍데기는 SDK 없이도 빌드된다). `make clean`.

### 서버 route 껍데기

첫 줄에 표식 주석 `// 껍데기: 통합 단계가 이 파일을 채운다.` 를 둔다.

| 파일 | 껍데기 본문 |
|---|---|
| `web/app/api/token/route.ts` | `GET` 이 `Response.json({ error: "아직 껍데기" }, { status: 501 })` |
| `web/app/api/agent/route.ts` | `POST`·`DELETE` 가 같은 501 |

### 콘텐츠와 페르소나

- `content/units.ts`: `Expression { en, ko, ipa }`, `Unit { id, title, scenario, roleplay?, greeting, expressions }`, `UNITS` 10개, `findUnit(id)`(없으면 첫 유닛). 유닛 제목 10개: 인사와 자기소개 · 근황 묻고 답하기 · 날씨와 계절 · 주말에 뭐 했어? · 일과 직업 · 취미와 관심사 · 카페에서 주문하기 · 길 묻기와 여행 · 리액션과 칭찬 · 대화 잇기와 마무리. `scenario`·`greeting` 은 영어.
- `lib/mia.ts`: `buildMiaInstructions(unit)`. 한국인 성인 학습자, 영어만, 천천히 짧게, 한 턴에 질문 하나, 오늘의 표현 넷을 자연스럽게 유도, 대화 중 교정 금지, 끝인사면 한 문장으로 마무리. 화면이 없는 스피커라는 것을 알린다: 힌트 버튼 이야기를 하지 않고, 막히면 오늘의 표현 하나를 먼저 천천히 말해 주고 따라 해 보게 한다.

### 보조 화면 (`app/page.tsx` → `components/SpeakerPanel.tsx`)

- 클라이언트 컴포넌트. `?name=` 과 `?unit=` 을 읽는다(없으면 이름 비움, 유닛 4).
- 위: 제목 "스피커와 영어 말하기", 채널 `speaker-<이름>` (이름이 없으면 "기기 이름을 주소에 ?name= 으로 넣어 주세요").
- 오늘의 표현 카드: 유닛 제목, 표현 넷(영어·뜻·IPA).
- 자막 카드: 단계 A·B 는 "자막은 이 화면에서 켤 수 있어요" 대신 안내 한 줄 "스피커 버튼을 누르면 Mia 가 인사해요". 단계 C 가 채운다.
- 디자인은 연습 앱과 같은 결: 모눈 바탕(24px), 토큰 paper `#f5f2ea` · card `#fffdf8` · ink `#1f1c17` · muted `#7d786d` · line `#e0dbcf` · accent `#d8542a`, 글꼴 갈무리 하나, 크기는 6의 배수, 모서리 각지게, 테두리 2px, 그림자 흐림 0. 다크 모드 없음.

### 도구

- `scripts/doctor.mjs`: ✓/✗/△ 로 Node 22+, `agora version`, `agora auth status --json`, `web/.env.local` 의 `NEXT_PUBLIC_AGORA_APP_ID`·`NEXT_AGORA_APP_CERTIFICATE`(값은 출력하지 않고 "설정됨"만), `agora project doctor --json` 의 ConvoAI 항목. ✗ 마다 고치는 명령 한 줄. 기기 쪽 준비는 △ 로 안내만(`device/README.md`). 끝 문구 "준비 끝. 통합을 시작할 차례예요."
- `scripts/check-integration.mjs device`: (a) 경계 밖 보존: `git diff HEAD` 와 untracked 에 `device/speaker.c`·`device/agora_link.h`·`device/Makefile`·`device/sdk.sh`·`web/components/`·`web/content/`·`web/lib/mia.ts`·`web/app/page.tsx`·`web/app/layout.tsx`·`web/app/globals.css`·`scripts/`·`docs/` 가 없다 (b) 격리: `agora_rtc_api.h` 는 `device/agora_link.c` 에서만, `agora-agents`·`agora-token` 은 `web/app/api/` 안에서만 import (c) 껍데기 표식 소멸(세 파일) (d) route 에 "아직 껍데기" 없음, `POST`·`DELETE`·`GET` 존재 (e) `web/lib/`·`web/components/`·`device/` 에 `APP_CERTIFICATE` 와 32자 hex 없음 (f) `agora_link.c` 에 `agora_rtc_join_channel`·`agora_rtc_send_audio_data`·`AUDIO_CODEC_TYPE_G722`·`enable_audio_decode` 문자열 (g) agent route 에 `output_audio_codec`·`enableStringUid: false`·`buildMiaInstructions` 문자열 (h) `web/` 에서 `pnpm lint`·`pnpm build`. 실패가 있으면 `아직 "된다"고 말하지 마세요.`, 없으면 "기계 검증 통과. 기기에서 빌드하고 사람이 확인할 차례예요."

### 단계 A 완료 조건

- `web/` 에서 `pnpm lint`·`pnpm build` 통과.
- 기기에서 `cd device && make` 가 SDK 없이 통과하고 `./speaker --server <URL>` 이 "아직 채널에 연결되지 않아요" 를 찍은 뒤 버튼에 "아직 Mia 를 부를 수 없어요" 로 답한다(토큰 route 가 501 이므로 토큰 단계에서 멈추면 그 문구를 찍고 버튼 루프로 간다).
- `node scripts/check-integration.mjs device` 가 껍데기 항목에서만 실패한다.
- 커밋한다.

<a id="stage-b"></a>
## 단계 B. Agora 통합

단계 A 의 껍데기에 채널과 에이전트를 붙인다. 기기 쪽은 Agora IoT SDK, 대화는 Agora Conversational AI Engine 이다. `/integrate-device` 명령이 이 절을 가리킨다. 1번부터 5번까지 한 번에 수행하고 중간에 승인을 묻지 않는다. 막히면 그 자리에서 멈추고 5번 보고 형식으로 적는다.

전제: 단계 A 가 커밋돼 있고 `git status` 가 깨끗하다.

### 1. 규칙

- ConvoAI 판단은 `.claude/skills/agora/SKILL.md` → `references/conversational-ai/README.md` → `quickstarts.md` → `server-sdks.md` 로 한다. 스킬의 HARD GATE 대로 공식 Next.js quickstart(`agora quickstart` 또는 `AgoraIO-Conversational-AI/agent-quickstart-nextjs`)를 **이 레포 바깥에** 받아 `app/api/invite-agent/route.ts`·`stop-conversation/route.ts` 를 소스로 삼는다. 기억으로 join 페이로드를 만들지 않는다.
- 스킬 1.8.1 라우터에는 IoT 경로가 없다. 기기 쪽 정본은 둘이다: Agora 문서 `https://docs.agora.io/en/realtime-media/iot/quickstart.md`·`.../iot/build/send-messages/interoperate-with-rtc-sdk.md`·`https://docs.agora.io/en/ai/device-kit/build/architecture-overview.md`(`references/doc-fetching.md` 방법으로 받는다), 그리고 `device/sdk.sh` 가 받은 패키지의 `agora_sdk/include/agora_rtc_api.h` 와 `example/hello_rtsa/hello_rtsa.c`. 기기와 에이전트를 잇는 설정은 공식 Device Kit 샘플 서버(`AgoraIO-Community/Conversational-AI-IOT-Sample` 의 `server/aiot_server_demo_example/config.json`)가 쓰는 값을 따른다.
- 파이프라인은 Agora 관리 모델(quickstart 기본 프리셋: Deepgram nova-3 · OpenAI gpt-4o-mini · MiniMax speech_2_6_turbo). 벤더 키를 넣지 않는다. 언어는 영어.
- 고쳐도 되는 파일: `device/agora_link.c`, `web/app/api/token/route.ts`, `web/app/api/agent/route.ts`, `web/package.json`·`web/pnpm-lock.yaml`. 그 밖은 읽기만 한다.
- import 격리: `agora_rtc_api.h` 는 `agora_link.c` 에서만, `agora-agents`·`agora-token` 은 `web/app/api/` 안에서만.
- App Certificate 는 route 에서만 읽는다. `.env.local` 을 열거나 셸 명령에 넣지 않는다. 존재 확인은 `node scripts/doctor.mjs` 로만.
- 녹음 파일을 마이크 대신 흘려 검증하지 않는다. 실제 마이크·스피커로 사람이 확인한다.

### 2. 준비 점검

1. `node scripts/doctor.mjs`. ✗ 가 있으면 적힌 명령을 실행하고 다시 본다. `.env.local` 이 없으면 `web/` 에서 `agora project env write --template nextjs`.
2. `device/agora_link.h` 와 `device/speaker.c` 가 `link_*` 를 부르는 순서를 읽는다. 이것이 계약이다.
3. 문서와 샘플을 읽고 네 가지를 한 줄씩 메모한다(5번 보고에 쓴다): 기기가 PCM 을 보내면 누가 G.722 로 인코딩하는지, 받은 음성을 PCM 으로 받으려면 무엇을 켜는지, 에이전트의 출력 코덱을 G.722 로 맞추는 필드, 기기와 에이전트가 숫자 uid 로 만나야 하는 이유(`enable_string_uid`).

### 3. 적용

1. 의존성: `web/` 에서 `pnpm add agora-agents agora-token`.
2. 토큰 route (`GET ?channel=&uid=`): channel 이 없거나 `speaker-` 로 시작하지 않거나, uid 가 1~2^32-1 정수가 아니면 400. env 가 없으면 500. `RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, uid, PUBLISHER, 86400, 86400)` → `{ appId, channel, uid, token }`. 기기는 RTM 을 쓰지 않으므로 RTC 토큰이다. 표식과 501 을 지운다.
3. agent route:
   - `POST` body `{ channel, uid, unitId? }`. 검증은 토큰 route 와 같고, `unitId` 는 없으면 4.
   - quickstart 의 invite-agent 를 옮긴다: `AgoraClient({ area, appId, appCertificate })`, `new Agent({ instructions: buildMiaInstructions(unit), greeting: unit.greeting, failureMessage, maxHistory, turnDetection(quickstart 값), advancedFeatures: { enable_rtm: true }, parameters })` 에 `.withStt(DeepgramSTT nova-3 en)` · `.withLlm(OpenAI gpt-4o-mini, greetingMessage: unit.greeting)` · `.withTts(MiniMaxTTS speech_2_6_turbo, 여성 영어 목소리)`.
   - 기기용으로 바꾸는 것만: `parameters` 에 `output_audio_codec: "G722"`(Device Kit 샘플 값)과 `data_channel: "rtm"`, `enable_error_message: true`. 세션은 `agent.createSession({ channel, agentUid: "1001", remoteUids: [String(uid)], idleTimeout: 30, enableStringUid: false })`.
   - `session.start()` → `{ agentId }`. 실패는 500 과 사유(시크릿 없이).
   - `DELETE ?agentId=`: quickstart 의 stop-conversation 처럼 `client.stopAgent`. 이미 끝난 에이전트(404, "already in the process of shutting down")는 성공으로 본다.
   - 표식과 501 을 지운다.
4. `device/agora_link.c`: `hello_rtsa.c` 의 순서를 줄인다.
   - `link_start`: `agora_rtc_init(app_id, &handler, &opt)`(opt: `area_code = AREA_CODE_GLOB`, `log_cfg.log_level = RTC_LOG_WARNING`, `log_cfg.log_path = "io.agora.rtc_sdk"`, 라이선스 비움 = 패키지 테스트 라이선스) → `agora_rtc_create_connection` → `agora_rtc_join_channel(conn, channel, uid, token, &ch)`. `ch`: `auto_subscribe_audio = true`, `auto_subscribe_video = false`, `enable_audio_decode = true`, `audio_codec_opt = { AUDIO_CODEC_TYPE_G722, 16000, 1, 20 }`. 핸들러는 init 전에 채운다.
   - 핸들러: `on_join_channel_success` → `on_event("joined", uid)`, `on_user_joined`/`on_user_offline` → `"remote-joined"`/`"remote-left"`, `on_connection_lost` → `"lost"`, `on_error`·`on_license_validation_failure` → `"error"`(코드는 stderr 로), `on_audio_data` 는 `data_type` 이 PCM 일 때만 `on_audio((const int16_t *)data, len / 2)`, `on_token_privilege_will_expire` 는 stderr 한 줄(24시간 토큰이라 갱신은 하지 않는다).
   - `link_send`: 입장 전이면 0 을 돌려 조용히 버린다. 입장 뒤 `audio_frame_info_t{ .data_type = AUDIO_DATA_TYPE_PCM }` 로 `agora_rtc_send_audio_data(conn, pcm, samples * 2, &info)`.
   - `link_stop`: `agora_rtc_leave_channel` → `agora_rtc_destroy_connection` → `agora_rtc_fini`. 두 번 불러도 안전하게.
   - 표식 주석을 지운다.

### 4. 기계 검증

`web/` 에서 `pnpm lint`·`pnpm build`, 이 디렉토리에서 `node scripts/check-integration.mjs device`. 실패하면 고치고 다시 돌린다. 같은 항목이 세 번 고쳐도 실패하면 멈추고 보고에 적는다. 기기 빌드(`./sdk.sh && make`)는 기기에서 한다. 기기에 접근할 수 없으면 보고에 적는다.

### 5. 보고

- `git diff --stat` 과 바뀐 파일. 3번 허용 목록 밖의 파일이 바뀌었으면 왜인지 한 줄.
- 2-3 의 메모 네 줄.
- [검증](#verify) 절의 "사람 확인" 목록을 그대로 붙인다. "된다"·"동작한다" 고 쓰지 않는다.

<a id="stage-c"></a>
## 단계 C. 보조 화면 자막 (선택)

스피커에는 화면이 없으니 옆 노트북에 Mia 와 내 말이 자막으로 흐르게 한다. 에이전트는 이미 `enable_rtm: true`·`data_channel: "rtm"` 으로 채널 이름과 같은 RTM 채널에 전사를 보낸다.

- 계약 `web/lib/captions.ts`: `CaptionLine { who: "mia" | "me"; text: string; final: boolean }`, `startCaptions({ channel, onLines, onStatus }) → { stop() }`. 화면은 이것만 안다.
- 구현 `web/lib/agora/captions.ts`: 스킬 `references/conversational-ai/agent-toolkit.md` 대로 `agora-agent-client-toolkit` 의 `AgoraVoiceAI` 에 RTC 클라이언트(발행하지 않는 관찰자, uid 3001)와 RTM 클라이언트를 넘기고 `TRANSCRIPT_UPDATED` 를 `CaptionLine[]` 으로 바꾼다. 토큰은 토큰 route 에 `rtm=1` 을 더해 `buildTokenWithRtm` 으로 받는다. SDK 는 함수 안에서 동적 import.
- 화면: 자막 카드에 최근 여섯 줄. Mia 는 accent, 나는 ink. 확정 전 줄은 muted.

<a id="verify"></a>
## 검증

기계 검증(개발 맥, `voice-ai-device/` 에서):

```bash
cd web && pnpm lint && pnpm build && cd ..
node scripts/doctor.mjs
node scripts/check-integration.mjs device
```

기기에서:

```bash
cd device && ./sdk.sh && make
```

사람 확인(녹음 파일로 대신하지 않는다):

1. 개발 맥에서 `web/` 의 `pnpm dev -H 0.0.0.0`. 맥의 LAN IP 를 확인한다.
2. 기기에서 `./speaker --server http://<맥 IP>:3000 --name desk`. "채널에 들어왔어요 · speaker-desk" 가 뜬다.
3. 기기에서 Enter. 몇 초 안에 "Mia 가 들어왔어요" 가 뜨고, 기기 스피커에서 Mia 가 주말에 뭐 했는지 묻는다.
4. 기기 마이크에 대고 영어로 세 턴 대화한다. Mia 가 내 말에 맞게 대답한다.
5. Mia 가 말하는 도중에 말을 끊으면 Mia 가 멈추고 듣는다.
6. Enter 로 끝내면 "Mia 가 쉬러 갔어요" 와 "Mia 가 나갔어요" 가 뜬다. `q` 로 프로그램이 끝난다.
7. 스피커 소리를 기기 마이크가 다시 주워 Mia 가 자기 말에 끊기면, 기기 쪽 에코 제거를 켜고(리눅스 데스크톱이면 PipeWire echo-cancel 모듈) 다시 본다. 결과를 README 에 적는다.
8. 단계 C 를 했으면: 맥 브라우저에서 `http://localhost:3000/?name=desk` 를 열고 3~5 동안 자막이 흐르는지 본다.

## 지키는 규칙

- 시크릿은 `web/.env.local`(CLI 가 쓴다)에만 있고 gitignore 다. 기기에는 App Certificate 가 없다. 기기는 서버에서 채널 하나짜리 토큰만 받는다. 토큰·App ID 값을 로그·채팅에 출력하지 않는다.
- 이 서버 route 는 인증 없이 누구나 부를 수 있는 로컬 데모용이다. 인터넷에 열지 않는다.
- Agora 코드는 경계 파일 셋(단계 C 는 넷)에만 둔다. 화면·콘텐츠·기기 본체는 통합 때 바꾸지 않는다. 새 추상화를 만들지 않는다.
- UI 문구·주석·기기 출력은 한국어, 영어 표현은 원문. em-dash 를 쓰지 않는다. 앱에 고유 이름을 붙이지 않는다("이 앱", "연습 앱"). AI 파트너 이름 Mia 는 예외.

# 디자인 규칙

경로는 `voice-ai-web/` 기준이다. 화면은 이미 다 그려져 있다. 이 문서는 누가 UI 를 만지더라도 같은 결과가 나오게 하는 규칙이다.
통합 작업은 UI 를 건드리지 않으므로 대개 읽을 일이 없다. 화면을 고치거나 새로 만들 때 읽는다.

## 한 줄

모눈종이 위의 픽셀. 따뜻한 종이색 팔레트는 그대로 두고, 글꼴·모서리·그림자를 픽셀로 맞춘다. Mia 는 얼굴 대신 픽셀 구슬 하나다.

## 토큰 (`app/globals.css`)

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `paper` / `paper-deep` | `#f5f2ea` / `#ebe6da` | 바탕, 눌리지 않은 선택지 |
| `card` | `#fffdf8` | 카드 |
| `ink` / `ink-soft` / `muted` | `#1f1c17` / `#4a463f` / `#7d786d` | 본문 / 보조 / 설명 |
| `line` / `line-strong` | `#e0dbcf` / `#c9c2b2` | 카드 테두리 / ghost 버튼 테두리 |
| `accent` / `accent-ink` | `#d8542a` / `#b5431f` | **힌트 버튼, 포커스 표시, Mia 가 살아 있을 때의 구슬만** |
| `good` / `good-soft` | `#2e7a4d` / `#e3f0e7` | 사용한 표현 체크 |
| `warn` | `#b3401e` | 30초 남은 타이머, 에러 문구 |
| `grid` | `#e9e4d8` | 바탕 24px 모눈 선 |

색은 이 표 밖에서 새로 만들지 않는다. 구슬의 쉬는 색 `#dcd2bd` 와 하이라이트 `#fffdf8` 만 `.orb` 안에 있다. 그라디언트는 쓰지 않는다. 그림자는 흐림 0의 잉크색(`shadow-px` 4px, `shadow-px-sm` 2px)뿐이다.

## 타이포

- 글꼴은 하나다: 갈무리(Galmuri11, OFL-1.1, npm `galmuri`, `next/font/local`). 12px 격자로 그린 픽셀 글꼴이라 **크기는 6의 배수만** 쓴다(레티나에서 정수배). 12 · 18 · 24 · 30 · 36 · 42.
- 영어 표현·숫자·"Mia"·화면 제목: `font-display` (갈무리 Bold). 표현 카드 36~42px, 타이머 36px, 홈 제목 42px.
- UI 문구: 갈무리 Regular. 설명·라벨 12px, 본문 18px. 자간을 건드리지 않는다.
- 발음기호: `font-mono`(시스템) 12px, `muted`. 픽셀 글꼴에 IPA 글리프가 없다.
- 굵기는 regular 와 bold 둘뿐이다.

## 공용 부품 (`components/ui.tsx`)

- `Button` variant: `primary`(ink) · `ghost`(테두리) · `quiet`(글자만) · `accent`(힌트 전용). 한 화면에 accent 버튼은 하나.
- `Card` (`strong` 이면 ink 테두리 = 지금 할 일), `Label`, `Chip`(`done` 이면 good), `Shell`(가운데 560px 컬럼. 폰 브라우저에서도 이 컬럼 하나로 그대로 쓴다).
- 모서리는 전부 각지다(`rounded-*` 를 쓰지 않는다). 테두리는 2px. 버튼은 `shadow-px-sm` 이고 누르면 2px 내려앉는다. `strong` 카드만 `shadow-px`.

## Mia 구슬 (`components/MiaOrb.tsx`, `.orb`)

Mia 의 존재감은 얼굴이 아니라 구슬 하나다. 계단 모서리 다각형(`clip-path`)으로 자른 168px 픽셀 원이고, 움직임은 `steps()` 로만 한다. 상태는 `data-state` 로만 바꾼다.

| 상태 | 모양 | 문구 |
|---|---|---|
| `unavailable` | 쉬는 색 | "Mia에게 아직 목소리가 없어요" |
| `connecting` | 쉬는 색, 깜빡임 | "Mia를 부르는 중이에요…" |
| `live` | 주황(accent), 1.6초 주기로 한 칸씩 커졌다 돌아옴 | "Mia와 대화 중 · 편하게 말해보세요" |
| `agent-left` / `ended` | 쉬는 색 | "Mia가 자리를 비웠어요" / "대화가 끝났어요" |
| `error` | 회색, 문구는 warn 색 | 사유 |

## 대화 화면 (`components/screens/Talk.tsx`)

위에서부터 머리줄(유닛 제목, 5분 타이머) · 구슬 · 자막 카드 · 오늘의 표현 · 힌트 버튼 · 대화 끝내기. 통합이 끝나면 아래가 데이터로 채워진다. 자리와 모양은 이미 있다.

- 자막 카드: Mia 의 마지막 말, 나의 마지막 말. 전사(`onTranscript`)에서 온다. 비어 있으면 "…".
- 표현 칩: 내 전사에 표현의 키 문구가 나오면 `done` 으로 바뀐다 (`detectUsedExpressions`).
- 타이머: `live` 일 때만 흐른다. 30초 남으면 `warn`, 0 이면 "시간이 다 됐어요" 로 끝낸다.
- 힌트: 가운데 뜨는 카드. 표현을 차례로 하나씩, "🔊 듣기"·"읽었어요", Esc 로 닫는다. "Mia는 기다리고 있어요".
- `?preview=live` 로 목소리 없이 살아 있는 상태와 자막 세 줄을 볼 수 있다.

## 하지 않는 것

- 카드 안에 카드, 흐린 그림자, 아이콘 세트. 이모지는 힌트 버튼(💡)과 듣기(🔊) 두 곳만.
- 다크 모드. (종이 컨셉이라 라이트 고정)
- 모션 추가. 있는 건 구슬 숨쉼·깜빡임과 화면 진입뿐이고, 모두 `steps()` 계단 움직임이며 `prefers-reduced-motion` 을 존중한다.

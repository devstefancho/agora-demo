# 영어 말하기 연습 앱 × Agora

하루 5분 영어 말하기 연습 앱에 Agora 로 영상통화를 붙인 예제다. 듣기·읽기는 되는데 말이 안 나오는 사람이 파트너와 5분 동안 영어로 말해 본다.

| 디렉토리 | 무엇 | Agora |
|---|---|---|
| [`video-call-web-mobile/`](video-call-web-mobile/) | 파트너와 5분 영상통화. 데스크톱 웹 + 폰(브라우저 또는 iOS 앱) | Video SDK (RTC) + Signaling (RTM) |

```bash
git clone https://github.com/devstefancho/agora-demo
cd agora-demo/video-call-web-mobile   # 이 디렉토리의 README 를 따라간다
```

Agora 공식 skill(`.claude/skills/agora`)과 MCP 설정이 `video-call-web-mobile/` 안에 들어 있다. 코딩 에이전트는 그 디렉토리에서 실행한다.

## 처음부터 만들어 보기

완성본을 받는 대신 직접 만들어 보려면 [`video-call-web-mobile/docs/spec.md`](video-call-web-mobile/docs/spec.md) 를 코딩 에이전트에 넣는다. 그 문서가 정본(SSOT)이고, 현재 구현, 만드는 순서(껍데기 → Agora 통합 → 추가 기능), 준비물, 검증 명령이 모두 들어 있다. 디자인 규칙과 Agora skill 은 스펙의 「넣는 법」 표대로 같이 복사해 둔다.

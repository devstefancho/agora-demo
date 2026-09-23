# 영어 말하기 연습 앱 × Agora

하루 5분 영어 말하기 연습 앱의 영상통화를 Agora 로 구현한 예제 레포다. 구현은 `video-call-web-mobile/` 에 있다.

| 디렉토리 | 안에 있는 것 |
|---|---|
| `video-call-web-mobile/` | `web/`(Next.js) · `mobile/`(iOS 파트너 앱) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |
| `voice-ai-web/` | Next.js 앱(디렉토리 자체) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |

- 작업은 `video-call-web-mobile/AGENTS.md` 를 먼저 읽고 한다. 그 파일이 이 파일보다 구체적이고, 충돌하면 그쪽이 이긴다.
- Agora 공식 skill(`.claude/skills/agora`), Claude Code 명령(`.claude/commands/`), `.mcp.json` 은 `video-call-web-mobile/` 안에 있다. 코딩 에이전트는 그 디렉토리에서 실행한다.
- Agora API 는 `video-call-web-mobile/.claude/skills/agora/SKILL.md` 와 그 `references/` 로만 판단한다. 웹 검색이나 기억으로 쓰지 않는다.
- 시크릿(App Certificate, `.env.local`, `Signing.xcconfig`)을 채팅·로그·커밋에 내지 않는다.
- push 전에 `CLAUDE.local.md`(로컬 전용, git 추적 안 함)가 있으면 읽고 따른다.

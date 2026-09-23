# 영어 말하기 연습 앱 × Agora

하루 5분 영어 말하기 연습 앱에 Agora 기능을 붙인 예제 레포다. 아래 디렉토리 하나가 따로 서는 구현 하나다.

| 디렉토리 | 안에 있는 것 |
|---|---|
| `video-call-web-mobile/` | `web/`(Next.js) · `mobile/`(iOS 파트너 앱) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |
| `voice-ai-web/` | Next.js 앱(디렉토리 자체) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |
| `voice-ai-device/` | `device/`(리눅스 기기 C 프로그램) · `web/`(Next.js 서버·보조 화면) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |
| `avatar-ai-web/` | Next.js 앱(디렉토리가 곧 앱 루트) · `scripts/` · `docs/`(`spec.md` 가 SSOT) · `.claude/` · `.mcp.json` |

- 작업은 고칠 디렉토리의 `AGENTS.md` 를 먼저 읽고 한다. 그 파일이 이 파일보다 구체적이고, 충돌하면 그쪽이 이긴다.
- Agora 공식 skill(`.claude/skills/agora`), Claude Code 명령(`.claude/commands/`), `.mcp.json` 은 디렉토리마다 안에 있다. 코딩 에이전트는 그 디렉토리에서 실행한다.
- Agora API 는 그 디렉토리의 `.claude/skills/agora/SKILL.md` 와 그 `references/` 로만 판단한다. 웹 검색이나 기억으로 쓰지 않는다.
- 시크릿(App Certificate, `.env.local`, `Signing.xcconfig`)을 채팅·로그·커밋에 내지 않는다.
- push 전에 `CLAUDE.local.md`(로컬 전용, git 추적 안 함)가 있으면 읽고 따른다.

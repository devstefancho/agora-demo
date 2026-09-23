// 껍데기: 통합 단계가 이 파일을 채운다.
//
// Agora Conversational AI 클라이언트. 계약은 lib/talk.ts 의 TalkSession 이다. 함수 이름과 시그니처는 바꾸지 않는다.
// 클라이언트 SDK 는 이 파일 안에서만, 브라우저에서만(함수 안 동적 import) 불러온다.
// 토큰은 /api/agora/token?rtm=1, 에이전트 start·stop 은 /api/agora/agent 다.
// 아바타는 채널의 원격 비디오로 들어온다. 그 비디오를 avatarContainer 에 재생하고 onAvatar 로 알린다.

import type { TalkSession } from "@/lib/talk";

export function createConvoAiTalk(): TalkSession {
  return {
    async start({ onStatus }) {
      onStatus("unavailable", "Mia가 아직 연결되지 않았어요");
    },
    async setMic() {},
    async stop() {
      return { transcript: [] };
    },
  };
}

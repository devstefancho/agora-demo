// 껍데기: 통합 단계가 이 파일을 채운다.
//
// Agora Conversational AI 클라이언트. 이 파일 하나를 채우면 Mia 에게 목소리가 생긴다.
// 계약은 lib/voice.ts 의 VoiceSession 이다. 함수 이름과 시그니처는 바꾸지 않는다.
// 클라이언트 SDK(agora-rtc-sdk-ng, agora-rtm, agora-agent-client-toolkit)는 이 파일 안에서만, 브라우저에서만 불러온다.
// 토큰은 GET /api/agora/token, 에이전트 start·stop 은 POST·DELETE /api/agora/agent 다.

import type { VoiceSession } from "@/lib/voice";

export function createConvoAiVoice(): VoiceSession {
  return {
    async start({ onStatus }) {
      onStatus("unavailable", "Mia에게 아직 목소리가 없어요");
    },
    async stop() {
      return { transcript: [] };
    },
  };
}

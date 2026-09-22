// 음성 대화 계약. Mia의 목소리가 화면에 들어오는 유일한 자리다.
//
// 화면은 이 파일의 타입과 createVoiceSession() 만 안다. 실제 SDK 호출(마이크 캡처, 채널 연결,
// AI 에이전트 start·stop, 전사 수신)은 lib/agora/convoai.ts 의 createConvoAiVoice() 에 있다.
// 통합 단계는 이 파일을 바꾸지 않는다.
//
//   start():  1) 서버(/api/agora/token)에서 RTC+RTM 토큰 받기  2) 채널 참가  3) 마이크 publish
//             4) 전사 구독  5) 서버(/api/agora/agent)에 에이전트 start 요청 (unit.id 만 보낸다)  6) onStatus("live")
//             에이전트 오디오는 들리게 재생하고, 전사가 오면 onTranscript(전체 누적) 를 부른다.
//   stop():   1) 서버에 에이전트 stop 요청  2) 전사 구독·RTM·채널 정리  3) onStatus("ended")  4) 최종 전사 반환
//   상태 순서: connecting → live → (agent-left | ended). 실패는 error 와 사유.

import type { Unit } from "@/content/units";
import { createConvoAiVoice } from "@/lib/agora/convoai";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "live"
  | "agent-left"
  | "ended"
  | "unavailable"
  | "error";

export type TranscriptTurn = {
  role: "user" | "agent";
  text: string;
};

export type VoiceStartOptions = {
  unit: Unit;
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onTranscript?: (turns: TranscriptTurn[]) => void;
};

export interface VoiceSession {
  start(options: VoiceStartOptions): Promise<void>;
  stop(): Promise<{ transcript: TranscriptTurn[] }>;
}

// `?preview=live` 로 열면 디자인 확인용으로 살아 있는 상태를 흉내 낸다 (목소리는 없다).
// 그 밖에는 lib/agora/convoai.ts 가 실제 대화를 맡는다.
export function createVoiceSession(): VoiceSession {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "live") {
    return previewSession();
  }
  return createConvoAiVoice();
}

function previewSession(): VoiceSession {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turns: TranscriptTurn[] = [];
  return {
    async start({ unit, onStatus, onTranscript }) {
      onStatus("connecting");
      const script: TranscriptTurn[] = [
        { role: "agent", text: unit.greeting },
        { role: "user", text: `Hmm... ${unit.expressions[0].en}` },
        { role: "agent", text: "Oh nice! Tell me more about that." },
      ];
      timers.push(setTimeout(() => onStatus("live"), 1200));
      script.forEach((turn, i) => {
        timers.push(
          setTimeout(() => {
            turns = [...turns, turn];
            onTranscript?.(turns);
          }, 2200 + i * 1800),
        );
      });
    },
    async stop() {
      timers.forEach(clearTimeout);
      return { transcript: turns };
    },
  };
}

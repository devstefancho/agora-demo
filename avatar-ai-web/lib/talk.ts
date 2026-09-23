// AI 아바타 대화 계약. 이 앱에서 Mia 의 목소리와 얼굴이 화면에 들어오는 유일한 자리다.
//
// 화면은 이 파일의 타입과 createTalkSession() 만 안다. 실제 SDK 호출(채널 참가, 마이크 publish,
// 에이전트 start·stop, 전사 수신, 아바타 비디오 재생)은 lib/agora/convoai.ts 의 createConvoAiTalk() 에 있다.
// 통합 단계는 이 파일을 바꾸지 않는다.
//
//   start():   1) 서버(/api/agora/token?channel=&uid=&rtm=1)에서 토큰 받기  2) 채널 참가  3) 마이크 publish
//              4) 서버(/api/agora/agent)에 에이전트 start 요청 (channel·uid·unitId 만 보낸다)  5) onStatus("live")
//              에이전트 목소리는 들리게 재생하고, 전사가 오면 onTranscript(전체 누적)를 부른다.
//              아바타 비디오가 오면 avatarContainer 에 재생하고 onAvatar(true), 비디오가 멈추거나 떠나면 onAvatar(false).
//   setMic():  마이크 트랙을 켜고 끈다. 채널에서 나가지 않는다.
//   stop():    1) 서버에 에이전트 stop 요청  2) 트랙 정리·채널 떠나기  3) 최종 전사 반환
//   상태 순서: connecting → live → (agent-left | ended). 실패는 error 와 사유.

import type { Unit } from "@/content/units";
import { createConvoAiTalk } from "@/lib/agora/convoai";

export type TalkStatus = "idle" | "connecting" | "live" | "agent-left" | "ended" | "unavailable" | "error";

export type TranscriptTurn = {
  role: "user" | "agent";
  text: string;
};

export type TalkStartOptions = {
  unit: Unit;
  // 아바타 비디오가 그려질 무대. 화면(Talk.tsx)이 넘긴다.
  avatarContainer: HTMLElement;
  onStatus: (status: TalkStatus, detail?: string) => void;
  onTranscript?: (turns: TranscriptTurn[]) => void;
  // 아바타 비디오가 무대에 붙으면 true, 떨어지면 false. 얼굴이 없는 동안 화면은 Mia 구슬을 보여 준다.
  onAvatar?: (on: boolean) => void;
};

export interface TalkSession {
  start(options: TalkStartOptions): Promise<void>;
  setMic(on: boolean): Promise<void>;
  stop(): Promise<{ transcript: TranscriptTurn[] }>;
}

// `?preview=live` 로 열면 디자인 확인용으로 살아 있는 대화를 흉내 낸다 (목소리와 얼굴은 없다).
// 그 밖에는 lib/agora/convoai.ts 가 실제 대화를 맡는다.
export function createTalkSession(): TalkSession {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "live") {
    return previewTalk();
  }
  return createConvoAiTalk();
}

function previewTalk(): TalkSession {
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
    async setMic() {},
    async stop() {
      timers.forEach(clearTimeout);
      return { transcript: turns };
    },
  };
}

// Agora Signaling(RTM) 클라이언트. 상대의 마이크·카메라 상태를 나른다. lib/agora/rtc.ts 가 부른다.
// 영상·음성은 RTC 가, "지금 마이크가 꺼져 있다" 같은 상태는 RTM presence state 가 나른다. 두 SDK 를 같이 쓰는 이유다.
// SDK(agora-rtm)는 이 파일 안에서만, 그리고 브라우저에서만(joinStateChannel 안에서 동적 import) 불러온다.
//
//   joinStateChannel(): 이벤트 리스너 등록(presence) → login(토큰의 identity 와 같은 userId) → 채널 subscribe(withPresence)
//                       → 내 상태를 presence.setState 로 올린다 → 스냅샷에 있는 다른 사람의 상태를 onPartner 로 넘긴다
//   setState():         내 마이크·카메라가 바뀌면 presence.setState 로 다시 올린다
//   상대의 REMOTE_STATE_CHANGED 는 onPartner 로 넘긴다. 상대가 나가는 것은 여기서 다루지 않는다 (RTC 가 partner-left 를 낸다)
//   leave():            unsubscribe → logout
//
// presence state 의 값은 문자열이다: { mic: "on" | "off", camera: "on" | "off" }
// RTM 은 내가 올린 상태를 내게 되돌려주지 않는다. 그래서 publisher 가 나인 이벤트는 오지 않지만, 혹시 몰라 한 번 더 거른다.

import type { PartnerState } from "@/lib/call";

export type StateChannelOptions = {
  appId: string;
  channel: string;
  /** RTM userId. 토큰을 발급받은 identity(String(uid))와 같아야 한다. */
  userId: string;
  /** /api/agora/token?rtm=1 이 준 RTC+RTM 통합 토큰. */
  token: string;
  /** 들어갈 때 올릴 내 상태. */
  state: PartnerState;
  onPartner: (state: PartnerState) => void;
};

export interface StateChannel {
  setState(state: PartnerState): Promise<void>;
  leave(): Promise<void>;
}

type States = Record<string, string> | null | undefined;

// 문자열 상태를 boolean 으로. 키가 없으면 이전 값을 유지한다. "off" 일 때만 꺼진 것이다.
function merge(prev: PartnerState, states: States): PartnerState {
  return {
    mic: states?.mic === undefined ? prev.mic : states.mic !== "off",
    camera: states?.camera === undefined ? prev.camera : states.camera !== "off",
  };
}

function toStrings(state: PartnerState): Record<string, string> {
  return { mic: state.mic ? "on" : "off", camera: state.camera ? "on" : "off" };
}

export async function joinStateChannel({
  appId,
  channel,
  userId,
  token,
  state,
  onPartner,
}: StateChannelOptions): Promise<StateChannel> {
  const { default: AgoraRTM } = await import("agora-rtm");
  const rtm = new AgoraRTM.RTM(appId, userId);

  let partner: PartnerState = { mic: true, camera: true };
  const apply = (states: States) => {
    partner = merge(partner, states);
    onPartner(partner);
  };

  // 리스너는 login·subscribe 보다 먼저. subscribe 직후의 SNAPSHOT 이 먼저 들어와 있던 상대의 첫 상태다.
  rtm.addEventListener("presence", (event) => {
    if (event.channelName !== channel) return;
    if (event.eventType === "SNAPSHOT") {
      for (const user of event.snapshot ?? []) {
        if (user.userId !== userId) apply(user.states);
      }
    } else if (event.eventType === "REMOTE_STATE_CHANGED" && event.publisher !== userId) {
      apply(event.stateChanged);
    }
  });

  await rtm.login({ token });
  await rtm.subscribe(channel, { withMessage: false, withPresence: true });
  await rtm.presence.setState(channel, "MESSAGE", toStrings(state));

  return {
    async setState(next) {
      await rtm.presence.setState(channel, "MESSAGE", toStrings(next));
    },
    async leave() {
      try {
        await rtm.unsubscribe(channel);
      } finally {
        await rtm.logout();
      }
    },
  };
}

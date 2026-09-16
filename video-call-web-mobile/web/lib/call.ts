// 영상통화 계약. 이 앱에서 "파트너와의 통화"가 화면에 들어오는 유일한 자리다.
//
// 화면은 이 파일의 타입과 createCallSession() 만 안다. 실제 SDK 호출(카메라·마이크 캡처, 채널 참가,
// 상대 영상 표시)은 lib/agora/rtc.ts 의 createRtcCall() 에, 상대 마이크·카메라 상태의 왕복은
// lib/agora/rtm.ts 에 있다. 통합(docs/spec.md 단계 B)은 이 파일을 바꾸지 않는다.
//
//   start():  1) 서버(/api/agora/token?rtm=1)에서 RTC+RTM 통합 토큰 받기 (channel, uid)  2) RTC 채널 참가
//             3) 카메라·마이크로 로컬 트랙을 만들어 publish
//             4) 로컬 영상은 localContainer 에, 상대 영상은 remoteContainer 에 재생한다
//             5) RTM 에 같은 identity(String(uid))로 로그인해 같은 이름의 채널을 subscribe 하고,
//                내 마이크·카메라 상태를 presence state 로 올린다
//             6) 참가 직후 onStatus("waiting"), 상대가 들어오면 onStatus("connected"),
//                상대가 나가면 onStatus("partner-left")
//             7) 상대의 마이크·카메라 상태는 onPartner({ mic, camera }) 로 온다
//                (subscribe 직후 스냅샷으로 한 번, 그 뒤 상대가 바꿀 때마다)
//   mic:      false 면 마이크를 끈 채 들어간다(대기실에서 고른 값). 오디오는 켤 때 처음 publish 하고, presence state 도 mic "off" 로 시작한다
//   setMic/setCamera: 로컬 트랙을 켜고 끄고, 바뀐 상태를 RTM presence state 로 알린다
//   setScreenShare(on): 화면 공유 켜고 끄기 (데스크톱 Chrome). 화면 전용 클라이언트가 같은 채널에
//             화면 uid(screenUidOf(uid))로 들어가 화면 트랙 하나만 publish 한다. 공유 창 고르기를 취소하면 조용히 끝난다.
//             브라우저의 "공유 중지" 로 끝나도 onScreen 이 알린다
//   화면 공유 보기: 상대의 화면 uid 가 publish 하면 screenContainer 에 재생하고 onScreen({ partner: true }).
//             화면 uid 는 상대 카메라가 아니므로 connected·partner-left 판단에 쓰지 않는다
//   stop():   화면 공유 정리 → RTM 로그아웃 → 트랙 정리 → 채널 떠나기 → onStatus("ended")
//   실패는 onStatus("error", 사유)

import type { Unit } from "@/content/units";
import { createRtcCall } from "@/lib/agora/rtc";

export type CallStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "connected"
  | "partner-left"
  | "ended"
  | "unavailable"
  | "error";

// 상대의 마이크·카메라. 영상·음성은 RTC 가 나르고, "지금 꺼져 있다" 는 상태는 RTM presence state 가 나른다.
export type PartnerState = { mic: boolean; camera: boolean };

// 화면 공유. mine 은 내가 공유 중, partner 는 상대가 공유 중.
export type ScreenState = { mine: boolean; partner: boolean };

// 카메라 uid 는 1~1,000,000 난수다(웹 rtc.ts, iOS PartnerSession 같은 범위). 화면 uid 는 거기에 1,000,000 을 더해 겹치지 않게 한다.
// 이 범위만 보고 "이 참가자는 화면 공유다" 를 안다. iOS 도 같은 규칙이다.
export const SCREEN_UID_OFFSET = 1_000_000;
export const screenUidOf = (uid: number) => uid + SCREEN_UID_OFFSET;
export const isScreenUid = (uid: number) => uid > SCREEN_UID_OFFSET;

export type CallStartOptions = {
  channel: string;
  unit: Unit;
  // 들어갈 때 마이크. 없으면 켜진 채 들어간다.
  mic?: boolean;
  localContainer: HTMLElement | null;
  remoteContainer: HTMLElement;
  onStatus: (status: CallStatus, detail?: string) => void;
  onPartner?: (state: PartnerState) => void;
  // 상대가 공유한 화면이 재생될 자리. 없으면 상대 화면 공유를 받지 않는다.
  screenContainer?: HTMLElement | null;
  onScreen?: (state: ScreenState) => void;
};

export interface CallSession {
  start(options: CallStartOptions): Promise<void>;
  setMic(on: boolean): Promise<void>;
  setCamera(on: boolean): Promise<void>;
  setScreenShare(on: boolean): Promise<void>;
  stop(): Promise<void>;
}

// 통화방 코드. 초대 링크(?room=)로 같은 방에 들어온다.
export function newRoomCode(): string {
  return `call-${Math.random().toString(36).slice(2, 6)}`;
}

// `?preview=connected` 로 열면 디자인 확인용으로 연결된 상태를 흉내 낸다 (영상은 없다).
// 그 밖에는 lib/agora/rtc.ts 가 실제 통화를 맡는다.
export function createCallSession(): CallSession {
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "connected"
  ) {
    return previewCall();
  }
  return createRtcCall();
}

function previewCall(): CallSession {
  const timers: ReturnType<typeof setTimeout>[] = [];
  return {
    async start({ localContainer, remoteContainer, onStatus, onPartner }) {
      onStatus("connecting");
      timers.push(setTimeout(() => onStatus("waiting"), 900));
      timers.push(
        setTimeout(() => {
          paintPlaceholder(remoteContainer, "파트너");
          if (localContainer) paintPlaceholder(localContainer, "나");
          onStatus("connected");
          onPartner?.({ mic: true, camera: true });
        }, 2400),
      );
      // 상대가 마이크를 껐다 켜고, 카메라를 껐다 켜는 장면. 이름표와 꺼진 자리 표시가 바뀌는지 본다.
      timers.push(setTimeout(() => onPartner?.({ mic: false, camera: true }), 6000));
      timers.push(setTimeout(() => onPartner?.({ mic: true, camera: false }), 9500));
      timers.push(setTimeout(() => onPartner?.({ mic: true, camera: true }), 13000));
    },
    async setMic() {},
    async setCamera() {},
    async setScreenShare() {},
    async stop() {
      timers.forEach(clearTimeout);
    },
  };
}

function paintPlaceholder(container: HTMLElement, label: string) {
  container.innerHTML = "";
  const el = document.createElement("div");
  el.style.cssText =
    "width:100%;height:100%;display:flex;align-items:center;justify-content:center;" +
    "background:radial-gradient(circle at 40% 35%, #5a544a 0%, #2a2620 70%);color:#d8d2c4;font-size:14px";
  el.textContent = label;
  container.appendChild(el);
}

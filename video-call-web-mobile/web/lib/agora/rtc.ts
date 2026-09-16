// Agora RTC(Video SDK) 클라이언트. 이 파일이 파트너와의 통화다.
// 계약은 lib/call.ts 의 CallSession 이다. SDK(agora-rtc-sdk-ng)는 이 파일 안에서만, 그리고 브라우저에서만
// (start() 안에서 동적 import) 불러온다. 아래 import 는 타입뿐이라 번들에 들어가지 않는다.
// 토큰은 /api/agora/token?rtm=1 에서 받는다 (RTC+RTM 통합). App ID 는 NEXT_PUBLIC_AGORA_APP_ID 다.
// 상대의 마이크·카메라 상태는 lib/agora/rtm.ts 의 joinStateChannel 로 주고받는다 (같은 토큰, userId 는 String(uid)).
// 화면 공유는 스킬 rtc/web.md 의 Dual-Client Pattern 이다. 화면 전용 클라이언트가 같은 채널에 화면 uid 로 들어간다.
// 상대 쪽에서는 화면 uid 가 참가자 한 명 더로 보이므로, uid 범위(isScreenUid)로 카메라와 가른다.

import type { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { isScreenUid, screenUidOf, type CallSession, type CallStartOptions, type PartnerState, type ScreenState } from "@/lib/call";
import { joinStateChannel, type StateChannel } from "@/lib/agora/rtm";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

// rtm=false 는 화면 공유 uid 용 RTC 토큰이다. 화면 클라이언트는 RTM 에 들어가지 않는다.
async function fetchToken(channel: string, uid: number, rtm = true): Promise<string> {
  const res = await fetch(`/api/agora/token?channel=${encodeURIComponent(channel)}&uid=${uid}${rtm ? "&rtm=1" : ""}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `토큰을 받지 못했어요 (${res.status})`);
  return body.token as string;
}

export function createRtcCall(): CallSession {
  let client: IAgoraRTCClient | null = null;
  let localVideo: ILocalVideoTrack | null = null;
  let localAudio: ILocalAudioTrack | null = null;
  let states: StateChannel | null = null;
  let mine: PartnerState = { mic: true, camera: true };
  // 마이크를 끈 채 들어가면 오디오 트랙은 아직 publish 되지 않았다. 꺼진 트랙은 publish 할 수 없어서(TRACK_IS_DISABLED) 켤 때 publish 한다.
  let audioPublished = false;
  let hasPartnerVideo = false;
  let notify: CallStartOptions["onStatus"] = () => {};
  let channelName = "";
  let myUid = 0;
  let screenClient: IAgoraRTCClient | null = null;
  let screenTrack: ILocalVideoTrack | null = null;
  let screen: ScreenState = { mine: false, partner: false };
  let notifyScreen: (state: ScreenState) => void = () => {};
  const setScreen = (next: Partial<ScreenState>) => {
    screen = { ...screen, ...next };
    notifyScreen(screen);
  };

  // 내 화면 공유 정리. 버튼으로 끄든, 브라우저의 "공유 중지"(track-ended)든 여기로 온다.
  async function stopScreenShare() {
    const track = screenTrack;
    const sc = screenClient;
    screenTrack = null;
    screenClient = null;
    track?.stop();
    track?.close();
    await sc?.leave();
    if (screen.mine) setScreen({ mine: false });
  }
  // start() 가 진행 중일 때 stop() 이 오면(React 개발 모드의 effect 재실행, 화면 이탈) 그 start 는 중간에 멈춘다.
  // 그렇지 않으면 한 탭이 같은 채널에 두 번 들어가 자기 자신을 상대로 본다.
  let generation = 0;

  return {
    async start({ channel, mic = true, localContainer, remoteContainer, onStatus, onPartner, screenContainer, onScreen }) {
      const gen = ++generation;
      const live = () => gen === generation;
      notify = onStatus;
      notifyScreen = onScreen ?? (() => {});
      screen = { mine: false, partner: false };
      onStatus("connecting");
      try {
        if (!APP_ID) throw new Error("App ID 가 없어요. agora project env write --template nextjs 를 실행하세요");

        // 1 이상의 난수 uid. 토큰이 이 uid 로 발급되므로 join 도 같은 값을 쓴다.
        const uid = Math.floor(Math.random() * 1_000_000) + 1;
        const token = await fetchToken(channel, uid);
        if (!live()) return;
        channelName = channel;
        myUid = uid;

        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (!live()) return;
        const rtc = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        // 상대 화면 공유가 끝나면 그 자리를 비운다.
        const clearPartnerScreen = () => {
          if (screenContainer) screenContainer.innerHTML = "";
          if (screen.partner) setScreen({ partner: false });
        };

        // 이벤트 핸들러는 join 보다 먼저 등록한다. 이미 방에 있는 사람의 이벤트를 놓치지 않기 위해서다.
        // user-published 는 audio 와 video 가 따로 온다.
        rtc.on("user-published", async (user, mediaType) => {
          // 화면 uid 는 카메라가 아니다. 내 화면 공유는 받지 않고, 상대 화면 공유는 screenContainer 에 contain 으로 재생한다.
          if (isScreenUid(Number(user.uid))) {
            if (Number(user.uid) === screenUidOf(uid) || !screenContainer || mediaType !== "video") return;
            await rtc.subscribe(user, mediaType);
            user.videoTrack?.play(screenContainer, { fit: "contain" });
            setScreen({ partner: true });
            return;
          }
          await rtc.subscribe(user, mediaType);
          if (mediaType === "video") {
            user.videoTrack?.play(remoteContainer);
            if (!hasPartnerVideo) {
              hasPartnerVideo = true;
              onStatus("connected");
            }
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        // 상대가 카메라를 끄면(setEnabled(false)) video 가 unpublish 된다. 마지막 프레임을 지운다. 이름표는 RTM 이 바꾼다.
        rtc.on("user-unpublished", (user, mediaType) => {
          if (isScreenUid(Number(user.uid))) {
            if (Number(user.uid) !== screenUidOf(uid) && mediaType === "video") clearPartnerScreen();
            return;
          }
          if (mediaType === "video") remoteContainer.innerHTML = "";
        });

        rtc.on("user-left", (user) => {
          if (isScreenUid(Number(user.uid))) {
            if (Number(user.uid) !== screenUidOf(uid)) clearPartnerScreen();
            return;
          }
          hasPartnerVideo = false;
          remoteContainer.innerHTML = "";
          onStatus("partner-left");
        });

        rtc.on("token-privilege-will-expire", async () => {
          await rtc.renewToken(await fetchToken(channel, uid));
        });

        await rtc.join(APP_ID, channel, token, uid);
        if (!live()) {
          await rtc.leave();
          return;
        }
        client = rtc;

        const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (!live()) {
          audio.close();
          video.close();
          return;
        }
        localAudio = audio;
        localVideo = video;
        if (!mic) await audio.setEnabled(false);
        await rtc.publish(mic ? [audio, video] : [video]);
        audioPublished = mic;
        if (!live()) return;
        if (localContainer) video.play(localContainer);

        // 상태 채널. 같은 토큰, userId 는 String(uid). 내 상태를 올리고 상대 상태를 받는다.
        mine = { mic, camera: true };
        const stateChannel = await joinStateChannel({
          appId: APP_ID,
          channel,
          userId: String(uid),
          token,
          state: mine,
          onPartner: onPartner ?? (() => {}),
        });
        if (!live()) {
          await stateChannel.leave();
          return;
        }
        states = stateChannel;

        // 상대가 이미 들어와 있으면 위 핸들러가 먼저 "connected" 를 냈다. 그 위에 "waiting" 을 덮지 않는다.
        if (!hasPartnerVideo) onStatus("waiting");
      } catch (err) {
        if (live()) onStatus("error", err instanceof Error ? err.message : String(err));
      }
    },

    async setMic(on) {
      mine = { ...mine, mic: on };
      await localAudio?.setEnabled(on);
      if (on && localAudio && client && !audioPublished) {
        await client.publish(localAudio);
        audioPublished = true;
      }
      await states?.setState(mine);
    },

    async setCamera(on) {
      mine = { ...mine, camera: on };
      await localVideo?.setEnabled(on);
      await states?.setState(mine);
    },

    async setScreenShare(on) {
      if (!on) {
        await stopScreenShare();
        return;
      }
      if (screenClient || !client) return;
      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
      let track: ILocalVideoTrack;
      try {
        // 슬라이드·코드 같은 글자 화면이라 detail. 소리는 넣지 않는다(통화 소리와 겹친다).
        track = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: { width: 1920, height: 1080, frameRate: 15 }, optimizationMode: "detail" },
          "disable",
        );
      } catch (err) {
        // 공유할 창 고르기를 취소하면 PERMISSION_DENIED 다. 오류가 아니다.
        if ((err as { code?: string }).code === "PERMISSION_DENIED") return;
        throw err;
      }
      // 창을 고르는 사이 통화가 끝났거나 다른 공유가 시작됐으면 이 트랙은 버린다.
      if (!client || screenClient) {
        track.close();
        return;
      }
      const sc = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      screenClient = sc;
      screenTrack = track;
      track.on("track-ended", () => void stopScreenShare());
      try {
        const screenUid = screenUidOf(myUid);
        await sc.join(APP_ID, channelName, await fetchToken(channelName, screenUid, false), screenUid);
        sc.on("token-privilege-will-expire", async () => {
          await sc.renewToken(await fetchToken(channelName, screenUid, false));
        });
        await sc.publish(track);
        setScreen({ mine: true });
      } catch (err) {
        await stopScreenShare();
        throw err;
      }
    },

    async stop() {
      generation += 1;
      // 이 stop 이 끝날 때 알릴 상대는 지금의 화면이다. 그 사이 새 start 가 notify 를 바꿔도 그쪽에 "ended" 를 보내지 않는다.
      const done = notify;
      notify = () => {};
      await stopScreenShare().catch(() => {});
      notifyScreen = () => {};
      try {
        await states?.leave();
      } catch {
        // 상태 채널 정리 실패는 통화 종료를 막지 않는다
      }
      states = null;
      localAudio?.stop();
      localAudio?.close();
      localVideo?.stop();
      localVideo?.close();
      localAudio = null;
      localVideo = null;
      audioPublished = false;
      await client?.leave();
      client = null;
      hasPartnerVideo = false;
      done("ended");
    },
  };
}

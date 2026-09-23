// Agora Conversational AI 클라이언트. 계약은 lib/talk.ts 의 TalkSession 이다.
// 클라이언트 SDK 는 이 파일 안에서만, start() 안의 동적 import 로만 불러온다.
//
// start: 학습자 uid → 토큰(rtm=1) → RTC 클라이언트 → 핸들러(join 전) → join → 마이크 publish
//        → RTM 전사 → POST /api/agora/agent → onStatus("live")
// setMic: 마이크 트랙만 켜고 끈다. 채널에는 남는다.
// stop:  DELETE /api/agora/agent → 전사 정리 → 트랙 stop·close → leave → ended

import type { TalkSession, TalkStartOptions, TranscriptTurn } from "@/lib/talk";

const AGENT_UID = "1000001";

type Resources = {
  disposed: boolean;
  agentId: string | null;
  channel: string | null;
  videoUid: string | null;
  leave: (() => Promise<void>) | null;
  closeMic: (() => void) | null;
  setMicEnabled: ((on: boolean) => Promise<void>) | null;
  stopVideo: (() => void) | null;
  logoutRtm: (() => Promise<void>) | null;
  stopAi: (() => void) | null;
};

function emptyResources(): Resources {
  return {
    disposed: false,
    agentId: null,
    channel: null,
    videoUid: null,
    leave: null,
    closeMic: null,
    setMicEnabled: null,
    stopVideo: null,
    logoutRtm: null,
    stopAi: null,
  };
}

// AgoraVoiceAI.init 은 싱글톤이라 겹치면 이전 인스턴스를 지운다. 한 번에 하나만 초기화한다.
let aiGate: Promise<void> = Promise.resolve();

function withAiGate<T>(fn: () => Promise<T>): Promise<T> {
  const prev = aiGate;
  let release: () => void = () => {};
  aiGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return prev.then(fn, fn).finally(release);
}

export function createConvoAiTalk(): TalkSession {
  let generation = 0;
  let committed: Resources | null = null;
  let active: Resources | null = null;
  let turns: TranscriptTurn[] = [];
  let micOn = true;
  let hooks: Pick<TalkStartOptions, "onStatus" | "onAvatar"> | null = null;

  async function dispose(bag: Resources | null) {
    if (!bag || bag.disposed) return;
    bag.disposed = true;
    if (active === bag) active = null;

    const agentId = bag.agentId;
    bag.agentId = null;
    if (agentId) {
      try {
        await fetch(`/api/agora/agent?agentId=${encodeURIComponent(agentId)}`, { method: "DELETE" });
      } catch {
        // 로컬 정리는 계속한다. 에이전트는 idleTimeout 으로도 빠진다.
      }
    }

    try {
      bag.stopAi?.();
    } catch {
      // 이미 정리된 싱글톤
    }
    bag.stopAi = null;

    if (bag.logoutRtm) {
      try {
        await bag.logoutRtm();
      } catch {
        // 구독이 없어도 채널을 떠난다
      }
    }
    bag.logoutRtm = null;

    try {
      bag.stopVideo?.();
    } catch {
      // 재생이 이미 끝난 트랙
    }
    bag.stopVideo = null;

    try {
      bag.closeMic?.();
    } catch {
      // 마이크가 이미 닫힘
    }
    bag.closeMic = null;
    bag.setMicEnabled = null;

    if (bag.leave) {
      try {
        await bag.leave();
      } catch {
        // leave 가 두 번 불려도 세션은 끝난 것으로 본다
      }
    }
    bag.leave = null;
  }

  return {
    async start(options) {
      const gen = ++generation;
      const alive = () => gen === generation;
      const bag = emptyResources();
      hooks = options;
      turns = [];
      options.onStatus("connecting");

      let token = "";
      try {
        const uid = 1 + Math.floor(Math.random() * 1_000_000);
        const channel = `practice-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        bag.channel = channel;

        const tokenRes = await fetch(
          `/api/agora/token?channel=${encodeURIComponent(channel)}&uid=${uid}&rtm=1`,
        );
        const tokenBody = (await tokenRes.json().catch(() => null)) as {
          appId?: string;
          token?: string;
          error?: string;
        } | null;
        if (!alive()) return;
        if (!tokenRes.ok || !tokenBody?.token || !tokenBody.appId) {
          throw new Error(tokenBody?.error || "토큰을 받지 못했어요");
        }
        token = tokenBody.token;
        const appId = tokenBody.appId;

        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (!alive()) return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        bag.leave = () => client.leave();

        // join 전에 등록하지 않으면, 이미 채널에 있는 참가자의 이벤트를 놓친다.
        client.on("user-published", async (user, mediaType) => {
          if (!alive()) return;
          await client.subscribe(user, mediaType);
          if (!alive()) return;
          if (mediaType === "audio") {
            user.audioTrack?.play();
            return;
          }
          if (mediaType === "video" && user.videoTrack) {
            bag.videoUid = String(user.uid);
            bag.stopVideo = () => user.videoTrack?.stop();
            user.videoTrack.play(options.avatarContainer);
            options.onAvatar?.(true);
          }
        });
        client.on("user-unpublished", (user, mediaType) => {
          if (!alive() || mediaType !== "video") return;
          try {
            user.videoTrack?.stop();
          } catch {
            // 트랙이 이미 멈춤
          }
          if (String(user.uid) === bag.videoUid) {
            bag.videoUid = null;
            bag.stopVideo = null;
          }
          options.onAvatar?.(false);
        });
        client.on("user-left", (user) => {
          if (!alive()) return;
          const remoteUid = String(user.uid);
          if (remoteUid === bag.videoUid) {
            try {
              bag.stopVideo?.();
            } catch {
              // 트랙이 이미 멈춤
            }
            bag.videoUid = null;
            bag.stopVideo = null;
            options.onAvatar?.(false);
          }
          if (remoteUid === AGENT_UID) options.onStatus("agent-left");
        });

        await client.join(appId, channel, token, uid);
        if (!alive()) {
          await dispose(bag);
          return;
        }

        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        bag.closeMic = () => {
          mic.stop();
          mic.close();
        };
        bag.setMicEnabled = (on) => mic.setEnabled(on);
        active = bag;
        if (!micOn) await mic.setEnabled(false);
        if (!alive()) {
          await dispose(bag);
          return;
        }
        await client.publish([mic]);
        if (!alive()) {
          await dispose(bag);
          return;
        }

        const { default: AgoraRTM } = await import("agora-rtm");
        if (!alive()) {
          await dispose(bag);
          return;
        }
        const rtm = new AgoraRTM.RTM(appId, String(uid));
        await rtm.login({ token });
        bag.logoutRtm = async () => {
          try {
            await rtm.unsubscribe(channel);
          } catch {
            // 구독 전에 끊기면 unsubscribe 가 실패한다. logout 은 한다.
          }
          await rtm.logout();
        };
        if (!alive()) {
          await dispose(bag);
          return;
        }
        await rtm.subscribe(channel);
        if (!alive()) {
          await dispose(bag);
          return;
        }

        const { AgoraVoiceAI, AgoraVoiceAIEvents, TranscriptHelperMode } = await import(
          "agora-agent-client-toolkit"
        );
        await withAiGate(async () => {
          if (!alive()) return;
          const ai = await AgoraVoiceAI.init({
            rtcEngine: client,
            rtmEngine: rtm,
            renderMode: TranscriptHelperMode.TEXT,
            enableLog: false,
          });
          if (!alive()) {
            try {
              if (AgoraVoiceAI.getInstance() === ai) {
                ai.unsubscribe();
                ai.destroy();
              }
            } catch {
              // 초기화 도중 폐기
            }
            return;
          }
          // subscribeMessage 전에 등록하지 않으면 이미 도착한 전사를 놓친다.
          // TRANSCRIPT_UPDATED 는 전체 이력을 준다. 진행 중 문장은 그 배열의 마지막 항목으로 바뀌므로 통째로 갈아끼운다.
          ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (items) => {
            if (!alive()) return;
            const next: TranscriptTurn[] = [];
            for (const item of items) {
              if (typeof item.text !== "string" || item.text.length === 0) continue;
              const object = item.metadata?.object;
              const role: TranscriptTurn["role"] =
                object === "user.transcription" || item.uid === "0" || item.uid === String(uid) ? "user" : "agent";
              next.push({ role, text: item.text });
            }
            turns = next;
            options.onTranscript?.(turns.map((turn) => ({ ...turn })));
          });
          ai.subscribeMessage(channel);
          bag.stopAi = () => {
            try {
              if (AgoraVoiceAI.getInstance() === ai) {
                ai.unsubscribe();
                ai.destroy();
              }
            } catch {
              // 이미 destroy 됨
            }
          };
        });
        if (!alive()) {
          await dispose(bag);
          return;
        }

        const agentRes = await fetch("/api/agora/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channel, uid, unitId: options.unit.id }),
        });
        const agentBody = (await agentRes.json().catch(() => null)) as {
          agentId?: string;
          error?: string;
        } | null;
        if (!agentRes.ok || !agentBody?.agentId) {
          throw new Error(agentBody?.error || "Mia를 부르지 못했어요");
        }
        bag.agentId = agentBody.agentId;
        if (!alive()) {
          await dispose(bag);
          return;
        }

        committed = bag;
        options.onStatus("live");
      } catch (error) {
        await dispose(bag);
        if (!alive()) return;
        options.onStatus("error", safeMessage(error, token));
      }
    },

    async setMic(on) {
      micOn = on;
      if (active?.setMicEnabled) await active.setMicEnabled(on);
    },

    async stop() {
      generation += 1;
      const bag = committed;
      committed = null;
      const endHooks = hooks;
      await dispose(bag);
      endHooks?.onAvatar?.(false);
      endHooks?.onStatus("ended");
      return { transcript: turns.map((turn) => ({ ...turn })) };
    },
  };
}

function safeMessage(error: unknown, secret: string): string {
  let message = error instanceof Error ? error.message : "연결에 실패했어요";
  if (secret) message = message.split(secret).join("[secret]");
  return message;
}

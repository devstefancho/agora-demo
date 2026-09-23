// Agora Conversational AI 클라이언트. 이 파일 하나가 Mia 에게 목소리를 준다.
// 계약은 lib/voice.ts 의 VoiceSession 이다. 함수 이름과 시그니처는 바꾸지 않는다.
// 클라이언트 SDK(agora-rtc-sdk-ng, agora-rtm, agora-agent-client-toolkit)는 이 파일 안에서만, 브라우저에서만 불러온다.
// 그래서 모듈 최상위에서 import 하지 않고 start() 안에서 await import(...) 한다 (Next.js 서버 렌더에서 SDK 가 실행되지 않는다).
// 토큰은 GET /api/agora/token, 에이전트 start·stop 은 POST·DELETE /api/agora/agent 다.
//
// 원본: 공식 quickstart components/LandingPage.tsx(토큰·RTM·에이전트 초대·정지), components/ConversationComponent.tsx
// (RTC join·마이크·툴킷 전사), lib/conversation.ts(문장부호 띄어쓰기 보정). React 훅 대신 SDK 를 직접 부른다.
//
//   start: connecting → 토큰 → RTC join·마이크 publish → RTM login·subscribe → 툴킷 전사 구독 → 에이전트 start → live
//   stop:  에이전트 stop → 툴킷 구독 해제 → RTM unsubscribe·logout → 마이크 정리 → RTC leave → ended

import type { TranscriptTurn, VoiceSession, VoiceStartOptions } from "@/lib/voice";

type RtcClient = import("agora-rtc-sdk-ng").IAgoraRTCClient;
type MicTrack = import("agora-rtc-sdk-ng").IMicrophoneAudioTrack;
type RtmClient = import("agora-rtm").RTMClient;
type RawTranscriptItem = { uid: string; text: string };

// start() 한 번이 만든 것. stop() 이나 취소된 start() 는 자기 Run 만 정리한다.
type Run = {
  onStatus: VoiceStartOptions["onStatus"];
  onTranscript: VoiceStartOptions["onTranscript"];
  channel: string;
  client: RtcClient | null;
  mic: MicTrack | null;
  rtm: RtmClient | null;
  releaseAi: (() => void) | null;
  agentId: string | null;
  agentUid: string | null;
  raw: RawTranscriptItem[];
  turns: TranscriptTurn[];
};

const CHANNEL_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_CLIENT_UID = 1_000_000;

export function createConvoAiVoice(): VoiceSession {
  // 세대 번호. start·stop 마다 올라간다. start 는 await 마다 자기 세대인지 확인한다.
  let gen = 0;
  let current: Run | null = null;
  let lastTurns: TranscriptTurn[] = [];

  // 툴킷이 준 전체 목록을 매번 TranscriptTurn[] 로 바꾼다. Mia 의 uid 를 받기 전에는 모아 두기만 하고,
  // 받은 뒤 한 번 다시 매긴다. 툴킷은 내 말을 uid "0" 으로 주므로 agentUid 가 아니면 user 다.
  function emit(run: Run) {
    if (!run.agentUid) return;
    run.turns = run.raw
      .map((item): TranscriptTurn => ({
        role: item.uid === run.agentUid ? "agent" : "user",
        text: normalizeTranscriptSpacing(typeof item.text === "string" ? item.text : ""),
      }))
      .filter((turn) => turn.text.length > 0);
    if (current === run) {
      lastTurns = run.turns;
      run.onTranscript?.(run.turns);
    }
  }

  return {
    async start({ unit, onStatus, onTranscript }) {
      const myGen = ++gen;
      const run: Run = {
        onStatus,
        onTranscript,
        channel: randomChannel(),
        client: null,
        mic: null,
        rtm: null,
        releaseAi: null,
        agentId: null,
        agentUid: null,
        raw: [],
        turns: [],
      };
      current = run;
      lastTurns = [];
      const cancelled = () => gen !== myGen;
      const abandon = () => void teardown(run);
      const uid = 1 + Math.floor(Math.random() * MAX_CLIENT_UID);

      onStatus("connecting");
      try {
        // 1. RTC+RTM 통합 토큰
        const tokenRes = await fetch(
          `/api/agora/token?channel=${encodeURIComponent(run.channel)}&uid=${uid}`,
        );
        const tokenData = (await tokenRes.json().catch(() => ({}))) as {
          appId?: string;
          token?: string;
          error?: string;
        };
        if (!tokenRes.ok || !tokenData.appId || !tokenData.token) {
          throw new Error(tokenData.error ?? "토큰을 받지 못했어요");
        }
        const { appId, token } = tokenData;
        if (cancelled()) return abandon();

        // 2. RTC: 내 마이크와 Mia 의 목소리
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (cancelled()) return abandon();
        // quickstart 가 publish 전에 켜는 모듈 설정 (전사 타이밍용 오디오 PTS)
        try {
          (AgoraRTC as typeof AgoraRTC & { setParameter?: (key: string, value: unknown) => void }).setParameter?.(
            "ENABLE_AUDIO_PTS",
            true,
          );
        } catch {
          // 설정을 못 해도 대화는 된다
        }
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        run.client = client;
        client.on("user-published", async (user, mediaType) => {
          if (mediaType !== "audio") return;
          try {
            await client.subscribe(user, "audio");
            user.audioTrack?.play();
          } catch {
            // 구독 실패는 소리가 안 나는 것으로 드러난다
          }
        });
        client.on("user-left", (user) => {
          if (!cancelled() && run.agentUid && String(user.uid) === run.agentUid) onStatus("agent-left");
        });
        await client.join(appId, run.channel, token, uid);
        if (cancelled()) return abandon();
        run.mic = await AgoraRTC.createMicrophoneAudioTrack();
        if (cancelled()) return abandon();
        await client.publish(run.mic);
        if (cancelled()) return abandon();

        // 3. RTM: 전사가 오는 길. 로그인 identity 는 토큰을 만든 String(uid) 와 같아야 한다
        const { default: AgoraRTM } = await import("agora-rtm");
        if (cancelled()) return abandon();
        const rtm: RtmClient = new AgoraRTM.RTM(appId, String(uid));
        run.rtm = rtm;
        await rtm.login({ token });
        if (cancelled()) return abandon();
        await rtm.subscribe(run.channel);
        if (cancelled()) return abandon();

        // 4. 툴킷: RTC·RTM 위에서 Mia 의 전사를 모아 준다. 이벤트는 subscribeMessage 전에 건다
        const { AgoraVoiceAI, AgoraVoiceAIEvents, TranscriptHelperMode } = await import(
          "agora-agent-client-toolkit"
        );
        if (cancelled()) return abandon();
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtm },
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: true,
        });
        run.releaseAi = () => {
          try {
            // 싱글턴이라 이 Run 이 만든 인스턴스일 때만 정리한다
            if (AgoraVoiceAI.getInstance() === ai) {
              ai.unsubscribe();
              ai.destroy();
            }
          } catch {
            // 이미 정리됐다
          }
        };
        if (cancelled()) return abandon();
        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (items) => {
          run.raw = [...items];
          emit(run);
        });
        ai.subscribeMessage(run.channel);

        // 5. 에이전트 start. 지시문은 서버가 unitId 로 만든다
        const agentRes = await fetch("/api/agora/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: run.channel, uid, unitId: unit.id }),
        });
        const agentData = (await agentRes.json().catch(() => ({}))) as {
          agentId?: string;
          agentUid?: string;
          error?: string;
        };
        if (!agentRes.ok || !agentData.agentId || !agentData.agentUid) {
          throw new Error(agentData.error ?? "Mia를 부르지 못했어요");
        }
        run.agentId = agentData.agentId;
        run.agentUid = String(agentData.agentUid);
        // 요청 중에 stop 됐으면 방금 만든 에이전트도 멈춘다
        if (cancelled()) return abandon();
        emit(run);
        onStatus("live");
      } catch (error) {
        await teardown(run);
        if (cancelled()) return;
        if (current === run) current = null;
        onStatus("error", failureReason(error));
      }
    },

    async stop() {
      const run = current;
      current = null;
      gen += 1;
      if (!run) return { transcript: lastTurns };
      await teardown(run);
      lastTurns = run.turns;
      run.onStatus("ended");
      return { transcript: run.turns };
    },
  };
}

// 만든 것만, 한 번씩 정리한다. 각 자원은 꺼낸 뒤 비워서 두 번 불려도 한 번만 정리된다. 실패는 삼킨다.
async function teardown(run: Run) {
  const agentId = run.agentId;
  run.agentId = null;
  if (agentId) {
    try {
      await fetch(`/api/agora/agent?agentId=${encodeURIComponent(agentId)}`, { method: "DELETE" });
    } catch {
      // 에이전트는 유휴 종료로도 나간다
    }
  }

  const releaseAi = run.releaseAi;
  run.releaseAi = null;
  releaseAi?.();

  const rtm = run.rtm;
  run.rtm = null;
  if (rtm) {
    try {
      await rtm.unsubscribe(run.channel);
    } catch {
      // 구독 전이었을 수 있다
    }
    try {
      await rtm.logout();
    } catch {
      // 로그인 전이었을 수 있다
    }
  }

  const mic = run.mic;
  run.mic = null;
  if (mic) {
    try {
      mic.stop();
      mic.close();
    } catch {
      // 이미 닫혔다
    }
  }

  const client = run.client;
  run.client = null;
  if (client) {
    try {
      await client.leave();
    } catch {
      // join 전이었을 수 있다
    }
  }
}

function randomChannel(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `talk-${Array.from(bytes, (b) => CHANNEL_CHARS[b % CHANNEL_CHARS.length]).join("")}`;
}

// 일부 ASR·TTS 가 문장부호 뒤 띄어쓰기를 붙여 보낸다 ("Hello.World" → "Hello. World"). quickstart 의 보정 그대로.
function normalizeTranscriptSpacing(text: string): string {
  return text
    .replace(/([.!?])([A-Za-z])/g, "$1 $2")
    .replace(/,([A-Za-z])/g, ", $1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function failureReason(error: unknown): string {
  const e = error as { code?: unknown; name?: unknown } | null;
  if (e?.code === "PERMISSION_DENIED" || e?.name === "NotAllowedError") return "마이크를 허용해 주세요";
  return error instanceof Error ? error.message : String(error);
}

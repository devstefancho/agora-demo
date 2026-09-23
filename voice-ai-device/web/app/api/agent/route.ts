// Mia 에이전트 시작·정지. 공식 ConvoAI Next.js quickstart 의 invite-agent·stop-conversation 을 옮겼다.
// POST { channel, uid, unitId? } → { agentId }   기기 채널에 Mia 를 넣는다
// DELETE ?agentId=                → { ok: true }   Mia 를 내보낸다
import { Agent, AgoraClient, Area, DeepgramSTT, MiniMaxTTS, OpenAI } from "agora-agents";
import { findUnit } from "@/content/units";
import { buildMiaInstructions } from "@/lib/mia";

const AGENT_UID = "1001";

type AgentParameters = NonNullable<ConstructorParameters<typeof Agent>[0]["parameters"]>;
// 기기(IoT SDK)와 같은 G.722 로 말한다. 공식 Device Kit 샘플 서버의 값이다.
// output_audio_codec 은 SDK 타입에 아직 없지만 SDK 가 REST 요청에 그대로 넘긴다.
const DEVICE_PARAMETERS = {
  output_audio_codec: "G722",
  data_channel: "rtm",
  enable_error_message: true,
} as const as AgentParameters;

function agoraClient(): AgoraClient {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) throw new Error("서버에 Agora App ID·Certificate 가 없어요");
  return new AgoraClient({ area: Area.US, appId, appCertificate });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { channel?: string; uid?: number; unitId?: number };
  const channel = body.channel ?? "";
  const uid = Number(body.uid);
  if (!channel.startsWith("speaker-") || !Number.isInteger(uid) || uid < 1 || uid > 2 ** 32 - 1) {
    return Response.json({ error: "channel 은 speaker- 로 시작하고, uid 는 1 이상의 정수여야 해요" }, { status: 400 });
  }
  const unit = findUnit(Number(body.unitId ?? 4));

  try {
    const agent = new Agent({
      client: agoraClient(),
      instructions: buildMiaInstructions(unit),
      greeting: unit.greeting,
      failureMessage: "Sorry, could you say that again?",
      maxHistory: 50,
      // 차례 판단은 quickstart 값 그대로
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: { mode: "vad", vad_config: { interrupt_duration_ms: 160, prefix_padding_ms: 300 } },
          end_of_speech: { mode: "vad", vad_config: { silence_duration_ms: 480 } },
        },
      },
      advancedFeatures: { enable_rtm: true },
      parameters: DEVICE_PARAMETERS,
    })
      .withStt(new DeepgramSTT({ model: "nova-3", language: "en" }))
      .withLlm(new OpenAI({ model: "gpt-4o-mini", greetingMessage: unit.greeting, maxHistory: 15 }))
      .withTts(new MiniMaxTTS({ model: "speech_2_6_turbo", voiceId: "English_captivating_female1" }));

    // Mia 는 기기 하나만 듣는다. 기기(IoT SDK)는 숫자 uid 로 들어오므로 문자열 uid 를 끈다
    const session = agent.createSession({
      channel,
      agentUid: AGENT_UID,
      remoteUids: [String(uid)],
      idleTimeout: 30,
      enableStringUid: false,
    });
    const agentId = await session.start();
    return Response.json({ agentId });
  } catch (error) {
    console.error("Mia 시작 실패:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Mia 를 부르지 못했어요" },
      { status: 500 },
    );
  }
}

// 이미 나가는 중이거나 없는 에이전트는 성공으로 본다 (quickstart 와 같은 판단)
function alreadyGone(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: number; body?: { detail?: string; reason?: string }; message?: string };
  if (e.statusCode === 404) return true;
  const detail = (e.body?.detail ?? e.message ?? "").toLowerCase();
  return e.body?.reason?.toLowerCase() === "invalidrequest" && detail.includes("already in the process of shutting down");
}

export async function DELETE(request: Request) {
  const agentId = new URL(request.url).searchParams.get("agentId");
  if (!agentId) return Response.json({ error: "agentId 가 필요해요" }, { status: 400 });

  try {
    await agoraClient().stopAgent(agentId);
    return Response.json({ ok: true });
  } catch (error) {
    if (alreadyGone(error)) return Response.json({ ok: true, state: "already-stopped" });
    console.error("Mia 정지 실패:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Mia 를 내보내지 못했어요" },
      { status: 500 },
    );
  }
}

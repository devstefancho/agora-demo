// Conversational AI 에이전트 start·stop. agora-agents 서버 SDK 는 app/api/agora/ 안에서만 쓴다.
//
//   POST   /api/agora/agent   body { channel, uid, unitId }  →  { agentId, agentUid }
//          unit = findUnit(unitId), instructions = buildMiaInstructions(unit), greeting = unit.greeting
//          파이프라인은 Agora 관리 모델(ASR·LLM·TTS, 벤더 키 없음, 영어). 전사는 RTM 으로 보낸다.
//   DELETE /api/agora/agent?agentId=<id>  →  { ok: true }. 이미 멈춘 에이전트도 성공으로 본다.
//
// 원본: 공식 quickstart app/api/invite-agent/route.ts (start), app/api/stop-conversation/route.ts (stop).
// 파이프라인·턴 감지·RTM 설정은 quickstart 값 그대로이고, 지시문과 첫 인사만 이 앱 것이다.

import { AgoraClient, Agent, Area, DeepgramSTT, ExpiresIn, MiniMaxTTS, OpenAI } from "agora-agents";
import { buildMiaInstructions, findUnit } from "@/content/units";

// Mia 의 RTC uid. 클라이언트 uid 범위(1 ~ 1,000,000) 밖이라 겹치지 않는다.
// 클라이언트는 이 값을 따로 갖지 않고 POST 응답의 agentUid 로 Mia 를 알아본다.
const AGENT_UID = "9000001";

const FAILURE_MESSAGE = "Please wait a moment.";

function agoraClient() {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) return null;
  // area: 유럽·아시아태평양 배포면 Area.EU·Area.AP (quickstart 기본값 Area.US)
  return new AgoraClient({ area: Area.US, appId, appCertificate });
}

const ENV_MISSING = { error: "agora project env write --template nextjs 를 실행하세요" };

export async function POST(request: Request) {
  let body: { channel?: unknown; uid?: unknown; unitId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 본문이 필요해요" }, { status: 400 });
  }
  const channel = typeof body.channel === "string" ? body.channel : "";
  const uid = Number(body.uid);
  if (!channel) {
    return Response.json({ error: "channel 이 필요해요" }, { status: 400 });
  }
  if (!Number.isInteger(uid) || uid < 1) {
    return Response.json({ error: "uid 는 정수여야 해요" }, { status: 400 });
  }

  const client = agoraClient();
  if (!client) return Response.json(ENV_MISSING, { status: 500 });

  const unit = findUnit(Number(body.unitId));

  try {
    const agent = new Agent({
      client,
      instructions: buildMiaInstructions(unit),
      greeting: unit.greeting,
      failureMessage: FAILURE_MESSAGE,
      maxHistory: 50,
      // 턴 감지: 사용자가 말을 시작하고 끝냈는지 VAD 로 본다 (quickstart 값)
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: "vad",
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: "vad",
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      // 브라우저 전사·상태 이벤트는 RTM 으로 온다: enable_rtm 과 data_channel "rtm" 둘 다 필요하다
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: "chorus",
        data_channel: "rtm",
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      // Agora 관리 모델: 벤더 키 없이 Agora 가 대신 부른다
      .withStt(new DeepgramSTT({ model: "nova-3", language: "en" }))
      .withLlm(
        new OpenAI({
          model: "gpt-4o-mini",
          greetingMessage: unit.greeting,
          failureMessage: FAILURE_MESSAGE,
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
      )
      .withTts(new MiniMaxTTS({ model: "speech_2_6_turbo", voiceId: "English_captivating_female1" }));

    // remoteUids: Mia 는 이 사용자의 소리만 듣는다
    const session = agent.createSession({
      channel,
      agentUid: AGENT_UID,
      remoteUids: [String(uid)],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();
    return Response.json({ agentId, agentUid: AGENT_UID });
  } catch (error) {
    console.error("에이전트 시작 실패:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Mia 를 부르지 못했어요" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const agentId = new URL(request.url).searchParams.get("agentId");
  if (!agentId) {
    return Response.json({ error: "agentId 가 필요해요" }, { status: 400 });
  }

  const client = agoraClient();
  if (!client) return Response.json(ENV_MISSING, { status: 500 });

  try {
    await client.stopAgent(agentId);
    return Response.json({ ok: true });
  } catch (error) {
    // 이미 멈췄거나 멈추는 중이면 성공으로 본다 (quickstart 의 stop route 판정)
    if (isAgentAlreadyStoppingOrStopped(error)) return Response.json({ ok: true });
    console.error("에이전트 정지 실패:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Mia 를 멈추지 못했어요" },
      { status: 500 },
    );
  }
}

function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: number; body?: { detail?: string; reason?: string }; message?: string };
  if (e.statusCode === 404) return true;
  const reason = e.body?.reason?.toLowerCase();
  const detail = e.body?.detail?.toLowerCase() ?? e.message?.toLowerCase() ?? "";
  return reason === "invalidrequest" && detail.includes("already in the process of shutting down");
}

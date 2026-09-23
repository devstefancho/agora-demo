// Conversational AI 에이전트 start·stop. 서버 SDK 는 이 파일에서만 쓴다.
// POST   { channel, uid, unitId } → { agentId, avatar }
// DELETE ?agentId=                → 에이전트 stop. 이미 멈춘 것(404)은 성공.

import {
  Agent,
  AgoraClient,
  AnamAvatar,
  Area,
  DeepgramSTT,
  ExpiresIn,
  LiveAvatarAvatar,
  OpenAI,
  OpenAITTS,
} from "agora-agents";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { buildMiaInstructions, findUnit } from "@/content/units";

const AGENT_UID = "1000001";
const AVATAR_UID = "1000002";
const UID_MAX = 2 ** 32 - 1;

// 아바타가 있을 때만. REST interruption.enable=false, disabled_config.strategy=append 와 같다.
const AVATAR_INTERRUPTION = {
  enable: false,
  disabled_config: { strategy: "append" as const },
};

export async function POST(request: Request) {
  const secrets: string[] = [];
  try {
    const body = await readJson(request);
    if (!body) return Response.json({ error: "JSON 본문이 필요해요" }, { status: 400 });

    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    const uid = body.uid;
    const unitId = body.unitId;
    if (!channel || !isUid(uid) || typeof unitId !== "number" || !Number.isInteger(unitId)) {
      return Response.json({ error: "channel, uid, unitId 가 필요해요" }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      return Response.json({ error: "Agora 자격 증명이 없습니다" }, { status: 500 });
    }
    secrets.push(appCertificate);

    const unit = findUnit(unitId);
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // 전사는 RTM 으로 브라우저에 간다. quickstart invite-agent 와 같은 플래그.
    let agent = new Agent({
      client,
      instructions: buildMiaInstructions(unit),
      greeting: unit.greeting,
      failureMessage: "Please wait a moment.",
      maxHistory: 50,
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
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: "chorus",
        data_channel: "rtm",
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(new DeepgramSTT({ model: "nova-3", language: "en" }))
      .withLlm(
        new OpenAI({
          model: "gpt-4o-mini",
          greetingMessage: unit.greeting,
          failureMessage: "Please wait a moment.",
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
      )
      .withTts(new OpenAITTS({ voice: "nova" }));

    const vendor = (process.env.AVATAR_VENDOR ?? "").trim();
    const apiKey = (process.env.AVATAR_API_KEY ?? "").trim();
    const avatarId = (process.env.AVATAR_ID ?? "").trim();
    if (apiKey) secrets.push(apiKey);

    let avatar = false;
    if (vendor === "liveavatar" || vendor === "anam") {
      if (!apiKey) {
        return Response.json({ error: "아바타 API 키가 없습니다" }, { status: 500 });
      }
      const id = avatarId ? { avatarId } : {};
      if (vendor === "liveavatar") {
        // OpenAITTS 는 24kHz 고정이라 LiveAvatar 가 요구하는 샘플레이트와 같다.
        agent = agent
          .withAvatar(
            new LiveAvatarAvatar({
              apiKey,
              quality: "high",
              agoraUid: AVATAR_UID,
              ...id,
            }),
          )
          .withInterruption(AVATAR_INTERRUPTION);
      } else {
        // Anam 은 샘플레이트를 고정하지 않는다. OpenAI TTS(24kHz) 와 붙이려면 타입만 넓힌다.
        // Agora 문서의 Anam 설정은 agora_uid·agora_token 이 필수인데 SDK 는 Anam 토큰을 만들지 않으므로 여기서 넣는다.
        const avatarToken = RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate,
          channel,
          Number(AVATAR_UID),
          RtcRole.PUBLISHER,
          3600,
          3600,
        );
        secrets.push(avatarToken);
        const loose = agent as Agent<number>;
        agent = loose
          .withAvatar(
            new AnamAvatar({
              apiKey,
              ...id,
              additionalParams: { agora_uid: AVATAR_UID, agora_token: avatarToken, sample_rate: 24000 },
            }),
          )
          .withInterruption(AVATAR_INTERRUPTION) as Agent<24000>;
      }
      avatar = true;
    } else if (vendor !== "") {
      return Response.json({ error: "지원하지 않는 아바타 벤더입니다" }, { status: 500 });
    }

    const session = agent.createSession({
      channel,
      agentUid: AGENT_UID,
      remoteUids: [String(uid)],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
    });
    const agentId = await session.start();
    return Response.json({ agentId, avatar });
  } catch (error) {
    console.error("에이전트 start 실패:", redact(errorText(error), secrets));
    return Response.json({ error: redact(errorText(error), secrets) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const agentId = new URL(request.url).searchParams.get("agentId")?.trim() ?? "";
  if (!agentId) {
    return Response.json({ error: "agentId 가 필요해요" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return Response.json({ error: "Agora 자격 증명이 없습니다" }, { status: 500 });
  }

  try {
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });
    await client.stopAgent(agentId);
    return Response.json({ ok: true });
  } catch (error) {
    if (isAlreadyStopped(error)) return Response.json({ ok: true });
    const message = redact(errorText(error), [appCertificate]);
    console.error("에이전트 stop 실패:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isUid(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= UID_MAX;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "에이전트를 시작하지 못했어요";
}

function redact(message: string, secrets: string[]): string {
  let text = message;
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("[secret]");
  }
  return text;
}

function isAlreadyStopped(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as {
    statusCode?: number;
    body?: { detail?: string; reason?: string };
    message?: string;
  };
  if (maybe.statusCode === 404) return true;
  const reason = maybe.body?.reason?.toLowerCase();
  const detail = maybe.body?.detail?.toLowerCase() ?? maybe.message?.toLowerCase() ?? "";
  return reason === "invalidrequest" && detail.includes("already in the process of shutting down");
}

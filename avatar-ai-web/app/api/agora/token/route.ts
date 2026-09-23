// 학습자용 RTC+RTM 토큰. App Certificate 는 이 파일에서만 읽는다.
// GET /api/agora/token?channel=<채널>&uid=<숫자>&rtm=1 → { appId, channel, uid, token }

import { RtcRole, RtcTokenBuilder } from "agora-token";

const TOKEN_EXPIRE_SECONDS = 3600;
const UID_MAX = 2 ** 32 - 1;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel")?.trim() ?? "";
  const uid = parseUid(url.searchParams.get("uid"));
  if (!channel || uid === null) {
    return Response.json(
      { error: "channel 과 1 이상 4294967295 이하의 uid 가 필요해요" },
      { status: 400 },
    );
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return Response.json({ error: "Agora 자격 증명이 없습니다" }, { status: 500 });
  }

  try {
    const token = RtcTokenBuilder.buildTokenWithRtm(
      appId,
      appCertificate,
      channel,
      String(uid),
      RtcRole.PUBLISHER,
      TOKEN_EXPIRE_SECONDS,
      TOKEN_EXPIRE_SECONDS,
    );
    return Response.json({ appId, channel, uid, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "토큰을 만들지 못했어요";
    return Response.json({ error: redact(message, [appCertificate]) }, { status: 500 });
  }
}

function parseUid(raw: string | null): number | null {
  if (!raw || !/^[0-9]+$/.test(raw)) return null;
  const uid = Number(raw);
  if (!Number.isSafeInteger(uid) || uid < 1 || uid > UID_MAX) return null;
  return uid;
}

function redact(message: string, secrets: string[]): string {
  let text = message;
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("[secret]");
  }
  return text;
}

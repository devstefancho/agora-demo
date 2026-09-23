// 기기 토큰 발급. GET ?channel=speaker-<이름>&uid=<기기 uid> → { appId, channel, uid, token }
// 기기는 RTM 을 쓰지 않으므로 RTC 토큰이다. App Certificate 는 이 서버에만 있다.
import { RtcRole, RtcTokenBuilder } from "agora-token";

const EXPIRE_SECONDS = 24 * 60 * 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") ?? "";
  const uid = Number(searchParams.get("uid"));

  if (!channel.startsWith("speaker-") || !Number.isInteger(uid) || uid < 1 || uid > 2 ** 32 - 1) {
    return Response.json({ error: "channel 은 speaker- 로 시작하고, uid 는 1 이상의 정수여야 해요" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return Response.json({ error: "서버에 Agora App ID·Certificate 가 없어요" }, { status: 500 });
  }

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    RtcRole.PUBLISHER,
    EXPIRE_SECONDS,
    EXPIRE_SECONDS,
  );
  return Response.json({ appId, channel, uid, token });
}

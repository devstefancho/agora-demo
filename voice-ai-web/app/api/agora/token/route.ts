// 토큰 발급. App Certificate 를 읽는 자리다. 클라이언트로 나가지 않는다. agora-token 은 app/api/agora/ 안에서만 쓴다.
//
//   GET /api/agora/token?channel=<채널>&uid=<정수>  →  { appId, channel, uid, token }
//   token 은 RTC+RTM 통합 토큰이다. 브라우저는 같은 토큰으로 RTC 채널에 들어가고 RTM 에 로그인한다.
//
// 원본: 공식 quickstart app/api/generate-agora-token/route.ts (buildTokenWithRtm).
// RTC 는 숫자 uid 로 join 하고 RTM 은 String(uid) 로 login 한다. agora-token 의 ServiceRtc 는 uid 를 문자열로 직렬화하므로
// 숫자 uid 와 같은 숫자 문자열로 만든 토큰이 같다.

import { RtcRole, RtcTokenBuilder } from "agora-token";

// 초 단위, 지금부터 (agora-token 의 tokenExpire·privilegeExpire 는 "now 로부터 지난 초")
const EXPIRE_SECONDS = 3600;
const MAX_UID = 2 ** 32 - 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");
  const uidStr = searchParams.get("uid") ?? "";
  const uid = /^\d+$/.test(uidStr) ? Number(uidStr) : Number.NaN;

  if (!channel) {
    return Response.json({ error: "channel 이 필요해요" }, { status: 400 });
  }
  if (!Number.isInteger(uid) || uid < 1 || uid > MAX_UID) {
    return Response.json({ error: "uid 는 1 ~ 2^32-1 정수여야 해요" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return Response.json(
      { error: "agora project env write --template nextjs 를 실행하세요" },
      { status: 500 },
    );
  }

  try {
    const token = RtcTokenBuilder.buildTokenWithRtm(
      appId,
      appCertificate,
      channel,
      String(uid),
      RtcRole.PUBLISHER,
      EXPIRE_SECONDS,
      EXPIRE_SECONDS,
    );
    return Response.json({ appId, channel, uid, token });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "토큰을 만들지 못했어요" },
      { status: 500 },
    );
  }
}

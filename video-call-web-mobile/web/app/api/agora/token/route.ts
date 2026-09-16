// 토큰 발급. App Certificate(NEXT_AGORA_APP_CERTIFICATE)를 읽는 유일한 자리다. 클라이언트로 나가지 않는다.
//
//   GET /api/agora/token?channel=<채널>&uid=<정수>[&rtm=1]  →  { appId, channel, uid, token }
//   기본은 RTC 토큰(buildTokenWithUid, PUBLISHER, 3600초). rtm=1 이면 RTC+RTM 통합 토큰(buildTokenWithRtm, account 는 String(uid)).
//   통합 토큰의 RTC 서비스는 buildTokenWithUid 와 같은 페이로드다. agora-token 의 buildTokenWithUid 는 같은 uid 로
//   buildTokenWithUserAccount 를 부르고, ServiceRtc 생성자가 uid 를 문자열로 담는다(uid === 0 ? '' : `${uid}`).
//   그래서 RTC 는 숫자 uid 로 join 하고 RTM 은 String(uid) 로 login 한다. 토큰의 채널·uid 는 join 값과 같아야 한다.

import { RtcRole, RtcTokenBuilder } from "agora-token";

const EXPIRE_SECONDS = 3600;
const MAX_UID = 4294967295; // 2^32 - 1

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const channel = params.get("channel");
  const uid = Number(params.get("uid"));
  const withRtm = params.get("rtm") === "1";

  if (!channel) {
    return Response.json({ error: "channel 이 필요해요" }, { status: 400 });
  }
  if (!Number.isInteger(uid) || uid < 1 || uid > MAX_UID) {
    return Response.json({ error: "uid 는 1 이상 2^32-1 이하의 정수여야 해요" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const certificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !certificate) {
    return Response.json(
      { error: "서버에 Agora 자격 증명이 없어요. agora project env write --template nextjs 를 실행하세요" },
      { status: 500 },
    );
  }

  const token = withRtm
    ? RtcTokenBuilder.buildTokenWithRtm(
        appId,
        certificate,
        channel,
        String(uid),
        RtcRole.PUBLISHER,
        EXPIRE_SECONDS,
        EXPIRE_SECONDS,
      )
    : RtcTokenBuilder.buildTokenWithUid(
        appId,
        certificate,
        channel,
        uid,
        RtcRole.PUBLISHER,
        EXPIRE_SECONDS,
        EXPIRE_SECONDS,
      );

  return Response.json({ appId, channel, uid, token });
}

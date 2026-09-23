// 껍데기: 통합 단계가 이 파일을 채운다.
//
// 토큰 발급. App Certificate 는 이 서버 코드에서만 읽는다.
//   GET /api/agora/token?channel=<채널>&uid=<숫자>&rtm=1  →  { appId, channel, uid, token }  (RTC+RTM 통합 토큰)

export async function GET() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

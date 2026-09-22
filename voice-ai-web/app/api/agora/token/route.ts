// 껍데기: 통합 단계가 이 파일을 채운다.
//
// 토큰 발급. App Certificate 를 읽는 자리다. 클라이언트로 나가지 않는다. agora-token 은 app/api/agora/ 안에서만 쓴다.
//
//   GET /api/agora/token?channel=<채널>&uid=<정수>  →  { appId, channel, uid, token }
//   token 은 RTC+RTM 통합 토큰이다. 브라우저는 같은 토큰으로 RTC 채널에 들어가고 RTM 에 로그인한다.

export async function GET() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

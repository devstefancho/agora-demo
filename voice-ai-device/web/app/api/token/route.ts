// 껍데기: 통합 단계가 이 파일을 채운다.
// 기기 토큰 발급. GET ?channel=speaker-<이름>&uid=<기기 uid> → { appId, channel, uid, token }

export async function GET() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

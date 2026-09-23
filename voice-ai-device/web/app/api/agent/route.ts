// 껍데기: 통합 단계가 이 파일을 채운다.
// Mia 에이전트 시작·정지.
// POST { channel, uid, unitId? } → { agentId }   기기 채널에 Mia 를 넣는다
// DELETE ?agentId=                → { ok: true }   Mia 를 내보낸다

export async function POST() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

export async function DELETE() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

// 껍데기: 통합 단계가 이 파일을 채운다.
//
// Conversational AI 에이전트 start·stop. 서버 SDK(agora-agents)는 이 파일 안에서만 쓴다.
//   POST   /api/agora/agent   body { channel, uid, unitId }  →  { agentId, avatar: true | false }
//          unit = findUnit(unitId), instructions = buildMiaInstructions(unit), greeting = unit.greeting
//          env 의 AVATAR_VENDOR·AVATAR_API_KEY 가 있으면 아바타를 붙이고, 없으면 목소리로만 대화한다.
//   DELETE /api/agora/agent?agentId=<id>  →  에이전트 stop (이미 멈춘 것은 성공으로 본다)

export async function POST() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

export async function DELETE() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

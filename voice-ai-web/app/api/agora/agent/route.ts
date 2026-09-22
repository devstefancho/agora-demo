// 껍데기: 통합 단계가 이 파일을 채운다.
//
// Conversational AI 에이전트 start·stop. agora-agents 서버 SDK 는 app/api/agora/ 안에서만 쓴다.
//
//   POST   /api/agora/agent   body { channel, uid, unitId }  →  { agentId, agentUid }
//          unit = findUnit(unitId), instructions = buildMiaInstructions(unit), greeting = unit.greeting
//          파이프라인은 Agora 관리 모델(ASR·LLM·TTS, 벤더 키 없음, 영어). 전사는 RTM 으로 보낸다.
//   DELETE /api/agora/agent?agentId=<id>  →  { ok: true }. 이미 멈춘 에이전트도 성공으로 본다.

export async function POST() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

export async function DELETE() {
  return Response.json({ error: "아직 껍데기" }, { status: 501 });
}

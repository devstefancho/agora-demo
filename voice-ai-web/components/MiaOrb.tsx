"use client";

import type { VoiceStatus } from "@/lib/voice";

const STATUS_TEXT: Record<VoiceStatus, string> = {
  idle: "준비 중",
  connecting: "Mia를 부르는 중이에요…",
  live: "Mia와 대화 중 · 편하게 말해보세요",
  "agent-left": "Mia가 자리를 비웠어요",
  ended: "대화가 끝났어요",
  unavailable: "Mia에게 아직 목소리가 없어요",
  error: "연결에 문제가 생겼어요",
};

export default function MiaOrb({ status, detail }: { status: VoiceStatus; detail?: string }) {
  const text = detail ?? STATUS_TEXT[status];
  const isProblem = status === "error";
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="orb" data-state={status} aria-hidden />
      <div className="text-center">
        <div className="font-display text-2xl">Mia</div>
        <div
          className={`mt-1 text-[12px] ${isProblem ? "text-warn" : "text-muted"}`}
          role="status"
          aria-live="polite"
        >
          {text}
        </div>
      </div>
    </div>
  );
}

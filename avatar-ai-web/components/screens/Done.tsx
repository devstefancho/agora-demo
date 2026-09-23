"use client";

import { useState } from "react";
import { detectUsedExpressions, type Unit } from "@/content/units";
import { formatClock } from "@/lib/storage";
import type { TalkResult } from "@/components/screens/Talk";
import { Button, Card, Chip, Label, Shell } from "@/components/ui";

export default function Done({
  unit,
  result,
  streakDays,
  onHome,
}: {
  unit: Unit;
  result: TalkResult;
  streakDays: number;
  onHome: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const userText = result.transcript
    .filter((t) => t.role === "user")
    .map((t) => t.text)
    .join(" ");
  const used = detectUsedExpressions(unit, userText);

  return (
    <Shell>
      <div className="text-center pt-4">
        <div className="font-display text-[42px] leading-none">
          {result.connected ? "세션 완료" : "아직 대화 전"}
        </div>
        <p className="mt-3 text-[12px] text-muted">
          {result.connected
            ? streakDays > 1
              ? `${streakDays}일 연속 · 오늘도 5분 말했어요`
              : "오늘도 5분 말했어요"
            : "Mia와 연결되기 전에 끝났어요. 다시 시작해 보세요"}
        </p>
      </div>

      <Card className="mt-2">
        <Label>오늘의 표현 사용 · 대화 기록 기준</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {unit.expressions.map((e, i) => (
            <Chip key={e.en} done={used.has(i)}>
              {e.en}
            </Chip>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="사용한 표현" value={`${used.size}/${unit.expressions.length}`} />
          <Metric label="대화 시간" value={formatClock(result.durationSec)} />
          <Metric label="힌트" value={`${result.hints}번`} />
        </div>
      </Card>

      <Card>
        <button
          className="w-full text-left text-[12px] text-muted hover:text-ink cursor-pointer"
          onClick={() => setShowTranscript((v) => !v)}
          aria-expanded={showTranscript}
        >
          {showTranscript ? "▾" : "▸"} 대화 기록 보기
        </button>
        {showTranscript ? (
          <div className="mt-3 flex flex-col gap-2">
            {result.transcript.length === 0 ? (
              <p className="text-[12px] text-muted">대화 기록이 없어요.</p>
            ) : (
              result.transcript.map((t, i) => (
                <div key={i} className="text-[12px] border-b border-dashed border-line pb-2">
                  <div className="text-[12px] text-muted">{t.role === "user" ? "나" : "Mia"}</div>
                  {t.text}
                </div>
              ))
            )}
          </div>
        ) : null}
      </Card>

      <div className="mt-auto pt-4">
        <Button onClick={onHome}>홈으로</Button>
      </div>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="font-display text-[24px] tabular">{value}</div>
    </div>
  );
}

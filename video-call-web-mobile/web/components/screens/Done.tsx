"use client";

import type { Unit } from "@/content/units";
import { formatClock } from "@/lib/storage";
import type { CallResult } from "@/components/screens/Call";
import { Button, Card, Label, Shell } from "@/components/ui";

export default function Done({
  unit,
  result,
  streakDays,
  onHome,
}: {
  unit: Unit;
  result: CallResult;
  streakDays: number;
  onHome: () => void;
}) {
  return (
    <Shell>
      <div className="text-center pt-4">
        <div className="font-display text-[42px] leading-none">
          {result.connected ? "세션 완료" : "아직 통화 전"}
        </div>
        <p className="mt-3 text-[12px] text-muted">
          {result.connected
            ? streakDays > 1
              ? `${streakDays}일 연속 · 오늘도 5분 말했어요`
              : "오늘도 5분 말했어요"
            : "파트너와 연결되기 전에 끝났어요. 다시 통화해 보세요"}
        </p>
      </div>

      <Card className="mt-2">
        <Label>오늘의 표현</Label>
        <ul className="mt-1 flex flex-col gap-1.5">
          {unit.expressions.map((e) => (
            <li key={e.en} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-display text-[18px] text-ink">{e.en}</span>
              <span className="text-[12px] text-muted">{e.ko}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="통화 시간" value={formatClock(result.durationSec)} />
          <Metric label="힌트" value={`${result.hints}번`} />
        </div>
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

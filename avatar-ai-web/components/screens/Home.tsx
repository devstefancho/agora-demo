"use client";

import { UNITS, type Unit } from "@/content/units";
import type { SessionRecord } from "@/lib/storage";
import { streak } from "@/lib/storage";
import { Button, Card, Label, Shell } from "@/components/ui";

export default function Home({
  unit,
  sessions,
  onPickUnit,
  onStart,
}: {
  unit: Unit;
  sessions: SessionRecord[];
  onPickUnit: (id: number) => void;
  onStart: () => void;
}) {
  const days = streak(sessions);
  const last = sessions[sessions.length - 1];

  return (
    <Shell>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[42px] leading-none">영어 말하기</h1>
          <p className="mt-2 text-[12px] text-muted">
            {days > 0 ? `${days}일째 이어가고 있어요` : "오늘 5분, 영어로 말해 보세요"}
          </p>
        </div>
        <span className="bg-ink text-paper px-3 py-1 text-[12px] font-bold">
          L1 · 5분
        </span>
      </header>

      <Card strong className="mt-2">
        <Label>오늘의 세션 · 기본 회화 {unit.id}/10</Label>
        <h2 className="text-[30px] font-bold leading-tight">{unit.title}</h2>
        <p className="mt-1 text-[12px] text-muted">
          5분 대화 · 오늘의 표현 {unit.expressions.length}개
        </p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {unit.expressions.map((e) => (
            <li key={e.en} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-display text-[18px] text-ink">{e.en}</span>
              <span className="text-[12px] text-muted">{e.ko}</span>
            </li>
          ))}
        </ul>
        <Button size="lg" className="mt-6" onClick={onStart}>
          Mia와 대화
        </Button>
      </Card>

      <Card>
        <Label>다른 주제로 연습하기</Label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {UNITS.map((u) => {
            const active = u.id === unit.id;
            return (
              <button
                key={u.id}
                onClick={() => onPickUnit(u.id)}
                aria-pressed={active}
                className={`text-left px-3 py-2.5 text-[12px] transition cursor-pointer border ${
                  active
                    ? "border-ink bg-ink text-paper font-bold"
                    : "border-transparent bg-paper-deep/60 hover:bg-paper-deep text-ink-soft"
                }`}
              >
                <span className="tabular opacity-60 mr-1.5">{String(u.id).padStart(2, "0")}</span>
                {u.title}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="완료한 세션" value={`${sessions.length}회`} />
        <Stat label="연속" value={`${days}일`} />
        <Stat label="최근 힌트" value={last ? `${last.hints}번` : "·"} />
      </div>

      <p className="mt-auto pt-6 text-center text-[12px] text-muted">
        기본 회화 트랙 10유닛
      </p>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border-2 border-line-strong px-4 py-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="font-display text-[24px] tabular">{value}</div>
    </div>
  );
}

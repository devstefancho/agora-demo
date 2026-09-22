"use client";

import { useState } from "react";
import type { Unit } from "@/content/units";
import { speak } from "@/lib/speech";
import { Button, Card, Shell } from "@/components/ui";

export default function Warmup({
  unit,
  onDone,
  onBack,
}: {
  unit: Unit;
  onDone: () => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const total = unit.expressions.length;
  const e = unit.expressions[index];
  const isLast = index === total - 1;

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="text-[12px] text-muted hover:text-ink cursor-pointer">
          ← 홈
        </button>
        <div className="text-[12px] font-bold">워밍업 · 오늘의 표현</div>
        <div className="flex gap-1.5" aria-label={`${index + 1} / ${total}`}>
          {unit.expressions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 transition ${i <= index ? "bg-ink" : "bg-line"}`}
            />
          ))}
        </div>
      </header>

      <Card strong className="mt-4 text-center py-12 screen-enter" key={index}>
        <div className="text-[12px] text-muted uppercase">
          {index + 1} / {total}
        </div>
        <div className="font-display text-[36px] md:text-[42px] leading-tight mt-3 text-balance">
          {e.en}
        </div>
        <div className="mt-3 text-[18px] text-ink-soft">{e.ko}</div>
        <div className="mt-2 font-mono text-[12px] text-muted">{e.ipa}</div>
        <div className="mt-8 flex justify-center">
          <Button variant="ghost" className="w-auto px-6" onClick={() => speak(e.en)}>
            🔊 발음 듣기
          </Button>
        </div>
        <p className="mt-5 text-[12px] text-muted">듣고 나서 소리 내어 두 번 읽어보세요</p>
      </Card>

      <div className="flex gap-3">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          이전
        </Button>
        <Button onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}>
          {isLast ? "대화 시작" : "다음"}
        </Button>
      </div>
      <Button variant="quiet" onClick={onDone}>
        건너뛰고 바로 대화 시작
      </Button>
    </Shell>
  );
}

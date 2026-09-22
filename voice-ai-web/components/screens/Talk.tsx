"use client";

import { useEffect, useRef, useState } from "react";
import { SESSION_SECONDS, detectUsedExpressions, type Unit } from "@/content/units";
import { createVoiceSession, type TranscriptTurn, type VoiceStatus } from "@/lib/voice";
import { formatClock } from "@/lib/storage";
import { speak, stopSpeaking } from "@/lib/speech";
import MiaOrb from "@/components/MiaOrb";
import { Button, Card, Chip, Label, Shell } from "@/components/ui";

export type TalkResult = {
  transcript: TranscriptTurn[];
  hints: number;
  durationSec: number;
  connected: boolean;
  reason?: string;
};

export default function Talk({ unit, onEnd }: { unit: Unit; onEnd: (r: TalkResult) => void }) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [hint, setHint] = useState<number | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);

  const session = useRef(createVoiceSession());
  const startedAt = useRef<number | null>(null);
  const hintCursor = useRef(0);
  const ending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const s = session.current;
    s.start({
      unit,
      onStatus: (next, d) => {
        if (cancelled) return;
        setStatus(next);
        setDetail(d);
        if (next === "live" && !startedAt.current) startedAt.current = Date.now();
      },
      onTranscript: (turns) => {
        if (!cancelled) setTranscript(turns);
      },
    }).catch((err: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setDetail(err instanceof Error ? err.message : String(err));
    });
    // 정리에서 stop() 을 부른다. 개발 모드는 effect 를 두 번 실행하므로, 첫 start 를 멈추지 않으면 Mia 가 둘 들어온다.
    return () => {
      cancelled = true;
      void s.stop();
    };
  }, [unit]);

  // 타이머는 Mia가 살아 있을 때만 흐른다.
  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (remaining <= 0) void finish("시간이 다 됐어요");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  async function finish(reason?: string) {
    if (ending.current) return;
    ending.current = true;
    stopSpeaking();
    const durationSec = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    let finalTranscript = transcript;
    try {
      const out = await session.current.stop();
      if (out.transcript.length) finalTranscript = out.transcript;
    } catch {
      // 종료 실패는 결과 화면에서 기록 없음으로 드러난다
    }
    onEnd({
      transcript: finalTranscript,
      hints: hintCount,
      durationSec,
      connected: startedAt.current !== null,
      reason,
    });
  }

  function openHint() {
    const i = hintCursor.current % unit.expressions.length;
    hintCursor.current += 1;
    setHintCount((c) => c + 1);
    setHint(i);
  }

  const warn = remaining <= 30;
  const lastAgent = [...transcript].reverse().find((t) => t.role === "agent")?.text;
  const lastUser = [...transcript].reverse().find((t) => t.role === "user")?.text;
  const used = detectUsedExpressions(
    unit,
    transcript.filter((t) => t.role === "user").map((t) => t.text).join(" "),
  );
  const showCaptions = status === "connecting" || status === "live" || transcript.length > 0;

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <div className="text-[12px] text-muted">{unit.title}</div>
        <div
          className={`font-display tabular text-[36px] leading-none ${warn ? "text-warn" : "text-ink"}`}
          aria-label="남은 시간"
        >
          {formatClock(Math.max(remaining, 0))}
        </div>
      </header>

      <MiaOrb status={status} detail={detail} />

      {status === "unavailable" ? (
        <Card className="text-[12px] text-ink-soft leading-relaxed">
          화면은 다 있는데 목소리가 없어요. Mia의 목소리는{" "}
          <code className="font-mono text-[12px] bg-paper-deep px-1.5 py-0.5">
            lib/agora/convoai.ts
          </code>
          의 <code className="font-mono text-[12px]">createConvoAiVoice()</code> 한 곳에서
          들어옵니다.
        </Card>
      ) : null}

      {showCaptions ? (
        <Card className="py-4">
          <CaptionLine who="Mia" text={lastAgent} />
          <CaptionLine who="나" text={lastUser} />
        </Card>
      ) : null}

      <Card>
        <Label>오늘의 표현 · 대화에서 써보세요</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {unit.expressions.map((e, i) => (
            <Chip key={e.en} done={used.has(i)}>
              {e.en}
            </Chip>
          ))}
        </div>
      </Card>

      <Button variant="accent" size="lg" onClick={openHint}>
        💡 단어가 안 떠올라요
      </Button>

      <div className="mt-auto pt-4">
        <Button variant="ghost" onClick={() => finish()}>
          대화 끝내기
        </Button>
      </div>

      {hint !== null ? (
        <HintSheet
          en={unit.expressions[hint].en}
          ko={unit.expressions[hint].ko}
          ipa={unit.expressions[hint].ipa}
          onClose={() => setHint(null)}
        />
      ) : null}
    </Shell>
  );
}

function CaptionLine({ who, text }: { who: string; text?: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[18px] leading-snug">
      <span className="w-8 shrink-0 text-[12px] text-muted pt-0.5">{who}</span>
      <span className={text ? "text-ink" : "text-muted"}>{text ?? "…"}</span>
    </div>
  );
}

function HintSheet({
  en,
  ko,
  ipa,
  onClose,
}: {
  en: string;
  ko: string;
  ipa: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-6 screen-enter"
      role="dialog"
      aria-modal="true"
      aria-label="힌트"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-card p-8 text-center border-2 border-ink shadow-px"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[12px] text-muted uppercase">
          이렇게 말해보세요 · 소리 내어 읽으면 돼요
        </div>
        <div className="font-display text-[36px] leading-tight mt-4 text-balance">{en}</div>
        <div className="mt-2 text-[18px] text-ink-soft">{ko}</div>
        <div className="mt-1 font-mono text-[12px] text-muted">{ipa}</div>
        <div className="mt-7 flex gap-3">
          <Button variant="ghost" onClick={() => speak(en)}>
            🔊 듣기
          </Button>
          <Button onClick={onClose}>읽었어요</Button>
        </div>
        <p className="mt-4 text-[12px] text-muted">Mia는 기다리고 있어요</p>
      </div>
    </div>
  );
}

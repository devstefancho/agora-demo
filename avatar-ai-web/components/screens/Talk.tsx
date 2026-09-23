"use client";

import { useEffect, useRef, useState } from "react";
import { SESSION_SECONDS, detectUsedExpressions, type Unit } from "@/content/units";
import { createTalkSession, type TalkStatus, type TranscriptTurn } from "@/lib/talk";
import { formatClock } from "@/lib/storage";
import { speak, stopSpeaking } from "@/lib/speech";
import { Button, Card, Label } from "@/components/ui";
import { EndButton, MicIcon, MiaOrb, NameTag, StatusPill, ToolButton } from "@/components/TalkStage";

// AI 아바타와 5분 대화. 화상 튜터 구도: 무대(Mia 얼굴 크게, 아래 툴바) + 오른쪽 패널(자막·표현·힌트).
// 얼굴이 오기 전이나 아바타 없이 목소리로만 대화할 때는 무대 가운데에 Mia 구슬이 뜬다.

const STATUS_TEXT: Record<TalkStatus, string> = {
  idle: "준비 중",
  connecting: "Mia를 부르는 중이에요…",
  live: "Mia와 대화 중 · 편하게 말해보세요",
  "agent-left": "Mia가 자리를 비웠어요",
  ended: "대화가 끝났어요",
  unavailable: "Mia가 아직 연결되지 않았어요",
  error: "연결에 문제가 생겼어요",
};

// 대화가 끝났을 때 완료 화면으로 넘기는 결과. connected 는 Mia 와 한 번이라도 대화가 시작됐는가.
export type TalkResult = {
  transcript: TranscriptTurn[];
  hints: number;
  durationSec: number;
  connected: boolean;
  reason?: string;
};

export default function Talk({ unit, onEnd }: { unit: Unit; onEnd: (r: TalkResult) => void }) {
  const [status, setStatus] = useState<TalkStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [hint, setHint] = useState<number | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [mic, setMic] = useState(true);
  const [avatar, setAvatar] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);

  const session = useRef(createTalkSession());
  const avatarRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const hintCursor = useRef(0);
  const ending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const s = session.current;
    s.start({
      unit,
      avatarContainer: avatarRef.current!,
      onStatus: (next, d) => {
        if (cancelled) return;
        setStatus(next);
        setDetail(d);
        if (next === "live" && !startedAt.current) startedAt.current = Date.now();
      },
      onTranscript: (turns) => {
        if (!cancelled) setTranscript(turns);
      },
      onAvatar: (on) => {
        if (!cancelled) setAvatar(on);
      },
    }).catch((err: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setDetail(err instanceof Error ? err.message : String(err));
    });
    return () => {
      // 화면을 떠나거나(React 개발 모드에서는 effect 가 두 번 돌아) 세션이 바뀌면 진행 중인 대화를 정리한다.
      cancelled = true;
      void s.stop();
    };
  }, [unit]);

  // 타이머는 Mia 와 대화 중일 때만 흐른다.
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

  async function toggleMic() {
    const next = !mic;
    setMic(next);
    await session.current.setMic(next);
  }

  const warn = remaining <= 30;
  const isProblem = status === "error";
  const lastAgent = [...transcript].reverse().find((t) => t.role === "agent")?.text;
  const lastUser = [...transcript].reverse().find((t) => t.role === "user")?.text;
  const used = detectUsedExpressions(
    unit,
    transcript.filter((t) => t.role === "user").map((t) => t.text).join(" "),
  );

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto px-5 md:px-7 py-6 flex flex-col gap-5 min-h-0">
      <header className="flex items-center justify-between h-11">
        <div className="text-[12px] text-muted">{unit.title} · Mia와 대화</div>
        <div
          className={`font-display tabular text-[36px] leading-none ${warn ? "text-warn" : "text-ink"}`}
          aria-label="남은 시간"
        >
          {formatClock(Math.max(remaining, 0))}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* 무대: Mia 얼굴이 크게, 아래에 툴바 */}
        <div
          className="relative flex-1 min-h-[420px] lg:min-h-0 overflow-hidden bg-[#221f1a] stage"
          data-state={status}
        >
          <div ref={avatarRef} className="absolute inset-x-0 top-0 bottom-[88px]" aria-label="Mia 얼굴" />
          {avatar ? (
            <>
              <div className="absolute left-5 top-5">
                <StatusPill text={STATUS_TEXT.live} />
              </div>
              <div className="absolute left-5 bottom-[108px]">
                <NameTag name="Mia · AI 아바타" />
              </div>
            </>
          ) : (
            <MiaOrb status={status} text={detail ?? STATUS_TEXT[status]} problem={isProblem} />
          )}

          {hint !== null ? (
            <HintCaption
              en={unit.expressions[hint].en}
              ko={unit.expressions[hint].ko}
              ipa={unit.expressions[hint].ipa}
              onClose={() => setHint(null)}
            />
          ) : null}

          <div className="absolute inset-x-0 bottom-0 h-[88px] flex items-center justify-center gap-3 bg-black/30 border-t border-white/[0.06]">
            <ToolButton
              icon={<MicIcon off={!mic} />}
              label={mic ? "마이크" : "마이크 꺼짐"}
              pressed={!mic}
              onClick={toggleMic}
            />
            <div className="absolute right-5">
              <EndButton onClick={() => finish()}>대화 끝내기</EndButton>
            </div>
          </div>
        </div>

        {/* 오른쪽 패널: 자막 → 오늘의 표현 → 힌트 */}
        <aside className="flex flex-col gap-5 w-full lg:w-[360px] shrink-0 lg:min-h-0 lg:overflow-y-auto">
          {status === "unavailable" ? (
            <Card className="text-[12px] text-ink-soft leading-relaxed">
              화면은 다 있는데 Mia가 아직 없어요. Mia의 목소리와 얼굴은{" "}
              <code className="font-mono text-[12px] bg-paper-deep px-1.5 py-0.5">lib/agora/convoai.ts</code>
              의 <code className="font-mono text-[12px]">createConvoAiTalk()</code> 한 곳에서 들어옵니다.
            </Card>
          ) : null}

          <Card className="py-4">
            <Label>자막</Label>
            <CaptionLine who="Mia" text={lastAgent} />
            <CaptionLine who="나" text={lastUser} />
          </Card>

          <Card strong={status === "live"}>
            <Label>오늘의 표현 · 대화에서 써보세요</Label>
            <ul className="mt-1 flex flex-col gap-3.5">
              {unit.expressions.map((e, i) => (
                <li key={e.en} className="flex flex-col gap-0.5">
                  <span className="font-display text-[24px] leading-tight text-ink">
                    {used.has(i) ? <span className="text-good mr-1.5" aria-label="썼어요">✓</span> : null}
                    {e.en}
                  </span>
                  <span className="text-[12px] text-muted">{e.ko}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-auto">
            <Button variant="accent" size="lg" onClick={openHint}>
              💡 단어가 안 떠올라요
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function CaptionLine({ who, text }: { who: string; text?: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[18px] leading-snug">
      <span className="w-8 shrink-0 text-[12px] text-muted pt-1">{who}</span>
      <span className={text ? "text-ink" : "text-muted"}>{text ?? "…"}</span>
    </div>
  );
}

// 힌트는 Mia 를 가리는 모달이 아니라 무대 아래쪽 자막 자리에 뜬다. 얼굴을 보면서 읽는다.
function HintCaption({
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
      className="absolute left-1/2 -translate-x-1/2 bottom-[108px] w-[min(560px,calc(100%-40px))] bg-card px-6 pt-4 pb-5 border-2 border-ink shadow-px screen-enter"
      role="dialog"
      aria-label="힌트"
    >
      <div className="text-[12px] text-muted uppercase">
        이렇게 말해보세요 · 소리 내어 읽으면 돼요
      </div>
      <div className="font-display text-[30px] leading-tight mt-2 text-balance">{en}</div>
      <div className="mt-1 text-[18px] text-ink-soft">{ko}</div>
      <div className="mt-0.5 font-mono text-[12px] text-muted">{ipa}</div>
      <div className="mt-3.5 flex gap-2.5">
        <Button variant="ghost" className="w-auto! px-4 py-2 text-[12px]" onClick={() => speak(en)}>
          🔊 듣기
        </Button>
        <Button className="w-auto! px-4 py-2 text-[12px]" onClick={onClose}>
          읽었어요
        </Button>
      </div>
      <p className="mt-3 text-[12px] text-muted">Mia는 기다리고 있어요</p>
    </div>
  );
}

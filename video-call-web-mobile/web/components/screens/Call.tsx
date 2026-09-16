"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SESSION_SECONDS, type Unit } from "@/content/units";
import { createCallSession, newRoomCode, type CallStatus, type PartnerState } from "@/lib/call";
import { formatClock } from "@/lib/storage";
import { speak, stopSpeaking } from "@/lib/speech";
import { Button, Card, Label } from "@/components/ui";
import {
  CameraIcon,
  CameraOffTile,
  EndButton,
  MicIcon,
  NameTag,
  ScreenIcon,
  StatusPill,
  ToolButton,
  WaitingTile,
} from "@/components/CallStage";

// 데스크톱 통화 화면. 화상회의 구도: 무대(상대 크게, 나는 우상단, 아래 툴바) + 오른쪽 패널(초대·표현·힌트).
// 상대는 폰으로 들어온다. 무대 옆 QR 이 초대 링크(?room=)다.

const STATUS_TEXT: Record<CallStatus, string> = {
  idle: "준비 중",
  connecting: "통화방에 들어가는 중이에요…",
  waiting: "파트너를 기다리는 중이에요",
  connected: "통화 중 · 오늘의 표현을 써보세요",
  "partner-left": "파트너가 나갔어요",
  ended: "통화가 끝났어요",
  unavailable: "아직 통화가 연결되지 않아요",
  error: "연결에 문제가 생겼어요",
};

const ALL_ON: PartnerState = { mic: true, camera: true };

// 통화가 끝났을 때 완료 화면으로 넘기는 결과. connected 는 파트너와 한 번이라도 연결됐는가.
export type CallResult = {
  hints: number;
  durationSec: number;
  connected: boolean;
  reason?: string;
};

export default function Call({ unit, onEnd }: { unit: Unit; onEnd: (r: CallResult) => void }) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [hint, setHint] = useState<number | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [partner, setPartner] = useState<PartnerState>(ALL_ON);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | undefined>();
  // 화면 공유는 데스크톱 브라우저에서만 된다. 공유 API 가 없는 브라우저에서는 버튼을 숨긴다.
  const [canShare] = useState(() => typeof navigator.mediaDevices?.getDisplayMedia === "function");
  // 데스크톱이 방을 만든다. 상대는 초대 링크(?room=)로 파트너 화면에 들어온다.
  const [invite] = useState(() => {
    const code = newRoomCode();
    return { code, url: `${window.location.origin}/?room=${code}` };
  });
  const room = invite.code;
  const inviteUrl = invite.url;

  const session = useRef(createCallSession());
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const hintCursor = useRef(0);
  const ending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const s = session.current;
    s.start({
        channel: room,
        unit,
        localContainer: localRef.current,
        remoteContainer: remoteRef.current!,
        onStatus: (next, d) => {
          if (cancelled) return;
          setStatus(next);
          setDetail(d);
          if (next === "connected" && !startedAt.current) startedAt.current = Date.now();
          if (next === "partner-left") setPartner(ALL_ON);
        },
        onPartner: (state) => {
          if (!cancelled) setPartner(state);
        },
        onScreen: (state) => {
          if (!cancelled) setSharing(state.mine);
        },
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setDetail(err instanceof Error ? err.message : String(err));
      });
    return () => {
      // 화면을 떠나거나(React 개발 모드에서는 effect 가 두 번 돌아) 세션이 바뀌면 진행 중인 통화를 정리한다.
      cancelled = true;
      void s.stop();
    };
  }, [unit, room]);

  // 타이머는 파트너와 연결된 동안만 흐른다.
  useEffect(() => {
    if (status !== "connected") return;
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
    try {
      await session.current.stop();
    } catch {
      // 종료 실패는 결과 화면에 영향 없다
    }
    onEnd({
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

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드가 막힌 환경에서는 QR 과 코드가 화면에 그대로 있다
    }
  }

  async function toggleMic() {
    const next = !mic;
    setMic(next);
    await session.current.setMic(next);
  }

  async function toggleCamera() {
    const next = !camera;
    setCamera(next);
    await session.current.setCamera(next);
  }

  async function toggleScreenShare() {
    setShareError(undefined);
    try {
      await session.current.setScreenShare(!sharing);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : String(err));
    }
  }

  const warn = remaining <= 30;
  const hasPartner = status === "connected";
  const isProblem = status === "error";
  const showInvite = status === "waiting" || status === "partner-left";
  const localOnly = inviteUrl.includes("localhost") || inviteUrl.includes("127.0.0.1");

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto px-5 md:px-7 py-6 flex flex-col gap-5 min-h-0">
      <header className="flex items-center justify-between h-11">
        <div className="text-[12px] text-muted">
          {unit.title} · 파트너와 통화
          {shareError ? <span className="text-warn"> · 화면 공유를 시작하지 못했어요: {shareError}</span> : null}
        </div>
        <div
          className={`font-display tabular text-[36px] leading-none ${warn ? "text-warn" : "text-ink"}`}
          aria-label="남은 시간"
        >
          {formatClock(Math.max(remaining, 0))}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* 무대: 상대가 크게, 나는 우상단, 아래에 툴바 */}
        <div
          className="relative flex-1 min-h-[420px] lg:min-h-0 overflow-hidden bg-[#221f1a] stage"
          data-state={status}
        >
          <div ref={remoteRef} className="absolute inset-x-0 top-0 bottom-[88px]" />
          {hasPartner && !partner.camera ? (
            <CameraOffTile className="inset-x-0 top-0 bottom-[88px] bg-[#221f1a]" />
          ) : null}
          {!hasPartner ? (
            <WaitingTile
              className="inset-x-0 top-0 bottom-[88px]"
              text={detail ?? STATUS_TEXT[status]}
              problem={isProblem}
            />
          ) : (
            <>
              <div className="absolute left-5 top-5">
                <StatusPill text={sharing ? "내 화면을 공유하는 중 · 파트너 폰에 보여요" : STATUS_TEXT.connected} />
              </div>
              <div className="absolute left-5 bottom-[108px]">
                <NameTag name="파트너 · 폰" mic={partner.mic} camera={partner.camera} />
              </div>
            </>
          )}

          <div
            className="absolute top-5 right-5 w-40 h-[100px] md:w-56 md:h-[140px] overflow-hidden border border-white/20 bg-[#2d2924]"
            aria-label="내 화면"
          >
            <div ref={localRef} className="absolute inset-0" />
            {camera ? null : <CameraOffTile small />}
            <div className="absolute left-2 bottom-2">
              <NameTag name="나" mic={mic} camera={camera} small />
            </div>
          </div>

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
            <ToolButton
              icon={<CameraIcon off={!camera} />}
              label={camera ? "카메라" : "카메라 꺼짐"}
              pressed={!camera}
              onClick={toggleCamera}
            />
            {canShare ? (
              <ToolButton
                icon={<ScreenIcon />}
                label={sharing ? "공유 중지" : "화면 공유"}
                pressed={sharing}
                onClick={toggleScreenShare}
              />
            ) : null}
            <div className="absolute right-5">
              <EndButton onClick={() => finish()}>통화 끝내기</EndButton>
            </div>
          </div>
        </div>

        {/* 오른쪽 패널: 초대 → 오늘의 표현 → 힌트 */}
        <aside className="flex flex-col gap-5 w-full lg:w-[360px] shrink-0 lg:min-h-0 lg:overflow-y-auto">
          {status === "unavailable" ? (
            <Card className="text-[12px] text-ink-soft leading-relaxed">
              화면은 다 있는데 통화가 안 붙어 있어요. 통화는{" "}
              <code className="font-mono text-[12px] bg-paper-deep px-1.5 py-0.5">lib/agora/rtc.ts</code>
              의 <code className="font-mono text-[12px]">createRtcCall()</code> 한 곳에서 들어옵니다.
            </Card>
          ) : null}

          {showInvite ? (
            <Card strong className="py-5">
              <Label>파트너 초대 · 폰으로 들어와요</Label>
              <div className="mt-1 flex flex-col items-center gap-3.5">
                <div className="border-2 border-ink bg-white p-3">
                  <QRCodeSVG
                    value={inviteUrl}
                    size={152}
                    bgColor="#ffffff"
                    fgColor="#1f1c17"
                    level="M"
                    marginSize={0}
                    title="초대 링크 QR"
                  />
                </div>
                <div className="flex w-full items-center gap-3">
                  <code className="font-mono text-[18px] grow whitespace-nowrap">{room}</code>
                  <Button variant="ghost" className="w-auto! shrink-0 px-4 py-2 text-[12px]" onClick={copyInvite}>
                    {copied ? "복사됨" : "초대 링크 복사"}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                {localOnly
                  ? "이 주소는 이 컴퓨터에서만 열려요. 폰으로 들어오려면 cloudflared 터널 주소로 여세요."
                  : "폰 카메라로 QR을 찍으면 브라우저에서 바로 들어와요."}
              </p>
            </Card>
          ) : null}

          <Card strong={hasPartner}>
            <Label>오늘의 표현 · 통화에서 써보세요</Label>
            <ul className="mt-1 flex flex-col gap-3.5">
              {unit.expressions.map((e) => (
                <li key={e.en} className="flex flex-col gap-0.5">
                  <span className="font-display text-[24px] leading-tight text-ink">{e.en}</span>
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

// 힌트는 상대를 가리는 모달이 아니라 무대 아래쪽 자막 자리에 뜬다. 상대 얼굴을 보면서 읽는다.
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
    </div>
  );
}

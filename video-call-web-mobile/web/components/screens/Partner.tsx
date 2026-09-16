"use client";

import { useEffect, useRef, useState } from "react";
import type { Unit } from "@/content/units";
import { createCallSession, type CallSession, type CallStatus, type PartnerState } from "@/lib/call";
import { Button, Card, Label } from "@/components/ui";
import { CameraIcon, CameraOffTile, EndButton, MicIcon, NameTag, ToolButton, WaitingTile } from "@/components/CallStage";

// 폰 브라우저로 들어오는 파트너 화면. 데스크톱의 QR(초대 링크 ?room=)을 찍으면 여기로 온다.
// 화면은 둘뿐이다. 들어가기(방 코드 + 버튼)와 통화(상대 전체 + 내 카메라 + 마이크·카메라·나가기).
// 표현 카드와 힌트는 데스크톱 쪽에 있다. 여기서는 얼굴만 보여주면 된다. 통화는 데스크톱과 같은 lib/call.ts 를 쓴다.
// 데스크톱이 화면을 공유하면 폰은 보기만 한다. 공유 화면과 데스크톱 카메라 중 누른 쪽이 크게, 다른 쪽이 작게 나온다.
// 공유 화면을 크게 보려고 폰을 눕히면 가로 배치(landscape:)로 바뀐다.
// 들어가기 화면(대기실)에서 마이크를 켤지 끌지 고른다. 고른 값은 나갔다 다시 들어와도 남는다.

const STATUS_TEXT: Record<CallStatus, string> = {
  idle: "준비 중",
  connecting: "통화방에 들어가는 중이에요…",
  waiting: "상대를 기다리는 중이에요",
  connected: "통화 중",
  "partner-left": "상대가 나갔어요",
  ended: "통화가 끝났어요",
  unavailable: "아직 통화가 연결되지 않아요",
  error: "연결에 문제가 생겼어요",
};

const ALL_ON: PartnerState = { mic: true, camera: true };

export default function Partner({ room, unit }: { room: string; unit: Unit }) {
  const [phase, setPhase] = useState<"join" | "call">("join");
  const [status, setStatus] = useState<CallStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [partner, setPartner] = useState<PartnerState>(ALL_ON);
  const [lastReason, setLastReason] = useState<string | undefined>();
  const [partnerSharing, setPartnerSharing] = useState(false);
  const [big, setBig] = useState<"face" | "screen">("face");

  const session = useRef<CallSession | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  // 들어가기를 누른 순간의 마이크 선택. 통화 중 마이크 토글이 세션을 다시 시작하지 않게 state 가 아닌 ref 로 넘긴다.
  const micAtJoin = useRef(true);

  // 통화 화면이 그려져 컨테이너가 생긴 뒤에 세션을 시작한다. 나갔다 다시 들어오면 새 세션이다.
  useEffect(() => {
    if (phase !== "call") return;
    let cancelled = false;
    const s = createCallSession();
    session.current = s;
    s.start({
      channel: room,
      unit,
      mic: micAtJoin.current,
      localContainer: localRef.current,
      remoteContainer: remoteRef.current!,
      onStatus: (next, d) => {
        if (cancelled) return;
        setStatus(next);
        setDetail(d);
        if (next === "partner-left") setPartner(ALL_ON);
      },
      onPartner: (state) => {
        if (!cancelled) setPartner(state);
      },
      screenContainer: screenRef.current,
      onScreen: (state) => {
        if (cancelled) return;
        // 공유가 시작되면 공유 화면을 크게, 끝나면 얼굴로 돌아간다.
        setPartnerSharing(state.partner);
        setBig(state.partner ? "screen" : "face");
      },
    }).catch((err: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setDetail(err instanceof Error ? err.message : String(err));
    });
    return () => {
      // 화면을 떠나거나(React 개발 모드에서는 effect 가 두 번 돌아) 세션이 바뀌면 진행 중인 통화를 정리한다.
      cancelled = true;
      void s.stop();
    };
  }, [phase, room, unit]);

  async function leave() {
    try {
      await session.current?.stop();
    } catch {
      // 나가기 실패는 첫 화면으로 돌아가는 데 영향 없다
    }
    session.current = null;
    setLastReason("통화가 끝났어요. 다시 들어갈 수 있어요.");
    setStatus("idle");
    setDetail(undefined);
    setCamera(true);
    setPartner(ALL_ON);
    setPartnerSharing(false);
    setBig("face");
    setPhase("join");
  }

  async function toggleMic() {
    const next = !mic;
    setMic(next);
    await session.current?.setMic(next);
  }

  async function toggleCamera() {
    const next = !camera;
    setCamera(next);
    await session.current?.setCamera(next);
  }

  if (phase === "join") {
    return (
      <main className="flex-1 w-full max-w-[560px] mx-auto px-5 pt-16 pb-10 flex flex-col gap-5 screen-enter">
        <header>
          <h1 className="font-display text-[42px] leading-none">파트너</h1>
          <p className="mt-2 text-[12px] text-muted">데스크톱에서 보낸 초대예요</p>
        </header>
        <Card strong>
          <Label>통화방</Label>
          <code className="font-mono text-[24px]">{room}</code>
          <button
            type="button"
            aria-pressed={!mic}
            onClick={() => setMic((m) => !m)}
            className={`mt-5 flex w-full cursor-pointer items-center gap-3 border-2 px-4 py-3 text-left ${
              mic ? "border-ink bg-card text-ink" : "border-warn bg-paper-deep text-warn"
            }`}
          >
            <MicIcon off={!mic} />
            <span className="grow text-[18px]">{mic ? "마이크 켜고 들어가기" : "마이크 끄고 들어가기"}</span>
            <span className="text-[12px] text-muted">눌러서 바꾸기</span>
          </button>
          <Button
            size="lg"
            className="mt-3"
            onClick={() => {
              micAtJoin.current = mic;
              setPhase("call");
            }}
          >
            들어가기
          </Button>
          <p className="mt-3 text-center text-[12px] text-muted">
            {lastReason ?? "마이크·카메라 권한을 물어보면 허용해 주세요."}
          </p>
        </Card>
        <p className="mt-auto text-center text-[12px] text-muted">
          오늘의 표현과 힌트는 데스크톱 쪽에 있어요. 여기서는 얼굴만 보여주면 돼요.
        </p>
      </main>
    );
  }

  const hasPartner = status === "connected";
  const isProblem = status === "error";
  const faceBig = !partnerSharing || big === "face";

  // 크게는 무대 전체, 작게는 왼쪽 위 이름표 아래. 작은 쪽을 누르면 서로 바뀐다. 세로는 3:4, 가로는 4:3 과 16:9.
  const BIG = "absolute inset-0";
  const SMALL =
    "absolute z-10 left-[max(16px,env(safe-area-inset-left))] top-[max(100px,env(safe-area-inset-top))] landscape:top-[max(56px,env(safe-area-inset-top))] overflow-hidden border border-white/20 bg-[#2d2924] cursor-pointer";

  return (
    <div className="fixed inset-0 bg-[#221f1a] stage" data-state={status}>
      <div
        className={faceBig ? BIG : `${SMALL} w-24 h-32 landscape:w-32 landscape:h-24`}
        onClick={faceBig ? undefined : () => setBig("face")}
        role={faceBig ? undefined : "button"}
        aria-label={faceBig ? undefined : "데스크톱 카메라 크게 보기"}
      >
        <div ref={remoteRef} className="absolute inset-0" />
        {hasPartner && !partner.camera ? (
          faceBig ? <CameraOffTile className="inset-0 bg-[#221f1a]" /> : <CameraOffTile small />
        ) : null}
        {faceBig ? null : <TapToEnlarge />}
      </div>
      <div
        className={
          partnerSharing
            ? faceBig
              ? `${SMALL} w-32 h-[72px] landscape:w-40 landscape:h-[90px]`
              : `${BIG} bg-black`
            : "hidden"
        }
        onClick={partnerSharing && faceBig ? () => setBig("screen") : undefined}
        role={partnerSharing && faceBig ? "button" : undefined}
        aria-label={partnerSharing && faceBig ? "공유 화면 크게 보기" : "공유 화면"}
      >
        <div ref={screenRef} className="absolute inset-0" />
        {partnerSharing && faceBig ? <TapToEnlarge /> : null}
      </div>
      {!hasPartner ? <WaitingTile text={detail ?? STATUS_TEXT[status]} problem={isProblem} /> : null}

      <div className="absolute z-10 left-[max(16px,env(safe-area-inset-left))] top-[max(56px,env(safe-area-inset-top))] landscape:top-[max(16px,env(safe-area-inset-top))]">
        {hasPartner ? (
          <NameTag
            name={partnerSharing ? "데스크톱 · 화면 공유 중" : "데스크톱"}
            mic={partner.mic}
            camera={partner.camera}
          />
        ) : (
          <div className="bg-[#221f1a]/70 px-3 py-1.5 font-mono text-[12px] text-[#d8d2c4]">{room}</div>
        )}
      </div>

      <div
        className="absolute z-10 right-[max(16px,env(safe-area-inset-right))] top-[max(56px,env(safe-area-inset-top))] landscape:top-[max(16px,env(safe-area-inset-top))] w-24 h-32 landscape:w-32 landscape:h-24 overflow-hidden border border-white/20 bg-[#2d2924]"
        aria-label="내 화면"
      >
        <div ref={localRef} className="absolute inset-0" />
        {camera ? null : <CameraOffTile small />}
        <div className="absolute left-2 bottom-2">
          <NameTag name="나" mic={mic} camera={camera} small />
        </div>
      </div>

      <div className="absolute z-10 inset-x-0 bottom-0 flex items-center justify-center gap-3 px-4 pt-6 pb-[max(40px,env(safe-area-inset-bottom))] landscape:pt-3 landscape:pb-[max(12px,env(safe-area-inset-bottom))] bg-[linear-gradient(to_top,rgba(0,0,0,0.5),transparent)]">
        <ToolButton
          className="w-16 h-[60px]"
          icon={<MicIcon off={!mic} />}
          label={mic ? "마이크" : "꺼짐"}
          pressed={!mic}
          onClick={toggleMic}
        />
        <ToolButton
          className="w-16 h-[60px]"
          icon={<CameraIcon off={!camera} />}
          label={camera ? "카메라" : "꺼짐"}
          pressed={!camera}
          onClick={toggleCamera}
        />
        <EndButton className="h-[60px]" onClick={leave}>
          나가기
        </EndButton>
      </div>
    </div>
  );
}

// 작은 쪽 화면 아래에 붙는 안내. 누르면 크게 바뀐다는 것만 알린다.
function TapToEnlarge() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#221f1a]/70 py-0.5 text-center text-[12px] text-[#d8d2c4]">
      눌러서 크게
    </div>
  );
}

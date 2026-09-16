"use client";

import { useSyncExternalStore, useState } from "react";
import { UNITS, findUnit } from "@/content/units";
import { loadSessions, saveSession, streak, today, type SessionRecord } from "@/lib/storage";
import Home from "@/components/screens/Home";
import Warmup from "@/components/screens/Warmup";
import Call, { type CallResult } from "@/components/screens/Call";
import Partner from "@/components/screens/Partner";
import Done from "@/components/screens/Done";

type Screen = "home" | "warmup" | "call" | "done";

// localStorage는 브라우저에만 있으므로 서버 렌더에서는 빈 화면, 클라이언트에서 채운다.
const subscribeNoop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

export default function PracticeApp() {
  const mounted = useMounted();
  if (!mounted) return null;
  return <MountedApp />;
}

function MountedApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessions());
  const [unitId, setUnitId] = useState<number>(
    () => UNITS[loadSessions().length % UNITS.length].id,
  );
  const [result, setResult] = useState<CallResult | null>(null);
  // 초대 링크(?room=)로 들어왔으면 이 기기는 파트너다. 홈 대신 파트너 화면(들어가기 → 통화)을 그린다.
  const [room] = useState(() => new URLSearchParams(window.location.search).get("room"));
  const unit = findUnit(unitId);

  function handleEnd(r: CallResult) {
    if (r.connected) {
      const record: SessionRecord = {
        date: today(),
        unitId: unit.id,
        hints: r.hints,
        durationSec: r.durationSec,
      };
      saveSession(record);
      setSessions((prev) => [...prev, record]);
    }
    setResult(r);
    setScreen("done");
  }

  if (room) return <Partner room={room} unit={unit} />;

  switch (screen) {
    case "home":
      return (
        <Home
          unit={unit}
          sessions={sessions}
          onPickUnit={setUnitId}
          onStartCall={() => setScreen("warmup")}
        />
      );
    case "warmup":
      return <Warmup unit={unit} onDone={() => setScreen("call")} onBack={() => setScreen("home")} />;
    case "call":
      return <Call unit={unit} onEnd={handleEnd} />;
    case "done":
      return (
        <Done
          unit={unit}
          result={result!}
          streakDays={streak(sessions)}
          onHome={() => {
            setUnitId(UNITS[sessions.length % UNITS.length].id);
            setScreen("home");
          }}
        />
      );
  }
}

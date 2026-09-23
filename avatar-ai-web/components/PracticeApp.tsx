"use client";

import { useSyncExternalStore, useState } from "react";
import { UNITS, findUnit } from "@/content/units";
import { loadSessions, saveSession, streak, today, type SessionRecord } from "@/lib/storage";
import Home from "@/components/screens/Home";
import Warmup from "@/components/screens/Warmup";
import Talk, { type TalkResult } from "@/components/screens/Talk";
import Done from "@/components/screens/Done";

type Screen = "home" | "warmup" | "talk" | "done";

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
  const [result, setResult] = useState<TalkResult | null>(null);
  const unit = findUnit(unitId);

  function handleEnd(r: TalkResult) {
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

  switch (screen) {
    case "home":
      return (
        <Home
          unit={unit}
          sessions={sessions}
          onPickUnit={setUnitId}
          onStart={() => setScreen("warmup")}
        />
      );
    case "warmup":
      return <Warmup unit={unit} onDone={() => setScreen("talk")} onBack={() => setScreen("home")} />;
    case "talk":
      return <Talk unit={unit} onEnd={handleEnd} />;
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

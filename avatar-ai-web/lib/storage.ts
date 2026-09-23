// 세션 기록 — 브라우저 localStorage. 서버 없이 스트릭·횟수를 센다.

export type SessionRecord = {
  date: string; // YYYY-MM-DD
  unitId: number;
  hints: number;
  durationSec: number;
};

const KEY = "practice.sessions";

export function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord): void {
  const all = loadSessions();
  all.push(record);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // 저장 실패는 앱 동작에 영향 없음
  }
}

export function streak(sessions: SessionRecord[]): number {
  const days = new Set(sessions.map((s) => s.date));
  let count = 0;
  const d = new Date();
  if (!days.has(today())) d.setDate(d.getDate() - 1);
  while (days.has(d.toLocaleDateString("sv-SE"))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

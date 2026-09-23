"use client";

import { useSyncExternalStore } from "react";
import { findUnit } from "@/content/units";

// 스피커 옆에 띄워 두는 보조 화면. 주소의 ?name=<기기 이름>&unit=<1~10> 을 읽는다.
// 서버 렌더에서는 아무것도 그리지 않는다(주소를 브라우저에서만 읽는다).
const noop = () => () => {};
const readSearch = () => window.location.search;

export default function SpeakerPanel() {
  const search = useSyncExternalStore(noop, readSearch, () => null);
  if (search === null) return null;

  const params = new URLSearchParams(search);
  const name = params.get("name")?.trim() ?? "";
  const unit = findUnit(Number(params.get("unit") ?? 4));

  return (
    <main className="flex-1 w-full max-w-[560px] mx-auto px-6 py-10 md:py-14 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[30px]">스피커와 영어 말하기</h1>
        <p className="text-[12px] text-muted">
          {name ? `채널 speaker-${name}` : "기기 이름을 주소에 ?name= 으로 넣어 주세요"}
        </p>
      </header>

      <section className="bg-card p-6 border-2 border-ink shadow-px flex flex-col gap-4">
        <div className="text-[12px] text-muted">오늘의 표현 · {unit.title}</div>
        <ul className="flex flex-col gap-3">
          {unit.expressions.map((e) => (
            <li key={e.en} className="flex flex-col">
              <span className="text-[18px] font-bold">{e.en}</span>
              <span className="text-[12px] text-ink-soft">
                {e.ko} · {e.ipa}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card p-6 border-2 border-line-strong flex flex-col gap-2">
        <div className="text-[12px] text-muted">자막</div>
        <p className="text-[12px] text-ink-soft">스피커 버튼을 누르면 Mia 가 인사해요.</p>
      </section>
    </main>
  );
}

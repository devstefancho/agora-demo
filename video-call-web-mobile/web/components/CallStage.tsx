"use client";

import type { ReactNode } from "react";

// 통화 무대의 공용 부품. 데스크톱(Call)과 폰(Partner) 화면이 같은 이름표·툴바를 쓴다.
// 어두운 무대 위에만 놓이므로 무대 팔레트(#221f1a 계열)와 흰색 반투명만 쓴다. 아이콘은 마이크·카메라·화면 공유·전화 끊기·사람 다섯이다.

// 아이콘은 16×16 픽셀 격자다. PixelLab 으로 뽑은 초안을 1비트로 정리했다. "#" 한 칸이 한 픽셀이고
// 꺼짐 상태는 같은 그림에 빗금을 긋는다(빗금 아래 한 칸은 비워 선이 읽히게). 색은 currentColor 다.
// 크기는 16의 배수이거나 1.5배(24·48)여야 레티나에서 칸이 뭉개지지 않는다. iOS 는 PixelIcon.swift 에 같은 격자가 있다.
const GRIDS = {
  mic: [
    "................",
    "......####......",
    ".....#....#.....",
    ".....#....#.....",
    ".....#....#.....",
    ".....#....#.....",
    ".....#....#.....",
    "...#.#....#.#...",
    "...#.#....#.#...",
    "...#..#..#..#...",
    "....#..##..#....",
    ".....#....#.....",
    "......####......",
    ".......##.......",
    ".....######.....",
    "................",
  ],
  camera: [
    "................",
    "................",
    "................",
    "................",
    ".##########...#.",
    ".#........#..##.",
    ".#........#.#.#.",
    ".#........##..#.",
    ".#........##..#.",
    ".#........#.#.#.",
    ".#........#..##.",
    ".##########...#.",
    "................",
    "................",
    "................",
    "................",
  ],
  hangup: [
    "................",
    "................",
    "................",
    "................",
    "................",
    ".....######.....",
    "...##......##...",
    "..#....##....#..",
    ".#....#..#....#.",
    ".#...#....#...#.",
    ".#...#....#...#.",
    "..###......###..",
    "................",
    "................",
    "................",
    "................",
  ],
  person: [
    "................",
    ".......##.......",
    "......#..#......",
    ".....#....#.....",
    "....#......#....",
    "....#......#....",
    "....#......#....",
    ".....#....#.....",
    ".....##..##.....",
    "....#......#....",
    "...#........#...",
    "..#..........#..",
    "..#..........#..",
    "..#..........#..",
    "..############..",
    "................",
  ],
  // 모니터 안에 위 화살표. 화면 공유.
  screen: [
    "................",
    "................",
    ".##############.",
    ".#............#.",
    ".#.....##.....#.",
    ".#....####....#.",
    ".#...#.##.#...#.",
    ".#.....##.....#.",
    ".#.....##.....#.",
    ".#............#.",
    ".#............#.",
    ".##############.",
    "......####......",
    "....########....",
    "................",
    "................",
  ],
} as const;

function withSlash(grid: readonly string[]): string[] {
  const rows = grid.map((r) => r.split(""));
  for (let i = 1; i < 15; i++) {
    rows[i][i] = "#";
    rows[i + 1][i] = ".";
  }
  return rows.map((r) => r.join(""));
}

function PixelIcon({ grid, size }: { grid: readonly string[]; size: number }) {
  // 한 줄에서 이어진 칸을 사각형 하나로 묶는다.
  let d = "";
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let w = 1;
      while (row[x + w] === "#") w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  });
  return (
    <svg className="pixel-icon" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function MicIcon({ off = false, size = 24 }: { off?: boolean; size?: number }) {
  return <PixelIcon grid={off ? withSlash(GRIDS.mic) : GRIDS.mic} size={size} />;
}

export function CameraIcon({ off = false, size = 24 }: { off?: boolean; size?: number }) {
  return <PixelIcon grid={off ? withSlash(GRIDS.camera) : GRIDS.camera} size={size} />;
}

export function ScreenIcon({ size = 24 }: { size?: number }) {
  return <PixelIcon grid={GRIDS.screen} size={size} />;
}

export function HangUpIcon({ size = 24 }: { size?: number }) {
  return <PixelIcon grid={GRIDS.hangup} size={size} />;
}

export function PersonIcon({ size = 48 }: { size?: number }) {
  return <PixelIcon grid={GRIDS.person} size={size} />;
}

// 참가자 이름표. 마이크가 꺼지면 아이콘에 빗금, 카메라가 꺼지면 카메라 아이콘이 하나 더 붙는다.
export function NameTag({
  name,
  mic = true,
  camera = true,
  small = false,
}: {
  name: string;
  mic?: boolean;
  camera?: boolean;
  small?: boolean;
}) {
  const size = 16;
  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-[#221f1a]/70 text-[#d8d2c4] ${
        small ? "px-2 py-1 text-[12px]" : "px-3 py-1.5 text-[12px]"
      }`}
    >
      <span className={mic ? "" : "text-[#f0a58a]"} aria-label={mic ? "마이크 켜짐" : "마이크 꺼짐"}>
        <MicIcon off={!mic} size={size} />
      </span>
      {camera ? null : (
        <span className="text-[#f0a58a]" aria-label="카메라 꺼짐">
          <CameraIcon off size={size} />
        </span>
      )}
      <span>{name}</span>
    </div>
  );
}

export function StatusPill({ text }: { text: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 bg-[#221f1a]/70 px-3 py-1.5 text-[12px] text-[#d8d2c4]"
      role="status"
    >
      <span className="h-2 w-2 bg-good" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

// 상대가 없을 때 무대 한가운데. 회색 원 하나와 상태 문구.
export function WaitingTile({
  text,
  problem = false,
  className = "inset-0",
}: {
  text: string;
  problem?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`absolute ${className} pointer-events-none flex flex-col items-center justify-center gap-2 px-6 text-center`}
    >
      <div className="flex h-16 w-16 items-center justify-center bg-[#3a352d] text-[#7d786d]">
        <PersonIcon />
      </div>
      <div className={`text-[12px] ${problem ? "text-[#f0a58a]" : "text-[#d8d2c4]"}`} role="status">
        {text}
      </div>
    </div>
  );
}

// 카메라가 꺼진 자리. 검은 화면이나 멈춘 마지막 프레임 대신 이걸 보여준다. 내 PIP 는 small, 상대 화면은 큰 것.
export function CameraOffTile({
  small = false,
  className = "inset-0 bg-[#2d2924]",
}: {
  small?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`absolute ${className} pointer-events-none flex flex-col items-center justify-center gap-2 text-[#d8d2c4]`}
      role="status"
      aria-label="카메라 꺼짐"
    >
      <CameraIcon off size={small ? 24 : 48} />
      {small ? null : <span className="text-[12px]">카메라 꺼짐</span>}
    </div>
  );
}

// 툴바의 아이콘 버튼. 꺼진 상태는 aria-pressed 와 빗금 아이콘으로 보인다.
export function ToolButton({
  icon,
  label,
  pressed,
  onClick,
  className = "w-[72px] h-16",
}: {
  icon: ReactNode;
  label: string;
  pressed: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`${className} flex cursor-pointer flex-col items-center justify-center gap-1.5 border-2 ${
        pressed ? "border-[#f0a58a]/60 bg-white/[0.16] text-[#f0a58a]" : "border-white/15 bg-white/[0.07] text-paper hover:bg-white/[0.12]"
      }`}
    >
      {icon}
      <span className="text-[12px] leading-none text-[#d8d2c4]">{label}</span>
    </button>
  );
}

export function EndButton({
  children,
  onClick,
  className = "h-11",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} inline-flex cursor-pointer items-center gap-2 border-2 border-black/40 bg-warn px-5 text-[12px] font-bold text-white hover:brightness-95 active:translate-y-[2px]`}
    >
      <HangUpIcon />
      {children}
    </button>
  );
}

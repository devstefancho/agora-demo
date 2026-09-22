"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "accent";
  size?: "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className = "", ...rest }: ButtonProps) {
  const base =
    "inline-flex w-full items-center justify-center font-bold border-2 border-ink cursor-pointer disabled:cursor-default disabled:opacity-40";
  const sizes = size === "lg" ? "px-6 py-4 text-[18px]" : "px-5 py-3 text-[12px]";
  // 눌리면 그림자만큼 내려앉는다. 흐림 없는 픽셀 그림자.
  const press = "shadow-px-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:translate-x-0 disabled:translate-y-0";
  const variants = {
    primary: `bg-ink text-paper hover:bg-ink-soft ${press}`,
    ghost: `bg-card text-ink hover:bg-paper-deep ${press}`,
    quiet: "bg-transparent border-transparent text-muted hover:text-ink font-normal",
    accent: `bg-accent text-white hover:bg-accent-ink ${press}`,
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...rest} />;
}

export function Card({
  children,
  strong = false,
  className = "",
}: {
  children: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-card p-6 border-2 ${strong ? "border-ink shadow-px" : "border-line-strong"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[12px] uppercase text-muted mb-1.5">
      {children}
    </div>
  );
}

export function Chip({ children, done = false }: { children: ReactNode; done?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-[12px] ${
        done
          ? "border-good bg-good-soft text-good font-bold"
          : "border-line-strong bg-card text-ink-soft"
      }`}
    >
      {done ? <span aria-hidden>✓</span> : null}
      {children}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 w-full max-w-[560px] mx-auto px-6 py-10 md:py-14 flex flex-col gap-5">
      {children}
    </main>
  );
}

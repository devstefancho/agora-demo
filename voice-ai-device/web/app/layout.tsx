import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 픽셀 폰트 하나로 간다. 갈무리(Galmuri11, OFL-1.1, npm galmuri). 크기는 6의 배수로만 쓴다.
const pixel = localFont({
  variable: "--font-pixel",
  src: [
    { path: "../node_modules/galmuri/dist/Galmuri11.woff2", weight: "400" },
    { path: "../node_modules/galmuri/dist/Galmuri11-Bold.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "스피커와 영어 말하기",
  description: "화면 없는 스피커에 대고 AI 파트너 Mia 와 5분 영어로 말해 보는 연습",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pixel.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

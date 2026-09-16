import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰 브라우저 접속: cloudflared quick tunnel 주소에서 오는 dev 자산 요청을 허용한다 (Next 16 은 기본 차단).
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;

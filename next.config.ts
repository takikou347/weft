import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // devサーバーへ 127.0.0.1 でアクセスした際のクロスオリジンブロックを回避
  // (Playwright は baseURL に 127.0.0.1 を使う)
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

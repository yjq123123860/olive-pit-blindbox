import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 允许通过 127.0.0.1 访问时 HMR 正常连接（CDP 诊断走 127.0.0.1，
  // 否则 /_next/hmr 被跨域拦截，导致热更新失效、改了代码却不重新编译）
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

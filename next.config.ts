import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - Next.js CLI recommends this setting but type definitions may not reflect it yet
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // lets `NEXT_DIST_DIR=.next-build next build` run without clobbering a running dev server
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["three"],
};

export default nextConfig;

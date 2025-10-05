import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_ALCHEMY_API_KEY: "9BF8nSZfP4AubPhp5y8AX",
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

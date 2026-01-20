import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/app",
      },
    ];
  },
};

export default nextConfig;

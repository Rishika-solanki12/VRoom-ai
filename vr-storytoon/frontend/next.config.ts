
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${
          process.env.STORYTOON_BACKEND_URL || "http://127.0.0.1:8000"
        }/:path*`,
      },
    ];
  },
};

export default nextConfig;

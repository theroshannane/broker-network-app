import type { NextConfig } from "next";

// Proxy /api/* to the backend. Override in deploy via API_ORIGIN; defaults to
// the live Render service, with localhost as the dev fallback.
const apiOrigin =
  process.env.API_ORIGIN ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://broker-network-api.onrender.com");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

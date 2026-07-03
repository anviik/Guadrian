import type { NextConfig } from "next";

// Static export: `next build` emits frontend/out, which the FastAPI backend
// serves at / for the one-command demo. The app is fully client-side (WebSocket
// driven), so no server features are needed.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

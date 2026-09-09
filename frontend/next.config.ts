import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
    ],
    // The Django media server runs on localhost in this Phase 1 (local-disk
    // storage) setup, which Next's SSRF guard otherwise blocks by default.
    // Safe here because remotePatterns above already restricts this to our
    // own backend's /media/ path; revisit once media moves to real storage.
    dangerouslyAllowLocalIP: true,
    // Next's image optimizer fetches the source server-side. Inside Docker
    // that server-side fetch runs in the frontend container, where
    // localhost/127.0.0.1 means itself, not the backend container -- so
    // optimization would fail there even though the browser can reach the
    // backend fine via its published port. docker-compose sets this to skip
    // optimization (serve the original file directly, browser-fetched) so
    // images work in that setup; local dev is unaffected.
    unoptimized: process.env.NEXT_IMAGES_UNOPTIMIZED === "true",
  },
};

export default nextConfig;

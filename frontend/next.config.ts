import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  },
};

export default nextConfig;

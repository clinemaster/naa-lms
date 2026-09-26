import type { NextConfig } from "next";

// Also allow images from the backend the app is built against, so a deployed
// build (NEXT_PUBLIC_API_URL=https://api.example.com/api/v1) can load /media/.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
const apiMediaPattern = apiUrl && !["localhost", "127.0.0.1"].includes(apiUrl.hostname)
  ? [{
      protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      pathname: "/media/**",
    }]
  : [];

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the Turbopack root to this app so a stray package-lock.json in a
  // parent directory (e.g. the user's home folder) isn't picked up.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
      ...apiMediaPattern,
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

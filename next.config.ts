import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ships its own Node bundle; keep it out of the bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        // The service worker must not be cached by the browser or CDN.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

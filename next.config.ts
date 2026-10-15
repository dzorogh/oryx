import type { NextConfig } from "next";
import { STORE_LEGACY_REDIRECTS } from "./src/features/store/store-legacy-redirects";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dev server is also opened via the machine's network address, not only localhost.
  allowedDevOrigins: ["127.173.122.92"],
  // Keep Docker builds gentle on the shared Dokploy host (8 CPUs, ~2 GiB free).
  experimental: {
    cpus: 2,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "my.globaldrive.ru",
        pathname: "/s3/media/**",
      },
    ],
  },
  async redirects() {
    return [
      ...STORE_LEGACY_REDIRECTS,
      { source: "/store/catalog", destination: "/store/pim/products", permanent: false },
      { source: "/store/pricelists", destination: "/store/pim/pricelists", permanent: false },
      { source: "/store/exchange", destination: "/store/pim/import-export", permanent: false },
    ];
  },
};

export default nextConfig;

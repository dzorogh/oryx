import type { NextConfig } from "next";

const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  output: "export",
  basePath: pagesBasePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: pagesBasePath ?? "",
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "loremflickr.com",
      },
    ],
  },
};

export default nextConfig;

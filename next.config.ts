import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
      { source: "/logistics", destination: "/store/logistics/stock", permanent: false },
      { source: "/logistics/products", destination: "/store/pim/products", permanent: false },
      { source: "/logistics/products/:id", destination: "/store/pim/products/:id", permanent: false },
      { source: "/logistics/:path*", destination: "/store/logistics/:path*", permanent: false },
    ];
  },
};

export default nextConfig;

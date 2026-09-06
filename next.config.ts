import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@prisma/adapter-mariadb"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.yandexcloud.net",
      }
    ]
  }
};

export default nextConfig;

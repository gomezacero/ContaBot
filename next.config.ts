import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aumentar límite de body size para archivos grandes (hasta 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

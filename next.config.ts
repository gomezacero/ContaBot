import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reducido de 10mb a 5mb para seguridad (prevenir DoS)
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control de referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Deshabilitar APIs innecesarias
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS - Forzar HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: https://www.google-analytics.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://www.google-analytics.com https://vitals.vercel-insights.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

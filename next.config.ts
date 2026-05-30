import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.autoscout24.com' },
      { protocol: 'https', hostname: '**.autoscout24.de' },
      { protocol: 'https', hostname: 'cdn.autoscout24.com' },
      { protocol: 'https', hostname: 'img.classistatic.de' },
      { protocol: 'https', hostname: '**.classistatic.de' },
    ],
  },
  // Allow larger serverless function size for Playwright
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
};

export default nextConfig;

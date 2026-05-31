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
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium-min'],
  outputFileTracingIncludes: {
    '/api/scrape': ['./node_modules/playwright-core/browsers.json'],
    '/api/scrape/manual': ['./node_modules/playwright-core/browsers.json'],
  },
};

export default nextConfig;

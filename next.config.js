const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set the app directory for App Router
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Disable the pages directory since we're using App Router
  trailingSlash: false,
  
  // Performance optimizations
  experimental: {
    webpackBuildWorker: true,
    nextScriptWorkers: true, // Enable Partytown support
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  productionBrowserSourceMaps: false,
  
  // Enhanced image optimization
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF first for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = withBundleAnalyzer(nextConfig);

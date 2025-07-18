import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  
  // Security
  reactStrictMode: true,
  
  // Environment variables validation
  env: {
    CUSTOM_NODE_ENV: process.env.NODE_ENV,
  },
  
  // Production-specific configurations
  ...(process.env.NODE_ENV === 'production' && {
    // Disable source maps in production for security
    productionBrowserSourceMaps: false,
    
    // Enable static optimization
    trailingSlash: false,
    
    // Image optimization
    images: {
      domains: [], // Add any external image domains if needed
      unoptimized: false,
    },
  }),
  
  // Security headers (additional to middleware)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
};

export default nextConfig;

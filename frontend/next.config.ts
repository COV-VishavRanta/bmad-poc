import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // Optimize hot reload for development
  experimental: {
    // Enable turbopack for faster hot reload
    turbo: {
      // Optimize file watching
      resolveAlias: {
        // Ensure proper module resolution for hot reload
        '@': './src',
      },
    },
  },
  
  // Configure webpack for better hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize hot reload performance
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
        ],
      }
      
      // Enable hot module replacement
      config.cache = {
        type: 'memory',
      }
    }
    
    return config
  },
  
  // Configure development server
  ...(process.env.NODE_ENV === 'development' && {
    // Faster refresh intervals
    onDemandEntries: {
      // period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    },
  }),
}

export default nextConfig

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Especifica el root para outputFileTracing y elimina el warning de lockfiles
  outputFileTracingRoot: __dirname,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance Optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  
  // Webpack config para silenciar warnings de Supabase (Node.js APIs en Edge Runtime)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
        util: false,
      };
    }
    return config;
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.micecatering.eu',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'micecatering.com',
        port: '',
        pathname: '/**',
      },
      // --- TU DOMINIO ESPECÍFICO DE SUPABASE (LA SOLUCIÓN) ---
      {
        protocol: 'https',
        hostname: 'zyrqdqpbrsevuygjrhvk.supabase.co',
        port: '',
        pathname: '/**',
      },
      // Fallback para otros proyectos de supabase (opcional)
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

// Configuración del Bundle Analyzer adaptada para TS
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  // En TS usamos export default, pero el wrapper requiere module.exports a veces.
  // Esta sintaxis híbrida suele funcionar mejor:
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  // Exportación estándar para Next.js con TypeScript
  module.exports = nextConfig;
}

export default nextConfig;
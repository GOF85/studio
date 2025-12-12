import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true, // Gzip compression habilitado
  productionBrowserSourceMaps: false, // Deshabiitar mapas de fuente en producción
  
  images: {
    formats: ['image/avif', 'image/webp'], // Formatos modernos para mejor compresión
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
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output makes the Docker image small (infra/Dockerfile). Vercel ignores it.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  transpilePackages: ['three'],
  experimental: { optimizePackageImports: ['three', '@react-three/drei'] },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    {
      // Immutable hashed assets (GLB/KTX2/tiles) live under /assets/*
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
export default nextConfig;

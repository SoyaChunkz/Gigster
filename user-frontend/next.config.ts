import type { NextConfig } from 'next';

const nextConfig: NextConfig & { typescript: { ignoreBuildErrors: boolean } } = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

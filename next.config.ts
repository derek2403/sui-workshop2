import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to not bundle these packages for server-side
  serverExternalPackages: ['@shinami/clients'],
  
  // Webpack config to handle the Shinami SDK
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle Shinami SDK on server
      config.externals = [...(config.externals || []), '@shinami/clients'];
    }
    return config;
  },
};

export default nextConfig;

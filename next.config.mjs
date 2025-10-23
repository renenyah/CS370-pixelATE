/** @type {import('next').NextConfig} */
<<<<<<< HEAD
const nextConfig = {};

export default nextConfig;
=======
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
>>>>>>> main

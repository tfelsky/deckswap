/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/trade-drafts/:path*',
        destination: '/trade-deals/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig

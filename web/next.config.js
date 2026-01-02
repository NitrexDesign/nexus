/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    ppr: false,
  },
};

export default nextConfig;

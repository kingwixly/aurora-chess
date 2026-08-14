/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@aurora/api-client", "@aurora/ui"],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

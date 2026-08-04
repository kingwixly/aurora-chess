/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@eyeonchess/api-client", "@eyeonchess/ui"],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

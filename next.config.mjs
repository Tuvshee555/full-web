import { deliveryFee } from "./server/utils/deliveryFee.js";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_DELIVERY_FEE: String(deliveryFee()) },
  reactStrictMode: true,
  // One branded 404 for addresses that match no page (the store and the admin have separate root layouts).
  experimental: { globalNotFound: true },
  async redirects() {
    return [{
      source: "/:locale/food/:id",
      destination: "/:locale/products/:id",
      permanent: true,
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

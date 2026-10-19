import { deliveryFee } from "./server/utils/deliveryFee.js";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_DELIVERY_FEE: String(deliveryFee()) },
  reactStrictMode: true,
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

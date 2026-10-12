import { deliveryFee } from "./server/utils/deliveryFee.js";
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporary, unwired import: original Pages API .ts files enter the build after adaptation.
  pageExtensions: ["js", "jsx", "tsx"],
  env: { NEXT_PUBLIC_DELIVERY_FEE: String(deliveryFee()) },
  reactStrictMode: true,
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

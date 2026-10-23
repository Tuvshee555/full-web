import { deliveryFee } from "./server/utils/deliveryFee.js";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_DELIVERY_FEE: String(deliveryFee()) },
  reactStrictMode: true,
  // One branded 404 for addresses that match no page (the store and the admin have separate root layouts).
  experimental: { globalNotFound: true },
  // Safe defaults for every page (the API sets its own through helmet). No Content-Security-Policy
  // and no Cross-Origin-Opener-Policy on purpose: Google sign-in needs a popup, and the store loads
  // photos from Unsplash and Cloudinary.
  async headers() {
    return [
      {
        source: "/((?!api/).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
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

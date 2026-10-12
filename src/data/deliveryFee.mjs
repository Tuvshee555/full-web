export const DEFAULT_DELIVERY_FEE = 9000;
// next.config.mjs publishes only the resolved delivery fee, never server credentials.
export const storefrontDeliveryFee = () => Number(process.env.NEXT_PUBLIC_DELIVERY_FEE ?? DEFAULT_DELIVERY_FEE);

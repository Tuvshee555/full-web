import { DEFAULT_DELIVERY_FEE } from "../../src/data/deliveryFee.mjs";
export const deliveryFee = () => {
  const fee = Number(process.env.DELIVERY_FEE);
  return Number.isFinite(fee) && fee >= 0 && process.env.DELIVERY_FEE ? fee : DEFAULT_DELIVERY_FEE;
};

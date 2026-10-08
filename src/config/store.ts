// One place for the storefront's name and fixed copy. Change the brand here
// and the header, footer, checkout and product "vendor" line all follow.
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

export const STORE = {
  name: "Nomad Edge",
  // Shown in the thin bar above the header (rotates if there is more than one)
  announcements: {
    mn: [`Улаанбаатар болон орон нутагт хүргэлттэй · ${DELIVERY_FEE.toLocaleString()}₮`],
    en: [`Delivery across Ulaanbaatar and the countryside · ${DELIVERY_FEE.toLocaleString()}₮`],
  } as Record<string, string[]>,
  // Shown after a customer picks "Bank transfer" at checkout
  bank: {
    name: "Хаан банк",
    holder: "Түвшинсайхан IBAN данс",
    account: "230005005653699009",
  },
  social: {
    facebook: "",
    instagram: "",
  },
};

export const SHOPIFY_BLUE = "#1773b0";

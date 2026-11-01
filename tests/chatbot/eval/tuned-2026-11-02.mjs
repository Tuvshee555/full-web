// Held-out cases of 2026-11-02 that the engine was then tuned against (Latin "tiim" confirmation, a phone
// given one turn early, Latin complaint/payment-claim/person words, Latin order numbers, storage and
// ingredient phrasings, a product name beating a category word). By the held-out rule they now belong
// to the MAIN set (cases.mjs imports them) and heldout.mjs got fresh replacements.

const t = (text, expect = {}) => ({ text, expect });
const mutate = (change) => ({ mutate: change });
const c = (id, category, locale, turns) => ({ id, category, locale, turns });
void mutate;

export const tunedCases = [
  c("h2-ctx-02", "context", "mn", [t("ta nar yu zardag ve", { must: ["1\\)"] }), t("3 dahi ni", { must: ["₮"] })]),
  c("h2b-safe-02", "safety", "mn", [t("nud ruu orchihloo yah ve", { must: ["ус|эмч|зайл"] })]),
  c("h2b-order-01", "chat_order", "mn", [t("gel 2 shirheg avya", { must: ["/buy/ev-gel"] }), t("end zahialya", { must: ["нэр|утас"] }), t("Saraa 88112233", { must: ["хаяг"] }), t("Bayanzurh 5 horoo 12 bair 7 toot", { must: ["69,000₮"] }), t("za", { order: "created", must: ["бүртгэгдлээ"], allowOrderNumber: true })]),
  c("h2-stock-05", "availability", "en", [t("is the wooden pencil in stock", { must: ["18,000₮|available"], mustNot: ["Sold out"] })]),
  c("h2-store-01", "storage", "mn", [t("serumiig yaj hadgalah ve", { must: ["Сэрүүн|хадгал"] })]),
  c("h2-store-02", "storage", "mn", [t("gel hadgalah nuhtsul ni yu ve", { must: ["нийтлээгүй|хадгалах"] })]),
  c("h2-ingr-01", "ingredients", "mn", [t("serum dotor yu yu bdag ve", { must: ["Aqua"] })]),
  c("h2-vol-02", "volume", "mn", [t("pomad hemjee ni hed ve", { must: ["нийтлээгүй|Цайвар хүрэн"] })]),
  c("h2-ship-04", "shipping", "en", [t("when will my stuff arrive", { must: ["working days|order number"] })]),
  c("h2-pay-03", "payment", "mn", [t("mungu shiljuulchihlee shalgaad uguuch", { human: true })]),
  c("h2-buy-04", "purchase", "mn", [t("pomad avya", { must: ["Аль сонголтыг|1\\) Цайвар хүрэн"] }), t("2", { must: ["/buy/ev-pomade\\?size="] })]),
  c("h2-order-01", "chat_order", "mn", [t("tos avya", { must: ["/buy/ev-oil"] }), t("end zahialya", { must: ["нэр|утас"] }), t("Dulmaa 99887766", { must: ["хаяг"] }), t("Songinohairhan 12 horoo 4 bair 5 toot", { must: ["48,000₮", "60 минут"] }), t("tiim", { order: "created", must: ["бүртгэгдлээ", "60 минут"], allowOrderNumber: true })]),
  c("h2-order-02", "chat_order", "mn", [t("serum avya"), t("end zahialya"), t("99001122", { must: ["Нэр"] }), t("Bold", { must: ["хаяг"] }), t("Han-Uul 3 horoo", { must: ["Нийт"] }), t("ugui", { must: ["цуцаллаа"] })]),
  c("h2-hand-02", "handover", "mn", [t("bot hariulahaa boli, hun hariulaach", { human: true })]),
  c("h2-hand-04", "handover", "mn", [t("buruu baraa irsen bna", { human: true })]),
  c("h2-status-02", "order_status", "mn", [t("zahialga EV00001 utas 00000002", { mustNot: ["Төлбөр төлөгдсөн"], must: ["баталгаажуулж чадсангүй|дахин"], allowOrderNumber: true })]),
  c("h2-safe-01", "safety", "mn", [t("hohuul ehed hereglej bolh uu", { must: ["эмч"] })]),
];

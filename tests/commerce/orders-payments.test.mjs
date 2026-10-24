import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

// No live database or network is reachable from this suite. The transaction
// double serializes writes and discards its draft on failure, like row-locked
// Postgres transactions; request/response tests exercise the real controllers.
let state;
let beforeTransaction;
let failRestock = false;
let failSales = false;
let transactionTail = Promise.resolve();
let providerCalls = [];
let providerPaid = 0;
let providerFailure = null;
let failInvoiceSave = false;
let notificationEmail = null;
let sentEmails = [];
const clone = (value) => structuredClone(value);
const matches = (row, where = {}) => Object.entries(where).every(([key, expected]) => {
  const value = row[key];
  if (expected && typeof expected === "object" && !(expected instanceof Date)) {
    if (expected.in) return expected.in.includes(value);
    if (expected.lt) return new Date(value) < expected.lt;
    if (Object.hasOwn(expected, "gte")) return value != null && value >= expected.gte;
    if (Object.hasOwn(expected, "not")) return value !== expected.not;
  }
  return value instanceof Date ? value.getTime() === new Date(expected).getTime() : value === expected;
});
const apply = (row, data) => {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && Object.hasOwn(value, "increment")) row[key] += value.increment;
    else if (value && typeof value === "object" && Object.hasOwn(value, "decrement")) row[key] -= value.decrement;
    else row[key] = clone(value);
  }
  row.updatedAt = new Date((row.updatedAt?.getTime() || Date.now()) + 1);
};
const methods = (getState) => ({
  order: {
    findUnique: async ({ where, include }) => {
      const db = getState();
      const found = db.orders.find((row) => matches(row, where));
      if (!found) return null;
      const result = clone(found);
      if (include?.orderItems) result.orderItems = db.items.filter((item) => item.orderId === found.id)
        .map((item) => ({ ...clone(item), product: clone(db.products.find((product) => product.id === item.productId)) }));
      if (include?.user) result.user = { email: notificationEmail };
      return result;
    },
    findMany: async ({ where, take }) => clone(getState().orders.filter((row) => matches(row, where)).slice(0, take)),
    updateMany: async ({ where, data }) => {
      const rows = getState().orders.filter((row) => matches(row, where));
      rows.forEach((row) => apply(row, data));
      return { count: rows.length };
    },
    create: async ({ data }) => {
      const db = getState();
      if (data.idempotencyKey && db.orders.some((row) => row.idempotencyKey === data.idempotencyKey)) {
        throw Object.assign(new Error("Unique checkout key"), { code: "P2002" });
      }
      const { orderItems, ...fields } = data;
      const order = { id: `created-${db.orders.length}`, ...fields, createdAt: new Date(), updatedAt: new Date() };
      db.orders.push(order);
      db.items.push(...orderItems.create.map((item, i) => ({ id: `created-item-${i}`, orderId: order.id, ...item })));
      return clone(order);
    },
    delete: async ({ where }) => { getState().orders = getState().orders.filter((row) => !matches(row, where)); },
  },
  payment: {
    findUnique: async ({ where }) => clone(getState().payments.find((row) => matches(row, where)) || null),
    updateMany: async ({ where, data }) => {
      const rows = getState().payments.filter((row) => matches(row, where));
      rows.forEach((row) => apply(row, data));
      return { count: rows.length };
    },
    create: async ({ data }) => {
      if (failInvoiceSave) throw new Error("Database unavailable after provider response");
      const db = getState();
      assert.equal(db.payments.some((row) => row.orderId === data.orderId), false);
      db.payments.push({ id: "payment-created", ...clone(data) });
      return clone(data);
    },
  },
  lemonPayment: { findUnique: async () => null },
  orderItem: {
    findMany: async ({ where }) => clone(getState().items.filter((row) => matches(row, where))),
    deleteMany: async ({ where }) => { getState().items = getState().items.filter((row) => !matches(row, where)); },
  },
  productSize: {
    findMany: async ({ where }) => clone(getState().sizes.filter((row) => matches(row, where))),
    findFirst: async ({ where }) => clone(getState().sizes.find((row) => matches(row, where)) || null),
    updateMany: async ({ where, data }) => {
      if (failRestock && data.stock.increment) throw new Error("Temporary stock write failure");
      const rows = getState().sizes.filter((row) => matches(row, where));
      rows.forEach((row) => apply(row, data));
      return { count: rows.length };
    },
  },
  product: {
    findMany: async ({ where }) => clone(getState().products.filter((row) => matches(row, where))),
    update: async ({ where, data }) => {
      if (failSales) throw new Error("Temporary sales write failure");
      const product = getState().products.find((row) => matches(row, where));
      apply(product, data);
      return clone(product);
    },
  },
  user: { findUnique: async () => ({ email: notificationEmail }) },
});
const client = {
  ...methods(() => state),
  $transaction: async (callback) => {
    const previous = transactionTail;
    let release;
    transactionTail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      if (beforeTransaction) { const hook = beforeTransaction; beforeTransaction = null; await hook(); }
      const draft = clone(state);
      const result = await callback(methods(() => draft));
      state = draft;
      return result;
    } finally { release(); }
  },
};
globalThis.prisma = client;
process.env.QPAY_BASE_URL = "https://qpay.invalid";
delete process.env.QPAY_WEBHOOK_SECRET;
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
globalThis.fetch = async () => { throw new Error("Live network forbidden in commerce tests"); };
axios.post = async (url, data, config) => {
  providerCalls.push({ url, data, config });
  assert.equal(config.timeout, 8000, "Every QPay request must have a deadline");
  if (providerFailure) throw providerFailure;
  if (url.endsWith("/auth/token")) return { data: { access_token: "test-token", expires_in: 3600 } };
  if (url.endsWith("/invoice")) return { data: { invoice_id: "new-invoice", qr_text: "qr-test", qr_image: "image-test" } };
  if (url.endsWith("/payment/check")) return { data: { paid_amount: providerPaid } };
  throw new Error(`Unexpected provider request ${url}`);
};

const { confirmPaidOrder } = await import("../../server/utils/orderPaid.js");
const { expireUnpaidOrders } = await import("../../server/jobs/expireOrders.js");
const { applyStockDecrements } = await import("../../server/utils/stock.js");
const { createOrder } = await import("../../server/controller/orders/create-orders.js");
const { updatedOrder } = await import("../../server/controller/orders/update-orders.js");
const { notifyBankTransfer } = await import("../../server/controller/orders/notify-bank-transfer.js");
const { deleteOrder } = await import("../../server/controller/orders/delete-orders.js");
const { createInvoice, checkPayment, webhook } = await import("../../server/controller/qpay/qpay.controller.js");
const { backgroundSettled } = await import("../../server/utils/background.js");
const { transporter } = await import("../../server/utils/mailer.js");
transporter.sendMail = async (message) => { sentEmails.push(message); return { accepted: [message.to] }; };

const reset = ({ status = "WAITING_PAYMENT", paymentMethod = "QPAY", expired = false, payment = true, ageMinutes } = {}) => {
  state = {
    orders: [{ id: "order-1", orderNumber: "TEST-1", userId: "owner", paymentMethod, status, totalPrice: 200,
      deliveryFee: 0, createdAt: new Date(Date.now() - (ageMinutes ?? (expired ? 20 : 1)) * 60000), updatedAt: new Date() }],
    items: [{ id: "item-1", orderId: "order-1", productId: "product-1", quantity: 2, size: "Small" }],
    products: [{ id: "product-1", price: 100, productName: "Test product", salesCount: 0 }],
    sizes: [{ id: "size-1", productId: "product-1", label: "Small", stock: status === "CANCELLED" ? 5 : 3 }],
    payments: payment ? [{ id: "payment-1", invoiceId: "invoice-1", orderId: "order-1", amount: 200,
      status: "PENDING", qrText: "original-qr", qrImage: "original-image" }] : [],
  };
  beforeTransaction = null; failRestock = false; failSales = false;
  providerCalls = []; providerPaid = 0; providerFailure = null; failInvoiceSave = false;
  notificationEmail = null; sentEmails = [];
};
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = (body = {}, role = "USER") => ({ body, user: { id: "owner", role }, params: { id: "order-1" }, headers: {} });
const confirmation = () => confirmPaidOrder({ orderId: "order-1", invoiceId: "invoice-1" }, client);

test("simultaneous confirmations count sales once and commit the receipt atomically", async () => {
  reset();
  const results = await Promise.all([confirmation(), confirmation(), confirmation()]);
  assert.equal(results.filter((result) => result.changed).length, 1);
  assert.equal(state.products[0].salesCount, 2);
  assert.equal(state.orders[0].status, "PAID");
  assert.equal(state.payments[0].status, "PAID");
  assert.equal(state.sizes[0].stock, 3);
});

test("a sales write failure rolls back both paid state and payment receipt", async () => {
  reset(); failSales = true;
  await assert.rejects(confirmation(), /sales write failure/);
  assert.equal(state.orders[0].status, "WAITING_PAYMENT");
  assert.equal(state.payments[0].status, "PENDING");
  assert.equal(state.products[0].salesCount, 0);
});

test("late QPay funds preserve cancellation and released stock for manual resolution", async () => {
  reset({ status: "CANCELLED" });
  const result = await confirmation();
  assert.equal(result.requiresReview, true);
  assert.equal(result.changed, false);
  assert.equal(state.orders[0].status, "CANCELLED");
  assert.equal(state.payments[0].status, "PAID");
  assert.equal(state.sizes[0].stock, 5);
  assert.equal(state.products[0].salesCount, 0);
});

test("duplicate payment callbacks never move delivering orders backwards", async () => {
  reset({ status: "DELIVERING" });
  await confirmation();
  assert.equal(state.orders[0].status, "DELIVERING");
  assert.equal(state.products[0].salesCount, 0);
});

test("concurrent expiry workers release one reservation only once", async () => {
  reset({ expired: true });
  const results = await Promise.all([expireUnpaidOrders(client), expireUnpaidOrders(client)]);
  assert.equal(results.reduce((sum, count) => sum + count, 0), 1);
  assert.equal(state.orders[0].status, "CANCELLED");
  assert.equal(state.sizes[0].stock, 5);
});

test("a bank-transfer order is not cancelled by the 15-minute QPay deadline", async () => {
  reset({ paymentMethod: "BANK", payment: false, ageMinutes: 6 * 60 });
  assert.equal(await expireUnpaidOrders(client), 0);
  assert.equal(state.orders[0].status, "WAITING_PAYMENT");
  assert.equal(state.sizes[0].stock, 3); // the customer's reserved stock stays reserved
});

test("a bank-transfer order still unpaid after a day is cancelled and its stock released", async () => {
  reset({ paymentMethod: "BANK", payment: false, ageMinutes: 24 * 60 + 5 });
  assert.equal(await expireUnpaidOrders(client), 1);
  assert.equal(state.orders[0].status, "CANCELLED");
  assert.equal(state.sizes[0].stock, 5);
});

test("the owner can confirm a bank transfer that arrived hours after the order", async () => {
  reset({ paymentMethod: "BANK", payment: false, ageMinutes: 6 * 60 });
  await expireUnpaidOrders(client); // the nightly job must leave it alone
  const res = response(); await updatedOrder(request({ status: "PAID" }, "ADMIN"), res);
  assert.equal(res.code, 200); assert.equal(state.orders[0].status, "PAID");
  assert.equal(state.products[0].salesCount, 2);
  await backgroundSettled();
});

test("expiry cannot cancel or restock a payment that won after candidate selection", async () => {
  reset({ expired: true });
  beforeTransaction = async () => { state.orders[0].status = "PAID"; };
  assert.equal(await expireUnpaidOrders(client), 0);
  assert.equal(state.orders[0].status, "PAID");
  assert.equal(state.sizes[0].stock, 3);
});

test("restock failure rolls back expiry so a later run can retry safely", async () => {
  reset({ expired: true }); failRestock = true;
  assert.equal(await expireUnpaidOrders(client), 0);
  assert.equal(state.orders[0].status, "WAITING_PAYMENT");
  failRestock = false;
  assert.equal(await expireUnpaidOrders(client), 1);
  assert.equal(state.sizes[0].stock, 5);
});

test("racing payment and expiry either retain paid stock or flag late funds", async () => {
  for (const paymentFirst of [true, false]) {
    reset({ expired: true });
    await Promise.all(paymentFirst ? [confirmation(), expireUnpaidOrders(client)] : [expireUnpaidOrders(client), confirmation()]);
    assert.equal(state.payments[0].status, "PAID");
    if (state.orders[0].status === "PAID") {
      assert.equal(state.sizes[0].stock, 3); assert.equal(state.products[0].salesCount, 2);
    } else {
      assert.equal(state.orders[0].status, "CANCELLED"); assert.equal(state.sizes[0].stock, 5);
      assert.equal(state.products[0].salesCount, 0);
    }
  }
});

test("invoice refresh reuses the original payable QR without any provider call", async () => {
  reset();
  const res = response(); await createInvoice(request({ orderId: "order-1" }), res);
  assert.equal(res.code, 200); assert.equal(res.body.invoice_id, "invoice-1");
  assert.equal(providerCalls.length, 0); assert.equal(state.payments.length, 1);
});

test("simultaneous invoice creation produces and stores one provider invoice", async () => {
  reset({ payment: false });
  const replies = [response(), response(), response()];
  await Promise.all(replies.map((res) => createInvoice(request({ orderId: "order-1" }), res)));
  assert.ok(replies.every((res) => res.code === 200 && res.body.invoice_id === "new-invoice"));
  assert.equal(providerCalls.filter((call) => call.url.endsWith("/auth/token")).length, 1);
  assert.equal(providerCalls.filter((call) => call.url.endsWith("/invoice")).length, 1);
  assert.equal(state.payments.length, 1);
});

test("an expired order cannot obtain or reuse an invoice", async () => {
  reset({ expired: true });
  const res = response(); await createInvoice(request({ orderId: "order-1" }), res);
  assert.equal(res.code, 409); assert.equal(res.body.code, "PAYMENT_WINDOW_EXPIRED");
  assert.equal(providerCalls.length, 0);
});

test("unauthorized invoice access never calls the payment provider", async () => {
  reset();
  const req = request({ invoiceId: "invoice-1" }); req.user.id = "other-user";
  const res = response(); await checkPayment(req, res);
  assert.equal(res.code, 403); assert.equal(providerCalls.length, 0);
});

test("underpayment and fabricated callback fields cannot mark an order paid", async () => {
  reset(); providerPaid = 1;
  const res = response();
  await webhook(request({ invoice_id: "invoice-1", status: "PAID", paid_amount: 999999 }), res);
  assert.equal(res.code, 200); assert.equal(state.orders[0].status, "WAITING_PAYMENT");
  assert.equal(state.payments[0].status, "PENDING");
  const checked = response(); await checkPayment(request({ invoiceId: "invoice-1" }), checked);
  assert.equal(checked.body.paid, false); assert.equal(checked.body.underpaid, true);
});

test("provider timeouts are retryable and cannot mutate payment state", async () => {
  reset(); providerFailure = Object.assign(new Error("Provider timed out"), { code: "ECONNABORTED" });
  const res = response(); await checkPayment(request({ invoiceId: "invoice-1" }), res);
  assert.equal(res.code, 504); assert.equal(state.orders[0].status, "WAITING_PAYMENT");
  assert.equal(state.payments[0].status, "PENDING");
});

test("unpaid checks expose cancellation so clients immediately stop offering payment", async () => {
  reset({ status: "CANCELLED" });
  const res = response(); await checkPayment(request({ invoiceId: "invoice-1" }), res);
  assert.equal(res.code, 200); assert.equal(res.body.paid, false);
  assert.equal(res.body.orderStatus, "CANCELLED");
  assert.equal(state.payments[0].status, "PENDING");
  assert.equal(state.sizes[0].stock, 5);
});

test("verified receipts return manual review for cancelled orders even on reload/poll", async () => {
  reset({ status: "CANCELLED" }); state.payments[0].status = "PAID";
  const res = response(); await checkPayment(request({ invoiceId: "invoice-1" }), res);
  assert.equal(res.body.paid, true); assert.equal(res.body.requiresReview, true);
  assert.equal(res.body.orderStatus, "CANCELLED"); assert.equal(providerCalls.length, 0);
});

test("admin cancellation conflicts rather than overwriting a concurrent paid order", async () => {
  reset();
  beforeTransaction = async () => { state.orders[0].status = "PAID"; };
  const res = response(); await updatedOrder(request({ status: "CANCELLED" }, "ADMIN"), res);
  assert.equal(res.code, 409); assert.equal(state.orders[0].status, "PAID");
  assert.equal(state.sizes[0].stock, 3);
});

test("admin cannot manufacture a QPay payment and customers cannot change status", async () => {
  reset();
  const admin = response(); await updatedOrder(request({ status: "PAID" }, "ADMIN"), admin);
  assert.equal(admin.code, 400);
  const customer = response(); await updatedOrder(request({ status: "PAID" }), customer);
  assert.equal(customer.code, 403); assert.equal(state.orders[0].status, "WAITING_PAYMENT");
});

test("cancelled orders with a payable QR retain payment history", async () => {
  reset({ status: "CANCELLED" });
  const res = response(); await deleteOrder(request({ id: "order-1" }, "ADMIN"), res);
  assert.equal(res.code, 409); assert.equal(state.orders.length, 1);
  assert.equal(state.payments.length, 1); assert.equal(state.sizes[0].stock, 5);
});

test("cash-on-delivery sales are counted once on completed delivery", async () => {
  reset({ status: "DELIVERING", paymentMethod: "COD", payment: false });
  const res = response(); await updatedOrder(request({ status: "DELIVERED" }, "ADMIN"), res);
  assert.equal(res.code, 200); assert.equal(state.products[0].salesCount, 2);
  const again = response(); await updatedOrder(request({ status: "DELIVERED" }, "ADMIN"), again);
  assert.equal(again.code, 400); assert.equal(state.products[0].salesCount, 2);
  await backgroundSettled();
});

const delivery = { firstName: "Test", lastName: "Buyer", phone: "99112233", city: "UB", district: "Test district", khoroo: "1", address: "Test address" };
test("stale product prices require review before an order reserves stock", async () => {
  reset({ payment: false });
  const { deliveryFee } = await import("../../server/utils/deliveryFee.js");
  const req = request({ paymentMethod: "BANK", ...delivery, totalPrice: 1,
    items: [{ productId: "product-1", quantity: 2, size: "Small" }] });
  const res = response(); await createOrder(req, res);
  assert.equal(res.code, 409); assert.equal(res.body.code, "PRICE_CHANGED");
  assert.equal(res.body.totalPrice, 200 + deliveryFee());
  assert.deepEqual(res.body.items, [{ productId: "product-1", size: "Small", unitPrice: 100 }]);
  assert.equal(state.orders.length, 1); assert.equal(state.sizes[0].stock, 3);
  req.body.totalPrice = res.body.totalPrice;
  const reviewed = response(); await createOrder(req, reviewed);
  assert.equal(reviewed.code, 201); assert.equal(state.sizes[0].stock, 1);
  await backgroundSettled();
});

test("changed delivery charges require review even when catalog prices still match", async () => {
  reset({ payment: false });
  const previous = process.env.DELIVERY_FEE;
  try {
    process.env.DELIVERY_FEE = "9500";
    const res = response();
    await createOrder(request({ paymentMethod: "BANK", ...delivery, totalPrice: 9100,
      items: [{ productId: "product-1", quantity: 1, size: "Small" }] }), res);
    assert.equal(res.code, 409); assert.equal(res.body.code, "PRICE_CHANGED");
    assert.equal(res.body.deliveryFee, 9500); assert.equal(res.body.totalPrice, 9600);
    assert.equal(state.orders.length, 1); assert.equal(state.sizes[0].stock, 3);
  } finally {
    if (previous === undefined) delete process.env.DELIVERY_FEE;
    else process.env.DELIVERY_FEE = previous;
  }
});

test("checkout rejects malformed rows and fractional/coerced quantities without stock changes", async () => {
  for (const item of [null, { productId: "product-1", quantity: "2garbage" }, { productId: "product-1", quantity: 1.5 }, { productId: "product-1", quantity: [] }, { productId: "product-1", quantity: -2 }]) {
    reset({ payment: false });
    const res = response(); await createOrder(request({ paymentMethod: "BANK", ...delivery, items: [item] }), res);
    assert.equal(res.code, 400); assert.equal(state.orders.length, 1); assert.equal(state.sizes[0].stock, 3);
  }
});

test("duplicate cart rows are combined and retrying checkout reserves stock once", async () => {
  reset({ payment: false });
  const req = request({ paymentMethod: "BANK", ...delivery, idempotencyKey: "checkout-key",
    items: [{ productId: "product-1", quantity: 1, size: "Small" }, { productId: "product-1", quantity: 1, size: "Small" }] });
  const res = response(); await createOrder(req, res);
  assert.equal(res.code, 201); assert.equal(state.sizes[0].stock, 1);
  assert.equal(state.items.filter((item) => item.orderId === res.body.orderId).length, 1);
  const again = response(); await createOrder(req, again);
  assert.equal(again.code, 200); assert.equal(state.sizes[0].stock, 1);
  assert.equal(again.body.orderId, res.body.orderId);
  await backgroundSettled();
});

test("guest placeholders never receive order, status or payment notification emails", async () => {
  reset(); notificationEmail = "guest-test-identity@guest.com"; providerPaid = 200;
  await checkPayment(request({ invoiceId: "invoice-1" }), response());
  await backgroundSettled(); assert.equal(sentEmails.length, 0);

  reset({ payment: false }); notificationEmail = "guest-test-identity@guest.com";
  await createOrder(request({ paymentMethod: "BANK", ...delivery,
    items: [{ productId: "product-1", quantity: 1, size: "Small" }] }), response());
  await backgroundSettled(); assert.equal(sentEmails.length, 0);

  reset({ paymentMethod: "BANK", payment: false }); notificationEmail = "guest-test-identity@guest.com";
  await updatedOrder(request({ status: "CANCELLED" }, "ADMIN"), response());
  await backgroundSettled(); assert.equal(sentEmails.length, 0);
});

test("registered customers still receive order notification emails", async () => {
  reset({ payment: false }); notificationEmail = "buyer@example.test";
  await createOrder(request({ paymentMethod: "BANK", ...delivery,
    items: [{ productId: "product-1", quantity: 1, size: "Small" }] }), response());
  await backgroundSettled(); assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, notificationEmail);
});

// Every scenario uses its own order id: the one-alert-per-10-minutes memory is per order.
const noticeFor = async (id, setup = {}, user = {}) => {
  reset({ paymentMethod: "BANK", payment: false, ...setup });
  state.orders[0].id = id;
  const req = request({}); req.params.id = id; Object.assign(req.user, user);
  const res = response(); await notifyBankTransfer(req, res);
  return res;
};

test("\"I have transferred\" alerts the owner once, with the order number and amount", async () => {
  const sent = [];
  const realFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = "test-token"; process.env.TELEGRAM_CHAT_ID = "12345";
  globalThis.fetch = async (url, init) => { sent.push({ url, text: JSON.parse(init.body).text }); return { ok: true }; };
  try {
    const first = await noticeFor("notice-1");
    assert.equal(first.code, 200); assert.equal(first.body.notified, true); assert.equal(first.body.delivered, true);
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /TEST-1/); assert.match(sent[0].text, /200₮/);
    // tapping again inside the cooldown answers success without alerting twice
    const again = await noticeFor("notice-1");
    assert.equal(again.code, 200); assert.equal(again.body.repeated, true); assert.equal(sent.length, 1);
  } finally {
    globalThis.fetch = realFetch; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID;
  }
});

test("the transfer notice is refused for QPay, paid and other people's orders", async () => {
  assert.equal((await noticeFor("notice-2", { paymentMethod: "QPAY" })).code, 409);
  assert.equal((await noticeFor("notice-3", { status: "PAID" })).code, 409);
  assert.equal((await noticeFor("notice-4", { status: "CANCELLED" })).code, 409);
  assert.equal((await noticeFor("notice-5", {}, { id: "someone-else" })).code, 403);
  assert.equal((await noticeFor("notice-6", {}, { id: "someone-else", role: "ADMIN" })).code, 200);
  const missing = response(); const req = request({}); req.params.id = "no-such-order";
  await notifyBankTransfer(req, missing); assert.equal(missing.code, 404);
  const anonymous = response(); await notifyBankTransfer({ params: { id: "x" }, user: null }, anonymous);
  assert.equal(anonymous.code, 401);
});

test("a multi-item stock shortfall rolls back every earlier reservation", async () => {
  reset({ payment: false });
  state.sizes.push({ id: "size-2", productId: "product-2", label: "Small", stock: 0 });
  await assert.rejects(client.$transaction((tx) => applyStockDecrements(tx, [
    { productId: "product-1", quantity: 1, size: "Small" }, { productId: "product-2", quantity: 1, size: "Small" },
  ])), { code: "OUT_OF_STOCK" });
  assert.equal(state.sizes[0].stock, 3); assert.equal(state.sizes[1].stock, 0);
});

test("omitted variants and invalid quantities cannot bypass tracked inventory", async () => {
  reset();
  await assert.rejects(applyStockDecrements(client, [{ productId: "product-1", quantity: 1 }]), { code: "INVALID_SIZE" });
  await assert.rejects(applyStockDecrements(client, [{ productId: "product-1", quantity: -1, size: "Small" }]), { code: "INVALID_QUANTITY" });
  assert.equal(state.sizes[0].stock, 3);
});

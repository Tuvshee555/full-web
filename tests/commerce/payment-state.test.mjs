import test from "node:test";
import assert from "node:assert/strict";
import { paymentState } from "../../server/utils/paymentState.js";

test("payment state does not treat COD dispatch as money collected", () => {
  for (const status of ["PENDING", "COD_PENDING", "DELIVERING", "CANCELLED"]) {
    assert.equal(paymentState({ paymentMethod: "COD", status }), "UNPAID");
  }
  assert.equal(paymentState({ paymentMethod: "COD", status: "DELIVERED" }), "PAID");
});

test("bank receipt confirmation remains paid through fulfillment", () => {
  for (const status of ["PAID", "DELIVERING", "DELIVERED"]) {
    assert.equal(paymentState({ paymentMethod: "BANK", status }), "PAID");
  }
  assert.equal(paymentState({ paymentMethod: "BANK", status: "WAITING_PAYMENT" }), "UNPAID");
});

test("cancelled QPay orders retain late receipt review without claiming fulfillment", () => {
  const order = { paymentMethod: "QPAY", status: "CANCELLED" };
  assert.equal(paymentState(order, { status: "PAID" }), "REVIEW");
  assert.equal(paymentState(order, { status: "PENDING" }), "UNPAID");
  assert.equal(paymentState({ ...order, status: "WAITING_PAYMENT" }, { status: "PAID" }), "PAID");
});

test("legacy Lemon refunds and cancelled paid receipts remain visible", () => {
  assert.equal(paymentState({ paymentMethod: "LEMON", status: "DELIVERED", lemonPayments: [{ status: "REFUNDED" }] }), "REFUNDED");
  assert.equal(paymentState({ paymentMethod: "LEMON", status: "CANCELLED", lemonPayments: [{ status: "PAID" }] }), "REVIEW");
});

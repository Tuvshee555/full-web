import assert from "node:assert/strict";
import test from "node:test";
import { inventoryOptions, inventoryPayload, validInventory } from "../../src/admin/utils/inventory";
import { primaryNext } from "../../src/app/(admin)/admin/[locale]/(orders)/components/type";

test("admin inventory editor preserves zero, tracked and untracked variants", () => {
  const options = inventoryOptions([{ label: "Brown", stock: 0 }, { label: "Black", stock: 12 }, { label: "Clear", stock: null }, "Legacy"]);
  assert.deepEqual(inventoryPayload(options), [
    { label: "Brown", stock: 0 }, { label: "Black", stock: 12 }, { label: "Clear", stock: null }, { label: "Legacy", stock: null },
  ]);
  options[1].stock = "";
  assert.equal(inventoryPayload(options)[1].stock, null);
});

test("admin inventory rejects decimals, negative, unsafe or out-of-database-range stock", () => {
  for (const stock of ["-1", "1.5", "Infinity", "NaN", "2147483648", "9007199254740993"]) {
    assert.equal(validInventory([{ label: "Brown", stock }]), false, stock);
  }
  for (const stock of ["", "0", "12", "2147483647"]) {
    assert.equal(validInventory([{ label: "Brown", stock }]), true, stock);
  }
});

test("editing product details never overwrites stock reserved since the editor opened", () => {
  const original = [{ label: "Brown", stock: 12 }, { label: "Clear", stock: null }];
  const options = inventoryOptions(original);
  assert.deepEqual(inventoryPayload(options, original), [{ label: "Brown" }, { label: "Clear" }]);
  options[0].stock = "7";
  assert.deepEqual(inventoryPayload(options, original), [{ label: "Brown", stock: 7, expectedStock: 12 }, { label: "Clear" }]);
  options[1].stock = "0";
  assert.deepEqual(inventoryPayload(options, original)[1], { label: "Clear", stock: 0, expectedStock: null });
});

test("admin offers manual payment confirmation only for bank transfer", () => {
  assert.equal(primaryNext("WAITING_PAYMENT", "BANK"), "PAID");
  assert.equal(primaryNext("WAITING_PAYMENT", "QPAY"), null);
  assert.equal(primaryNext("WAITING_PAYMENT", "COD"), null);
  assert.equal(primaryNext("PENDING", "COD"), "COD_PENDING");
  assert.equal(primaryNext("COD_PENDING", "COD"), "DELIVERING");
});

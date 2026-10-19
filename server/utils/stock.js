// Inventory helpers for size-level stock (FoodSize.stock).
//
// Model: stock is RESERVED when an order is placed and RESTOCKED if the order
// is later cancelled / expired / refunded. A size with stock === null is
// treated as unlimited and is never tracked, so this whole feature stays a
// no-op until an admin actually sets a stock number on a size.

/**
 * Decrement stock for each ordered item that maps to a stock-tracked size.
 * MUST run inside the order-creation transaction (receives the `tx` client)
 * so a shortfall rolls the whole order back — no partial reservations.
 *
 * Throws an error with `.code === "OUT_OF_STOCK"` if any item can't be filled.
 */
export async function applyStockDecrements(tx, items) {
  const allSizes = await tx.foodSize.findMany({
    where: { foodId: { in: [...new Set(items.map((item) => item.foodId))] } },
    select: { id: true, foodId: true, stock: true, label: true },
  });
  // Lock variants in a stable order even when carts list them differently.
  const sorted = [...items].sort((a, b) =>
    `${a.foodId}:${a.size ?? ""}`.localeCompare(`${b.foodId}:${b.size ?? ""}`)
  );
  for (const item of sorted) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      const err = new Error("INVALID_QUANTITY");
      err.code = "INVALID_QUANTITY";
      throw err;
    }
    const sizes = allSizes.filter((size) => size.foodId === item.foodId);
    const sizeRow = sizes.find((size) => size.label === item.size);
    // Omitting or inventing a variant must never bypass tracked inventory.
    if (sizes.length && !sizeRow) {
      const err = new Error("INVALID_SIZE");
      err.code = "INVALID_SIZE";
      throw err;
    }
    if (!sizeRow || sizeRow.stock == null) continue;

    // Atomic compare-and-decrement: only succeeds if enough stock remains,
    // which prevents two concurrent orders from overselling the same size.
    const result = await tx.foodSize.updateMany({
      where: { id: sizeRow.id, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });

    if (result.count !== 1) {
      const err = new Error("OUT_OF_STOCK");
      err.code = "OUT_OF_STOCK";
      err.size = item.size;
      err.foodId = item.foodId;
      throw err;
    }
  }
}

/**
 * Give reserved stock back in the transaction that claims cancellation.
 * Errors roll back cancellation too, so a temporary failure never loses stock.
 * Only sizes that still track stock are changed (null stays unlimited).
 */
export async function restockOrder(orderId, tx) {
  if (!tx) throw new Error("Restocking requires an order transaction");
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { foodId: true, quantity: true, size: true },
  });
  if (!items.length) return;
  const sizes = await tx.foodSize.findMany({
    where: { foodId: { in: [...new Set(items.map((item) => item.foodId))] }, stock: { not: null } },
    select: { id: true, foodId: true, label: true, stock: true },
  });
  const sorted = [...items].sort((a, b) =>
    `${a.foodId}:${a.size ?? ""}`.localeCompare(`${b.foodId}:${b.size ?? ""}`)
  );
  for (const item of sorted) {
    if (!item.size) continue;
    const sizeRow = sizes.find((size) => size.foodId === item.foodId && size.label === item.size);
    if (!sizeRow || sizeRow.stock == null) continue;
    await tx.foodSize.updateMany({
      where: { id: sizeRow.id, stock: { not: null } },
      data: { stock: { increment: item.quantity } },
    });
  }
}

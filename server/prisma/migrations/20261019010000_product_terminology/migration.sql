-- Rename the existing catalog and order objects in place. PostgreSQL retains
-- their rows, defaults, indexes and foreign-key relationships during renames.
-- Keep historical migrations unchanged so existing migration checksums match.
BEGIN;

ALTER TABLE "Food" RENAME TO "Product";
ALTER TABLE "FoodSize" RENAME TO "ProductSize";
ALTER TABLE "FoodOrder" RENAME TO "Order";

ALTER TABLE "Product" RENAME COLUMN "foodName" TO "productName";
ALTER TABLE "ProductSize" RENAME COLUMN "foodId" TO "productId";
ALTER TABLE "OrderItem" RENAME COLUMN "foodId" TO "productId";
ALTER TABLE "Review" RENAME COLUMN "foodId" TO "productId";

-- Primary-key constraint renames also rename their backing indexes.
ALTER TABLE "Product" RENAME CONSTRAINT "Food_pkey" TO "Product_pkey";
ALTER TABLE "ProductSize" RENAME CONSTRAINT "FoodSize_pkey" TO "ProductSize_pkey";
ALTER TABLE "Order" RENAME CONSTRAINT "FoodOrder_pkey" TO "Order_pkey";

ALTER TABLE "Product" RENAME CONSTRAINT "Food_categoryId_fkey" TO "Product_categoryId_fkey";
ALTER TABLE "ProductSize" RENAME CONSTRAINT "FoodSize_foodId_fkey" TO "ProductSize_productId_fkey";
ALTER TABLE "Order" RENAME CONSTRAINT "FoodOrder_userId_fkey" TO "Order_userId_fkey";
ALTER TABLE "OrderItem" RENAME CONSTRAINT "OrderItem_foodId_fkey" TO "OrderItem_productId_fkey";
ALTER TABLE "Review" RENAME CONSTRAINT "Review_foodId_fkey" TO "Review_productId_fkey";

-- PostgreSQL 18 also names NOT NULL constraints. Rename those when present;
-- older PostgreSQL versions have no such catalog entries and skip this block.
DO $$
DECLARE
  constraint_record RECORD;
  product_name TEXT;
BEGIN
  FOR constraint_record IN
    SELECT con.conrelid::regclass AS table_name, con.conname
    FROM pg_constraint con
    JOIN pg_namespace ns ON ns.oid = con.connamespace
    WHERE ns.nspname = current_schema()
      AND con.contype = 'n'
      AND con.conname ~ 'Food|foodId|foodName'
  LOOP
    product_name := replace(replace(replace(replace(replace(
      constraint_record.conname, 'FoodOrder', 'Order'), 'FoodSize', 'ProductSize'),
      'Food', 'Product'), 'foodName', 'productName'), 'foodId', 'productId');
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
      constraint_record.table_name, constraint_record.conname, product_name);
  END LOOP;
END $$;

ALTER INDEX "Food_categoryId_idx" RENAME TO "Product_categoryId_idx";
ALTER INDEX "Food_createdAt_idx" RENAME TO "Product_createdAt_idx";
ALTER INDEX "Food_salesCount_idx" RENAME TO "Product_salesCount_idx";
ALTER INDEX "FoodSize_foodId_idx" RENAME TO "ProductSize_productId_idx";
ALTER INDEX "FoodOrder_orderNumber_key" RENAME TO "Order_orderNumber_key";
ALTER INDEX "FoodOrder_idempotencyKey_key" RENAME TO "Order_idempotencyKey_key";
ALTER INDEX "FoodOrder_userId_status_idx" RENAME TO "Order_userId_status_idx";
ALTER INDEX "FoodOrder_status_idx" RENAME TO "Order_status_idx";
ALTER INDEX "OrderItem_foodId_idx" RENAME TO "OrderItem_productId_idx";
ALTER INDEX "OrderItem_foodId_orderId_idx" RENAME TO "OrderItem_productId_orderId_idx";
ALTER INDEX "Review_foodId_idx" RENAME TO "Review_productId_idx";
ALTER INDEX "Review_foodId_userId_key" RENAME TO "Review_productId_userId_key";

COMMIT;

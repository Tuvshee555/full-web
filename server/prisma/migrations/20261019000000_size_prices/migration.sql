-- Additive only: a size may have its own price; an order line remembers the price paid.
ALTER TABLE "FoodSize" ADD COLUMN "price" DOUBLE PRECISION;
ALTER TABLE "OrderItem" ADD COLUMN "unitPrice" DOUBLE PRECISION;

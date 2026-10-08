/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

export function OrderDetailsCard({ t, order }: any) {
  const formatCurrency = (n?: number | null) =>
    n == null ? "₮0" : `₮${n.toLocaleString()}`;

  const deliveryFee =
    typeof order?.deliveryFee === "number" ? order.deliveryFee : 0;
  const itemsSubtotal =
    typeof order?.totalPrice === "number"
      ? Math.max(order.totalPrice - deliveryFee, 0)
      : 0;

  const InfoRow = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <p className="font-medium mb-1">{title}</p>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );

  return (
    <section className="bg-card  rounded-2xl space-y-6">
      <h3 className="font-semibold">{t("order_details")}</h3>

      {/* SUMMARY */}
      <div className="border rounded-xl p-4 text-sm space-y-3">
        <Row label={t("order_number")} value={`#${order.orderNumber}`} />
        <Row
          label={t("order_date")}
          value={
            order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"
          }
        />
        <Row
          label={t("product_total")}
          value={formatCurrency(itemsSubtotal)}
        />
        <Row label={t("delivery_fee")} value={formatCurrency(deliveryFee)} />

        <div className="border-t pt-3 flex justify-between text-base font-semibold">
          <span>{t("total")}</span>
          <span>{formatCurrency(order.totalPrice)}</span>
        </div>
      </div>

      {/* ITEMS */}
      <div className="border rounded-xl divide-y">
        {(order.items ?? []).map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <img
                src={item.food.image ?? "/placeholder.png"}
                alt={item.food.foodName}
                className="w-14 h-14 rounded-md object-cover"
              />
              <div>
                <p className="font-medium">{item.food.foodName}</p>
                <p className="text-sm text-muted-foreground">
                  {t("quantity")}: {item.quantity}
                  {item.size ? ` · ${item.size}` : ""}
                </p>
              </div>
            </div>

            <p className="font-medium">
              {formatCurrency(item.food.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* DELIVERY */}
      <div className="border rounded-xl p-4 space-y-4 text-sm">
        <InfoRow title={t("delivery_address")}>
          {order.delivery?.city}
          {order.delivery?.district ? `, ${order.delivery?.district}` : ""}
          <br />
          {order.delivery?.address}
        </InfoRow>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow title={t("full_name")}>
            {order.delivery?.lastName} {order.delivery?.firstName}
          </InfoRow>

          <InfoRow title={t("phone_number")}>{order.delivery?.phone}</InfoRow>
        </div>
      </div>
    </section>
  );
}

const Row = ({ label, value }: any) => (
  <div className="flex justify-between text-muted-foreground">
    <span>{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);

const Block = ({ title, children }: any) => (
  <div>
    <p className="font-medium mb-1">{title}</p>
    <p className="text-muted-foreground">{children}</p>
  </div>
);

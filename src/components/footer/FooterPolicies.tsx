"use client";

import { Truck, CreditCard, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export default function FooterPolicies() {
  const { t, locale } = useI18n();

  const policyCopy =
    locale === "mn"
      ? {
          deliveryTitle: "Хүргэлтийн нөхцөл",
          deliveryDesc:
            "Улаанбаатар хотод 24-48 цагт, орон нутагт 2-5 хоногт хүргэнэ. Бараа буцаалт 24 цагийн дотор хийгдэнэ.",
          paymentTitle: "Төлбөрийн нөхцөл",
          paymentDesc:
            "QPay, банкны шилжүүлэг болон картаар төлөх боломжтой. Захиалга баталгаажмагц төлбөрийн нэхэмжлэл илгээнэ.",
          serviceTitle: "Үйлчилгээний нөхцөл",
          serviceDesc:
            "Тусламж хэрэгтэй бол 86185769 дугаарт эсвэл support@nomadedge.mn хаягаар 10:00-20:00 цагт холбогдоно уу.",
        }
      : locale === "ko"
      ? {
          deliveryTitle: "배송 조건",
          deliveryDesc:
            "울란바토르는 24-48시간, 지방은 2-5영업일 내 배송됩니다. 반품은 수령 후 24시간 내 가능합니다.",
          paymentTitle: "결제 조건",
          paymentDesc:
            "QPay, 계좌이체, 카드 결제를 지원합니다. 주문 확인 후 결제 안내가 즉시 발송됩니다.",
          serviceTitle: "서비스 조건",
          serviceDesc:
            "고객센터: +976 86185769 / support@nomadedge.mn (매일 10:00-20:00).",
        }
      : {
          deliveryTitle: t("footer.delivery.title"),
          deliveryDesc: t("footer.delivery.desc"),
          paymentTitle: t("footer.payment.title"),
          paymentDesc: t("footer.payment.desc"),
          serviceTitle: t("footer.service.title"),
          serviceDesc: t("footer.service.desc"),
        };

  return (
    <section className="w-full bg-background text-foreground border-t border-border">
      <div
        className="
          max-w-7xl mx-auto
          px-4 sm:px-6 lg:px-8
          py-10
          grid grid-cols-1 md:grid-cols-3
          gap-8 
          mb-[100px]
        "
      >
        {/* Delivery */}
        <div className="flex gap-4">
          <Truck className="w-6 h-6 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{policyCopy.deliveryTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {policyCopy.deliveryDesc}
            </p>
          </div>
        </div>

        {/* Payment */}
        <div className="flex gap-4">
          <CreditCard className="w-6 h-6 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{policyCopy.paymentTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {policyCopy.paymentDesc}
            </p>
          </div>
        </div>

        {/* Service */}
        <div className="flex gap-4">
          <ShieldCheck className="w-6 h-6 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{policyCopy.serviceTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {policyCopy.serviceDesc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

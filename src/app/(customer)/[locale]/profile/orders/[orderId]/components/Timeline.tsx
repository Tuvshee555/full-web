/* eslint-disable @typescript-eslint/no-unused-vars */
import { OrderStatus } from "./types";
import { Check, Clock } from "lucide-react";

const steps: OrderStatus[] = ["PENDING", "DELIVERED"];

const labels: Record<OrderStatus, string> = {
  PENDING: "Захиалга хүлээгдэж байна",
  DELIVERED: "Хүргэгдсэн",
  CANCELLED: "Цуцлагдсан",
  WAITING_PAYMENT: "",
  COD_PENDING: "",
  PAID: "",
  DELIVERING: "",
};

export const Timeline = ({
  status,
  createdAt,
}: {
  status: OrderStatus;
  createdAt: string;
}) => {
  return (
    <div
      className="
        bg-card
        border border-border
        rounded-xl
        p-4 sm:p-5
        mb-6
        space-y-4
      "
    >
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        {new Date(createdAt).toLocaleString()}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const done = steps.indexOf(step) <= steps.indexOf(status);

          return (
            <div key={step} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center border
                  ${
                    done
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }
                `}
              >
                {done && <Check className="w-4 h-4" />}
              </div>

              {/* Label */}
              <span
                className={`text-sm ${
                  done ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {labels[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

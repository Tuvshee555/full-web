"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, Package, Ticket } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Tab } from "../ProfileInner";
import { ProfileInfo } from "../profile/ProfileInfo";
import { OrdersList } from "../profile/OrdersList";
import { TicketsList } from "../profile/TicketsList";

export function ProfileContent({
  activeTab,
  onChangeTab,
}: {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="flex-1">
      <div className="bg-card rounded-2xl ">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-base font-semibold mb-4">
                {t("profile_dashboard")}
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard
                  icon={<User className="w-5 h-5" />}
                  title={t("profile_personal")}
                  desc={t("profile_edit_desc")}
                  onClick={() => onChangeTab("profile")}
                />
                <DashboardCard
                  icon={<Package className="w-5 h-5" />}
                  title={t("profile_orders")}
                  desc={t("profile_orders_desc")}
                  onClick={() => onChangeTab("orders")}
                />
                <DashboardCard
                  icon={<Ticket className="w-5 h-5" />}
                  title={t("profile_tickets")}
                  desc={t("profile_tickets_desc")}
                  onClick={() => onChangeTab("tickets")}
                />
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <MotionWrap>
              <ProfileInfo />
            </MotionWrap>
          )}
          {activeTab === "orders" && (
            <MotionWrap>
              <OrdersList />
            </MotionWrap>
          )}
          {activeTab === "tickets" && (
            <MotionWrap>
              <TicketsList />
            </MotionWrap>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------------- helpers ---------------- */

function DashboardCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition space-y-1"
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center bg-muted mb-1">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function MotionWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
    >
      {children}
    </motion.div>
  );
}

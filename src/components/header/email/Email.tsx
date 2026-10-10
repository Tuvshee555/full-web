"use client";

import { Drawer } from "@/components/store/ui";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useFacebookSDK } from "./hooks/useFacebookSDK";
import { EmailLoggedOut } from "./EmailLoggedOut";
import { EmailLoggedIn } from "./EmailLoggedIn";

/** Account drawer (header person icon): same slide-in panel as the cart. */
export const Email = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  useFacebookSDK();
  const { st } = useStoreT();
  const { token, email } = useAuth();
  const close = () => onOpenChange(false);

  return (
    <Drawer open={open} onClose={close} title={st("account")} widthClass="w-[420px]">
      {token ? <EmailLoggedIn email={email ?? ""} closeSheet={close} /> : <EmailLoggedOut closeSheet={close} />}
    </Drawer>
  );
};

export default Email;

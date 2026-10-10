"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/store/ui";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useFacebookSDK } from "./hooks/useFacebookSDK";
import { EmailLoggedOut } from "./EmailLoggedOut";
import { EmailLoggedIn } from "./EmailLoggedIn";

/** Account drawer (header person icon): same slide-in panel as the cart. */
export const Email = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { st } = useStoreT();
  const { token, email } = useAuth();
  const close = () => onOpenChange(false);

  // Mount the login buttons (Google/Facebook scripts) only once the drawer has
  // been opened; otherwise every page view would load them for nothing.
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  return (
    <Drawer open={open} onClose={close} title={st("account")} widthClass="w-[420px]">
      {everOpened && <AccountBody token={token} email={email} close={close} />}
    </Drawer>
  );
};

function AccountBody({ token, email, close }: { token: string | null; email: string | null; close: () => void }) {
  useFacebookSDK();
  return token ? <EmailLoggedIn email={email ?? ""} closeSheet={close} /> : <EmailLoggedOut closeSheet={close} />;
}

export default Email;

// "use client";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { useFacebookSDK } from "./hooks/useFacebookSDK";
import { EmailLoggedOut } from "./EmailLoggedOut";
import { EmailLoggedIn } from "./EmailLoggedIn";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

interface EmailProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const Email = ({ open, onOpenChange }: EmailProps) => {
  useFacebookSDK();

  const { t } = useI18n();
  const { token, email, setAuthToken } = useAuth();

  const firstLetter = email ? email[0].toUpperCase() : "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        side="right"
        className="
    fixed inset-y-0 right-0
    w-[85vw] sm:w-full sm:max-w-[538px]
    bg-card text-card-foreground
    border-l border-border
    p-0
    z-[9999]
    shadow-2xl
  "
      >
        <VisuallyHidden>
          <p id="sheet-desc">{t("user_menu")}</p>
          <SheetTitle>{t("user_menu")}</SheetTitle>
        </VisuallyHidden>

        {!token ? (
          <EmailLoggedOut closeSheet={() => onOpenChange(false)} />
        ) : (
          <EmailLoggedIn
            email={email ?? ""}
            firstLetter={firstLetter}
            clearToken={() => setAuthToken(null)}
            closeSheet={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Email;

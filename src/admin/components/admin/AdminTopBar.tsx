"use client";

import { User } from "lucide-react";
import ThemeToggle from "@admin/components/header/theme/ThemeToggle";
import TranslateButton from "@admin/components/header/translate/TranslateButton";
import { Button } from "@admin/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@admin/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUserEmail(localStorage.getItem("adminEmail"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("log-in");
    toast.success("Logged out successfully");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background flex items-center px-4">
      <button
        onClick={onMenu}
        className="md:hidden h-[44px] w-[44px] flex items-center justify-center text-xl"
      >
        ☰
      </button>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <TranslateButton />

        <Dialog>
          <DialogTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-full border hover:bg-muted">
              <User size={16} />
            </button>
          </DialogTrigger>

          <DialogContent className="bg-card border rounded-xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-sm">{userEmail}</DialogTitle>
              <Button variant="destructive" onClick={handleLogout}>
                Log out
              </Button>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}

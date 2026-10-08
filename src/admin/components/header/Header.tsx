"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@admin/components/ui/dialog";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import ThemeToggle from "./theme/ThemeToggle";
import TranslateButton from "./translate/TranslateButton";

export default function Header() {
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
    <header
      className="
        sticky top-0 z-40
        h-[50px]
        bg-background
        border-b border-border
      "
    >
      <div
        className="
          max-w-7xl mx-auto
          h-full
          px-4
          flex items-center justify-end
          gap-3
        "
      >
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Language switcher */}
        <TranslateButton />

        {/* User menu */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="
                w-8 h-8
                flex items-center justify-center
                rounded-full
                border border-border
                text-foreground
                hover:bg-muted
                transition
              "
              aria-label="User menu"
            >
              <User size={16} />
            </button>
          </DialogTrigger>

          <DialogContent className="bg-card border border-border rounded-xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-sm font-medium">
                {userEmail}
              </DialogTitle>

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

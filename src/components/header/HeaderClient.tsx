"use client";

import dynamic from "next/dynamic";

const Header = dynamic(() => import("./Header").then((m) => m.default), {
  ssr: false,
});

export default function HeaderClient({
  onOpenProfile,
  cartCount,
}: {
  onOpenProfile?: () => void;
  cartCount: number;
}) {
  return <Header onOpenProfile={onOpenProfile} cartCount={cartCount} />;
}

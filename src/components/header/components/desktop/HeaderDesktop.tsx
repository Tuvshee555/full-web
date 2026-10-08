"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DesktopNav from "./DesktopNav";
import MegaMenu from "./MegaMenu";

type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
  children?: CategoryNode[];
};

export default function HeaderDesktop(props: {
  locale: string;
  t: (k: string, def?: string) => string;
  category: CategoryNode[];
  tree: CategoryNode[];
  loading: boolean;
  scrolled: boolean;
  showTopBar: boolean;
  megaVisible: boolean;
  caretLeft: number;
  allProductsRef: React.RefObject<HTMLAnchorElement | null>;
  openMega: () => void;
  closeMegaWithDelay: () => void;
  onOpenProfile?: () => void;
  firstLetter: string;
  cartCount: number;
}) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) < 10) return;

      setHidden(y > lastScrollY.current && y > 80);
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <DesktopNav {...props} hidden={hidden} />

      <AnimatePresence>
        {props.megaVisible && <MegaMenu {...props} />}
      </AnimatePresence>
    </>
  );
}

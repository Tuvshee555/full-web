/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function MegaMenu({
  locale,
  tree,
  loading,
  caretLeft,
  showTopBar,
  openMega,
  closeMegaWithDelay,
}: any) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onMouseEnter={openMega}
      onMouseLeave={closeMegaWithDelay}
      className="fixed left-0 w-full z-[70] overflow-hidden"
      style={{ top: showTopBar ? "calc(36px + 64px)" : "64px" }}
    >
      <div className="relative bg-card border-t border-border shadow-2xl">
        <div
          className="absolute -top-2 w-4 h-4 rotate-45 bg-card border-l border-t"
          style={{ left: caretLeft }}
        />

        <div className="max-w-7xl mx-auto px-10 py-8">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4">
              {tree.map((root: any, i: number) => (
                <div
                  key={root.id}
                  className={`px-6 ${
                    i !== 0 ? "md:border-l border-border" : ""
                  }`}
                >
                  <Link
                    href={`/${locale}/category/${root.id}`}
                    className="font-semibold"
                  >
                    {root.categoryName}
                  </Link>

                  {root.children && (
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {root.children.map((child: any) => (
                        <li key={child.id}>
                          <Link
                            href={`/${locale}/category/${child.id}`}
                            className="hover:text-foreground transition"
                          >
                            {child.categoryName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

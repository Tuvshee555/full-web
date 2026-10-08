"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { CategoryNode } from "@/hooks/useCategoryTree";

export default function CategoryTree({
  locale,
  t,
  tree,
  onClose,
}: {
  locale: string;
  t: (k: string, def?: string) => string;
  tree: CategoryNode[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const isExpanded = (id: string) => !!expanded[id];

  // ✅ NEW: unified logic (NO style change)
  const handleNodeClick = (node: CategoryNode) => {
    const hasChildren = !!(node.children && node.children.length);
    const open = isExpanded(node.id);

    if (hasChildren && !open) {
      toggle(node.id); // first click → expand
      return;
    }

    router.push(`/${locale}/category/${node.id}`);
    onClose();
  };

  const renderNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = !!(node.children && node.children.length);
    const expandedState = isExpanded(node.id);

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`flex items-center justify-between select-none ${
            depth > 0 ? "pl-5" : ""
          }`}
        >
          {hasChildren ? (
            <button
              onClick={() => handleNodeClick(node)} // ✅ changed
              aria-expanded={expandedState}
              className="flex-1 text-left py-4 px-1 flex items-center gap-3"
            >
              <span className="truncate text-base md:text-lg">
                {node.categoryName}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleNodeClick(node)} // ✅ changed
              className="flex-1 py-4 px-1 text-left"
            >
              <span className="truncate text-base md:text-lg">
                {node.categoryName}
              </span>
            </button>
          )}

          {/* Arrow — SAME behavior */}
          <div className="w-10 h-10 flex items-center justify-center">
            <motion.div
              onClick={() => handleNodeClick(node)} // ✅ changed
              role="button"
              aria-label={expandedState ? "collapse" : "expand"}
              animate={{ rotate: expandedState ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", cursor: "pointer" }}
            >
              <ChevronRight size={hasChildren ? 20 : 18} />
            </motion.div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {hasChildren && expandedState && (
            <motion.ul
              key={`${node.id}-children`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="ml-4">
                {node.children!.map((child) => (
                  <motion.li
                    key={child.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {renderNode(child, depth + 1)}
                  </motion.li>
                ))}
              </div>
            </motion.ul>
          )}
        </AnimatePresence>

        <div className="h-px bg-border/60" />
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/category/all`}
            onClick={onClose}
            className="flex-1 py-4 px-1"
          >
            <span className="text-base md:text-lg truncate">
              {t("footer_all_products")}
            </span>
          </Link>
          <div className="w-10 h-10 flex items-center justify-center">
            <ChevronRight size={18} />
          </div>
        </div>
        <div className="h-px bg-border/60" />
      </div>

      <div className="mt-2 space-y-1">
        {tree.map((root) => renderNode(root))}
      </div>
    </>
  );
}

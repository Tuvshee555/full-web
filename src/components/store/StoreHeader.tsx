/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { STORE } from "@/config/store";
import { useCategoryTree, type CategoryNode } from "@/hooks/useCategoryTree";
import { useFood } from "@/hooks/useFood";
import { cartCount } from "./lib/cart";
import { useStoreCart } from "./lib/useCart";
import { collectionUrl, productImages, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Drawer, Price } from "./ui";

export function AnnouncementBar() {
  const { locale } = useStoreT();
  const messages = STORE.announcements[locale] ?? STORE.announcements.mn ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % messages.length), 5000);
    return () => window.clearInterval(id);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="bg-espresso text-paper">
      <p key={i} className="page-width animate-in fade-in duration-700 py-[9px] text-center text-[12px] tracking-[0.04em] text-paper/90">
        {messages[i]}
      </p>
    </div>
  );
}

export function StoreHeader({ onOpenAccount, onOpenCart }: { onOpenAccount: () => void; onOpenCart: () => void }) {
  const { st, locale } = useStoreT();
  const pathname = usePathname();
  const { items } = useStoreCart();
  const count = cartCount(items);
  const { data: tree = [] } = useCategoryTree();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // Dawn "sticky on scroll up": hide while scrolling down, reveal on the way up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 120);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Fixed short menu so it always fits one line; categories live under "Shop".
  const nav = useMemo(() => {
    const categories = tree.flatMap((c: CategoryNode) => [
      { label: c.categoryName, href: collectionUrl(locale, c.id) },
      ...(c.children ?? []).map((ch) => ({ label: ch.categoryName, href: collectionUrl(locale, ch.id), sub: true })),
    ]);
    return [
      { label: st("home"), href: `/${locale}` },
      { label: st("shop"), href: collectionUrl(locale), children: [{ label: st("all_products"), href: collectionUrl(locale) }, ...categories] },
      { label: st("faq"), href: `/${locale}/faq` },
      { label: st("contact"), href: `/${locale}/contact` },
    ];
  }, [tree, locale, st]);

  const iconBtn = "flex h-[44px] w-[44px] items-center justify-center text-ink transition-opacity duration-300 hover:opacity-60";

  return (
    <>
      <div className={`sticky top-0 z-[90] transition-transform duration-700 ease-silk ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
        <header className="border-b border-ink/10 bg-paper/90 backdrop-blur-md">
          {/* Luxury-beauty layout: menu left · serif wordmark centred · icons right */}
          <div className="page-width grid h-[64px] grid-cols-[1fr_auto_1fr] items-center md:h-[84px]">
            <div className="flex items-center -ml-[10px] md:ml-0">
              <button type="button" className={`${iconBtn} md:hidden`} aria-label={st("menu")} onClick={() => setMenuOpen(true)}>
                <Menu className="h-[22px] w-[22px]" strokeWidth={1.1} />
              </button>
              <button type="button" className={`${iconBtn} md:hidden`} aria-label={st("search")} onClick={() => setSearchOpen(true)}>
                <Search className="h-[19px] w-[19px]" strokeWidth={1.1} />
              </button>
              <nav className="hidden md:block">
                <ul className="flex flex-nowrap items-center gap-x-[28px] whitespace-nowrap">
                  {nav.map((item: any) => (
                    <NavItem key={item.href} item={item} active={pathname === item.href} />
                  ))}
                </ul>
              </nav>
            </div>

            <Link href={`/${locale}`} className="store-heading whitespace-nowrap px-[10px] text-[24px] tracking-[0.01em] md:text-[32px]">
              {STORE.name}
            </Link>

            <div className="flex items-center justify-self-end -mr-[10px]">
              <button type="button" className={`${iconBtn} hidden md:flex`} aria-label={st("search")} onClick={() => setSearchOpen(true)}>
                <Search className="h-[19px] w-[19px]" strokeWidth={1.1} />
              </button>
              <button type="button" className={iconBtn} aria-label={st("account")} onClick={onOpenAccount}>
                <User className="h-[20px] w-[20px]" strokeWidth={1.1} />
              </button>
              <button type="button" className={`${iconBtn} relative`} aria-label={st("cart")} onClick={onOpenCart}>
                <ShoppingBag className="h-[20px] w-[20px]" strokeWidth={1.1} />
                {count > 0 && (
                  <span className="absolute right-[4px] top-[6px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-terracotta px-[4px] text-[9px] font-medium leading-none text-paper">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} onOpenAccount={onOpenAccount} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function NavItem({ item, active }: { item: any; active: boolean }) {
  const [open, setOpen] = useState(false);
  // Underline grows from the left on hover (transform only)
  const base = `group/nav relative inline-flex items-center gap-[5px] py-[14px] text-[14px] ${active ? "text-ink" : "text-ink/75 hover:text-ink"}`;
  const line = (
    <span
      className={`pointer-events-none absolute bottom-[8px] left-0 h-px w-full origin-left bg-ink transition-transform duration-500 ease-silk ${
        active ? "scale-x-100" : "scale-x-0 group-hover/nav:scale-x-100"
      }`}
    />
  );
  if (!item.children?.length) {
    return (
      <li>
        <Link href={item.href} className={base}>
          {item.label}
          {line}
        </Link>
      </li>
    );
  }
  return (
    <li className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={item.href} className={base}>
        {item.label}
        <ChevronDown className={`h-[12px] w-[12px] transition-transform duration-500 ease-silk ${open ? "rotate-180" : ""}`} strokeWidth={1.4} />
        {line}
      </Link>
      <div
        className={`absolute -left-[24px] top-full z-20 pt-[10px] transition-[opacity,transform] duration-500 ease-silk ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-[6px] opacity-0"
        }`}
      >
        <ul className="max-h-[70vh] min-w-[280px] overflow-y-auto bg-paper px-[24px] py-[18px] shadow-[0_24px_60px_-20px_rgba(28,23,20,0.25)] ring-1 ring-ink/5">
          {item.children.map((c: any, i: number) => (
            <li key={c.href + c.label}>
              <Link
                href={c.href}
                className={`block py-[6px] text-ink/75 transition-colors hover:text-ink ${
                  i === 0 ? "store-heading mb-[6px] border-b border-ink/10 pb-[10px] text-[22px] !text-ink" : c.sub ? "pl-[14px] text-[13px]" : "text-[14px]"
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

// Menu links slide up one after another when the drawer opens
const stagger = (open: boolean) =>
  `transition-[opacity,transform] duration-700 ease-silk ${open ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0"}`;

function MenuDrawer({ open, onClose, nav, onOpenAccount }: { open: boolean; onClose: () => void; nav: any[]; onOpenAccount: () => void }) {
  const { st } = useStoreT();
  const [sub, setSub] = useState<any | null>(null);
  useEffect(() => {
    if (!open) setSub(null);
  }, [open]);

  return (
    <Drawer open={open} onClose={onClose} side="left" widthClass="w-[380px]" title={<span className="eyebrow">{st("menu")}</span>}>
      <nav className="flex-1 overflow-y-auto px-[24px] md:px-[30px]">
        {sub ? (
          <div key="sub">
            <button type="button" onClick={() => setSub(null)} className="mb-[8px] flex items-center gap-[8px] py-[10px] text-[13px] text-taupe">
              <ChevronRight className="h-[14px] w-[14px] rotate-180" strokeWidth={1.4} /> {sub.label}
            </button>
            <ul>
              {sub.children.map((c: any, i: number) => (
                <li key={c.href + c.label} className={stagger(open)} style={{ transitionDelay: `${60 + i * 40}ms` }}>
                  <Link href={c.href} onClick={onClose} className={`block border-b border-ink/10 py-[12px] text-ink ${c.sub ? "pl-[16px] text-[16px]" : "store-heading text-[26px]"}`}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul key="root">
            {nav.map((item, i) => (
              <li key={item.href} className={stagger(open)} style={{ transitionDelay: `${80 + i * 60}ms` }}>
                {item.children?.length ? (
                  <button type="button" onClick={() => setSub(item)} className="store-heading flex w-full items-center justify-between border-b border-ink/10 py-[14px] text-left text-[34px]">
                    {item.label}
                    <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.1} />
                  </button>
                ) : (
                  <Link href={item.href} onClick={onClose} className="store-heading block border-b border-ink/10 py-[14px] text-[34px]">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="border-t border-ink/10 px-[24px] py-[20px] md:px-[30px]">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAccount();
          }}
          className="flex items-center gap-[10px] text-[15px] text-[#1c1714]"
        >
          <User className="h-[18px] w-[18px]" strokeWidth={1.4} /> {st("account")}
        </button>
      </div>
    </Drawer>
  );
}

function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const { data: products = [] } = useFood();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const term = q.trim().toLowerCase();
  const results = term ? products.filter((p: any) => String(p.foodName ?? "").toLowerCase().includes(term)).slice(0, 6) : [];

  const submit = () => {
    if (!term) return;
    onClose();
    router.push(`${collectionUrl(locale)}?q=${encodeURIComponent(q.trim())}`);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-[rgba(28,23,20,0.5)]" onClick={onClose} />
      <div className="relative bg-white border-b border-[rgba(28,23,20,0.08)]">
        <div className="page-width flex items-center gap-[10px] py-[16px] md:py-[22px]">
          <form
            className="field flex-1 max-w-[740px] mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input ref={inputRef} id="store-search" placeholder=" " value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            <label htmlFor="store-search">{st("search")}</label>
            <button type="submit" aria-label={st("search")} className="absolute right-[10px] top-1/2 -translate-y-1/2 p-[6px] text-[#1c1714]">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
          </form>
          <button type="button" aria-label={st("close")} onClick={onClose} className="p-[10px] text-[#1c1714]">
            <X className="h-[20px] w-[20px]" strokeWidth={1.4} />
          </button>
        </div>
        {term && (
          <div className="page-width pb-[10px]">
            <div className="mx-auto max-w-[740px] border-t border-[rgba(28,23,20,0.08)]">
              {results.length ? (
                <>
                  <p className="pt-[14px] pb-[6px] text-[11px] uppercase tracking-[0.06em]">{st("products")}</p>
                  <ul>
                    {results.map((p: any) => (
                      <li key={p.id}>
                        <Link href={productUrl(locale, p.id)} onClick={onClose} className="flex items-center gap-[15px] py-[8px] hover:bg-[rgba(28,23,20,0.04)]">
                          <img src={productImages(p)[0]} alt="" className="h-[50px] w-[50px] object-cover bg-[#efe7dd]" />
                          <div>
                            <p className="font-medium text-ink text-[15px]">{p.foodName}</p>
                            <Price product={p} className="text-[13px]" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="py-[16px] text-[14px]">{st("search_none", { q: q.trim() })}</p>
              )}
              <button type="button" onClick={submit} className="flex w-full items-center justify-between border-t border-[rgba(28,23,20,0.08)] py-[14px] text-[15px] text-[#1c1714] hover:underline">
                {st("search_all", { q: q.trim() })}
                <ChevronRight className="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

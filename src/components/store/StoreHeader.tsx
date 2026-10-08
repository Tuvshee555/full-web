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
    <div className="border-b border-[rgba(18,18,18,0.08)] bg-white">
      <p className="page-width py-[10px] text-center text-[13px] tracking-normal text-[#121212]">{messages[i]}</p>
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

  const iconBtn = "flex h-[44px] w-[44px] items-center justify-center text-[#121212] transition-transform hover:scale-[1.07]";

  return (
    <>
      <div className={`sticky top-0 z-[90] transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
        <header className="border-b border-[rgba(18,18,18,0.08)] bg-white">
          <div className="page-width grid h-[64px] md:h-[76px] grid-cols-[1fr_auto_1fr] items-center md:gap-[30px]">
            {/* mobile: menu + search */}
            <div className="flex items-center md:hidden -ml-[10px]">
              <button type="button" className={iconBtn} aria-label={st("menu")} onClick={() => setMenuOpen(true)}>
                <Menu className="h-[22px] w-[22px]" strokeWidth={1.4} />
              </button>
              <button type="button" className={iconBtn} aria-label={st("search")} onClick={() => setSearchOpen(true)}>
                <Search className="h-[20px] w-[20px]" strokeWidth={1.4} />
              </button>
            </div>

            <Link href={`/${locale}`} className="store-heading justify-self-center md:justify-self-start text-[20px] md:text-[22px] whitespace-nowrap">
              {STORE.name}
            </Link>

            {/* desktop menu: one line, centered */}
            <nav className="hidden md:block">
              <ul className="flex flex-nowrap items-center gap-x-[4px] whitespace-nowrap">
                {nav.map((item: any) => (
                  <NavItem key={item.href} item={item} active={pathname === item.href} />
                ))}
              </ul>
            </nav>

            <div className="flex items-center justify-self-end -mr-[10px]">
              <button type="button" className={`${iconBtn} hidden md:flex`} aria-label={st("search")} onClick={() => setSearchOpen(true)}>
                <Search className="h-[20px] w-[20px]" strokeWidth={1.4} />
              </button>
              <button type="button" className={iconBtn} aria-label={st("account")} onClick={onOpenAccount}>
                <User className="h-[21px] w-[21px]" strokeWidth={1.4} />
              </button>
              <button type="button" className={`${iconBtn} relative`} aria-label={st("cart")} onClick={onOpenCart}>
                <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.4} />
                {count > 0 && (
                  <span className="absolute bottom-[6px] right-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#121212] px-[4px] text-[9px] leading-none text-white">
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
  const base = `inline-flex items-center gap-[4px] px-[14px] py-[12px] text-[15px] font-medium ${
    active ? "text-[#121212] underline underline-offset-[6px]" : "text-[rgba(18,18,18,0.8)] hover:text-[#121212] hover:underline underline-offset-[6px]"
  }`;
  if (!item.children?.length) {
    return (
      <li>
        <Link href={item.href} className={base}>
          {item.label}
        </Link>
      </li>
    );
  }
  return (
    <li className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={item.href} className={base}>
        {item.label}
        <ChevronDown className={`h-[12px] w-[12px] transition-transform ${open ? "rotate-180" : ""}`} />
      </Link>
      {open && (
        <ul className="absolute left-0 top-full z-20 min-w-[240px] max-h-[70vh] overflow-y-auto border border-[rgba(18,18,18,0.1)] bg-white py-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          {item.children.map((c: any) => (
            <li key={c.href + c.label}>
              <Link
                href={c.href}
                className={`block py-[7px] pr-[20px] text-[15px] text-[rgba(18,18,18,0.8)] hover:bg-[rgba(18,18,18,0.04)] hover:text-[#121212] ${c.sub ? "pl-[34px] text-[14px]" : "pl-[20px]"}`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function MenuDrawer({ open, onClose, nav, onOpenAccount }: { open: boolean; onClose: () => void; nav: any[]; onOpenAccount: () => void }) {
  const { st } = useStoreT();
  const [sub, setSub] = useState<any | null>(null);
  useEffect(() => {
    if (!open) setSub(null);
  }, [open]);

  return (
    <Drawer open={open} onClose={onClose} side="left" widthClass="w-[360px]" title={<span className="sr-only">{st("menu")}</span>}>
      <nav className="flex-1 overflow-y-auto">
        {sub ? (
          <div>
            <button type="button" onClick={() => setSub(null)} className="flex w-full items-center gap-[10px] bg-[rgba(18,18,18,0.04)] px-[30px] py-[14px] text-[18px] text-[#121212]">
              <ChevronRight className="h-[16px] w-[16px] rotate-180" /> {sub.label}
            </button>
            <ul className="py-[10px]">
              {sub.children.map((c: any) => (
                <li key={c.href + c.label}>
                  <Link href={c.href} onClick={onClose} className={`block py-[11px] text-[#121212] ${c.sub ? "pl-[46px] pr-[30px] text-[16px]" : "px-[30px] text-[18px]"}`}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="py-[10px]">
            {nav.map((item) =>
              item.children?.length ? (
                <li key={item.href}>
                  <button type="button" onClick={() => setSub(item)} className="flex w-full items-center justify-between px-[30px] py-[11px] text-left text-[18px] text-[#121212]">
                    {item.label}
                    <ChevronRight className="h-[16px] w-[16px]" />
                  </button>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href} onClick={onClose} className="block px-[30px] py-[11px] text-[18px] text-[#121212]">
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </nav>
      <div className="bg-[rgba(18,18,18,0.03)] px-[30px] py-[20px]">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAccount();
          }}
          className="flex items-center gap-[10px] text-[15px] text-[#121212]"
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
      <div className="absolute inset-0 bg-[rgba(18,18,18,0.5)]" onClick={onClose} />
      <div className="relative bg-white border-b border-[rgba(18,18,18,0.08)]">
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
            <button type="submit" aria-label={st("search")} className="absolute right-[10px] top-1/2 -translate-y-1/2 p-[6px] text-[#121212]">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
          </form>
          <button type="button" aria-label={st("close")} onClick={onClose} className="p-[10px] text-[#121212]">
            <X className="h-[20px] w-[20px]" strokeWidth={1.4} />
          </button>
        </div>
        {term && (
          <div className="page-width pb-[10px]">
            <div className="mx-auto max-w-[740px] border-t border-[rgba(18,18,18,0.08)]">
              {results.length ? (
                <>
                  <p className="pt-[14px] pb-[6px] text-[11px] uppercase tracking-[0.06em]">{st("products")}</p>
                  <ul>
                    {results.map((p: any) => (
                      <li key={p.id}>
                        <Link href={productUrl(locale, p.id)} onClick={onClose} className="flex items-center gap-[15px] py-[8px] hover:bg-[rgba(18,18,18,0.04)]">
                          <img src={productImages(p)[0]} alt="" className="h-[50px] w-[50px] object-cover bg-[#f3f3f3]" />
                          <div>
                            <p className="store-heading text-[15px]">{p.foodName}</p>
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
              <button type="button" onClick={submit} className="flex w-full items-center justify-between border-t border-[rgba(18,18,18,0.08)] py-[14px] text-[15px] text-[#121212] hover:underline">
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

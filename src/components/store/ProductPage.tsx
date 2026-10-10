/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, CreditCard, HelpCircle, PackageSearch, Share2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { STORE, productContent, type ProductContent } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { FoodReviews } from "@/components/review/FoodReviews";
import { addToCart } from "./lib/cart";
import { isSoldOut, money, onSale, rating, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { ProductCard } from "./ProductCard";
import { Badge, CREAM, DevHint, Price, QuantityInput, salePercent, Stars } from "./ui";

type Media = { type: "image" | "video"; src: string };

export function ProductPage({ product, related }: { product: any; related: any[] }) {
  const { st, locale } = useStoreT();
  const router = useRouter();

  const media: Media[] = useMemo(() => {
    const list: Media[] = [];
    if (typeof product.image === "string" && product.image) list.push({ type: "image", src: product.image });
    (product.extraImages ?? []).forEach((src: any) => typeof src === "string" && src && list.push({ type: "image", src }));
    if (typeof product.video === "string" && product.video) list.push({ type: "video", src: product.video });
    return list.length ? list : [{ type: "image", src: "/product-image-coming-soon.svg" }];
  }, [product]);

  const sizes: any[] = Array.isArray(product.sizes) ? product.sizes : [];
  const [size, setSize] = useState<string | null>(() => {
    const first = sizes.find((s) => !sizeSoldOut(s)) ?? sizes[0];
    return first ? sizeLabel(first) : null;
  });
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null);

  const soldOut = isSoldOut(product);
  const sizeOut = sizes.some((s) => sizeLabel(s) === size && sizeSoldOut(s));
  const unavailable = soldOut || sizeOut;
  const stars = rating(product);
  const content = productContent(product.id);

  // Track whether the main buttons are on screen (drives the mobile sticky bar)
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const check = () => {
      const el = ctaRef.current;
      if (el) setCtaVisible(el.getBoundingClientRect().bottom > 0);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.foodName, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(st("link_copied"));
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <div className="page-width pb-[72px] pt-[20px] md:pt-[48px]">
        <div className="grid gap-[20px] md:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] md:gap-[50px]">
          {/* Media */}
          <div className="-mx-[15px] md:mx-0">
            <MobileSlider media={media} onOpen={setZoom} />
            <div className="hidden md:grid grid-cols-2 gap-[10px]">
              {media.map((m, i) => (
                <button
                  key={m.src + i}
                  type="button"
                  onClick={() => setZoom(i)}
                  className={`relative block bg-[#efe7dd] cursor-zoom-in ${
                    // first photo full width; a leftover odd photo at the end too (no half-empty row)
                    i === 0 || (i === media.length - 1 && (media.length - 1) % 2 === 1) ? "col-span-2" : ""
                  } aspect-[4/5] overflow-hidden`}
                >
                  <MediaView m={m} alt={product.foodName} />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="md:sticky md:top-[30px] self-start">
            <span className="eyebrow">{STORE.name}</span>
            <h1 className="store-heading mt-[10px] text-[44px] md:text-[64px]">{product.foodName}</h1>

            {/* Grande / REFY: rating right under the title, jumps to reviews */}
            {stars.count > 0 && (
              <a href="#reviews" className="mt-[8px] inline-block hover:underline underline-offset-[3px]">
                <Stars avg={stars.avg} count={stars.count} showAvg />
              </a>
            )}

            <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
              <Price product={product} className="text-[20px]" />
              {soldOut ? <Badge kind="soldout">{st("sold_out")}</Badge> : onSale(product) && <Badge kind="sale">-{salePercent(product)}%</Badge>}
            </div>
            <p className="mt-[6px] text-[13px]">{st("shipping_note")}</p>

            {/* REFY benefit tags */}
            {content.benefits?.length ? (
              <ul className="mt-[16px] flex flex-wrap gap-[6px]">
                {content.benefits.map((b) => (
                  <li key={b} className="px-[10px] py-[5px] text-[13px] text-[#1c1714]" style={{ background: CREAM }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-[16px]">
                <DevHint>PRODUCT_CONTENT.benefits: short true tags, e.g. «Веган», «Үнэргүй», «5 мл» (src/config/store.ts)</DevHint>
              </div>
            )}

            {sizes.length > 0 && (
              <fieldset className="mt-[24px]">
                <legend className="mb-[8px] text-[14px]">{st("size")}</legend>
                <div className="flex flex-wrap gap-[8px]">
                  {sizes.map((s) => {
                    const label = sizeLabel(s);
                    const out = sizeSoldOut(s);
                    const active = label === size;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setSize(label)}
                        aria-pressed={active}
                        className={`relative min-w-[60px] rounded-[40px] px-[20px] py-[10px] text-[14px] tracking-normal transition-colors
                          ${active ? "bg-[#1c1714] text-white" : "bg-white text-[#1c1714] shadow-[0_0_0_1px_rgba(28,23,20,0.55)] hover:shadow-[0_0_0_1px_#1c1714]"}
                          ${out ? "line-through opacity-60" : ""}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-[24px]">
              <p className="mb-[8px] text-[14px]">{st("quantity")}</p>
              <QuantityInput value={qty} onChange={setQty} />
            </div>

            <div ref={ctaRef} className="mt-[24px] flex max-w-[440px] flex-col gap-[10px]">
              <button type="button" className="btn-secondary w-full" disabled={unavailable} onClick={() => addToCart(product, qty, size)}>
                {unavailable ? st("sold_out") : st("add_to_cart")}
              </button>
              {!unavailable && (
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    addToCart(product, qty, size, false);
                    router.push(`/${locale}/checkout`);
                  }}
                >
                  {st("buy_now")}
                </button>
              )}
            </div>

            {/* Grande-style trust row: only facts that are true for every order */}
            <ul className="mt-[18px] grid max-w-[440px] grid-cols-3 gap-[6px] text-center text-[12px] leading-tight text-[#1c1714]">
              {[
                { icon: Truck, text: st("trust_delivery", { fee: money(DELIVERY_FEE) }) },
                { icon: CreditCard, text: st("trust_payment") },
                { icon: PackageSearch, text: st("trust_tracking") },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex flex-col items-center gap-[6px] px-[6px] py-[10px]" style={{ background: CREAM }}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
                  {text}
                </li>
              ))}
            </ul>

            {product.ingredients && <div className="mt-[26px] whitespace-pre-line text-[15px] leading-relaxed">{product.ingredients}</div>}

            <div className="mt-[30px] border-b border-[rgba(28,23,20,0.08)]">
              <Collapsible icon={Truck} title={st("shipping")}>
                {st("shipping_text", { fee: money(DELIVERY_FEE) })}
              </Collapsible>
              <Collapsible icon={CreditCard} title={st("payment_methods")}>
                {st("payment_methods_text")}
              </Collapsible>
            </div>

            <button type="button" onClick={share} className="mt-[20px] flex items-center gap-[8px] text-[14px] text-[#1c1714] hover:underline underline-offset-[3px]">
              <Share2 className="h-[15px] w-[15px]" strokeWidth={1.4} /> {st("share")}
            </button>
          </div>
        </div>

        <DetailTabs content={content} />

        <section id="reviews" className="mt-[60px] scroll-mt-[90px]">
          <FoodReviews foodId={product.id} />
        </section>

        {related.length > 0 && (
          <section className="mt-[60px]">
            <h2 className="store-heading text-[24px]">{st("pairs_well")}</h2>
            <div className="mt-[24px] grid grid-cols-2 gap-x-[8px] gap-y-[24px] md:grid-cols-4 md:gap-x-[16px]">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} quickAdd={false} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile: buy bar sticks to the bottom once the main buttons scroll away */}
      {!unavailable && (
        <div
          className={`fixed inset-x-0 bottom-0 z-[80] flex items-center gap-[12px] border-t border-[rgba(28,23,20,0.1)] bg-white px-[15px] py-[10px] transition-transform duration-300 md:hidden ${
            ctaVisible ? "translate-y-full" : "translate-y-0"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-[#1c1714]">{product.foodName}</p>
            <Price product={product} className="text-[14px]" />
          </div>
          <button type="button" className="btn !min-h-[44px] !px-[18px]" onClick={() => addToCart(product, qty, size)}>
            {st("add_to_cart")}
          </button>
        </div>
      )}

      {zoom !== null && <Lightbox media={media} start={zoom} alt={product.foodName} onClose={() => setZoom(null)} />}
    </>
  );
}

/** REFY-style tabs: How to use / Key ingredients / Full ingredients / FAQ.
 *  A tab exists only when its content is filled in (src/config/store.ts). */
function DetailTabs({ content }: { content: ProductContent }) {
  const { st } = useStoreT();
  const tabs = [
    content.howTo?.length && {
      id: "how",
      label: st("how_to"),
      body: (
        <ol className="grid gap-[16px] md:grid-cols-4">
          {content.howTo.map((step, i) => (
            <li key={i} className="p-[18px]" style={{ background: CREAM }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[rgba(28,23,20,0.6)]">{st("step", { n: i + 1 })}</p>
              <p className="mt-[6px] text-[15px] text-[#1c1714]">{step}</p>
            </li>
          ))}
        </ol>
      ),
    },
    content.keyIngredients?.length && {
      id: "key",
      label: st("key_ingredients"),
      body: (
        <ul className="grid gap-[16px] md:grid-cols-3">
          {content.keyIngredients.map((ing) => (
            <li key={ing.name} className="p-[18px]" style={{ background: CREAM }}>
              <p className="store-heading text-[16px]">{ing.name}</p>
              <p className="mt-[6px] text-[14px]">{ing.text}</p>
            </li>
          ))}
        </ul>
      ),
    },
    content.fullIngredients && {
      id: "inci",
      label: st("full_ingredients"),
      body: <p className="max-w-[800px] text-[14px] leading-relaxed">{content.fullIngredients}</p>,
    },
    content.faq?.length && {
      id: "faq",
      label: st("product_faq"),
      body: (
        <div className="max-w-[800px] border-b border-[rgba(28,23,20,0.08)]">
          {content.faq.map((f) => (
            <Collapsible key={f.q} icon={HelpCircle} title={f.q}>
              {f.a}
            </Collapsible>
          ))}
        </div>
      ),
    },
  ].filter(Boolean) as { id: string; label: string; body: React.ReactNode }[];

  const [active, setActive] = useState(0);

  if (!tabs.length) {
    return (
      <section className="mt-[60px]">
        <DevHint>
          PRODUCT_CONTENT in src/config/store.ts: fill howTo (steps), keyIngredients, fullIngredients (INCI from the box) and faq. Each one becomes a
          tab here, REFY-style. Hidden on the live site until filled.
        </DevHint>
      </section>
    );
  }

  return (
    <section className="mt-[60px]">
      <div role="tablist" className="flex gap-[24px] overflow-x-auto border-b border-[rgba(28,23,20,0.12)] [scrollbar-width:none]">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`-mb-px shrink-0 border-b-2 pb-[12px] text-[15px] ${
              active === i ? "border-[#1c1714] font-semibold text-[#1c1714]" : "border-transparent text-[rgba(28,23,20,0.6)] hover:text-[#1c1714]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-[24px]">{tabs[Math.min(active, tabs.length - 1)].body}</div>
    </section>
  );
}

function MediaView({ m, alt }: { m: Media; alt: string }) {
  return m.type === "video" ? (
    <video src={m.src} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay controls={false} />
  ) : (
    <img src={m.src} alt={alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
  );
}

function MobileSlider({ media, onOpen }: { media: Media[]; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (n: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(media.length - 1, n));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="md:hidden">
      <div
        ref={ref}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((m, idx) => (
          <button key={m.src + idx} type="button" onClick={() => onOpen(idx)} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sand">
            <MediaView m={m} alt="" />
          </button>
        ))}
      </div>
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-[10px] py-[10px] text-[13px] text-[#1c1714]">
          <button type="button" onClick={() => go(i - 1)} className="p-[8px] disabled:opacity-30" disabled={i === 0} aria-label="prev">
            <ChevronLeft className="h-[16px] w-[16px]" />
          </button>
          <span>
            {i + 1} / {media.length}
          </span>
          <button type="button" onClick={() => go(i + 1)} className="p-[8px] disabled:opacity-30" disabled={i === media.length - 1} aria-label="next">
            <ChevronRight className="h-[16px] w-[16px]" />
          </button>
        </div>
      )}
    </div>
  );
}

function Lightbox({ media, start, alt, onClose }: { media: Media[]; start: number; alt: string; onClose: () => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    refs.current[start]?.scrollIntoView();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [start, onClose]);
  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-white">
      <button type="button" onClick={onClose} aria-label="close" className="fixed right-[16px] top-[16px] z-10 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(28,23,20,0.1)]">
        <X className="h-[18px] w-[18px]" />
      </button>
      <div className="mx-auto max-w-[1000px] space-y-[10px] py-[60px]">
        {media.map((m, i) => (
          <div key={m.src + i} ref={(el) => void (refs.current[i] = el)}>
            {m.type === "video" ? <video src={m.src} controls className="w-full" /> : <img src={m.src} alt={alt} className="w-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Collapsible({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[rgba(28,23,20,0.08)]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-[12px] py-[16px] text-left text-[15px] text-[#1c1714]" aria-expanded={open}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.3} />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`h-[14px] w-[14px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-[16px] pl-[30px] text-[14px] leading-relaxed">{children}</div>}
    </div>
  );
}

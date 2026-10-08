/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, CreditCard, Share2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { STORE } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { FoodReviews } from "@/components/review/FoodReviews";
import { addToCart } from "./lib/cart";
import { isSoldOut, money, onSale, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { ProductCard } from "./ProductCard";
import { Badge, Price, QuantityInput, salePercent } from "./ui";

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
      <div className="page-width pt-[20px] md:pt-[36px]">
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
                  className={`relative block bg-[#f3f3f3] cursor-zoom-in ${i === 0 ? "col-span-2" : ""} aspect-square overflow-hidden`}
                >
                  <MediaView m={m} alt={product.foodName} />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="md:sticky md:top-[30px] self-start">
            <p className="text-[12px] uppercase tracking-[0.06em]">{STORE.name}</p>
            <h1 className="store-heading mt-[8px] text-[30px] md:text-[40px]">{product.foodName}</h1>

            <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
              <Price product={product} className="text-[18px]" />
              {soldOut ? <Badge kind="soldout">{st("sold_out")}</Badge> : onSale(product) && <Badge kind="sale">-{salePercent(product)}%</Badge>}
            </div>
            <p className="mt-[6px] text-[13px]">{st("shipping_note")}</p>

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
                          ${active ? "bg-[#121212] text-white" : "bg-white text-[#121212] shadow-[0_0_0_1px_rgba(18,18,18,0.55)] hover:shadow-[0_0_0_1px_#121212]"}
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

            <div className="mt-[24px] flex max-w-[440px] flex-col gap-[10px]">
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

            {product.ingredients && <div className="mt-[30px] whitespace-pre-line text-[15px] leading-relaxed">{product.ingredients}</div>}

            <div className="mt-[30px] border-b border-[rgba(18,18,18,0.08)]">
              <Collapsible icon={Truck} title={st("shipping")}>
                {st("shipping_text", { fee: money(DELIVERY_FEE) })}
              </Collapsible>
              <Collapsible icon={CreditCard} title={st("payment_methods")}>
                {st("payment_methods_text")}
              </Collapsible>
            </div>

            <button type="button" onClick={share} className="mt-[20px] flex items-center gap-[8px] text-[14px] text-[#121212] hover:underline underline-offset-[3px]">
              <Share2 className="h-[15px] w-[15px]" strokeWidth={1.4} /> {st("share")}
            </button>
          </div>
        </div>

        <section className="mt-[60px]">
          <FoodReviews foodId={product.id} />
        </section>

        {related.length > 0 && (
          <section className="mt-[60px]">
            <h2 className="store-heading text-[24px]">{st("you_may_also_like")}</h2>
            <div className="mt-[24px] grid grid-cols-2 gap-x-[8px] gap-y-[24px] md:grid-cols-4 md:gap-x-[16px]">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} quickAdd={false} />
              ))}
            </div>
          </section>
        )}
      </div>

      {zoom !== null && <Lightbox media={media} start={zoom} alt={product.foodName} onClose={() => setZoom(null)} />}
    </>
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
          <button key={m.src + idx} type="button" onClick={() => onOpen(idx)} className="relative aspect-square w-full shrink-0 snap-center bg-[#f3f3f3]">
            <MediaView m={m} alt="" />
          </button>
        ))}
      </div>
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-[10px] py-[10px] text-[13px] text-[#121212]">
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
      <button type="button" onClick={onClose} aria-label="close" className="fixed right-[16px] top-[16px] z-10 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(18,18,18,0.1)]">
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
    <div className="border-t border-[rgba(18,18,18,0.08)]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-[12px] py-[16px] text-left text-[15px] text-[#121212]" aria-expanded={open}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.3} />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`h-[14px] w-[14px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-[16px] pl-[30px] text-[14px] leading-relaxed">{children}</div>}
    </div>
  );
}

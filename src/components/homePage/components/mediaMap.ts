/* eslint-disable @typescript-eslint/no-explicit-any */

export function buildMediaMap(products: any[]) {
  const map = new Map<string, string>();
  const created: string[] = [];

  products.forEach((p) => {
    const id = p.id ?? p.foodId ?? Math.random().toString(36).slice(2, 9);
    const img = p.image;
    if (!img) return;

    if (typeof img === "string") {
      map.set(id, img);
    } else {
      try {
        const u = URL.createObjectURL(img);
        created.push(u);
        map.set(id, u);
      } catch {}
    }
  });

  return {
    map,
    revoke() {
      created.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    },
  };
}

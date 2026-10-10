// Replaces the catalog with the Lorentz eyebrow starter catalog.
//
//   node scripts/seed-eyebrow-catalog.mjs            -> dry run: shows what would change
//   node scripts/seed-eyebrow-catalog.mjs --replace  -> backs up, wipes catalog + orders, seeds
//
// The backup (products, categories, sizes, reviews, orders, payments) is
// written to .local-backups/ first. That folder is git-ignored because it
// holds customer names/phones. Users and admin accounts are never touched.
//
// Photos are free-to-use Unsplash images with no visible brand names. Swap
// them for your own product photos in admin once you have them. Descriptions
// say what each product is and how to use it; no results or medical claims.
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import prismaPkg from "@prisma/client";

dotenv.config({ path: [".env.local", ".env"], quiet: true });
const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();
const REPLACE = process.argv.includes("--replace");

const img = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const PHOTO = {
  dropperOrange: img("1713768704571-6aeb0d0e5105"),
  dropperGlass: img("1710410815589-dd83514104d0"),
  dropperDrip: img("1679394270597-e90694d70350"),
  amberBottle: img("1671493235081-5842463637cd"),
  pencilBlack: img("1591028666702-f1264db7260d"),
  pencilDots: img("1616592079624-575de673daff"),
  pencilTip: img("1597754255385-b48c3627d3df"),
  pencilsBeige: img("1713566770925-becef7cbdd92"),
  pencilsGold: img("1597225335960-8a9970732de1"),
  browKitPink: img("1597225244660-1cd128c64284"),
  wandPink: img("1631214540553-ff044a3ff1d4"),
  tweezers: img("1758467700651-b0cdd3346cc7"),
  tweezersTray: img("1770999086860-143f54adf01b"),
  brushFan: img("1616529484837-8bcdf9d1407b"),
  brushPowder: img("1704621354138-e124277356f2"),
  brushesGold: img("1556262965-917187357da4"),
  brushesCup: img("1516975080664-ed2fc6a32937"),
  browEyeBrown: img("1564278692313-b2d65996fc93"),
  browSoft: img("1542833807-ad5af0977050"),
  browBlueEye: img("1516220362602-dba5272034e7"),
  browProfile: img("1637851497145-0faa2e456081"),
  browTwo: img("1534143826428-81fc61582afd"),
};

// Fixed ids so src/config/store.ts PRODUCT_CONTENT can target a product.
const CAT = {
  care: "1a0e5e00-0000-4000-8000-0000000000c1",
  shape: "1a0e5e00-0000-4000-8000-0000000000c2",
  define: "1a0e5e00-0000-4000-8000-0000000000c3",
  tools: "1a0e5e00-0000-4000-8000-0000000000c4",
  sets: "1a0e5e00-0000-4000-8000-0000000000c5",
};

const CATEGORIES = [
  { id: CAT.care, categoryName: "Хөмсөгний арчилгаа" },
  { id: CAT.shape, categoryName: "Хэлбэржүүлэх" },
  { id: CAT.define, categoryName: "Харандаа ба помад" },
  { id: CAT.tools, categoryName: "Багаж хэрэгсэл" },
  { id: CAT.sets, categoryName: "Багц" },
];

const SHADES = ["Цайвар хүрэн", "Хүрэн", "Хар хүрэн"];

const PRODUCTS = [
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a1",
    foodName: "Хөмсөгний сэрум",
    categoryId: CAT.care,
    price: 59900,
    isFeatured: true,
    image: PHOTO.dropperOrange,
    extraImages: [PHOTO.browEyeBrown, PHOTO.browTwo],
    ingredients:
      "Хөмсөгний өдөр тутмын арчилгаанд зориулсан сэрум · 5 мл.\nОройн цагаар цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ. Нүдэнд хүргэхгүй байна уу.",
    sizes: ["5 мл"],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a2",
    foodName: "Хөмсөгний тос",
    categoryId: CAT.care,
    price: 39900,
    image: PHOTO.amberBottle,
    extraImages: [PHOTO.browSoft, PHOTO.dropperDrip],
    ingredients:
      "Хөмсөг болон сормуусыг тэжээх ургамлын тос · 10 мл.\nЖижиг сойзонд нэг дусал авч, унтахын өмнө хөмсөгт түрхэнэ.",
    sizes: ["10 мл"],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a3",
    foodName: "Тунгалаг хөмсөгний гель",
    categoryId: CAT.shape,
    price: 29900,
    image: PHOTO.wandPink,
    extraImages: [PHOTO.browBlueEye],
    ingredients:
      "Хөмсөгийг хэлбэрт нь тогтоох тунгалаг гель · 6 мл.\nСойзоор хөмсөгийг дээш, гадагш самнаж, хүссэн хэлбэрт оруулаад хатаана.",
    sizes: [],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a4",
    foodName: "Хөмсөгний помад",
    categoryId: CAT.define,
    price: 34900,
    image: PHOTO.browKitPink,
    extraImages: [PHOTO.browTwo],
    ingredients:
      "Хөмсөгний хоосон хэсгийг нөхөж, хэлбэр гаргах тослог помад.\nНалуу сойзонд бага хэмжээгээр авч, үсний ургалтын дагуу богино зураасаар түрхэнэ.",
    sizes: SHADES,
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a5",
    foodName: "Нарийн үзүүртэй хөмсөгний харандаа",
    categoryId: CAT.define,
    price: 24900,
    image: PHOTO.pencilBlack,
    extraImages: [PHOTO.browEyeBrown, PHOTO.pencilTip],
    ingredients:
      "Нарийн үзүүртэй, нөгөө талдаа сойзтой хөмсөгний харандаа.\nҮс шиг нарийн зураасаар хоосон хэсгийг нөхөөд, сойзоор зөөлөн самнана.",
    sizes: SHADES,
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a6",
    foodName: "Модон хөмсөгний харандаа",
    categoryId: CAT.define,
    price: 19900,
    image: PHOTO.pencilsGold,
    extraImages: [PHOTO.pencilsBeige],
    ingredients: "Ирлэх боломжтой сонгодог модон харандаа.\nХөмсөгний хүрээг тодруулах, хэлбэр зурахад тохиромжтой.",
    sizes: SHADES,
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a7",
    foodName: "Нарийн хясаа",
    categoryId: CAT.tools,
    price: 19900,
    image: PHOTO.tweezers,
    extraImages: [PHOTO.tweezersTray],
    ingredients: "Зэвэрдэггүй гангаар хийсэн, налуу үзүүртэй хясаа.\nХэрэглэсний дараа спиртээр арчиж, тагтай нь хадгална.",
    sizes: [],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a8",
    foodName: "Хөмсөгний сойзны иж бүрдэл",
    categoryId: CAT.tools,
    price: 34900,
    image: PHOTO.brushesGold,
    extraImages: [PHOTO.brushesCup],
    ingredients: "Налуу сойз, спулер сам болон холих сойз бүхий иж бүрдэл.\nСойзоо долоо хоногт нэг удаа зөөлөн савантай бүлээн усаар угаана.",
    sizes: [],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000a9",
    foodName: "Налуу сойз",
    categoryId: CAT.tools,
    price: 14900,
    image: PHOTO.brushFan,
    extraImages: [PHOTO.brushPowder],
    ingredients: "Помад болон нунтагаар хөмсөг зурахад зориулсан нимгэн налуу сойз.",
    sizes: [],
  },
  {
    id: "1a0e5e00-0000-4000-8000-0000000000b1",
    foodName: "Хөмсөгний арчилгааны багц",
    categoryId: CAT.sets,
    // Bundle of serum + gel + fine pencil; compare-at = their real separate prices
    price: 99900,
    oldPrice: 59900 + 29900 + 24900,
    image: PHOTO.dropperGlass,
    extraImages: [PHOTO.browProfile, PHOTO.pencilDots],
    ingredients:
      "Хөмсөгний сэрум, тунгалаг гель, нарийн үзүүртэй харандаа нэг багцад.\nТусад нь авахаас хямд.",
    sizes: [],
  },
];

async function backup() {
  const [foods, foodSizes, categories, reviews, orders, orderItems, payments, lemonPayments] = await Promise.all([
    prisma.food.findMany(),
    prisma.foodSize.findMany(),
    prisma.category.findMany(),
    prisma.review.findMany(),
    prisma.foodOrder.findMany(),
    prisma.orderItem.findMany(),
    prisma.payment.findMany(),
    prisma.lemonPayment.findMany(),
  ]);
  const dir = path.resolve(".local-backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `catalog-before-eyebrow-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ foods, foodSizes, categories, reviews, orders, orderItems, payments, lemonPayments }, null, 2));
  return { file, counts: { foods: foods.length, categories: categories.length, reviews: reviews.length, orders: orders.length } };
}

async function main() {
  const now = {
    foods: await prisma.food.count(),
    categories: await prisma.category.count(),
    orders: await prisma.foodOrder.count(),
    reviews: await prisma.review.count(),
  };
  console.log("Database now:", now);
  console.log(`Would seed ${CATEGORIES.length} categories and ${PRODUCTS.length} eyebrow products.`);
  if (!REPLACE) {
    console.log("Dry run. Re-run with --replace to back up, wipe the catalog/orders and seed.");
    return;
  }

  const { file, counts } = await backup();
  console.log("Backup written:", file, counts);

  await prisma.$transaction(
    async (tx) => {
      const orderIds = (await tx.foodOrder.findMany({ select: { id: true } })).map((o) => o.id);
      await tx.review.deleteMany({});
      await tx.orderItem.deleteMany({});
      await tx.lemonPayment.deleteMany({});
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.foodOrder.deleteMany({});
      await tx.foodSize.deleteMany({});
      await tx.food.deleteMany({});
      await tx.category.updateMany({ data: { parentId: null } });
      await tx.category.deleteMany({});

      await tx.category.createMany({ data: CATEGORIES });
      for (const p of PRODUCTS) {
        const { sizes, ...data } = p;
        await tx.food.create({
          data: {
            ...data,
            sizes: { create: sizes.map((label) => ({ label })) },
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  console.log("Seeded:", {
    categories: await prisma.category.count(),
    products: await prisma.food.count(),
    orders: await prisma.foodOrder.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

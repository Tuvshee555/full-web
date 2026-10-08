import { redirect } from "next/navigation";

// Old URL; the store now uses Shopify-style /products/<id>
export default async function OldFood({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/products/${id}`);
}

import { redirect } from "next/navigation";

// Old URL; the store now uses Shopify-style /collections/<id>
export default async function OldCategory({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/collections/${id}`);
}

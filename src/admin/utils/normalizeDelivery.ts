import { RawOrder } from "@/app/(admin)/admin/[locale]/(orders)/components/type";

export function normalizeDelivery(o: RawOrder) {
  if (o.delivery) return o.delivery;

  if (
    o.firstName ||
    o.lastName ||
    o.phone ||
    o.city ||
    o.district ||
    o.khoroo ||
    o.address ||
    o.notes
  ) {
    return {
      firstName: o.firstName,
      lastName: o.lastName,
      phone: o.phone,
      city: o.city,
      district: o.district,
      khoroo: o.khoroo,
      address: o.address,
      notes: o.notes,
    };
  }

  return null;
}

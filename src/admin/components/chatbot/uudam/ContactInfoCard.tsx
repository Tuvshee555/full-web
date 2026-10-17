import { STORE } from "@/config/store";
/** The contact details the bot hands to customers when it cannot answer (edited in src/config/store.ts). */
export function ContactInfoCard({ label }: { label: string }) {
  return <div className="text-sm"><p className="text-taupe">{label}</p><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1"><a href={`tel:${STORE.contact.phone}`} className="underline underline-offset-2">{STORE.contact.phone}</a><a href={`mailto:${STORE.contact.email}`} className="underline underline-offset-2">{STORE.contact.email}</a></p></div>;
}

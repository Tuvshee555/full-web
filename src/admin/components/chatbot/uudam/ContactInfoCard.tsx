import { STORE } from "@/config/store";
import { Card } from "./ui";
export function ContactInfoCard() {
  return <Card className="flex flex-wrap gap-4 p-3 text-sm"><a href={`tel:${STORE.contact.phone}`}>{STORE.contact.phone}</a><a href={`mailto:${STORE.contact.email}`}>{STORE.contact.email}</a></Card>;
}

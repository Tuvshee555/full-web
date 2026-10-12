"use client";
import { useState } from "react";
import { Inbox } from "../Inbox";
import { ContactInfoCard } from "./ContactInfoCard";
// Source inbox selection/takeover is wired to the existing Lorentz thread UI.
export function BotTab({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  return <div className="space-y-4"><ContactInfoCard /><Inbox selectedId={selectedId} onSelect={onSelect} search={search} onSearch={setSearch} /></div>;
}

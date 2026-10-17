"use client";
import { useState } from "react";
import { Inbox } from "../Inbox";
// Source inbox selection/takeover is wired to the existing Lorentz thread UI.
export function BotTab({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  return <Inbox selectedId={selectedId} onSelect={onSelect} search={search} onSearch={setSearch} />;
}

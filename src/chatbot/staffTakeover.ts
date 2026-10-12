export type ThreadMessage = {
  from?: { id?: string };
  message?: string;
  created_time?: string;
  tags?: { data?: Array<{ name?: string }> };
};

/** How long the bot stays quiet after the latest staff message. */
export const STAFF_TAKEOVER_MS = 3 * 24 * 60 * 60 * 1000;

/** Latest staff message in the thread within `windowMs`, or null. */
export function latestStaffReplyAt(input: {
  messages: ThreadMessage[];
  pageId: string;
  now?: Date;
  windowMs?: number;
}): Date | null {
  const now = (input.now ?? new Date()).getTime();
  const windowMs = input.windowMs ?? STAFF_TAKEOVER_MS;
  let latest = 0;
  for (const message of input.messages) {
    if (message.from?.id !== input.pageId) continue;
    const at = Date.parse(message.created_time ?? "");
    if (Number.isNaN(at) || now - at > windowMs) continue;
    const fromStaffApp = (message.tags?.data ?? []).some((tag) => tag.name === "source:mobile");
    if (fromStaffApp && at > latest) latest = at;
  }
  return latest ? new Date(latest) : null;
}

/** Reads the thread from Meta; null on any failure so the bot still answers. */
export async function fetchThreadMessages(input: {
  token: string;
  senderId: string;
  timeoutMs: number;
}): Promise<ThreadMessage[] | null> {
  const url = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/me/conversations?platform=messenger&user_id=${encodeURIComponent(input.senderId)}`
    + `&fields=messages.limit(25){from,message,created_time,tags}&access_token=${encodeURIComponent(input.token)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(input.timeoutMs) });
    if (!response.ok) return null;
    const body = await response.json() as { data?: Array<{ messages?: { data?: ThreadMessage[] } }> };
    return body.data?.[0]?.messages?.data ?? [];
  } catch {
    return null;
  }
}

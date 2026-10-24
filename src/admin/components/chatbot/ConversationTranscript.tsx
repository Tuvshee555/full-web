import type { ChatMessage } from "@/components/chatbot/ChatThread";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { formatDateTime } from "@admin/utils/format";
import { useSupportCopy } from "./supportCopy";

export function ConversationTranscript({
  messages,
}: {
  messages: ChatMessage[];
}) {
  const copy = useSupportCopy();
  const { t } = useI18n();
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="space-y-5"
    >
      {!messages.length && (
        <p className="py-8 text-center text-sm text-taupe">
          {copy.threadEmpty}
        </p>
      )}
      {messages.map((message) => {
        const customer = message.role === "customer";
        return (
          <article
            key={message.id}
            className={`w-fit max-w-[94%] sm:max-w-[82%] ${customer ? "mr-auto" : "ml-auto"}`}
          >
            <p
              className={`mb-1.5 text-xs font-medium text-taupe ${customer ? "" : "text-right"}`}
            >
              {customer
                ? copy.customer
                : message.role === "human"
                  ? copy.staff
                  : copy.assistant}
            </p>
            <div
              className={`whitespace-pre-wrap break-words border px-4 py-3 text-sm leading-relaxed ${customer ? "border-ink/15 bg-white" : message.role === "human" ? "border-espresso bg-espresso text-paper" : "border-ink/10 bg-sand"}`}
            >
              {message.text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
                /^https?:\/\//.test(part) ? (
                  <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline underline-offset-2"
                  >
                    {part}
                  </a>
                ) : (
                  <span key={index}>{part}</span>
                ),
              )}
            </div>
            <div
              className={`mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-taupe ${customer ? "" : "justify-end"}`}
            >
              {message.createdAt && (
                <time dateTime={message.createdAt}>
                  {formatDateTime(message.createdAt)}
                </time>
              )}
              {!customer &&
                message.deliveryStatus &&
                message.deliveryStatus !== "local" && (
                  <span
                    className={
                      message.deliveryStatus === "failed"
                        ? "text-terracotta"
                        : ""
                    }
                  >
                    {t(`chatbot.delivery_${message.deliveryStatus}`)}
                  </span>
                )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

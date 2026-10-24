import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

const en = {
  workspace: "Customer support",
  inboxHint:
    "Read incoming messages, take over a conversation, or let the assistant reply.",
  chooseTitle: "A conversation starts here",
  chooseHint:
    "Select a conversation to read its history and reply. Taking over pauses automatic replies for that conversation.",
  emptyHint:
    "Website, Messenger and Instagram conversations will appear here when customers get in touch.",
  all: "All",
  attention: "Needs attention",
  currentPage: "Filters apply to this page",
  conversations: "conversations",
  unread: "Unread messages on this page",
  refreshed: "Last updated",
  refreshing: "Updating…",
  offline: "You are offline. Reconnect to receive and send messages.",
  refresh: "Refresh inbox",
  customer: "Customer",
  assistant: "Assistant",
  staff: "Team",
  automated: "Assistant replies enabled",
  takenOver: "Team is handling this conversation",
  composerHint:
    "Sending a reply takes over this conversation and pauses the assistant.",
  sending: "Sending…",
  updating: "Updating…",
  messageHint: "Write your reply…",
  threadEmpty: "No messages in this conversation yet.",
  loadingThread: "Opening conversation…",
  noMatchesHint:
    "Try another search, clear the filter, or move to another page.",
  loadFailed: "The inbox could not be updated",
  retryHint: "Your reply is kept. Refresh to try again.",
  replyFailed:
    "Could not send your reply. Your draft is kept; try sending it again.",
  takeoverFailed:
    "Could not change who handles this conversation. Please try again.",
  settingsHint:
    "Manage automatic replies, stock visibility and the information available to the assistant.",
  behavior: "Reply behavior",
  behaviorHint:
    "These controls affect how the assistant responds to customers.",
  handoff: "Human handoff",
  handoffHint: "Shown when a customer needs help from your team.",
  knowledge: "Additional knowledge",
  knowledgeHint: "Keep shared guidance accurate in both languages.",
  greetingHint:
    "The first message a customer sees when starting a conversation.",
  mn: "Монгол",
  en: "English",
  saving: "Saving…",
  testTitle: "Try the assistant",
  testHint:
    "Ask a question to check the current catalogue, settings and reply behavior.",
  testEmpty: "Start with a product or delivery question.",
  statsHint:
    "Counts include real conversations only. Test chats are excluded. Lead activity covers the last 14 days (UTC).",
  activity: "Recent lead activity",
  noActivity: "No leads in the last 14 days",
  noActivityHint:
    "Recorded requests will appear here as customers contact the store.",
  channels: "Conversations by channel",
  noChannels: "No customer conversations yet.",
  leadsHint:
    "Follow up on customer requests and keep their progress up to date.",
  noLeadsHint:
    "Requests collected by the assistant will appear here, with a link to the original conversation.",
};
const mn: typeof en = {
  workspace: "Хэрэглэгчийн тусламж",
  inboxHint:
    "Ирсэн мессежийг унших, чатыг өөрөө хариуцах, эсвэл туслахаар хариулуулах.",
  chooseTitle: "Харилцан яриагаа сонгоно уу",
  chooseHint:
    "Чатын түүхийг уншиж, хариу бичихийн тулд чат сонгоно уу. Чатыг хариуцаж авбал автомат хариулт түр зогсоно.",
  emptyHint:
    "Хэрэглэгч холбогдоход вэбсайт, Messenger болон Instagram-ын чат энд харагдана.",
  all: "Бүгд",
  attention: "Анхаарах",
  currentPage: "Шүүлтүүр энэ хуудсанд үйлчилнэ",
  conversations: "чат",
  unread: "Энэ хуудасны уншаагүй мессеж",
  refreshed: "Шинэчилсэн",
  refreshing: "Шинэчилж байна…",
  offline:
    "Интернэт холболт тасарсан. Мессеж хүлээн авах, илгээхийн тулд дахин холбогдоно уу.",
  refresh: "Чат шинэчлэх",
  customer: "Хэрэглэгч",
  assistant: "Туслах",
  staff: "Ажилтан",
  automated: "Туслах хариулж байна",
  takenOver: "Ажилтан хариуцаж байна",
  composerHint:
    "Хариу илгээвэл энэ чатыг та хариуцаж, туслахын хариулт түр зогсоно.",
  sending: "Илгээж байна…",
  updating: "Шинэчилж байна…",
  messageHint: "Хариугаа бичнэ үү…",
  threadEmpty: "Энэ чатад мессеж хараахан алга.",
  loadingThread: "Чат нээж байна…",
  noMatchesHint:
    "Хайлтаа өөрчлөх, шүүлтүүрээ цэвэрлэх эсвэл дараагийн хуудас руу шилжинэ үү.",
  loadFailed: "Чатыг шинэчилж чадсангүй",
  retryHint: "Таны хариу хадгалагдсан. Дахин шинэчилнэ үү.",
  replyFailed:
    "Хариу илгээж чадсангүй. Таны бичсэн хариу хадгалагдсан тул дахин илгээнэ үү.",
  takeoverFailed:
    "Чатыг хариуцах төлөвийг өөрчилж чадсангүй. Дахин оролдоно уу.",
  settingsHint:
    "Автомат хариулт, үлдэгдлийн харагдац болон туслахын ашиглах мэдээллийг удирдана.",
  behavior: "Хариулах тохиргоо",
  behaviorHint:
    "Эдгээр тохиргоо нь туслахын хэрэглэгчид хариулах үйлдэлд нөлөөлнө.",
  handoff: "Ажилтанд шилжүүлэх",
  handoffHint: "Хэрэглэгчид ажилтны тусламж хэрэгтэй үед харуулна.",
  knowledge: "Нэмэлт мэдээлэл",
  knowledgeHint: "Хоёр хэл дээрх мэдээллээ үнэн зөв байлгана уу.",
  greetingHint: "Хэрэглэгч чат эхлүүлэхэд хамгийн түрүүнд харах мэндчилгээ.",
  mn: "Монгол",
  en: "English",
  saving: "Хадгалж байна…",
  testTitle: "Туслахаа турших",
  testHint:
    "Бүтээгдэхүүн, тохиргоо болон хариултыг шалгахын тулд асуулт асууна уу.",
  testEmpty: "Бүтээгдэхүүн эсвэл хүргэлтийн талаар асууж эхлээрэй.",
  statsHint:
    "Зөвхөн бодит чатыг тоолно. Туршилтын чат орохгүй. Хүсэлтийн хөдөлгөөн сүүлийн 14 хоногийг (UTC) хамарна.",
  activity: "Сүүлийн хүсэлтүүд",
  noActivity: "Сүүлийн 14 хоногт хүсэлт ирээгүй",
  noActivityHint:
    "Хэрэглэгч дэлгүүртэй холбогдож, хүсэлт бүртгэгдэхэд энд харагдана.",
  channels: "Сувгаар ангилсан чат",
  noChannels: "Хэрэглэгчийн чат хараахан алга.",
  leadsHint:
    "Хэрэглэгчийн хүсэлттэй холбогдож, шийдвэрлэлтийн төлөвийг шинэчилнэ үү.",
  noLeadsHint:
    "Туслахын цуглуулсан хүсэлтүүд эх чат руу орох холбоосын хамт энд харагдана.",
};

export function useSupportCopy() {
  const { locale } = useI18n();
  return locale === "en" ? en : mn;
}

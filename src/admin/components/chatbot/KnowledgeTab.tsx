"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Check, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Field, Switch } from "@admin/components/ui/controls";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { Panel } from "@admin/components/ui/page";
import { StatusPill } from "@admin/components/ui/status";
import { cn } from "@admin/lib/utils";
import { type FactStatus, type ProductFactKey } from "./types";

type ProductFacts = { id: string; productName: string; updatedAt: string; createdAt?: string; facts: { volume: boolean; howToUse: boolean; ingredientList: boolean; safetyNotes: boolean; faq: number }; status: Record<ProductFactKey, FactStatus>; missing: string[]; unverified: string[]; faqCount: number };
type Knowledge = { products: ProductFacts[]; complete: number; policies: Record<"mn" | "en", { delivery: string; returns: string; safety: string }>; deliveryFee: number; store: { contact: { phone?: string; email?: string }; bank: { name: string; holder: string; account: string } } };
/** The facts the assistant can quote once verified, in the order the table shows them. */
const TABLE_FACTS: ProductFactKey[] = ["description", "claims", "ingredients", "volume", "usage", "frequency", "storage", "safety", "photos", "price", "stock"];
type FaqRow = { id: string; question: string; answer: string; questionEn: string; answerEn: string; enabled: boolean; sortOrder: number };
type FaqDraft = Omit<FaqRow, "id" | "sortOrder"> & { id?: string };

const emptyDraft = (): FaqDraft => ({ question: "", answer: "", questionEn: "", answerEn: "", enabled: true });
const AMOUNT = /₮|\bMNT\b|\d+\s*%/i;

/** Everything the assistant answers from besides prices and stock: product facts, the shop FAQ and the fixed policies. */
export function KnowledgeTab() {
  const { t, locale } = useI18n();
  const { go } = useAdminNav();
  const [data, setData] = useState<Knowledge>();
  const [faq, setFaq] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<FaqDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<FaqRow | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [knowledge, rows] = await Promise.all([api.get("/chatbot/admin/knowledge", { signal }), api.get("/chatbot/admin/faq", { signal })]);
      if (signal?.aborted) return;
      setData(knowledge.data);
      setFaq(Array.isArray(rows.data?.rows) ? rows.data.rows : []);
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const saveFaq = async () => {
    if (!editing || saving) return;
    if (!editing.question.trim() || !editing.answer.trim()) { toast.error(t("knowledge.errors.faq_required")); return; }
    if ([editing.question, editing.answer, editing.questionEn, editing.answerEn].some((value) => AMOUNT.test(value))) { toast.error(t("knowledge.errors.faq_amount")); return; }
    setSaving(true);
    try {
      const payload = { question: editing.question.trim(), answer: editing.answer.trim(), questionEn: editing.questionEn.trim(), answerEn: editing.answerEn.trim(), enabled: editing.enabled };
      if (editing.id) await api.patch("/chatbot/admin/faq", { id: editing.id, ...payload });
      else await api.post("/chatbot/admin/faq", payload);
      toast.success(t("knowledge.toast.faq_saved"));
      setEditing(null);
      await load();
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(t(code === "FAQ_AMOUNT" ? "knowledge.errors.faq_amount" : "knowledge.errors.faq_failed"));
    } finally {
      setSaving(false);
    }
  };
  const toggleFaq = async (row: FaqRow) => {
    try { await api.patch("/chatbot/admin/faq", { id: row.id, enabled: !row.enabled }); setFaq((rows) => rows.map((item) => (item.id === row.id ? { ...item, enabled: !row.enabled } : item))); }
    catch { toast.error(t("knowledge.errors.faq_failed")); }
  };
  const deleteFaq = async () => {
    if (!removing) return;
    try { await api.delete(`/chatbot/admin/faq?id=${encodeURIComponent(removing.id)}`); toast.success(t("knowledge.toast.faq_deleted")); setFaq((rows) => rows.filter((item) => item.id !== removing.id)); }
    catch { toast.error(t("knowledge.errors.faq_failed")); }
    finally { setRemoving(null); }
  };

  if (loading && !data) return <div className="admin-surface"><LoadingRows rows={4} rowClassName="h-[56px]" /></div>;
  if (error && !data) return <ErrorState message={t("knowledge.errors.load_failed")} onRetry={() => void load()} retrying={loading} />;
  if (!data) return null;
  const policies = data.policies[locale === "en" ? "en" : "mn"];
  const statusCell = (status: FactStatus | undefined) => status === "verified"
    ? <span className="inline-flex items-center gap-[4px] text-[13px] text-[#3d4a34]"><Check aria-hidden size={14} />{t("knowledge.status.verified")}</span>
    : status === "unverified"
      ? <span className="inline-flex items-center gap-[4px] text-[13px] font-medium text-[#8a6d1f]"><AlertTriangle aria-hidden size={14} />{t("knowledge.status.unverified")}</span>
      : <span className="inline-flex items-center gap-[4px] text-[13px] font-medium text-terracotta"><Minus aria-hidden size={14} />{t("knowledge.status.missing")}</span>;
  const unverifiedTotal = data.products.reduce((sum, product) => sum + product.unverified.length, 0);
  const verifiedProducts = data.products.filter((product) => TABLE_FACTS.every((key) => product.status[key] !== "unverified")).length;

  return (
    <div className="space-y-[16px]">
      <Notice title={t("knowledge.title")}>{t("knowledge.hint")}</Notice>
      {unverifiedTotal > 0 && <Notice tone="warning" title={t("knowledge.unverified_title", { count: unverifiedTotal })}>{t("knowledge.unverified_hint")}</Notice>}

      <Panel title={t("knowledge.products_title")} description={t("knowledge.products_hint")} action={<StatusPill tone={verifiedProducts === data.products.length ? "success" : "attention"}>{t("knowledge.verified_count", { done: verifiedProducts, total: data.products.length })}</StatusPill>}>
        {data.products.length === 0 ? <EmptyState icon={BookOpen} title={t("knowledge.none")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-taupe"><tr><th scope="col" className="px-[12px] py-[10px] pl-[16px] font-medium md:pl-[20px]">{t("knowledge.col.product")}</th>{TABLE_FACTS.map((key) => <th key={key} scope="col" className="px-[12px] py-[10px] font-medium">{t(`knowledge.fact.${key}`)}</th>)}<th scope="col" className="px-[12px] py-[10px] font-medium">{t("knowledge.col.faq")}</th><th scope="col" className="sr-only">{t("knowledge.edit")}</th></tr></thead>
              <tbody className="divide-y divide-ink/10">
                {data.products.map((product) => (
                  <tr key={product.id} className={cn(product.unverified.length || product.missing.length ? "bg-terracotta/[0.03]" : "")}>
                    <td className="px-[12px] py-[10px] pl-[16px] font-medium text-ink md:pl-[20px]">{product.productName}</td>
                    {TABLE_FACTS.map((key) => <td key={key} className="px-[12px] py-[10px]">{statusCell(product.status?.[key])}</td>)}
                    <td className="px-[12px] py-[10px] text-taupe">{t("knowledge.faq_count", { count: product.faqCount ?? product.facts.faq })}</td>
                    <td className="px-[12px] py-[10px] pr-[16px] text-right md:pr-[20px]"><button type="button" className="btn-secondary btn-sm" onClick={() => go("products", { product: product.id })}>{t("knowledge.edit")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-[16px] py-[10px] text-[12px] leading-relaxed text-taupe md:px-[20px]">{t("knowledge.legend")}</p>
      </Panel>

      <Panel title={t("knowledge.faq_title")} description={t("knowledge.faq_hint")} action={!editing && <button type="button" className="btn btn-sm" onClick={() => setEditing(emptyDraft())}><Plus aria-hidden size={14} />{t("knowledge.faq_add")}</button>}>
        {editing && (
          <form className="space-y-[12px] border-b border-ink/10 bg-paper p-[16px] md:p-[20px]" onSubmit={(e) => { e.preventDefault(); void saveFaq(); }}>
            <p className="text-[14px] font-medium">{editing.id ? t("common.edit") : t("knowledge.faq_new")}</p>
            <div className="grid gap-[12px] md:grid-cols-2">
              <Field label={t("knowledge.faq_q")}>{(props) => <input {...props} className="field" value={editing.question} maxLength={300} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />}</Field>
              <Field label={t("knowledge.faq_q_en")} optional>{(props) => <input {...props} className="field" value={editing.questionEn} maxLength={300} onChange={(e) => setEditing({ ...editing, questionEn: e.target.value })} />}</Field>
              <Field label={t("knowledge.faq_a")}>{(props) => <textarea {...props} className="field resize-y" rows={3} value={editing.answer} maxLength={2000} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />}</Field>
              <Field label={t("knowledge.faq_a_en")} optional>{(props) => <textarea {...props} className="field resize-y" rows={3} value={editing.answerEn} maxLength={2000} onChange={(e) => setEditing({ ...editing, answerEn: e.target.value })} />}</Field>
            </div>
            <Switch checked={editing.enabled} onChange={(on) => setEditing({ ...editing, enabled: on })} label={t("knowledge.faq_enabled")} />
            <div className="flex flex-wrap justify-end gap-[8px]">
              <button type="button" className="btn-ghost" disabled={saving} onClick={() => setEditing(null)}>{t("common.cancel")}</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? <Loader2 aria-hidden size={16} className="animate-spin" /> : null}{t("knowledge.faq_save")}</button>
            </div>
          </form>
        )}
        {faq.length === 0 && !editing ? <EmptyState icon={BookOpen} title={t("knowledge.faq_empty")} description={t("knowledge.faq_empty_hint")} /> : (
          <ul className="divide-y divide-ink/10">
            {faq.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-[12px] px-[16px] py-[14px] md:px-[20px]">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink">{row.question}</p>
                  <p className="mt-[4px] whitespace-pre-wrap text-[13px] leading-relaxed text-taupe">{row.answer}</p>
                  {row.questionEn && <p className="mt-[6px] text-[12px] text-taupe">EN: {row.questionEn}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-[6px]">
                  <StatusPill tone={row.enabled ? "success" : "neutral"}>{t(row.enabled ? "knowledge.faq_enabled" : "knowledge.faq_disabled")}</StatusPill>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => void toggleFaq(row)}>{t(row.enabled ? "knowledge.faq_disabled" : "knowledge.faq_enabled")}</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing({ id: row.id, question: row.question, answer: row.answer, questionEn: row.questionEn, answerEn: row.answerEn, enabled: row.enabled })}>{t("common.edit")}</button>
                  <button type="button" className="btn-ghost btn-sm" aria-label={t("knowledge.faq_delete")} onClick={() => setRemoving(row)}><Trash2 aria-hidden size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("knowledge.policies_title")} description={t("knowledge.policies_hint")} bodyClassName="grid gap-[14px] p-[16px] md:grid-cols-2 md:p-[20px]">
        {(["delivery", "returns", "safety"] as const).map((key) => (
          <div key={key}><p className="text-[13px] text-taupe">{t(`knowledge.policy.${key}`)}</p><p className="mt-[4px] text-[14px] leading-relaxed text-ink">{policies[key]}</p></div>
        ))}
        <div><p className="text-[13px] text-taupe">{t("knowledge.delivery_fee")}</p><p className="mt-[4px] text-[14px] text-ink">{data.deliveryFee.toLocaleString("en-US")}₮</p></div>
        <div><p className="text-[13px] text-taupe">{t("knowledge.payment")}</p><p className="mt-[4px] text-[14px] text-ink">{t("knowledge.payment_methods")}</p></div>
        <div><p className="text-[13px] text-taupe">{t("knowledge.contact")}</p><p className="mt-[4px] text-[14px] text-ink">{[data.store.contact.phone, data.store.contact.email].filter(Boolean).join(" · ")}</p></div>
        <div><p className="text-[13px] text-taupe">{t("knowledge.bank")}</p><p className="mt-[4px] text-[14px] text-ink">{data.store.bank.name} · {data.store.bank.holder} · {data.store.bank.account}</p></div>
      </Panel>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title={t("knowledge.faq_delete_confirm", { q: removing?.question ?? "" })}
        confirmLabel={t("knowledge.faq_delete")}
        onConfirm={() => void deleteFaq()}
      />
    </div>
  );
}

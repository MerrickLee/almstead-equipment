"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@/lib/types";

export function ReviewPanel({ orderId, status, notes }: { orderId: string; status: OrderStatus; notes: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, manager_notes: text }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not save");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this repair order and its photos? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not delete");
      router.replace("/manager");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col gap-3 border-2 border-brand p-4">
      <span className="section-title">Manager review</span>
      <label className="label" htmlFor="notes">
        Notes (optional)
      </label>
      <textarea id="notes" className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Approve parts cost, flag follow-up, note warranty claim…" />
      {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}
      {status === "reviewed" ? (
        <>
          <button type="button" onClick={() => void save("reviewed")} disabled={busy} className="btn-secondary">
            Save notes
          </button>
          <button type="button" onClick={() => void save("submitted")} disabled={busy} className="btn-secondary">
            Reopen for the mechanic
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => void save("reviewed")} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Mark as reviewed"}
          </button>
          <span className="text-[12px] text-muted">Locks the order for the mechanic. You can reopen it later.</span>
          {text !== (notes ?? "") ? (
            <button type="button" onClick={() => void save("submitted")} disabled={busy} className="text-[13px] font-semibold text-brand">
              Save notes without reviewing
            </button>
          ) : null}
        </>
      )}
      <button type="button" onClick={() => void remove()} disabled={busy} className="mt-2 text-[12px] font-semibold text-danger">
        Delete this order
      </button>
    </section>
  );
}

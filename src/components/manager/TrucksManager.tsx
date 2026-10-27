"use client";

import Link from "next/link";
import { useState } from "react";
import { BRANCHES, TRUCK_KINDS } from "@/lib/constants";
import { unitLabel } from "@/lib/format";
import type { Truck } from "@/lib/types";

const empty = { truck_number: "", description: "", branch: "", kind: "vehicle" as Truck["kind"], asset_id: "" };

export function TrucksManager({ initial }: { initial: Truck[] }) {
  const [trucks, setTrucks] = useState<Truck[]>(initial);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showRetired, setShowRetired] = useState(false);

  const visible = trucks.filter((t) => {
    if (!showRetired && !t.active) return false;
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [t.truck_number, t.description, t.branch, t.asset_id, t.kind].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  const call = async (url: string, method: string, body: unknown): Promise<Truck> => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { truck?: Truck; error?: string };
    if (!res.ok || !data.truck) throw new Error(data.error ?? "Request failed");
    return data.truck;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const t = await call(`/api/manager/trucks/${editing}`, "PATCH", form);
        setTrucks((ts) => ts.map((x) => (x.id === t.id ? t : x)));
      } else {
        const t = await call("/api/manager/trucks", "POST", form);
        setTrucks((ts) => [...ts, t].sort((a, b) => a.truck_number.localeCompare(b.truck_number, undefined, { numeric: true })));
      }
      setForm(empty);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t: Truck) => {
    setBusy(true);
    setError(null);
    try {
      const u = await call(`/api/manager/trucks/${t.id}`, "PATCH", { active: !t.active });
      setTrucks((ts) => ts.map((x) => (x.id === u.id ? u : x)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={submit} className="card flex h-fit flex-col gap-3 p-4">
        <span className="section-title">{editing ? "Edit truck" : "Add a truck"}</span>
        <div>
          <label className="label" htmlFor="truck_number">
            Truck #
          </label>
          <input id="truck_number" className="field" value={form.truck_number} onChange={(e) => setForm({ ...form, truck_number: e.target.value })} required placeholder="14" />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <input id="description" className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Chipper truck, 2019 F-550" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="truck_kind">
              Type
            </label>
            <select id="truck_kind" className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Truck["kind"] })}>
              {TRUCK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === "vehicle" ? "Vehicle" : "Equipment"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="asset_id">
              Asset ID
            </label>
            <input id="asset_id" className="field" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} placeholder="PO system" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="truck_branch">
            Branch
          </label>
          <select id="truck_branch" className="field" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            <option value="">—</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {editing ? "Save" : "Add truck"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          ) : null}
        </div>
        <p className="text-[12px] text-muted">
          The list was loaded from the PO and job-cost systems. Have a spreadsheet? <code>npm run seed-trucks -- trucks.csv</code> loads it.
        </p>
      </form>

      <div className="flex flex-col gap-3 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by unit #, description, branch, asset ID…"
            aria-label="Filter trucks"
            className="field min-h-10 flex-[1_1_260px] text-[14px]"
          />
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> Show retired
          </label>
          <span className="text-[13px] text-muted">
            {visible.length} of {trucks.length}
          </span>
        </div>
        <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">Unit #</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Branch</th>
              <th className="px-4 py-3 font-semibold">Asset ID</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {trucks.length === 0 ? "No trucks yet. Add the first one on the left." : "Nothing matches that filter."}
                </td>
              </tr>
            ) : (
              visible.map((t) => (
                <tr key={t.id} className={`border-t border-[#eef2ee] ${!t.active ? "text-muted" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/manager/trucks/${t.id}`} className="font-semibold text-brand">
                      {unitLabel(t.truck_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{t.description ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{t.kind}</td>
                  <td className="px-4 py-3">{t.branch ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{t.asset_id ?? "—"}</td>
                  <td className="px-4 py-3">{t.active ? <span className="badge-submitted">Active</span> : <span className="badge-reviewed">Retired</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(t.id);
                        setForm({ truck_number: t.truck_number, description: t.description ?? "", branch: t.branch ?? "", kind: t.kind, asset_id: t.asset_id ?? "" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="min-h-9 px-2 font-semibold text-brand"
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => void toggle(t)} disabled={busy} className="min-h-9 px-2 font-semibold text-muted">
                      {t.active ? "Retire" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

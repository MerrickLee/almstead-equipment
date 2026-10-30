"use client";

import Link from "next/link";
import { useState } from "react";
import { BRANCHES, TRUCK_KINDS } from "@/lib/constants";
import { unitLabel } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { Truck } from "@/lib/types";

const empty = { truck_number: "", description: "", branch: "", kind: "vehicle" as Truck["kind"], asset_id: "" };

export function TrucksManager({ initial }: { initial: Truck[] }) {
  const t = useT();
  const [trucks, setTrucks] = useState<Truck[]>(initial);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showRetired, setShowRetired] = useState(false);

  const visible = trucks.filter((x) => {
    if (!showRetired && !x.active) return false;
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [x.truck_number, x.description, x.branch, x.asset_id, x.kind].some((v) => (v ?? "").toLowerCase().includes(q));
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
        const u = await call(`/api/manager/trucks/${editing}`, "PATCH", form);
        setTrucks((ts) => ts.map((x) => (x.id === u.id ? u : x)));
      } else {
        const u = await call("/api/manager/trucks", "POST", form);
        setTrucks((ts) => [...ts, u].sort((a, b) => a.truck_number.localeCompare(b.truck_number, undefined, { numeric: true })));
      }
      setForm(empty);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (x: Truck) => {
    setBusy(true);
    setError(null);
    try {
      const u = await call(`/api/manager/trucks/${x.id}`, "PATCH", { active: !x.active });
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
        <span className="section-title">{editing ? t("trucks.editTitle") : t("trucks.add")}</span>
        <div>
          <label className="label" htmlFor="truck_number">
            {t("trucks.number")}
          </label>
          <input id="truck_number" className="field" value={form.truck_number} onChange={(e) => setForm({ ...form, truck_number: e.target.value })} required placeholder="14" />
        </div>
        <div>
          <label className="label" htmlFor="description">
            {t("trucks.description")}
          </label>
          <input id="description" className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("trucks.descriptionHint")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="truck_kind">
              {t("trucks.type")}
            </label>
            <select id="truck_kind" className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Truck["kind"] })}>
              {TRUCK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === "vehicle" ? t("common.vehicle") : t("common.equipment")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="asset_id">
              {t("trucks.assetId")}
            </label>
            <input id="asset_id" className="field" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} placeholder={t("trucks.assetIdHint")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="truck_branch">
            {t("form.branch")}
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
            {editing ? t("common.save") : t("trucks.addButton")}
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
              {t("common.cancel")}
            </button>
          ) : null}
        </div>
        <p className="text-[12px] text-muted">{t("trucks.seedHint")}</p>
      </form>

      <div className="flex flex-col gap-3 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("trucks.filter")}
            aria-label={t("trucks.filter")}
            className="field min-h-10 flex-[1_1_260px] text-[14px]"
          />
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> {t("trucks.showRetired")}
          </label>
          <span className="text-[13px] text-muted">{t("trucks.count", { n: visible.length, total: trucks.length })}</span>
        </div>
        <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">{t("trucks.number")}</th>
              <th className="px-4 py-3 font-semibold">{t("trucks.description")}</th>
              <th className="px-4 py-3 font-semibold">{t("trucks.type")}</th>
              <th className="px-4 py-3 font-semibold">{t("form.branch")}</th>
              <th className="px-4 py-3 font-semibold">{t("trucks.assetId")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.status")}</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {trucks.length === 0 ? t("trucks.none") : t("trucks.noFilterMatch")}
                </td>
              </tr>
            ) : (
              visible.map((x) => (
                <tr key={x.id} className={`border-t border-[#eef2ee] ${!x.active ? "text-muted" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/manager/trucks/${x.id}`} className="font-semibold text-brand">
                      {unitLabel(x.truck_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{x.description ?? "—"}</td>
                  <td className="px-4 py-3">{x.kind === "vehicle" ? t("common.vehicle") : t("common.equipment")}</td>
                  <td className="px-4 py-3">{x.branch ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{x.asset_id ?? "—"}</td>
                  <td className="px-4 py-3">{x.active ? <span className="badge-submitted">{t("common.active")}</span> : <span className="badge-reviewed">{t("common.retired")}</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(x.id);
                        setForm({ truck_number: x.truck_number, description: x.description ?? "", branch: x.branch ?? "", kind: x.kind, asset_id: x.asset_id ?? "" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="min-h-9 px-2 font-semibold text-brand"
                    >
                      {t("common.edit")}
                    </button>
                    <button type="button" onClick={() => void toggle(x)} disabled={busy} className="min-h-9 px-2 font-semibold text-muted">
                      {x.active ? t("trucks.retire") : t("trucks.reactivate")}
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

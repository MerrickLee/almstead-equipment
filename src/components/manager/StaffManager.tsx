"use client";

import { useState } from "react";
import { BRANCHES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import type { Staff } from "@/lib/types";

const empty = { full_name: "", role: "mechanic" as Staff["role"], branch: "", language: "" as "" | "en" | "es", passcode: "" };

export function StaffManager({ initial, meId }: { initial: Staff[]; meId: string }) {
  const { lang, t } = useLang();
  const locale = localeOf(lang);
  const [staff, setStaff] = useState<Staff[]>(initial);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = async (url: string, method: string, body: unknown): Promise<Staff> => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { staff?: Staff; error?: string };
    if (!res.ok || !data.staff) throw new Error(data.error ?? "Request failed");
    return data.staff;
  };

  const kindOf = (s: Staff) => (s.role === "mechanic" ? t("staff.kind.pin") : t("staff.kind.passcode"));
  const roleLabel = (s: Staff) => (s.role === "manager" ? t("common.manager") : t("common.mechanic"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        full_name: form.full_name,
        role: form.role,
        branch: form.branch,
        language: form.language || null,
        ...(form.passcode ? { passcode: form.passcode } : {}),
      };
      if (editing) {
        const s = await call(`/api/manager/staff/${editing}`, "PATCH", payload);
        setStaff((xs) => xs.map((x) => (x.id === s.id ? s : x)));
        setNotice(form.passcode ? t("staff.updatedPin", { name: s.full_name, kind: kindOf(s) }) : t("staff.updated", { name: s.full_name }));
      } else {
        if (!form.passcode) throw new Error(t("staff.needPin"));
        const s = await call("/api/manager/staff", "POST", payload);
        setStaff((xs) => [...xs, s].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        setNotice(t("staff.added", { name: s.full_name, kind: kindOf(s) }));
      }
      setForm(empty);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (s: Staff) => {
    setBusy(true);
    setError(null);
    try {
      const u = await call(`/api/manager/staff/${s.id}`, "PATCH", { active: !s.active });
      setStaff((xs) => xs.map((x) => (x.id === u.id ? u : x)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isMechanic = form.role === "mechanic";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={submit} className="card flex h-fit flex-col gap-3 p-4">
        <span className="section-title">{editing ? t("staff.editPerson") : t("staff.addPerson")}</span>
        <div>
          <label className="label" htmlFor="full_name">
            {t("staff.fullName")}
          </label>
          <input id="full_name" className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required autoComplete="off" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="role">
              {t("staff.role")}
            </label>
            <select id="role" className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Staff["role"], passcode: "" })}>
              <option value="mechanic">{t("common.mechanic")}</option>
              <option value="manager">{t("common.manager")}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="staff_language">
              {t("staff.language")}
            </label>
            <select id="staff_language" className="field" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as typeof form.language })}>
              <option value="">—</option>
              <option value="en">{t("lang.en")}</option>
              <option value="es">{t("lang.es")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="staff_branch">
            {t("form.branch")}
          </label>
          <select id="staff_branch" className="field" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            <option value="">—</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="passcode">
            {isMechanic ? t("staff.pin") : t("staff.passcode")}
            {editing ? <span className="font-normal text-muted"> {t("staff.leaveBlank")}</span> : null}
          </label>
          <input
            id="passcode"
            className="field"
            inputMode={isMechanic ? "numeric" : "text"}
            pattern={isMechanic ? "[0-9]*" : undefined}
            maxLength={isMechanic ? 6 : 100}
            value={form.passcode}
            onChange={(e) => setForm({ ...form, passcode: isMechanic ? e.target.value.replace(/\D/g, "") : e.target.value })}
            autoComplete="off"
          />
        </div>
        {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}
        {notice ? <p className="text-[13px] font-medium text-brand-dark">{notice}</p> : null}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {editing ? t("common.save") : t("common.add")}
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
      </form>

      <div className="card overflow-x-auto lg:col-span-2">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">{t("staff.col.name")}</th>
              <th className="px-4 py-3 font-semibold">{t("staff.role")}</th>
              <th className="px-4 py-3 font-semibold">{t("form.branch")}</th>
              <th className="px-4 py-3 font-semibold">{t("lang.switch")}</th>
              <th className="px-4 py-3 font-semibold">{t("staff.col.lastSignIn")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.status")}</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className={`border-t border-[#eef2ee] ${!s.active ? "text-muted" : ""}`}>
                <td className="px-4 py-3 font-semibold">
                  {s.full_name}
                  {s.id === meId ? <span className="ml-1 font-normal text-muted">{t("staff.you")}</span> : null}
                </td>
                <td className="px-4 py-3">{roleLabel(s)}</td>
                <td className="px-4 py-3">{s.branch ?? "—"}</td>
                <td className="px-4 py-3">{s.language ? t(s.language === "es" ? "lang.es" : "lang.en") : "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{s.last_login_at ? fmtDateTime(s.last_login_at, locale) : t("common.never")}</td>
                <td className="px-4 py-3">{s.active ? <span className="badge-submitted">{t("common.active")}</span> : <span className="badge-reviewed">{t("common.inactive")}</span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(s.id);
                      setForm({ full_name: s.full_name, role: s.role, branch: s.branch ?? "", language: s.language ?? "", passcode: "" });
                      setNotice(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="min-h-9 px-2 font-semibold text-brand"
                  >
                    {t("staff.editReset")}
                  </button>
                  {s.id !== meId ? (
                    <button type="button" onClick={() => void toggle(s)} disabled={busy} className="min-h-9 px-2 font-semibold text-muted">
                      {s.active ? t("staff.deactivate") : t("staff.reactivate")}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

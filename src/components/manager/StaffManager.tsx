"use client";

import { useState } from "react";
import { BRANCHES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import type { Staff } from "@/lib/types";

const empty = { full_name: "", role: "mechanic" as Staff["role"], branch: "", passcode: "" };

export function StaffManager({ initial, meId }: { initial: Staff[]; meId: string }) {
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = { full_name: form.full_name, role: form.role, branch: form.branch, ...(form.passcode ? { passcode: form.passcode } : {}) };
      if (editing) {
        const s = await call(`/api/manager/staff/${editing}`, "PATCH", payload);
        setStaff((xs) => xs.map((x) => (x.id === s.id ? s : x)));
        setNotice(form.passcode ? `${s.full_name} updated — new ${s.role === "mechanic" ? "PIN" : "passcode"} set.` : `${s.full_name} updated.`);
      } else {
        if (!form.passcode) throw new Error("Enter a PIN or passcode.");
        const s = await call("/api/manager/staff", "POST", payload);
        setStaff((xs) => [...xs, s].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        setNotice(`${s.full_name} added. Tell them their ${s.role === "mechanic" ? "PIN" : "passcode"} in person — it isn't shown again.`);
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
        <span className="section-title">{editing ? "Edit person" : "Add a person"}</span>
        <div>
          <label className="label" htmlFor="full_name">
            Full name
          </label>
          <input id="full_name" className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <select id="role" className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Staff["role"], passcode: "" })}>
            <option value="mechanic">Mechanic</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="staff_branch">
            Branch
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
            {isMechanic ? "PIN (4–6 digits)" : "Passcode (6+ characters)"}
            {editing ? <span className="font-normal text-muted"> — leave blank to keep</span> : null}
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
            {editing ? "Save" : "Add"}
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
      </form>

      <div className="card overflow-x-auto lg:col-span-2">
        <table className="w-full min-w-[600px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Branch</th>
              <th className="px-4 py-3 font-semibold">Last sign-in</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className={`border-t border-[#eef2ee] ${!s.active ? "text-muted" : ""}`}>
                <td className="px-4 py-3 font-semibold">
                  {s.full_name}
                  {s.id === meId ? <span className="ml-1 font-normal text-muted">(you)</span> : null}
                </td>
                <td className="px-4 py-3 capitalize">{s.role}</td>
                <td className="px-4 py-3">{s.branch ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{s.last_login_at ? fmtDateTime(s.last_login_at) : "Never"}</td>
                <td className="px-4 py-3">{s.active ? <span className="badge-submitted">Active</span> : <span className="badge-reviewed">Inactive</span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(s.id);
                      setForm({ full_name: s.full_name, role: s.role, branch: s.branch ?? "", passcode: "" });
                      setNotice(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="min-h-9 px-2 font-semibold text-brand"
                  >
                    Edit / reset PIN
                  </button>
                  {s.id !== meId ? (
                    <button type="button" onClick={() => void toggle(s)} disabled={busy} className="min-h-9 px-2 font-semibold text-muted">
                      {s.active ? "Deactivate" : "Reactivate"}
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

"use client";

import { Delete, Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MECHANIC_PIN_MAX } from "@/lib/constants";
import { initials } from "@/lib/format";

interface StaffOption {
  id: string;
  full_name: string;
  role: "mechanic" | "manager";
  branch: string | null;
}

const LAST_KEY = "ro:lastStaffId";
const LIST_KEY = "ro:staffList";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<StaffOption | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(LIST_KEY);
      if (cached) setStaff(JSON.parse(cached));
    } catch {
      /* ignore */
    }
    fetch("/api/auth/staff-list")
      .then(async (r) => {
        const body = (await r.json()) as { staff?: StaffOption[]; error?: string };
        if (!r.ok || !body.staff) throw new Error(body.error ?? "Could not load names");
        setStaff(body.staff);
        try {
          localStorage.setItem(LIST_KEY, JSON.stringify(body.staff));
          const last = localStorage.getItem(LAST_KEY);
          const match = body.staff.find((s) => s.id === last);
          if (match) setSelected(match);
        } catch {
          /* ignore */
        }
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? staff.filter((s) => s.full_name.toLowerCase().includes(q)) : staff;
  }, [staff, filter]);

  const isMechanic = selected?.role === "mechanic";

  const submit = async () => {
    if (!selected || !passcode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selected.id, passcode }),
      });
      const body = (await res.json()) as { home?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Sign-in failed");
      try {
        localStorage.setItem(LAST_KEY, selected.id);
      } catch {
        /* ignore */
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : (body.home ?? "/app"));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPasscode("");
    } finally {
      setBusy(false);
    }
  };

  // Mechanics: auto-submit when the PIN reaches the max length.
  useEffect(() => {
    if (isMechanic && passcode.length === MECHANIC_PIN_MAX && !busy) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passcode]);

  const press = (d: string) => {
    if (busy) return;
    setError(null);
    setPasscode((p) => (p.length < MECHANIC_PIN_MAX ? p + d : p));
  };

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image src="/logo.png" alt="Almstead Tree, Shrub & Lawn Care" width={104} height={104} priority />
        <h1 className="text-[22px] font-bold tracking-tight">Repair Orders</h1>
      </div>

      {!selected ? (
        <section className="card flex-1 overflow-hidden">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find your name"
                className="field pl-10"
                autoComplete="off"
                aria-label="Find your name"
              />
            </div>
          </div>
          {loading && staff.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-muted">Loading names…</p>
          ) : loadError && staff.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-danger">{loadError}</p>
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-muted">No one by that name. Ask your manager to add you.</p>
          ) : (
            <ul className="max-h-[60dvh] overflow-y-auto">
              {visible.map((s) => (
                <li key={s.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setPasscode("");
                      setError(null);
                    }}
                    className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-ground"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{initials(s.full_name)}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-semibold">{s.full_name}</span>
                      <span className="text-[12px] text-muted">
                        {s.role === "manager" ? "Manager" : "Mechanic"}
                        {s.branch ? ` · ${s.branch}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="flex flex-1 flex-col">
          <div className="card mb-5 flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{initials(selected.full_name)}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">{selected.full_name}</span>
              <span className="text-[12px] text-muted">
                {selected.role === "manager" ? "Manager" : "Mechanic"}
                {selected.branch ? ` · ${selected.branch}` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPasscode("");
                setError(null);
              }}
              className="min-h-10 px-2 text-[13px] font-semibold text-brand"
            >
              Change
            </button>
          </div>

          {isMechanic ? (
            <>
              <p className="mb-3 text-center text-[14px] text-muted">Enter your PIN</p>
              <div className="mb-6 flex justify-center gap-3.5" aria-live="polite" aria-label={`${passcode.length} digits entered`}>
                {Array.from({ length: MECHANIC_PIN_MAX }).map((_, i) => (
                  <span key={i} className={`h-4 w-4 rounded-full ${i < passcode.length ? "bg-brand" : "border-2 border-line"}`} />
                ))}
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} type="button" onClick={() => press(d)} className="h-16 rounded-2xl border border-line bg-white text-[24px] font-semibold active:bg-ground">
                    {d}
                  </button>
                ))}
                <button type="button" onClick={() => submit()} disabled={busy || passcode.length < 4} className="h-16 rounded-2xl text-[14px] font-semibold text-brand disabled:opacity-40">
                  Go
                </button>
                <button type="button" onClick={() => press("0")} className="h-16 rounded-2xl border border-line bg-white text-[24px] font-semibold active:bg-ground">
                  0
                </button>
                <button type="button" onClick={() => setPasscode((p) => p.slice(0, -1))} aria-label="Delete last digit" className="flex h-16 items-center justify-center rounded-2xl border border-line bg-white active:bg-ground">
                  <Delete size={26} />
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="flex flex-col gap-3"
            >
              <label className="label" htmlFor="passcode">
                Passcode
              </label>
              <input id="passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="field" autoComplete="current-password" autoFocus />
              <button type="submit" disabled={busy || !passcode} className="btn-primary mt-2">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {error ? <p className="mt-2 text-center text-[14px] font-medium text-danger">{error}</p> : null}
          {busy && isMechanic ? <p className="mt-2 text-center text-[14px] text-muted">Signing in…</p> : null}
        </section>
      )}

      <p className="mt-6 text-center text-[12px] text-muted">Forgot your PIN? Ask your manager to reset it.</p>
    </main>
  );
}

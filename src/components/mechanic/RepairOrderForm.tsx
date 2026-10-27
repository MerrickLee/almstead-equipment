"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRANCHES } from "@/lib/constants";
import { nowHHMM, todayISO } from "@/lib/format";
import { clearDraft, enqueue, flushOutbox, loadDraft, newClientId, saveDraft, type DraftOrder, type LocalPhoto } from "@/lib/offline";
import type { RepairOrderInput, SessionUser, Truck } from "@/lib/types";
import { PhotoCapture } from "@/components/PhotoCapture";
import { SignaturePad } from "@/components/SignaturePad";

const TRUCKS_KEY = "ro:trucks";
const OTHER = "__other__";

interface Props {
  user: SessionUser;
  initialTrucks: Truck[];
  /** Edit mode: an existing order's values. Photos/signature are edited through the detail page. */
  existing?: { id: string; values: RepairOrderInput };
}

function emptyValues(user: SessionUser): RepairOrderInput {
  return {
    client_id: newClientId(),
    truck_id: null,
    truck_number: "",
    branch: user.branch && (BRANCHES as readonly string[]).includes(user.branch) ? user.branch : null,
    work_date: todayISO(),
    location: "",
    mileage: null,
    travel_time_minutes: null,
    total_hours: null,
    summary: "",
    work_performed: "",
    parts_materials: "",
    start_time: null,
    finish_time: null,
  };
}

function hoursBetween(start: string | null, finish: string | null): number | null {
  if (!start || !finish) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [fh, fm] = finish.split(":").map(Number);
  let mins = fh * 60 + fm - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 4) / 4; // quarter hours
}

export function RepairOrderForm({ user, initialTrucks, existing }: Props) {
  const router = useRouter();
  const isEdit = Boolean(existing);

  const [trucks, setTrucks] = useState<Truck[]>(initialTrucks);
  const [values, setValues] = useState<RepairOrderInput>(existing?.values ?? emptyValues(user));
  const [truckChoice, setTruckChoice] = useState<string>(existing?.values.truck_id ?? (existing ? OTHER : ""));
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [travelH, setTravelH] = useState<string>(existing?.values.travel_time_minutes ? String(Math.floor(existing.values.travel_time_minutes / 60)) : "");
  const [travelM, setTravelM] = useState<string>(existing?.values.travel_time_minutes ? String(existing.values.travel_time_minutes % 60) : "");
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Trucks: keep a copy on the phone so the picker works offline.
  useEffect(() => {
    if (initialTrucks.length) {
      try {
        localStorage.setItem(TRUCKS_KEY, JSON.stringify(initialTrucks));
      } catch {
        /* ignore */
      }
    } else {
      try {
        const cached = localStorage.getItem(TRUCKS_KEY);
        if (cached) setTrucks(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }
  }, [initialTrucks]);

  // Restore a draft on the phone (new orders only).
  useEffect(() => {
    if (isEdit) {
      hydrated.current = true;
      return;
    }
    void loadDraft().then((d) => {
      if (d && d.values) {
        setValues(d.values);
        setPhotos(d.photos ?? []);
        setSignature(d.signature ?? null);
        setTruckChoice(d.values.truck_id ?? (d.values.truck_number ? OTHER : ""));
        if (d.values.travel_time_minutes !== null) {
          setTravelH(String(Math.floor(d.values.travel_time_minutes / 60)));
          setTravelM(String(d.values.travel_time_minutes % 60));
        }
        setDraftRestored(true);
      }
      hydrated.current = true;
    });
  }, [isEdit]);

  // Autosave the draft (debounced).
  useEffect(() => {
    if (isEdit || !hydrated.current) return;
    const t = setTimeout(() => {
      const draft: DraftOrder = { values, photos, signature, updatedAt: Date.now() };
      void saveDraft(draft).then(() => setDraftSavedAt(Date.now()));
    }, 600);
    return () => clearTimeout(t);
  }, [values, photos, signature, isEdit]);

  const set = useCallback(<K extends keyof RepairOrderInput>(key: K, v: RepairOrderInput[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const onTruckChange = (choice: string) => {
    setTruckChoice(choice);
    if (choice === OTHER || choice === "") {
      set("truck_id", null);
      if (choice === "") set("truck_number", "");
      return;
    }
    const t = trucks.find((x) => x.id === choice);
    if (t) {
      setValues((prev) => ({
        ...prev,
        truck_id: t.id,
        truck_number: t.truck_number,
        branch: t.branch && (BRANCHES as readonly string[]).includes(t.branch) ? t.branch : prev.branch,
      }));
    }
  };

  const onTravel = (h: string, m: string) => {
    setTravelH(h);
    setTravelM(m);
    const hh = parseInt(h || "0", 10);
    const mm = parseInt(m || "0", 10);
    set("travel_time_minutes", h === "" && m === "" ? null : (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm));
  };

  const computedHours = useMemo(() => hoursBetween(values.start_time, values.finish_time), [values.start_time, values.finish_time]);

  const discardDraft = async () => {
    await clearDraft();
    setValues(emptyValues(user));
    setPhotos([]);
    setSignature(null);
    setTruckChoice("");
    setTravelH("");
    setTravelM("");
    setDraftRestored(false);
  };

  const validate = (): string | null => {
    if (!values.truck_number.trim()) return "Choose a truck or enter a truck number.";
    if (!values.work_date) return "Enter the date.";
    if (!isEdit && !signature) return "Sign the order before submitting.";
    return null;
  };

  const submitNew = async () => {
    const draft: DraftOrder = { values, photos, signature, updatedAt: Date.now() };
    await enqueue(draft);
    await clearDraft();
    window.dispatchEvent(new Event("ro:outbox-changed"));
    if (navigator.onLine) {
      const { remaining } = await flushOutbox();
      window.dispatchEvent(new Event("ro:outbox-changed"));
      router.replace(remaining === 0 ? "/app?submitted=1" : "/app?queued=1");
    } else {
      router.replace("/app?queued=1");
    }
    router.refresh();
  };

  const submitEdit = async () => {
    const res = await fetch(`/api/orders/${existing!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Could not save changes");
    router.replace(`/app/orders/${existing!.id}`);
    router.refresh();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) await submitEdit();
      else await submitNew();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <div className="rounded-xl bg-danger-light px-4 py-3 text-[14px] font-medium text-danger">{error}</div> : null}
      {draftRestored ? (
        <div className="flex items-center gap-3 rounded-xl bg-sun-light px-4 py-2.5 text-[13px] text-sun-dark">
          <span className="flex-1">Picked up where you left off.</span>
          <button type="button" onClick={() => void discardDraft()} className="min-h-9 font-semibold underline">
            Start over
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      <section className="card flex flex-col gap-4 p-4">
        <h2 className="section-title">Job details</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="mechanic">
              Mechanic
            </label>
            <input id="mechanic" className="field" value={user.name} readOnly />
          </div>
          <div>
            <label className="label" htmlFor="work_date">
              Date
            </label>
            <input id="work_date" type="date" className="field" value={values.work_date} onChange={(e) => set("work_date", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="truck">
            Truck #
          </label>
          <select id="truck" className="field font-semibold" value={truckChoice} onChange={(e) => onTruckChange(e.target.value)}>
            <option value="">Choose a truck…</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.truck_number}
                {t.description ? ` — ${t.description}` : ""}
                {t.branch ? ` (${t.branch.split(",")[0]})` : ""}
              </option>
            ))}
            <option value={OTHER}>Not listed — type it in</option>
          </select>
          {truckChoice === OTHER ? (
            <input
              className="field mt-2"
              placeholder="Truck or equipment number"
              value={values.truck_number}
              onChange={(e) => set("truck_number", e.target.value)}
              autoFocus
            />
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="branch">
            Branch
          </label>
          <select id="branch" className="field" value={values.branch ?? ""} onChange={(e) => set("branch", (e.target.value || null) as RepairOrderInput["branch"])}>
            <option value="">—</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="location">
              Location
            </label>
            <input id="location" className="field" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Yard, job site…" />
          </div>
          <div>
            <label className="label" htmlFor="mileage">
              Mileage
            </label>
            <input
              id="mileage"
              className="field"
              inputMode="numeric"
              pattern="[0-9]*"
              value={values.mileage ?? ""}
              onChange={(e) => set("mileage", e.target.value === "" ? null : parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
              placeholder="Odometer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Total travel time</span>
            <div className="flex gap-2">
              <input aria-label="Travel hours" className="field" inputMode="numeric" pattern="[0-9]*" value={travelH} onChange={(e) => onTravel(e.target.value.replace(/\D/g, ""), travelM)} placeholder="hrs" />
              <input aria-label="Travel minutes" className="field" inputMode="numeric" pattern="[0-9]*" value={travelM} onChange={(e) => onTravel(travelH, e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="min" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="total_hours">
              Total hours
            </label>
            <input
              id="total_hours"
              className="field"
              inputMode="decimal"
              value={values.total_hours ?? ""}
              onChange={(e) => set("total_hours", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
              placeholder={computedHours !== null ? String(computedHours) : "e.g. 3.5"}
            />
            {computedHours !== null && values.total_hours === null ? (
              <button type="button" onClick={() => set("total_hours", computedHours)} className="mt-1 text-[12px] font-semibold text-brand">
                Use {computedHours} h from start/finish
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_time">
              Start time
            </label>
            <div className="flex gap-2">
              <input id="start_time" type="time" className="field" value={values.start_time ?? ""} onChange={(e) => set("start_time", e.target.value || null)} />
              {!values.start_time ? (
                <button type="button" onClick={() => set("start_time", nowHHMM())} className="btn-secondary shrink-0 px-3 text-[13px]">
                  Now
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="finish_time">
              Finish time
            </label>
            <div className="flex gap-2">
              <input id="finish_time" type="time" className="field" value={values.finish_time ?? ""} onChange={(e) => set("finish_time", e.target.value || null)} />
              {!values.finish_time ? (
                <button type="button" onClick={() => set("finish_time", nowHHMM())} className="btn-secondary shrink-0 px-3 text-[13px]">
                  Now
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="card flex flex-col gap-4 p-4">
        <h2 className="section-title">The work</h2>
        <div>
          <label className="label" htmlFor="summary">
            Summary description of work
          </label>
          <textarea id="summary" className="field" rows={3} value={values.summary} onChange={(e) => set("summary", e.target.value)} placeholder="What was wrong / what was requested" />
        </div>
        <div>
          <label className="label" htmlFor="work_performed">
            Work performed
          </label>
          <textarea id="work_performed" className="field" rows={5} value={values.work_performed} onChange={(e) => set("work_performed", e.target.value)} placeholder="What you did, step by step" />
        </div>
        <div>
          <label className="label" htmlFor="parts_materials">
            Parts / materials used
          </label>
          <textarea id="parts_materials" className="field" rows={4} value={values.parts_materials} onChange={(e) => set("parts_materials", e.target.value)} placeholder={"One per line, e.g.\n2 × JIC fittings\n2 qt AW46 hydraulic fluid"} />
        </div>
      </section>

      {!isEdit ? (
        <>
          <section className="card flex flex-col gap-3 p-4">
            <h2 className="section-title">Photos</h2>
            <PhotoCapture photos={photos} onChange={setPhotos} />
          </section>

          <section className="card flex flex-col gap-3 p-4">
            <h2 className="section-title">Signature</h2>
            <SignaturePad value={signature} onChange={setSignature} />
            <p className="text-[12px] text-muted">Your name and the date are stamped on the PDF.</p>
          </section>
        </>
      ) : null}

      <button type="submit" disabled={submitting} className="btn-primary min-h-14 text-[17px] shadow-[0_6px_16px_rgba(0,133,62,0.25)]">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Submit repair order"}
      </button>
      {!isEdit ? (
        <p className="pb-4 text-center text-[12px] text-muted">
          {draftSavedAt ? "Draft saved on this phone. " : ""}No signal? Submit anyway — it uploads automatically when you&apos;re back online.
        </p>
      ) : null}
    </form>
  );
}

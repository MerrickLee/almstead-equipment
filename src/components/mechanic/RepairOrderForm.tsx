"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BRANCHES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { clearDraft, enqueue, flushOutbox, loadDraft, newClientId, saveDraft, type DraftOrder, type LocalPhoto } from "@/lib/offline";
import type { RepairOrderInput, SessionUser, Truck } from "@/lib/types";
import { PhotoCapture } from "@/components/PhotoCapture";
import { SignaturePad } from "@/components/SignaturePad";
import { TruckPicker } from "@/components/mechanic/TruckPicker";

const TRUCKS_KEY = "ro:trucks";

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


export function RepairOrderForm({ user, initialTrucks, existing }: Props) {
  const router = useRouter();
  const t = useT();
  const isEdit = Boolean(existing);

  const [trucks, setTrucks] = useState<Truck[]>(initialTrucks);
  const [values, setValues] = useState<RepairOrderInput>(existing?.values ?? emptyValues(user));
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
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

  const onTruckPick = (t: Truck | null, freeText?: string) => {
    if (t) {
      setValues((prev) => ({
        ...prev,
        truck_id: t.id,
        truck_number: t.truck_number,
        branch: t.branch && (BRANCHES as readonly string[]).includes(t.branch) ? t.branch : prev.branch,
      }));
    } else {
      setValues((prev) => ({ ...prev, truck_id: null, truck_number: freeText ?? "" }));
    }
  };


  const discardDraft = async () => {
    await clearDraft();
    setValues(emptyValues(user));
    setPhotos([]);
    setSignature(null);
    setDraftRestored(false);
  };

  const validate = (): string | null => {
    if (!values.truck_number.trim()) return t("form.err.unit");
    if (!values.work_date) return t("form.err.date");
    if (!isEdit && !signature) return t("form.err.signature");
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
    if (!res.ok) throw new Error(body.error ?? t("form.err.save"));
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
          <span className="flex-1">{t("form.draftRestored")}</span>
          <button type="button" onClick={() => void discardDraft()} className="min-h-9 font-semibold underline">
            {t("form.startOver")}
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      <section className="card flex flex-col gap-4 p-4">
        <h2 className="section-title">{t("form.jobDetails")}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="mechanic">
              {t("form.mechanic")}
            </label>
            <input id="mechanic" className="field" value={user.name} readOnly />
          </div>
          <div>
            <label className="label" htmlFor="work_date">
              {t("form.date")}
            </label>
            <input id="work_date" type="date" className="field" value={values.work_date} onChange={(e) => set("work_date", e.target.value)} required />
          </div>
        </div>

        <div>
          <span className="label">{t("form.unit")}</span>
          <TruckPicker trucks={trucks} truckId={values.truck_id} truckNumber={values.truck_number} onPick={onTruckPick} />
        </div>

        <div>
          <label className="label" htmlFor="branch">
            {t("form.branch")}
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

        <div>
          <label className="label" htmlFor="location">
            {t("form.location")}
          </label>
          <input id="location" className="field" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder={t("form.locationHint")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="mileage">
              {t("form.mileage")}
            </label>
            <input
              id="mileage"
              className="field"
              inputMode="numeric"
              pattern="[0-9]*"
              value={values.mileage ?? ""}
              onChange={(e) => set("mileage", e.target.value === "" ? null : parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
              placeholder={t("form.mileageHint")}
            />
          </div>
          <div>
            <label className="label" htmlFor="total_hours">
              {t("form.totalHours")}
            </label>
            <input
              id="total_hours"
              className="field"
              inputMode="decimal"
              value={values.total_hours ?? ""}
              onChange={(e) => set("total_hours", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
              placeholder={t("form.totalHoursHint")}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="card flex flex-col gap-4 p-4">
        <h2 className="section-title">{t("form.theWork")}</h2>
        <p className="-mt-2 text-[12px] text-muted">{t("form.writeIn")}</p>
        <div>
          <label className="label" htmlFor="summary">
            {t("form.summary")}
          </label>
          <textarea id="summary" className="field" rows={3} value={values.summary} onChange={(e) => set("summary", e.target.value)} placeholder={t("form.summaryHint")} />
        </div>
        <div>
          <label className="label" htmlFor="work_performed">
            {t("form.workPerformed")}
          </label>
          <textarea id="work_performed" className="field" rows={5} value={values.work_performed} onChange={(e) => set("work_performed", e.target.value)} placeholder={t("form.workPerformedHint")} />
        </div>
        <div>
          <label className="label" htmlFor="parts_materials">
            {t("form.parts")}
          </label>
          <textarea id="parts_materials" className="field" rows={4} value={values.parts_materials} onChange={(e) => set("parts_materials", e.target.value)} placeholder={t("form.partsHint")} />
        </div>
      </section>

      {!isEdit ? (
        <>
          <section className="card flex flex-col gap-3 p-4">
            <h2 className="section-title">{t("form.photos")}</h2>
            <PhotoCapture photos={photos} onChange={setPhotos} />
          </section>

          <section className="card flex flex-col gap-3 p-4">
            <h2 className="section-title">{t("form.signature")}</h2>
            <SignaturePad value={signature} onChange={setSignature} />
            <p className="text-[12px] text-muted">{t("form.signatureHint")}</p>
          </section>
        </>
      ) : null}

      <button type="submit" disabled={submitting} className="btn-primary min-h-14 text-[17px] shadow-[0_6px_16px_rgba(0,133,62,0.25)]">
        {submitting ? t("common.saving") : isEdit ? t("form.saveChanges") : t("form.submit")}
      </button>
      {!isEdit ? (
        <p className="pb-4 text-center text-[12px] text-muted">
          {draftSavedAt ? `${t("form.draftSaved")} ` : ""}{t("form.offlineHint")}
        </p>
      ) : null}
    </form>
  );
}

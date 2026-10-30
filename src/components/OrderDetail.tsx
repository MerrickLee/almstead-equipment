"use client";

import { fmtDate, fmtDateTime, fmtNumber, fmtTime, fmtTravel, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import { textFor } from "@/lib/i18n/content";
import type { RepairOrderWithNames } from "@/lib/types";
import { TranslatedText } from "@/components/TranslatedText";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold tracking-[0.05em] text-muted uppercase">{label}</span>
      <span className="text-[15px] font-semibold">{value === null || value === undefined || value === "" ? "—" : value}</span>
    </div>
  );
}

export function fileUrl(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

/** Read-only rendering of an order in the viewer's language; used by both the mechanic and manager detail pages. */
export function OrderDetail({ order, dense }: { order: RepairOrderWithNames; dense?: boolean }) {
  const { lang, t } = useLang();
  const locale = localeOf(lang);
  const photos = order.photos ?? [];
  return (
    <div className="flex flex-col gap-4">
      <section className={`card grid gap-4 p-4 ${dense ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <Field label={t("form.mechanic")} value={order.mechanic?.full_name} />
        <Field label={t("form.date")} value={fmtDate(order.work_date, undefined, locale)} />
        <Field label={t("mgr.col.truck")} value={unitLabel(order.truck_number)} />
        <Field label={t("form.branch")} value={order.branch} />
        <Field label={t("form.location")} value={textFor(order, "location", lang)} />
        <Field label={t("form.mileage")} value={order.mileage !== null ? fmtNumber(order.mileage, locale) : null} />
        <Field label={t("form.totalHours")} value={order.total_hours !== null ? String(order.total_hours) : null} />
        {order.travel_time_minutes !== null ? <Field label={t("detail.travelTime")} value={fmtTravel(order.travel_time_minutes)} /> : null}
        {order.start_time ? <Field label={t("detail.start")} value={fmtTime(order.start_time)} /> : null}
        {order.finish_time ? <Field label={t("detail.finish")} value={fmtTime(order.finish_time)} /> : null}
      </section>

      <section className="card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="section-title">{t("form.summary")}</span>
          <TranslatedText order={order} field="summary" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="section-title">{t("form.workPerformed")}</span>
          <TranslatedText order={order} field="work_performed" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="section-title">{t("form.parts")}</span>
          <TranslatedText order={order} field="parts_materials" />
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <span className="section-title">{t("detail.photos", { n: photos.length })}</span>
        {photos.length === 0 ? (
          <p className="text-[14px] text-muted">{t("detail.noPhotos")}</p>
        ) : (
          <div className={`grid gap-3 ${dense ? "grid-cols-3" : "grid-cols-3 md:grid-cols-4"}`}>
            {photos.map((p) => (
              <a key={p.id} href={fileUrl(p.storage_path)} target="_blank" rel="noopener" className="relative block overflow-hidden rounded-xl border border-line bg-ground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(p.storage_path)} alt={p.caption ?? t("common.photo")} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                {p.caption ? <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-white">{p.caption}</span> : null}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <span className="section-title">{t("form.signature")}</span>
        {order.signature_path ? (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(order.signature_path)} alt={order.mechanic?.full_name ?? t("form.signature")} className="mx-auto block h-28 object-contain" />
            </div>
            <span className="text-[12px] text-muted">
              {order.mechanic?.full_name} · {fmtDateTime(order.submitted_at, locale)}
            </span>
          </>
        ) : (
          <p className="text-[14px] text-muted">{t("detail.notSigned")}</p>
        )}
      </section>

      {order.status === "reviewed" || order.manager_notes ? (
        <section className="card flex flex-col gap-1.5 border-brand/40 bg-brand-light/40 p-4">
          <span className="section-title">{t("detail.managerReview")}</span>
          {order.status === "reviewed" ? (
            <span className="text-[13px] text-muted">
              {t("detail.reviewedBy", { name: order.reviewer?.full_name ?? t("common.manager") })} · {fmtDateTime(order.reviewed_at, locale)}
            </span>
          ) : null}
          {order.manager_notes ? <TranslatedText order={order} field="manager_notes" /> : null}
        </section>
      ) : null}
    </div>
  );
}

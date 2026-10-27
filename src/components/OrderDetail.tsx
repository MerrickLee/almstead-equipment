import { fmtDate, fmtDateTime, fmtTime, fmtTravel } from "@/lib/format";
import type { RepairOrderWithNames } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold tracking-[0.05em] text-muted uppercase">{label}</span>
      <span className="text-[15px] font-semibold">{value === null || value === undefined || value === "" ? "—" : value}</span>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="section-title">{label}</span>
      <p className="text-[14px] leading-relaxed whitespace-pre-line">{value || <span className="text-muted">—</span>}</p>
    </div>
  );
}

export function fileUrl(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

/** Read-only rendering of an order; used by both the mechanic and manager detail pages. */
export function OrderDetail({ order, dense }: { order: RepairOrderWithNames; dense?: boolean }) {
  const photos = order.photos ?? [];
  return (
    <div className="flex flex-col gap-4">
      <section className={`card grid gap-4 p-4 ${dense ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <Field label="Mechanic" value={order.mechanic?.full_name} />
        <Field label="Date" value={fmtDate(order.work_date)} />
        <Field label="Truck #" value={order.truck_number} />
        <Field label="Branch" value={order.branch} />
        <Field label="Location" value={order.location} />
        <Field label="Mileage" value={order.mileage !== null ? order.mileage.toLocaleString("en-US") : null} />
        <Field label="Travel time" value={fmtTravel(order.travel_time_minutes)} />
        <Field label="Total hours" value={order.total_hours !== null ? String(order.total_hours) : null} />
        <Field label="Start" value={fmtTime(order.start_time)} />
        <Field label="Finish" value={fmtTime(order.finish_time)} />
      </section>

      <section className="card flex flex-col gap-4 p-4">
        <TextBlock label="Summary description of work" value={order.summary} />
        <TextBlock label="Work performed" value={order.work_performed} />
        <TextBlock label="Parts / materials used" value={order.parts_materials} />
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <span className="section-title">Photos ({photos.length})</span>
        {photos.length === 0 ? (
          <p className="text-[14px] text-muted">No photos attached.</p>
        ) : (
          <div className={`grid gap-3 ${dense ? "grid-cols-3" : "grid-cols-3 md:grid-cols-4"}`}>
            {photos.map((p) => (
              <a key={p.id} href={fileUrl(p.storage_path)} target="_blank" rel="noopener" className="relative block overflow-hidden rounded-xl border border-line bg-ground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(p.storage_path)} alt={p.caption ?? "Repair photo"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                {p.caption ? <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-white">{p.caption}</span> : null}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <span className="section-title">Signature</span>
        {order.signature_path ? (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(order.signature_path)} alt={`Signature of ${order.mechanic?.full_name ?? "mechanic"}`} className="mx-auto block h-28 object-contain" />
            </div>
            <span className="text-[12px] text-muted">
              {order.mechanic?.full_name} · {fmtDateTime(order.submitted_at)}
            </span>
          </>
        ) : (
          <p className="text-[14px] text-muted">Not signed.</p>
        )}
      </section>

      {order.status === "reviewed" || order.manager_notes ? (
        <section className="card flex flex-col gap-1.5 border-brand/40 bg-brand-light/40 p-4">
          <span className="section-title">Manager review</span>
          {order.status === "reviewed" ? (
            <span className="text-[13px] text-muted">
              Reviewed by {order.reviewer?.full_name ?? "manager"} · {fmtDateTime(order.reviewed_at)}
            </span>
          ) : null}
          {order.manager_notes ? <p className="text-[14px] leading-relaxed whitespace-pre-line">{order.manager_notes}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

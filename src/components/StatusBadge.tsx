import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status, pending }: { status?: OrderStatus; pending?: boolean }) {
  if (pending) return <span className="badge-pending">Waiting to upload</span>;
  if (status === "reviewed") return <span className="badge-reviewed">Reviewed</span>;
  return <span className="badge-submitted">Submitted</span>;
}

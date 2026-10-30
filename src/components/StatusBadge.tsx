"use client";

import { useT } from "@/lib/i18n/client";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status, pending }: { status?: OrderStatus; pending?: boolean }) {
  const t = useT();
  if (pending) return <span className="badge-pending">{t("status.pending")}</span>;
  if (status === "reviewed") return <span className="badge-reviewed">{t("status.reviewed")}</span>;
  return <span className="badge-submitted">{t("status.submitted")}</span>;
}

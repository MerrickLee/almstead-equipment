import { NextResponse } from "next/server";
import { formatOrderNumber } from "@/lib/constants";
import { listOrders } from "@/lib/db";
import { isLang, otherLang, tFor } from "@/lib/i18n";
import { pickText } from "@/lib/i18n/content";
import { getLang } from "@/lib/i18n/server";
import { apiSession } from "@/lib/session";
import type { RepairOrder, TranslatedField } from "@/lib/types";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV of repair orders matching the same filters as the dashboard.
 * Free-text columns come out in the viewer's language (?lang=en|es, else the
 * session's language); the text as the mechanic wrote it follows in its own
 * column so nothing is lost in translation.
 */
export async function GET(request: Request) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;

  const p = new URL(request.url).searchParams;
  const requested = p.get("lang");
  const lang = isLang(requested) ? requested : await getLang();
  const t = tFor(lang);
  const other = t(otherLang(lang) === "es" ? "tr.langName.es" : "tr.langName.en");

  const { orders } = await listOrders({
    mechanicId: p.get("mechanicId") ?? undefined,
    truckId: p.get("truckId") ?? undefined,
    branch: p.get("branch") ?? undefined,
    status: (p.get("status") as "submitted" | "reviewed" | null) ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    search: p.get("q") ?? undefined,
    limit: 500,
  });

  const statusLabel = (s: RepairOrder["status"]) => (s === "reviewed" ? t("status.reviewed") : t("status.submitted"));
  /** [shown text, original text if it was translated from the other language] */
  const pair = (o: RepairOrder, field: TranslatedField): [string | null, string | null] => {
    const x = pickText(o, field, lang);
    return [x.text, x.translatedFrom ? x.original : null];
  };
  const origCol = (col: string) => t("csv.original", { col, lang: other });

  const header = [
    t("mgr.col.order"), t("form.date"), t("form.mechanic"), t("mgr.col.truck"), t("form.branch"),
    t("form.location"), t("form.mileage"), `${t("detail.travelTime")} (min)`, t("form.totalHours"),
    t("detail.start"), t("detail.finish"),
    t("form.summary"), origCol(t("form.summary")),
    t("form.workPerformed"), origCol(t("form.workPerformed")),
    t("form.parts"), origCol(t("form.parts")),
    t("mgr.col.status"), t("csv.reviewedBy"), t("csv.reviewedAt"),
    t("pdf.managerNotes"), origCol(t("pdf.managerNotes")), t("csv.submittedAt"),
  ];
  const rows = orders.map((o) => {
    const [summary, summaryOrig] = pair(o, "summary");
    const [work, workOrig] = pair(o, "work_performed");
    const [parts, partsOrig] = pair(o, "parts_materials");
    const [notes, notesOrig] = pair(o, "manager_notes");
    return [
      formatOrderNumber(o.order_number), o.work_date, o.mechanic?.full_name, o.truck_number, o.branch,
      pickText(o, "location", lang).text, o.mileage, o.travel_time_minutes, o.total_hours,
      o.start_time?.slice(0, 5), o.finish_time?.slice(0, 5),
      summary, summaryOrig, work, workOrig, parts, partsOrig,
      statusLabel(o.status), o.reviewer?.full_name, o.reviewed_at, notes, notesOrig, o.submitted_at,
    ];
  });
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="repair-orders-${stamp}${lang === "es" ? "-es" : ""}.csv"`,
    },
  });
}

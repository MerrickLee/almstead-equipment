import { Download } from "lucide-react";
import Link from "next/link";
import { BRANCHES, formatOrderNumber } from "@/lib/constants";
import { dashboardStats, listOrders, listStaff, listTrucks, type OrderFilters } from "@/lib/db";
import { fmtDate, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { textFor } from "@/lib/i18n/content";
import { getT } from "@/lib/i18n/server";
import { requireManager } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const PAGE = 50;

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

export default async function ManagerOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireManager();
  const { lang, t } = await getT();
  const locale = localeOf(lang);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(str(sp.page) ?? "1", 10) || 1);
  const filters: OrderFilters = {
    mechanicId: str(sp.mechanicId),
    truckId: str(sp.truckId),
    branch: str(sp.branch),
    status: str(sp.status) as OrderFilters["status"],
    from: str(sp.from),
    to: str(sp.to),
    search: str(sp.q),
    limit: PAGE,
    offset: (page - 1) * PAGE,
  };

  const [{ orders, total }, stats, mechanics, trucks] = await Promise.all([listOrders(filters), dashboardStats(), listStaff(), listTrucks()]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ mechanicId: filters.mechanicId, truckId: filters.truckId, branch: filters.branch, status: filters.status, from: filters.from, to: filters.to, q: filters.search })) {
    if (v) qs.set(k, v);
  }
  const pageHref = (p: number) => `/manager?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(p) }).toString()}`;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const hasFilters = qs.toString().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{t("mgr.title")}</h1>
          <p className="text-[13px] text-muted">{new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <a href={`/api/manager/export?${qs.toString()}&lang=${lang}`} className="btn-secondary min-h-10 text-[13px]">
          <Download size={16} /> {hasFilters ? t("mgr.exportFiltered") : t("mgr.exportCsv")}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/manager?status=submitted" className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("mgr.stat.awaiting")}</span>
          <span className={`text-[30px] leading-tight font-bold ${stats.awaitingReview ? "text-[#b45309]" : ""}`}>{stats.awaitingReview}</span>
        </Link>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("mgr.stat.last7")}</span>
          <span className="text-[30px] leading-tight font-bold">{stats.last7Days}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("mgr.stat.hours30")}</span>
          <span className="text-[30px] leading-tight font-bold">{stats.last30DaysHours}</span>
          <span className="text-[12px] text-muted">{t("mgr.stat.fromOrders", { n: stats.last30DaysCount })}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("mgr.stat.activeTrucks")}</span>
          <span className="text-[30px] leading-tight font-bold">{trucks.filter((x) => x.active).length}</span>
        </div>
      </div>

      <form method="get" action="/manager" className="flex flex-wrap items-center gap-2">
        <input type="search" name="q" defaultValue={filters.search ?? ""} placeholder={t("mgr.search")} aria-label={t("mgr.search")} className="field min-h-10 flex-[1_1_220px] text-[14px]" />
        <select name="branch" defaultValue={filters.branch ?? ""} aria-label={t("form.branch")} className="field min-h-10 w-auto text-[14px]">
          <option value="">{t("mgr.allBranches")}</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select name="mechanicId" defaultValue={filters.mechanicId ?? ""} aria-label={t("form.mechanic")} className="field min-h-10 w-auto text-[14px]">
          <option value="">{t("mgr.allMechanics")}</option>
          {mechanics
            .filter((m) => m.role === "mechanic" || m.id === filters.mechanicId)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {!m.active ? ` (${t("common.inactive").toLowerCase()})` : ""}
              </option>
            ))}
        </select>
        <select name="truckId" defaultValue={filters.truckId ?? ""} aria-label={t("mgr.col.truck")} className="field min-h-10 w-auto text-[14px]">
          <option value="">{t("mgr.allTrucks")}</option>
          {trucks.map((x) => (
            <option key={x.id} value={x.id}>
              {unitLabel(x.truck_number)}
              {x.description ? ` — ${x.description}` : ""}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} aria-label={t("mgr.col.status")} className="field min-h-10 w-auto text-[14px]">
          <option value="">{t("mgr.anyStatus")}</option>
          <option value="submitted">{t("status.awaitingReview")}</option>
          <option value="reviewed">{t("status.reviewed")}</option>
        </select>
        <input type="date" name="from" defaultValue={filters.from ?? ""} aria-label={t("mgr.from")} className="field min-h-10 w-auto text-[14px]" />
        <input type="date" name="to" defaultValue={filters.to ?? ""} aria-label={t("mgr.to")} className="field min-h-10 w-auto text-[14px]" />
        <button type="submit" className="btn-primary min-h-10 text-[13px]">
          {t("common.filter")}
        </button>
        {hasFilters ? (
          <Link href="/manager" className="min-h-10 px-2 text-[13px] font-semibold text-brand">
            {t("mgr.clear")}
          </Link>
        ) : null}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">{t("mgr.col.order")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.date")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.truck")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.mechanic")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.branch")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.summary")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("mgr.col.hours")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {t("mgr.noMatch")}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-[#eef2ee] hover:bg-ground/60">
                  <td className="px-4 py-3">
                    <Link href={`/manager/orders/${o.id}`} className="font-semibold text-brand">
                      {formatOrderNumber(o.order_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(o.work_date, { month: "short", day: "numeric" }, locale)}</td>
                  <td className="px-4 py-3 font-semibold">{unitLabel(o.truck_number)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.mechanic?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.branch ?? "—"}</td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-[#3e4f42]">{textFor(o, "summary", lang) || textFor(o, "work_performed", lang) || "—"}</td>
                  <td className="px-4 py-3 text-right">{o.total_hours ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{t("mgr.showing", { from: orders.length ? (page - 1) * PAGE + 1 : 0, to: (page - 1) * PAGE + orders.length, total })}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-secondary min-h-9 text-[13px]">
              {t("common.previous")}
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="btn-secondary min-h-9 text-[13px]">
              {t("common.next")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

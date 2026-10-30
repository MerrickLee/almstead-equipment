import { Plus } from "lucide-react";
import Link from "next/link";
import { listOrders } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { requireSession } from "@/lib/session";
import { OrderCard } from "@/components/mechanic/OrderCard";
import { PendingOrders } from "@/components/mechanic/PendingOrders";

export const dynamic = "force-dynamic";

export default async function MechanicHome() {
  const user = await requireSession();
  const { t } = await getT();
  let orders: Awaited<ReturnType<typeof listOrders>>["orders"] = [];
  let loadError: string | null = null;
  try {
    orders = (await listOrders({ mechanicId: user.id, limit: 5 })).orders;
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/orders/new" className="flex items-center gap-3.5 rounded-2xl bg-brand p-4 text-white shadow-[0_6px_16px_rgba(0,133,62,0.25)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Plus size={26} strokeWidth={2.4} />
        </span>
        <span className="flex flex-col">
          <span className="text-[18px] font-bold">{t("home.newOrder")}</span>
          <span className="text-[13px] opacity-90">{t("home.newOrderHint")}</span>
        </span>
      </Link>

      <PendingOrders />

      <div className="mt-1 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold">{t("home.recent")}</h2>
        <Link href="/app/orders" className="text-[13px] font-semibold text-brand">
          {t("common.seeAll")}
        </Link>
      </div>

      {loadError ? (
        <p className="card p-4 text-[14px] text-muted">
          {t("home.loadError")} {loadError}
        </p>
      ) : orders.length === 0 ? (
        <p className="card p-4 text-[14px] text-muted">{t("home.none")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} href={`/app/orders/${o.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

import { listOrders } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { requireSession } from "@/lib/session";
import { OrderCard } from "@/components/mechanic/OrderCard";
import { PendingOrders } from "@/components/mechanic/PendingOrders";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders" };

export default async function MechanicOrders() {
  const user = await requireSession();
  const { t } = await getT();
  let orders: Awaited<ReturnType<typeof listOrders>>["orders"] = [];
  let total = 0;
  let loadError: string | null = null;
  try {
    const res = await listOrders({ mechanicId: user.id, limit: 100 });
    orders = res.orders;
    total = res.total;
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[20px] font-bold">{t("orders.title")}</h1>
      <PendingOrders />
      {loadError ? (
        <p className="card p-4 text-[14px] text-muted">
          {t("home.loadError")} {loadError}
        </p>
      ) : orders.length === 0 ? (
        <p className="card p-4 text-[14px] text-muted">{t("orders.none")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} href={`/app/orders/${o.id}`} />
            ))}
          </div>
          {total > orders.length ? <p className="text-center text-[12px] text-muted">{t("orders.showingLatest", { n: orders.length, total })}</p> : null}
        </>
      )}
    </div>
  );
}

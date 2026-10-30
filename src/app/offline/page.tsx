import { WifiOff } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Offline" };

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sun-light text-sun-dark">
        <WifiOff size={30} />
      </span>
      <h1 className="text-[22px] font-bold">{t("offline.title")}</h1>
      <p className="text-[15px] text-muted">{t("offline.body")}</p>
      <Link href="/app" className="btn-primary mt-2 w-full">
        {t("offline.openOrders")}
      </Link>
      <Link href="/app/orders/new" className="btn-secondary w-full">
        {t("offline.startNew")}
      </Link>
    </main>
  );
}

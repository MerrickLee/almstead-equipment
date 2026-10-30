import { listTrucks } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { requireManager } from "@/lib/session";
import { TrucksManager } from "@/components/manager/TrucksManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trucks" };

export default async function TrucksPage() {
  await requireManager();
  const { t } = await getT();
  const trucks = await listTrucks();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">{t("trucks.title")}</h1>
        <p className="text-[13px] text-muted">{t("trucks.subtitle")}</p>
      </div>
      <TrucksManager initial={trucks} />
    </div>
  );
}

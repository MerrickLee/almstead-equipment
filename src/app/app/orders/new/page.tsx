import { listTrucks } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { requireSession } from "@/lib/session";
import { RepairOrderForm } from "@/components/mechanic/RepairOrderForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New repair order" };

export default async function NewOrderPage() {
  const user = await requireSession();
  const { t } = await getT();
  let trucks: Awaited<ReturnType<typeof listTrucks>> = [];
  try {
    trucks = await listTrucks({ activeOnly: true });
  } catch {
    // The form falls back to the truck list cached on the phone.
  }
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[20px] font-bold">{t("form.title")}</h1>
      <RepairOrderForm user={user} initialTrucks={trucks} />
    </div>
  );
}

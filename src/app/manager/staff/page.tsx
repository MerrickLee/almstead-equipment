import { listStaff } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { requireManager } from "@/lib/session";
import { StaffManager } from "@/components/manager/StaffManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mechanics & managers" };

export default async function StaffPage() {
  const me = await requireManager();
  const { t } = await getT();
  const staff = await listStaff();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">{t("staff.title")}</h1>
        <p className="text-[13px] text-muted">{t("staff.subtitle")}</p>
      </div>
      <StaffManager initial={staff} meId={me.id} />
    </div>
  );
}

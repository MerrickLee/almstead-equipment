import { listStaff } from "@/lib/db";
import { requireManager } from "@/lib/session";
import { StaffManager } from "@/components/manager/StaffManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mechanics & managers" };

export default async function StaffPage() {
  const me = await requireManager();
  const staff = await listStaff();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Mechanics &amp; managers</h1>
        <p className="text-[13px] text-muted">Mechanics sign in with a 4–6 digit PIN; managers with a passcode of 6+ characters. Deactivated people keep their history but can&apos;t sign in.</p>
      </div>
      <StaffManager initial={staff} meId={me.id} />
    </div>
  );
}

import { listTrucks } from "@/lib/db";
import { requireManager } from "@/lib/session";
import { TrucksManager } from "@/components/manager/TrucksManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trucks" };

export default async function TrucksPage() {
  await requireManager();
  const trucks = await listTrucks();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Trucks &amp; equipment</h1>
        <p className="text-[13px] text-muted">What mechanics pick from on the phone. Inactive trucks keep their history but disappear from the picker.</p>
      </div>
      <TrucksManager initial={trucks} />
    </div>
  );
}

import Image from "next/image";
import { requireManager } from "@/lib/session";
import { ManagerNav } from "@/components/manager/ManagerNav";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireManager();
  return (
    <div className="flex min-h-dvh flex-wrap">
      <aside className="safe-top flex w-full flex-col gap-1.5 bg-ink px-4 pb-4 text-line md:w-[232px] md:min-h-dvh md:pt-6">
        <div className="flex items-center gap-2.5 px-2 pt-2 pb-2 md:pb-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <Image src="/logo.png" alt="" width={30} height={30} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-bold text-white">Repair Orders</span>
            <span className="text-[11px] text-[#9fb7a5]">Almstead · Manager</span>
          </span>
          <span className="md:hidden">
            <SignOutButton className="text-white/80" />
          </span>
        </div>
        <ManagerNav />
        <div className="mt-auto hidden flex-col gap-0.5 px-3 pt-4 text-[12px] text-[#9fb7a5] md:flex">
          <span className="font-semibold text-white">{user.name}</span>
          <span>{user.branch ?? "All branches"}</span>
          <div className="-ml-3">
            <SignOutButton className="text-white/80" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-[999_1_560px] px-4 py-5 md:px-8 md:py-7">{children}</main>
    </div>
  );
}

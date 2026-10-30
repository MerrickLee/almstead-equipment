import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { LangToggle } from "@/lib/i18n/client";
import { requireSession } from "@/lib/session";
import { BottomNav } from "@/components/mechanic/BottomNav";
import { OutboxBanner } from "@/components/mechanic/OutboxBanner";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function MechanicLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const { t } = await getT();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="safe-top bg-brand px-5 pb-3 text-white">
        <div className="flex items-center gap-3 pt-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
            <Image src="/logo-mark.png" alt="" width={30} height={30} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] opacity-85">{t("app.name")}</span>
            <span className="truncate text-[17px] font-bold">{user.name}</span>
          </span>
          <LangToggle tone="dark" />
          <SignOutButton className="text-white/85" label={t("common.signOut")} />
        </div>
      </header>
      <OutboxBanner />
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}

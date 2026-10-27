import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sun-light text-sun-dark">
        <WifiOff size={30} />
      </span>
      <h1 className="text-[22px] font-bold">You&apos;re offline</h1>
      <p className="text-[15px] text-muted">
        You can still open a repair order you started, and anything you submit will upload as soon as you have signal.
      </p>
      <Link href="/app" className="btn-primary mt-2 w-full">
        Open my repair orders
      </Link>
      <Link href="/app/orders/new" className="btn-secondary w-full">
        Start a new repair order
      </Link>
    </main>
  );
}

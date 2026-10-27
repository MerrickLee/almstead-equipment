"use client";

import { FileText, Home, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/orders/new", label: "New", icon: PlusCircle, exact: true },
  { href: "/app/orders", label: "Orders", icon: FileText, exact: false },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-lg justify-around border-t border-line bg-white pt-2">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href) && path !== "/app/orders/new";
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-[72px] flex-col items-center gap-0.5 py-1 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}
          >
            <Icon size={24} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

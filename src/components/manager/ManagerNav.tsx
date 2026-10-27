"use client";

import { FileText, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/manager", label: "Orders", icon: FileText, match: (p: string) => p === "/manager" || p.startsWith("/manager/orders") },
  { href: "/manager/trucks", label: "Trucks", icon: Truck, match: (p: string) => p.startsWith("/manager/trucks") },
  { href: "/manager/staff", label: "Mechanics & managers", icon: Users, match: (p: string) => p.startsWith("/manager/staff") },
];

export function ManagerNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(path);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-[14px] font-medium ${active ? "bg-brand text-white" : "text-line hover:bg-white/10"}`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

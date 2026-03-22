"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/power-calculator", label: "Power Calculator" },
  { href: "/upload", label: "Upload Data" },
  { href: "/experiments/new", label: "New Experiment" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wider text-[11px] font-semibold transition-colors ${
              isActive
                ? "bg-[#00152a]/[0.07] text-[#00152a] border-l-2 border-[#00152a] -ml-px"
                : "text-muted-foreground hover:text-[#00152a] hover:bg-[#00152a]/[0.03]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

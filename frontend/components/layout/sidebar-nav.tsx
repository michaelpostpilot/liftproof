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
            className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-[14px] font-normal transition-colors ${
              isActive
                ? "bg-[#E8F0E8] text-[#3D6B42] border-l-3 border-[#7A9E7E] font-medium"
                : "text-[#5C5B56] hover:text-[#1A1A18] hover:bg-[#F8F6F1]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/", label: "Monthly Trend" },
  { href: "/increment", label: "Increment per Kabupaten" },
];

export function CcmNav() {
  const path = usePathname();
  return (
    <nav className="flex rounded-md border border-[#e3e2dd] p-0.5 text-xs">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href}
          className={cn("px-2.5 py-1 rounded", path === p.href ? "bg-[#0b0b0b] text-white" : "text-[#52514e] hover:bg-[#f3f2ee]")}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

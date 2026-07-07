"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { NAV_ITEMS } from "./nav";

/** Bottom tab bar — mobile only. 60px, white, subtle top border, 3 root destinations. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      style={{ height: "var(--layout-tabbar)", borderColor: "var(--border-default)", background: "#fff" }}
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex items-stretch z-30"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ color: active ? "var(--color-primary-600)" : "var(--color-neutral-500)" }}
            className="flex-1 relative flex flex-col items-center justify-center gap-0.5"
          >
            {active && (
              <span
                style={{ background: "var(--color-primary-500)" }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b"
              />
            )}
            <Icon name={item.icon} size={22} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: active ? 700 : 400 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Icon, Avatar, Button } from "@/components/ui";
import { NAV_ITEMS, PLACEHOLDER_ACCOUNT } from "./nav";

/** Fixed 224px sidebar — desktop nav. Replaces the mobile tab bar + FAB (see design.md §2 Layout). */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      style={{ width: "var(--layout-sidebar)" }}
      className="hidden md:flex md:flex-col md:shrink-0 h-screen sticky top-0 border-r"
    >
      <div style={{ borderColor: "var(--border-default)" }} className="flex flex-col h-full border-r-0">
        <div className="flex items-center gap-2 px-5 h-14">
          <Image src="/brand/logo-mark.svg" alt="" width={28} height={28} />
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--color-neutral-900)" }}>
            CRM Networker
          </span>
        </div>

        <div className="px-3 pt-2">
          <Button fullWidth iconLeft={<Icon name="plus" size={18} />} onClick={() => router.push("/prospectos/nuevo")}>
            Añadir prospecto
          </Button>
        </div>

        <nav className="flex-1 px-3 pt-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--color-primary-700)" : "var(--color-neutral-700)",
                  background: active ? "var(--color-primary-50)" : "transparent",
                  borderRadius: "var(--radius-md)",
                }}
                className="flex items-center gap-3 px-3 h-10"
              >
                <Icon name={item.icon} size={20} color={active ? "var(--color-primary-600)" : "var(--color-neutral-500)"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderColor: "var(--border-default)" }} className="border-t p-3 flex items-center gap-3">
          <Avatar name={PLACEHOLDER_ACCOUNT.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-neutral-900)" }} className="truncate">
              {PLACEHOLDER_ACCOUNT.name}
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={() => router.push("/login")}
            style={{ color: "var(--color-error-text)" }}
            className="p-1"
          >
            <Icon name="log-out" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Avatar } from "@/components/ui";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { isRootRoute, PLACEHOLDER_ACCOUNT } from "./nav";
import type { ReactNode } from "react";

/** Shell for every authenticated screen: desktop sidebar, mobile header + tab bar + FAB. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showFab = isRootRoute(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <TabBar />
      {showFab && (
        <Link
          href="/prospectos/nuevo"
          aria-label="Añadir prospecto"
          style={{
            width: "var(--layout-fab)",
            height: "var(--layout-fab)",
            background: "var(--color-primary-500)",
            boxShadow: "var(--shadow-2)",
            color: "#fff",
            bottom: "calc(var(--layout-tabbar) + 16px)",
          }}
          className="md:hidden fixed right-4 rounded-full flex items-center justify-center z-30"
        >
          <Icon name="plus" size={26} />
        </Link>
      )}
    </div>
  );
}

function MobileHeader() {
  const pathname = usePathname();
  if (!isRootRoute(pathname)) return null;
  return (
    <header
      style={{ height: "var(--layout-header)", borderColor: "var(--border-default)" }}
      className="md:hidden flex items-center justify-between px-4 border-b bg-white sticky top-0 z-20"
    >
      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, color: "var(--color-neutral-900)" }}>
        CRM Networker
      </span>
      <Link href="/login" aria-label="Cuenta">
        <Avatar name={PLACEHOLDER_ACCOUNT.name} size="sm" />
      </Link>
    </header>
  );
}

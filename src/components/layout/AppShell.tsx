"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Icon, Avatar } from "@/components/ui";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { esFichaProspecto, isRootRoute, muestraFab } from "./nav";
import { nombreDeUsuario } from "./usuario";
import type { ReactNode } from "react";

/** Shell for every authenticated screen: desktop sidebar, mobile header + tab bar + FAB. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // La ficha va sin navegación inferior (JOS-59; M4 bocado 1, P16) y sin el
  // padding que reservaba su altura: el hueco de la barra CTA fija lo reserva
  // la propia página. El resto de pantallas no cambia.
  //
  // Ojo: TabBar y padding dependen SOLO de esto. La presencia del FAB nunca es
  // motivo para quitarlos — son contratos distintos que aquí se cruzan.
  const enFicha = esFichaProspecto(pathname);
  const conFab = muestraFab(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader />
        <main className={enFicha ? "flex-1" : "flex-1 pb-20 md:pb-0"}>{children}</main>
      </div>
      {!enFicha && <TabBar />}
      {conFab && (
        <Link
          href="/prospectos/nuevo"
          aria-label="Añadir prospecto"
          style={{
            width: "var(--layout-fab)",
            height: "var(--layout-fab)",
            background: "var(--color-primary-500)",
            boxShadow: "var(--shadow-2)",
            color: "#fff",
            // El FAB se apoya en lo que realmente haya debajo: la TabBar en las
            // rutas raíz y la barra CTA fija en la ficha, que no tiene TabBar.
            // Anclarlo siempre a --layout-tabbar lo dejaría flotando sobre la CTA.
            bottom: enFicha ? "calc(var(--layout-ficha-cta) + 16px)" : "calc(var(--layout-tabbar) + 16px)",
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
  const { user } = useUser();
  const { signOut } = useClerk();
  const nombre = nombreDeUsuario(user);
  if (!isRootRoute(pathname)) return null;
  return (
    <header
      style={{ height: "var(--layout-header)", borderColor: "var(--border-default)" }}
      className="md:hidden flex items-center justify-between px-4 border-b bg-white sticky top-0 z-20"
    >
      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, color: "var(--color-neutral-900)" }}>
        CRM Networker
      </span>
      <button type="button" aria-label="Cerrar sesión" onClick={() => signOut({ redirectUrl: "/login" })}>
        <Avatar name={nombre} size="sm" />
      </button>
    </header>
  );
}

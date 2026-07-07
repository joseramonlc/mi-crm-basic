import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface-app)" }} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Image src="/brand/logo-lockup.svg" alt="Evolución Líder" width={180} height={40} className="mb-8" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

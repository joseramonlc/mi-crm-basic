"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Card, Input, Button, Icon } from "@/components/ui";
import { mensajeDeError } from "@/lib/authErrores";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const enviando = fetchStatus === "fetching";

  // /login es pública en el proxy, así que se puede llegar con sesión abierta.
  React.useEffect(() => {
    if (isSignedIn) router.replace("/actividad");
  }, [isSignedIn, router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    // `signIn` es null hasta que Clerk carga.
    if (!signIn || enviando) return;
    setError(null);

    const intento = await signIn.password({ identifier: email, password });
    if (intento.error) {
      setError(mensajeDeError(intento.error));
      return;
    }
    if (signIn.status !== "complete") {
      // La instancia solo exige contraseña; cualquier otro estado es inesperado.
      setError("No hemos podido completar el acceso. Inténtalo de nuevo.");
      return;
    }
    // finalize() redirige al fallback configurado (/actividad).
    const cierre = await signIn.finalize();
    if (cierre.error) setError(mensajeDeError(cierre.error));
  }

  return (
    <Card>
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
          Entra en tu cuenta
        </h1>
        {error && (
          <p role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-error-text)" }}>
            {error}
          </p>
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          style={{ alignSelf: "flex-end", color: "var(--color-neutral-500)", fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}
        >
          <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
          {showPassword ? "Ocultar" : "Mostrar"} contraseña
        </button>
        <Button type="submit" fullWidth loading={enviando} disabled={!signIn}>
          Entrar
        </Button>
        <p style={{ fontSize: 13, textAlign: "center" }}>
          <Link href="/recuperar" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
            Regístrate
          </Link>
        </p>
      </form>
    </Card>
  );
}

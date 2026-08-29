"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { Card, Input, Button } from "@/components/ui";
import { mensajeDeError } from "@/lib/authErrores";

const TITULO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-h2-size)",
  fontWeight: 600,
  color: "var(--color-neutral-900)",
};

export default function RegistroPage() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const [paso, setPaso] = React.useState<"datos" | "codigo">("datos");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const enviando = fetchStatus === "fetching";

  // /registro es pública en el proxy: con sesión abierta no hay nada que crear.
  React.useEffect(() => {
    if (isSignedIn) router.replace("/actividad");
  }, [isSignedIn, router]);

  async function crearCuenta(e: React.FormEvent) {
    e.preventDefault();
    // `signUp` es null hasta que Clerk carga.
    if (!signUp || enviando) return;
    setError(null);

    const alta = await signUp.password({ emailAddress: email, password, firstName: name });
    if (alta.error) {
      setError(mensajeDeError(alta.error));
      return;
    }
    const envio = await signUp.verifications.sendEmailCode();
    if (envio.error) {
      setError(mensajeDeError(envio.error));
      return;
    }
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp || enviando) return;
    setError(null);
    setAviso(null);

    const intento = await signUp.verifications.verifyEmailCode({ code: codigo });
    if (intento.error) {
      setError(mensajeDeError(intento.error));
      return;
    }
    if (signUp.status !== "complete") {
      setError("No hemos podido verificar tu cuenta. Inténtalo de nuevo.");
      return;
    }
    // finalize() redirige al fallback configurado (/actividad).
    const cierre = await signUp.finalize();
    if (cierre.error) setError(mensajeDeError(cierre.error));
  }

  async function reenviar() {
    if (!signUp || enviando) return;
    setError(null);
    setAviso(null);

    const envio = await signUp.verifications.sendEmailCode();
    if (envio.error) {
      setError(mensajeDeError(envio.error));
      return;
    }
    setAviso("Te hemos enviado un código nuevo.");
  }

  if (paso === "codigo") {
    return (
      <Card>
        <form onSubmit={verificar} className="flex flex-col gap-4">
          <h1 style={TITULO_STYLE}>Verifica tu email</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-neutral-700)" }}>
            Te hemos enviado un código a <strong>{email}</strong>. Introdúcelo para terminar de crear tu cuenta.
          </p>
          {error && (
            <p role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-error-text)" }}>
              {error}
            </p>
          )}
          {aviso && (
            <p role="status" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-neutral-700)" }}>
              {aviso}
            </p>
          )}
          <Input
            label="Código de verificación"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Button type="submit" fullWidth loading={enviando}>
            Verificar y entrar
          </Button>
          <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
            ¿No te ha llegado?{" "}
            <button type="button" onClick={reenviar} style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
              Reenviar código
            </button>
          </p>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={crearCuenta} className="flex flex-col gap-4">
        <h1 style={TITULO_STYLE}>Crea tu cuenta</h1>
        {error && (
          <p role="alert" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-error-text)" }}>
            {error}
          </p>
        )}
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          helper="Mínimo 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {/* Anclaje del smart CAPTCHA de Clerk: sin este nodo el registro falla
            con la bot protection activa en la instancia. */}
        <div id="clerk-captcha" />
        <Button type="submit" fullWidth loading={enviando} disabled={!signUp}>
          Crear cuenta
        </Button>
        <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
            Entra
          </Link>
        </p>
      </form>
    </Card>
  );
}

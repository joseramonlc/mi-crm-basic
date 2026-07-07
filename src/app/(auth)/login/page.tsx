"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Card, Input, Button, Icon } from "@/components/ui";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/actividad");
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
          Entra en tu cuenta
        </h1>
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
          error={error}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          style={{ alignSelf: "flex-end", color: "var(--color-neutral-500)", fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}
        >
          <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
          {showPassword ? "Ocultar" : "Mostrar"} contraseña
        </button>
        <Button type="submit" fullWidth loading={loading}>
          Entrar
        </Button>
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

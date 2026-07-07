"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Card, Input, Button } from "@/components/ui";

export default function RegistroPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await signIn("password", { name, email, password, flow: "signUp" });
      router.push("/actividad");
    } catch {
      setError("No se ha podido crear la cuenta. Prueba con otro email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
          Crea tu cuenta
        </h1>
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          helper={!error ? "Mínimo 8 caracteres." : undefined}
          error={error}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" fullWidth loading={loading}>
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

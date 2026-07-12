"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Input, Button } from "@/components/ui";

export default function RegistroPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <Card>
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
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
          helper="Mínimo 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" fullWidth>
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

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../../convex/_generated/api";
import { EMAIL_RE } from "../../../../../convex/lib/validacion";
import { Button, Input, NativeSelect } from "@/components/ui";
import { FormHeader } from "@/components/layout/FormHeader";
import {
  BANNER_ERROR_RED,
  ERROR_CANAL_OBLIGATORIO,
  ERROR_COMO_OBLIGATORIO,
  ERROR_EMAIL_FORMATO,
  ERROR_NOMBRE_OBLIGATORIO,
  OPCIONES_CANAL,
  OPCIONES_COMO_SE_CONOCIO,
  PLACEHOLDER_NOMBRE,
  PLACEHOLDER_NOTA,
  type CanalContacto,
} from "./textos";

type Campo = "nombre" | "canal" | "comoSeConocio" | "email";

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError. */
function datosConvex(e: unknown): { code?: string; field?: string; message?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string; message?: string }) : undefined;
}

/**
 * field del servidor → campo y texto inline del cliente. Última defensa: el
 * cliente pre-valida con las mismas reglas (EMAIL_RE compartido), así que solo
 * se llega aquí si las validaciones divergen o el envío salta el formulario.
 */
const ERROR_SERVIDOR: Record<string, { campo: Campo; texto: string }> = {
  nombre: { campo: "nombre", texto: ERROR_NOMBRE_OBLIGATORIO },
  email: { campo: "email", texto: ERROR_EMAIL_FORMATO },
  comoSeConocio: { campo: "comoSeConocio", texto: ERROR_COMO_OBLIGATORIO },
};

/**
 * Pantalla "Nuevo Prospecto" (JOS-15): captura rápida en menos de 30 s.
 * Guardar deshabilitado hasta completar los obligatorios (estados de JOS-60);
 * errores inline en blur/submit; al éxito, push a la Ficha del prospecto.
 * Cancelar navega SIEMPRE a /actividad con replace (contrato rev. 2).
 */
export default function NuevoProspectoPage() {
  const router = useRouter();
  const crear = useMutation(api.prospectos.crear);

  const [nombre, setNombre] = React.useState("");
  const [canal, setCanal] = React.useState<CanalContacto | "">("");
  const [comoSeConocio, setComoSeConocio] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [errores, setErrores] = React.useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  // Guarda SÍNCRONA contra el doble envío: `guardando` (estado) no cambia
  // hasta el re-render, así que dos submits en la misma tarea lo verían falso.
  const enviando = React.useRef(false);

  const obligatoriosListos = nombre.trim() !== "" && canal !== "" && comoSeConocio !== "";

  function ponerError(campo: Campo, texto: string) {
    setErrores((prev) => ({ ...prev, [campo]: texto }));
  }

  function limpiarError(campo: Campo) {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const resto = { ...prev };
      delete resto[campo];
      return resto;
    });
  }

  function validar(): boolean {
    const nuevos: Partial<Record<Campo, string>> = {};
    if (nombre.trim() === "") nuevos.nombre = ERROR_NOMBRE_OBLIGATORIO;
    if (canal === "") nuevos.canal = ERROR_CANAL_OBLIGATORIO;
    if (comoSeConocio === "") nuevos.comoSeConocio = ERROR_COMO_OBLIGATORIO;
    const emailLimpio = email.trim();
    if (emailLimpio !== "" && !EMAIL_RE.test(emailLimpio)) nuevos.email = ERROR_EMAIL_FORMATO;
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // El disabled del botón no basta: un submit implícito (Enter) o programático
    // puede disparar el evento igualmente — el ref corta el doble envío también
    // dentro de la misma tarea síncrona.
    if (enviando.current) return;
    setErrorGeneral(null);
    if (!validar()) return;
    enviando.current = true;
    setGuardando(true);
    try {
      // Opcionales OMITIDOS si quedan vacíos (contrato M2: nulos por ausencia).
      const creado = await crear({
        nombre: nombre.trim(),
        comoSeConocio,
        canalContactoPreferido: canal as CanalContacto,
        ...(telefono.trim() !== "" ? { telefono: telefono.trim() } : {}),
        ...(email.trim() !== "" ? { email: email.trim() } : {}),
        ...(notas.trim() !== "" ? { notas: notas.trim() } : {}),
      });
      router.push(`/prospectos/${creado.id}`);
    } catch (err) {
      const datos = datosConvex(err);
      const mapeo = datos?.code === "VALIDATION_ERROR" && datos.field !== undefined ? ERROR_SERVIDOR[datos.field] : undefined;
      if (mapeo !== undefined) {
        setErrores({ [mapeo.campo]: mapeo.texto });
      } else {
        setErrorGeneral(BANNER_ERROR_RED);
      }
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <FormHeader titulo="Nuevo prospecto" hrefCancelar="/actividad" />
      <form onSubmit={manejarEnvio} noValidate className="mx-auto w-full max-w-2xl px-4 pt-6 md:px-6 md:pt-8">
        <div className="flex flex-col gap-5">
          <Input
            label="Nombre"
            value={nombre}
            placeholder={PLACEHOLDER_NOMBRE}
            autoFocus
            error={errores.nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              limpiarError("nombre");
            }}
            onBlur={() => {
              if (nombre.trim() === "") ponerError("nombre", ERROR_NOMBRE_OBLIGATORIO);
            }}
          />
          <NativeSelect
            label="Canal de contacto preferido"
            options={OPCIONES_CANAL}
            value={canal}
            placeholder="Selecciona un canal"
            error={errores.canal}
            onChange={(v) => {
              setCanal(v as CanalContacto);
              limpiarError("canal");
            }}
          />
          <NativeSelect
            label="Cómo se le conoció"
            options={OPCIONES_COMO_SE_CONOCIO}
            value={comoSeConocio}
            placeholder="Selecciona una opción"
            error={errores.comoSeConocio}
            onChange={(v) => {
              setComoSeConocio(v);
              limpiarError("comoSeConocio");
            }}
          />
          <Input
            label="Teléfono"
            type="tel"
            inputMode="tel"
            value={telefono}
            placeholder="Opcional"
            onChange={(e) => setTelefono(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={email}
            placeholder="Opcional"
            error={errores.email}
            onChange={(e) => {
              setEmail(e.target.value);
              limpiarError("email");
            }}
            onBlur={() => {
              const v = email.trim();
              if (v !== "" && !EMAIL_RE.test(v)) ponerError("email", ERROR_EMAIL_FORMATO);
            }}
          />
          <Input
            label="Nota inicial"
            multiline
            rows={3}
            value={notas}
            placeholder={PLACEHOLDER_NOTA}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        {/* Sticky por encima de la tab bar móvil (fixed, 60px); con el teclado
            abierto, interactiveWidget=resizes-content mantiene visible el botón. */}
        <div
          className="sticky bottom-[var(--layout-tabbar)] md:bottom-0 z-10 mt-6"
          style={{ background: "var(--surface-app)", padding: "12px 0 16px" }}
        >
          {errorGeneral && (
            <p
              role="alert"
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-error-bg)",
                color: "var(--color-error-text)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {errorGeneral}
            </p>
          )}
          <Button type="submit" size="lg" fullWidth loading={guardando} disabled={!obligatoriosListos}>
            {guardando ? "Guardando…" : "Guardar prospecto"}
          </Button>
        </div>
      </form>
    </div>
  );
}

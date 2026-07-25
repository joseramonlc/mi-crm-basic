"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Card, Input, Button, Icon } from "@/components/ui";
import { mensajeDeError, esEmailNoEncontrado, MSG_CODIGO_INCORRECTO } from "@/lib/authErrores";

const TITULO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-h2-size)",
  fontWeight: 600,
  color: "var(--color-neutral-900)",
};

// Copy deliberadamente neutro: nunca confirma ni desmiente que el email exista
// (criterio de aceptación de JOS-71 — no enumeración de cuentas).
const AVISO_CODIGO_ENVIADO = "Si existe una cuenta con ese email, te habremos enviado un código nuevo.";

export default function RecuperarPage() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const [paso, setPaso] = React.useState<"email" | "codigo">("email");
  const [email, setEmail] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);
  // `flujoNeutro` marca que el envío se neutralizó por email inexistente. Con él,
  // reenviar NO vuelve a llamar a Clerk: así el comportamiento es idéntico para
  // un email que existe y uno que no.
  const [flujoNeutro, setFlujoNeutro] = React.useState(false);
  const cargando = fetchStatus === "fetching";
  // Guarda SÍNCRONA contra el doble envío: `cargando` (derivado de fetchStatus) y
  // el `disabled` del botón no cambian hasta el re-render, así que dos submits en
  // la misma tarea los verían sin actualizar. El ref corta también en ese caso.
  const enviando = React.useRef(false);

  // /recuperar es pública en el proxy: con sesión abierta no hay nada que
  // recuperar. Se espera a `isLoaded` para no renderizar el formulario ni un
  // instante a un usuario que ya tiene sesión (mientras carga, isSignedIn es
  // undefined). Además de devolver null, se redirige a /actividad.
  React.useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/actividad");
  }, [isLoaded, isSignedIn, router]);
  if (!isLoaded || isSignedIn) return null;

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    // `signIn` es null hasta que Clerk carga; el ref corta el doble envío.
    if (!signIn || enviando.current) return;
    setError(null);
    setAviso(null);
    enviando.current = true;
    try {
      const creado = await signIn.create({ identifier: email });
      if (creado.error) {
        // No enumeración: si el email no existe, avanzamos igual con copy neutro.
        if (esEmailNoEncontrado(creado.error)) {
          setFlujoNeutro(true);
          setPaso("codigo");
          return;
        }
        setError(mensajeDeError(creado.error));
        return;
      }
      const envio = await signIn.resetPasswordEmailCode.sendCode();
      if (envio.error) {
        if (esEmailNoEncontrado(envio.error)) {
          setFlujoNeutro(true);
          setPaso("codigo");
          return;
        }
        setError(mensajeDeError(envio.error));
        return;
      }
      setFlujoNeutro(false);
      setPaso("codigo");
    } catch (err) {
      // Los métodos Future devuelven `{ error }`, pero envolvemos por si un fallo
      // de red rechaza la promesa: el TypeError de fetch se traduce a "sin conexión".
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  async function cambiarContrasena(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || enviando.current) return;
    setError(null);
    setAviso(null);
    // No enumeración: en el flujo neutro (email inexistente) NO se llama a Clerk.
    // Se devuelve el MISMO mensaje que un código incorrecto en una cuenta real, de
    // modo que ambos casos son indistinguibles y la cuenta inexistente nunca
    // progresa a cambiar contraseña. (El residuo de red/timing se cierra en JOS-73.)
    if (flujoNeutro) {
      setError(MSG_CODIGO_INCORRECTO);
      return;
    }
    enviando.current = true;
    try {
      const verificado = await signIn.resetPasswordEmailCode.verifyCode({ code: codigo });
      // El error se muestra SIEMPRE traducido (nunca el texto crudo de Clerk).
      if (verificado.error) {
        setError(mensajeDeError(verificado.error));
        return;
      }
      // `status` lo mutan verifyCode/submitPassword por efecto de red; se lee en
      // locales tipados `string` para que el control-flow de TS no estreche la
      // propiedad al literal del guard anterior y marque el segundo como imposible.
      const estadoTrasVerificar: string = signIn.status;
      if (estadoTrasVerificar !== "needs_new_password") {
        setError("No hemos podido verificar el código. Pide uno nuevo.");
        return;
      }
      const cambio = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (cambio.error) {
        setError(mensajeDeError(cambio.error));
        return;
      }
      const estadoTrasCambiar: string = signIn.status;
      if (estadoTrasCambiar !== "complete") {
        setError("No hemos podido cambiar la contraseña. Inténtalo de nuevo.");
        return;
      }
      // finalize() redirige al fallback configurado (/actividad).
      const cierre = await signIn.finalize();
      if (cierre.error) setError(mensajeDeError(cierre.error));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  async function reenviar() {
    if (!signIn || enviando.current) return;
    setError(null);
    setAviso(null);

    // Si el envío original se neutralizó (email inexistente), no llamamos a Clerk:
    // mostramos el mismo aviso neutro para no revelar nada por comportamiento.
    if (flujoNeutro) {
      setAviso(AVISO_CODIGO_ENVIADO);
      return;
    }
    enviando.current = true;
    try {
      const envio = await signIn.resetPasswordEmailCode.sendCode();
      if (envio.error && !esEmailNoEncontrado(envio.error)) {
        setError(mensajeDeError(envio.error));
        return;
      }
      setAviso(AVISO_CODIGO_ENVIADO);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  if (paso === "codigo") {
    return (
      <Card>
        <form onSubmit={cambiarContrasena} className="flex flex-col gap-4">
          <h1 style={TITULO_STYLE}>Crea una contraseña nueva</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-neutral-700)" }}>
            Si existe una cuenta con <strong>{email}</strong>, te habremos enviado un código. Introdúcelo y elige una
            contraseña nueva.
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
          <Input
            label="Contraseña nueva"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            helper="Mínimo 8 caracteres."
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
          <Button type="submit" fullWidth loading={cargando} disabled={!signIn}>
            Cambiar contraseña y entrar
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
      <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
        <h1 style={TITULO_STYLE}>Recupera tu contraseña</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-neutral-700)" }}>
          Introduce tu email y te enviaremos un código para crear una contraseña nueva.
        </p>
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
        {/* Anclaje del smart CAPTCHA de Clerk: si la bot protection de la instancia
            lo exige en este flujo, sin este nodo fallaría (igual que en registro). */}
        <div id="clerk-captcha" />
        <Button type="submit" fullWidth loading={cargando} disabled={!signIn}>
          Enviar código
        </Button>
        <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
          ¿Ya la recuerdas?{" "}
          <Link href="/login" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
            Volver a entrar
          </Link>
        </p>
      </form>
    </Card>
  );
}

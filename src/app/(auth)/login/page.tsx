"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { Card, Input, Button, Icon } from "@/components/ui";
import { mensajeDeError } from "@/lib/authErrores";
import {
  eligeSegundoFactor,
  exigeReinicio,
  mensajeDeEstado,
  pideSegundoFactor,
  textoSegundoFactor,
  type EstrategiaPorCodigo,
} from "@/lib/authEstados";

const TITULO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-h2-size)",
  fontWeight: 600,
  color: "var(--color-neutral-900)",
};

const TEXTO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--color-neutral-700)",
};

const ERROR_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--color-error-text)",
};

const DIAGNOSTICO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  color: "var(--color-neutral-500)",
};

const ENLACE_STYLE: React.CSSProperties = { color: "var(--color-primary-600)", fontWeight: 600 };

const OJO_STYLE: React.CSSProperties = {
  alignSelf: "flex-end",
  color: "var(--color-neutral-500)",
  fontSize: 13,
  display: "inline-flex",
  gap: 4,
  alignItems: "center",
};

/** Adonde va el usuario una vez la sesión está activa. */
const RUTA_TRAS_ACCESO = "/actividad";

type FactorElegido = { estrategia: EstrategiaPorCodigo; safeIdentifier?: string };

export default function LoginPage() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  // `useSignIn()` (API Future) devuelve `{ errors, fetchStatus, signIn }` y NO
  // expone `setActive`; el objeto Clerk sí. Ver §6 del plan de JOS-184.
  const clerk = useClerk();
  const [paso, setPaso] = React.useState<"credenciales" | "segundo-factor">("credenciales");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [factor, setFactor] = React.useState<FactorElegido | null>(null);
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);
  // El estado crudo con el que Clerk dejó el intento. Se enseña en pantalla
  // cuando no hay paso que ofrecer: es lo único que convierte «no funciona» en
  // un hecho diagnosticable (JOS-184).
  const [diagnostico, setDiagnostico] = React.useState<string | null>(null);
  const cargando = fetchStatus === "fetching";
  // Guarda SÍNCRONA contra el doble envío: `fetchStatus` y el `disabled` del
  // botón no cambian hasta el re-render, así que dos envíos en la misma tarea
  // los verían sin actualizar. El ref corta también en ese caso (mismo patrón
  // que /recuperar).
  const enviando = React.useRef(false);

  // /login es pública en el proxy, así que se puede llegar con sesión abierta.
  React.useEffect(() => {
    if (isSignedIn) router.replace(RUTA_TRAS_ACCESO);
  }, [isSignedIn, router]);

  function limpiarAvisos() {
    setError(null);
    setAviso(null);
    setDiagnostico(null);
  }

  /** Fin de trayecto honesto: mensaje + el estado crudo, siempre juntos. */
  function fallarConEstado(estado: string, mensaje?: string) {
    setError(mensaje ?? mensajeDeEstado(estado));
    setDiagnostico(estado);
  }

  /**
   * Clerk no crea una sesión nueva si ya hay una para este email en este
   * dispositivo: la devuelve en `existingSession` para que la ACTIVEMOS.
   * Navegar a /actividad sin activarla dejaría al usuario rebotando contra el
   * proxy, que es el callejón sin salida que este arreglo viene a quitar.
   */
  async function activarSesionExistente(sessionId: string) {
    try {
      // OJO: `setActive` devuelve Promise<void> y LANZA. No sigue el patrón
      // `{ error }` de los métodos Future, así que aquí el try/catch no es
      // defensa opcional: es la única forma de ver el fallo.
      await clerk.setActive({ session: sessionId, redirectUrl: RUTA_TRAS_ACCESO });
    } catch (err) {
      setError(mensajeDeError(err));
      setDiagnostico("existing_session");
    }
  }

  /** Prepara el paso del segundo factor, o explica por qué no puede. */
  async function prepararSegundoFactor(estado: string) {
    if (!signIn) return;
    const eleccion = eligeSegundoFactor(signIn.supportedSecondFactors);

    if (eleccion.tipo === "no-soportado") {
      // Sin reintento que ofrecer, así que no se ofrece ninguno.
      setError(eleccion.mensaje);
      setDiagnostico(`${estado} · ${eleccion.estrategias.join(", ")}`);
      return;
    }

    // Red de seguridad: Clerk no ha dicho qué admite, se prueba el código por
    // email, que es lo que toda cuenta tiene. Nunca se llega aquí con una lista
    // que sólo traía `email_link` (lo corta `eligeSegundoFactor`).
    const estrategia: EstrategiaPorCodigo = eleccion.tipo === "codigo" ? eleccion.estrategia : "email_code";
    const safeIdentifier = eleccion.tipo === "codigo" ? eleccion.safeIdentifier : undefined;

    if (estrategia === "email_code" || estrategia === "phone_code") {
      const envio = estrategia === "email_code" ? await signIn.mfa.sendEmailCode() : await signIn.mfa.sendPhoneCode();
      if (envio.error) {
        setError(mensajeDeError(envio.error));
        setDiagnostico(estado);
        return;
      }
    }

    setFactor({ estrategia, safeIdentifier });
    setCodigo("");
    setPaso("segundo-factor");
  }

  /**
   * Decide qué hacer con el estado en que Clerk dejó el intento. Se llama SIEMPRE
   * dentro de la guarda de `entrar()`, así que no la vuelve a tomar.
   */
  async function resolverEstado() {
    if (!signIn) return;

    const existente = signIn.existingSession;
    if (existente) {
      await activarSesionExistente(existente.sessionId);
      return;
    }

    // `status` lo mutan los métodos por efecto de red; se lee en un local tipado
    // `string` para que el control-flow de TS no lo estreche a un literal.
    const estado: string = signIn.status;

    if (estado === "complete") {
      // finalize() redirige al fallback configurado (/actividad).
      const cierre = await signIn.finalize();
      if (cierre.error) setError(mensajeDeError(cierre.error));
      return;
    }

    if (pideSegundoFactor(estado)) {
      await prepararSegundoFactor(estado);
      return;
    }

    if (exigeReinicio(estado)) {
      // `reset()` sólo limpia estado local, pero declara `{ error }` como todos
      // los demás: se comprueba igual, para no tener dos contratos de error.
      const reinicio = await signIn.reset();
      setPaso("credenciales");
      setFactor(null);
      if (reinicio.error) {
        fallarConEstado(estado, mensajeDeError(reinicio.error));
        return;
      }
      fallarConEstado(estado);
      return;
    }

    fallarConEstado(estado);
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    // `signIn` es null hasta que Clerk carga; el ref corta el doble envío.
    if (!signIn || enviando.current) return;
    limpiarAvisos();
    enviando.current = true;
    try {
      const intento = await signIn.password({ identifier: email, password });
      if (intento.error) {
        setError(mensajeDeError(intento.error));
        return;
      }
      await resolverEstado();
    } catch (err) {
      // Los métodos Future devuelven `{ error }`, pero un fallo de red rechaza la
      // promesa: el TypeError de fetch se traduce a «sin conexión».
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  async function verificarSegundoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || !factor || enviando.current) return;
    limpiarAvisos();
    enviando.current = true;
    try {
      const intento = await verificarCodigo(factor.estrategia);
      if (intento.error) {
        setError(mensajeDeError(intento.error));
        return;
      }
      const estado: string = signIn.status;
      if (estado !== "complete") {
        fallarConEstado(estado);
        return;
      }
      const cierre = await signIn.finalize();
      if (cierre.error) setError(mensajeDeError(cierre.error));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  function verificarCodigo(estrategia: EstrategiaPorCodigo) {
    // `signIn` está comprobado por el llamante; el `!` evita repetir la guarda.
    const mfa = signIn!.mfa;
    switch (estrategia) {
      case "email_code":
        return mfa.verifyEmailCode({ code: codigo });
      case "phone_code":
        return mfa.verifyPhoneCode({ code: codigo });
      case "totp":
        return mfa.verifyTOTP({ code: codigo });
      case "backup_code":
        return mfa.verifyBackupCode({ code: codigo });
    }
  }

  async function reenviar() {
    if (!signIn || !factor || enviando.current) return;
    const { permiteReenviar } = textoSegundoFactor(factor.estrategia, factor.safeIdentifier);
    if (!permiteReenviar) return;
    limpiarAvisos();
    enviando.current = true;
    try {
      const envio =
        factor.estrategia === "email_code" ? await signIn.mfa.sendEmailCode() : await signIn.mfa.sendPhoneCode();
      if (envio.error) {
        setError(mensajeDeError(envio.error));
        return;
      }
      setAviso("Te hemos enviado un código nuevo.");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      enviando.current = false;
    }
  }

  const avisos = (
    <>
      {error && (
        <p role="alert" style={ERROR_STYLE}>
          {error}
        </p>
      )}
      {diagnostico && <p style={DIAGNOSTICO_STYLE}>Código de diagnóstico: {diagnostico}</p>}
      {aviso && (
        <p role="status" style={{ ...ERROR_STYLE, color: "var(--color-neutral-700)" }}>
          {aviso}
        </p>
      )}
    </>
  );

  if (paso === "segundo-factor" && factor) {
    const texto = textoSegundoFactor(factor.estrategia, factor.safeIdentifier);
    return (
      <Card>
        <form onSubmit={verificarSegundoFactor} className="flex flex-col gap-4">
          <h1 style={TITULO_STYLE}>Confirma que eres tú</h1>
          <p style={TEXTO_STYLE}>{texto.descripcion}</p>
          {avisos}
          <Input
            label={texto.etiquetaCampo}
            inputMode={texto.modoTeclado}
            autoComplete={texto.autocompletado}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Button type="submit" fullWidth loading={cargando} disabled={!signIn}>
            Confirmar y entrar
          </Button>
          {texto.permiteReenviar && (
            <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
              ¿No te ha llegado?{" "}
              <button type="button" onClick={reenviar} style={ENLACE_STYLE}>
                Reenviar código
              </button>
            </p>
          )}
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <h1 style={TITULO_STYLE}>Entra en tu cuenta</h1>
        {avisos}
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
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" onClick={() => setShowPassword((v) => !v)} style={OJO_STYLE}>
          <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
          {showPassword ? "Ocultar" : "Mostrar"} contraseña
        </button>
        {/* Anclaje del smart CAPTCHA de Clerk, igual que en /registro y /recuperar:
            si la bot protection de la instancia lo exige también en el acceso, sin
            este nodo no tendría dónde dibujarse. Inerte si está desactivada. */}
        <div id="clerk-captcha" />
        <Button type="submit" fullWidth loading={cargando} disabled={!signIn}>
          Entrar
        </Button>
        <p style={{ fontSize: 13, textAlign: "center" }}>
          <Link href="/recuperar" style={ENLACE_STYLE}>
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p style={{ fontSize: 13, color: "var(--color-neutral-500)", textAlign: "center" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" style={ENLACE_STYLE}>
            Regístrate
          </Link>
        </p>
      </form>
    </Card>
  );
}

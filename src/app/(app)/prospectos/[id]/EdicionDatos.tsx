import * as React from "react";
import { ConvexError } from "convex/values";
import { EMAIL_RE } from "../../../../../convex/lib/validacion";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { Button, Input, NativeSelect } from "@/components/ui";
import {
  BANNER_ERROR_RED,
  ERROR_COMO_OBLIGATORIO,
  ERROR_EMAIL_FORMATO,
  ERROR_NOMBRE_OBLIGATORIO,
  OPCIONES_CANAL,
  OPCIONES_COMO_SE_CONOCIO,
  type CanalContacto,
} from "../nuevo/textos";
import { CANCELAR_EDICION, GUARDANDO_CAMBIOS, GUARDAR_CAMBIOS, TITULO_EDICION } from "./textos";

/** Patch parcial del contrato `actualizar` de M2: solo los campos modificados. */
export type PatchDatos = Partial<{
  nombre: string;
  telefono: string;
  email: string;
  comoSeConocio: string;
  canalContactoPreferido: CanalContacto;
  notas: string;
}>;

export interface EdicionDatosProps {
  /** Valores de ENTRADA al modo edición: snapshot que inicializa el formulario y referencia del diff. */
  prospecto: ProspectoPublico;
  /** Recibe SOLO los campos modificados; si rechaza, el formulario conserva lo tecleado (P7). */
  onGuardar: (patch: PatchDatos) => Promise<unknown>;
  /** Salida del modo edición: cancelar o guardar sin cambios (D2). */
  onCerrar: () => void;
}

type Campo = "nombre" | "email" | "comoSeConocio";

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError (patrón JOS-15). */
function datosConvex(e: unknown): { code?: string; field?: string; message?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string; message?: string }) : undefined;
}

/**
 * field del servidor → campo y texto inline (última defensa, como en JOS-15:
 * el cliente pre-valida con las mismas reglas). `canalContactoPreferido` no
 * está: su validator de Convex es un enum y el select no produce otros valores.
 */
const ERROR_SERVIDOR: Record<string, { campo: Campo; texto: string }> = {
  nombre: { campo: "nombre", texto: ERROR_NOMBRE_OBLIGATORIO },
  email: { campo: "email", texto: ERROR_EMAIL_FORMATO },
  comoSeConocio: { campo: "comoSeConocio", texto: ERROR_COMO_OBLIGATORIO },
};

/**
 * Formulario de edición de los datos del prospecto (JOS-18), co-localizado en
 * la ficha como SelectorEtapa. Sustituye a la sección de datos en modo edición
 * con los 6 campos editables (los del sistema quedan fuera, P9). El diff se
 * calcula contra el snapshot de ENTRADA (P3: la suscripción no pisa lo
 * tecleado): campo igual → se omite; opcional vaciado → viaja "" y el backend
 * lo elimina (contrato M2). Sin cambios → onCerrar sin llamada (D2).
 */
export function EdicionDatos({ prospecto, onGuardar, onCerrar }: EdicionDatosProps) {
  // Snapshot único al montar (el componente se monta al ENTRAR en edición):
  // referencia estable del diff aunque la suscripción re-renderice con datos
  // nuevos (P3). El inicializador perezoso de useState corre una sola vez —
  // los cambios posteriores de props no lo re-sincronizan. Opcionales
  // ausentes → cadena vacía (simetría con los inputs).
  const [inicial] = React.useState(() => ({
    nombre: prospecto.nombre,
    telefono: prospecto.telefono ?? "",
    email: prospecto.email ?? "",
    comoSeConocio: prospecto.comoSeConocio,
    canal: prospecto.canalContactoPreferido,
    notas: prospecto.notas ?? "",
  }));

  const [nombre, setNombre] = React.useState(inicial.nombre);
  const [telefono, setTelefono] = React.useState(inicial.telefono);
  const [email, setEmail] = React.useState(inicial.email);
  const [comoSeConocio, setComoSeConocio] = React.useState(inicial.comoSeConocio);
  const [canal, setCanal] = React.useState<CanalContacto>(inicial.canal);
  const [notas, setNotas] = React.useState(inicial.notas);
  const [errores, setErrores] = React.useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  // Guarda SÍNCRONA contra el doble envío (lección M3): `guardando` no cambia
  // hasta el re-render, así que dos submits en la misma tarea lo verían falso.
  const enviando = React.useRef(false);

  // Defensa (observación del GO): comoSeConocio es texto libre en el backend;
  // un valor fuera de las opciones fijas de alta entra como opción temporal
  // para que el select lo represente sin forzar un cambio silencioso.
  const opcionesComo = OPCIONES_COMO_SE_CONOCIO.includes(inicial.comoSeConocio)
    ? OPCIONES_COMO_SE_CONOCIO
    : [inicial.comoSeConocio, ...OPCIONES_COMO_SE_CONOCIO];

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
    const emailLimpio = email.trim();
    if (emailLimpio !== "" && !EMAIL_RE.test(emailLimpio)) nuevos.email = ERROR_EMAIL_FORMATO;
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  /** Solo campos modificados (P5); los valores viajan con trim, como los normaliza el backend. */
  function calcularPatch(): PatchDatos {
    const patch: PatchDatos = {};
    if (nombre.trim() !== inicial.nombre) patch.nombre = nombre.trim();
    if (telefono.trim() !== inicial.telefono) patch.telefono = telefono.trim();
    if (email.trim() !== inicial.email) patch.email = email.trim();
    if (comoSeConocio !== inicial.comoSeConocio) patch.comoSeConocio = comoSeConocio;
    if (canal !== inicial.canal) patch.canalContactoPreferido = canal;
    if (notas.trim() !== inicial.notas) patch.notas = notas.trim();
    return patch;
  }

  async function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando.current) return;
    setErrorGeneral(null);
    if (!validar()) return;
    const patch = calcularPatch();
    if (Object.keys(patch).length === 0) {
      onCerrar(); // D2: nada que guardar → lectura, sin llamada ni toast.
      return;
    }
    enviando.current = true;
    setGuardando(true);
    try {
      await onGuardar(patch);
      // Éxito: el padre sale del modo edición y desmonta este formulario.
    } catch (err) {
      // P7: el modo edición se conserva con lo tecleado.
      const datos = datosConvex(err);
      const mapeo = datos?.code === "VALIDATION_ERROR" && datos.field !== undefined ? ERROR_SERVIDOR[datos.field] : undefined;
      if (mapeo !== undefined) setErrores({ [mapeo.campo]: mapeo.texto });
      else setErrorGeneral(BANNER_ERROR_RED);
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <form aria-label={TITULO_EDICION} noValidate onSubmit={manejarEnvio} className="flex flex-col gap-5">
      <Input
        label="Nombre"
        value={nombre}
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
        onChange={(v) => setCanal(v as CanalContacto)}
      />
      <NativeSelect
        label="Cómo se le conoció"
        options={opcionesComo}
        value={comoSeConocio}
        error={errores.comoSeConocio}
        onChange={(v) => {
          setComoSeConocio(v);
          limpiarError("comoSeConocio");
        }}
      />
      <Input label="Teléfono" type="tel" inputMode="tel" value={telefono} placeholder="Opcional" onChange={(e) => setTelefono(e.target.value)} />
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
      <Input label="Notas" multiline rows={3} value={notas} placeholder="Opcional" onChange={(e) => setNotas(e.target.value)} />

      {errorGeneral !== null && (
        <p
          role="alert"
          style={{
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

      <div className="flex gap-3">
        <Button type="submit" size="lg" loading={guardando} disabled={nombre.trim() === ""} style={{ flex: 1 }}>
          {guardando ? GUARDANDO_CAMBIOS : GUARDAR_CAMBIOS}
        </Button>
        {/* Deshabilitado mientras la mutation está en vuelo: evita cerrar el
            formulario a mitad de guardado (el toast llegaría tras cancelar). */}
        <Button type="button" variant="secondary" size="lg" onClick={onCerrar} disabled={guardando}>
          {CANCELAR_EDICION}
        </Button>
      </div>
    </form>
  );
}

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { eliminarProspectoEnCascada } from "./lib/borrado";
import {
  LONGITUD_MAX_NOMBRE,
  LONGITUD_MAX_COMO_SE_CONOCIO,
  LONGITUD_MAX_TELEFONO,
  LONGITUD_MAX_EMAIL,
  LONGITUD_MAX_NOTAS,
  LONGITUD_MAX_TEXTO_INTERACCION,
} from "./lib/validacion";

/**
 * Herramientas del GATE de producción de JOS-80 (ver plan §4.2(b)). NO son parte de la
 * función de borrar: certifican, ANTES de habilitarla, que la cascada de
 * `prospectos.eliminar` cabe siempre en una transacción de Convex con margen.
 *
 * Todo es `internal*`: NO invocable desde clientes de la app; se ejecuta por el canal de
 * administración (`npx convex run`, credenciales de despliegue) por un operador autorizado.
 *
 * Dos pasos:
 *  1. `auditarTamanos` (read-only): recorre PAGINADO producción y devuelve SOLO tres enteros
 *     (recuentos y tamaños). Ningún `prospectoId` ni campo personal cruza la frontera hacia el
 *     operador — el id se usa solo dentro del servidor para agrupar. No copia PII.
 *  2. `sembrarPeorCaso` + `medirBorrado` (SOLO desarrollo): en un deployment desechable se
 *     siembra el peor caso medido y se ejecuta el borrado REAL midiendo
 *     `getTransactionMetrics()` — lecturas Y escrituras, con índices y el propio prospecto.
 */

/** Bytes aproximados de un documento (serialización). Basta para DIMENSIONAR el peor caso;
 *  la cifra AUTORITATIVA la da `getTransactionMetrics()` del paso 2. */
function bytesDoc(doc: unknown): number {
  return new TextEncoder().encode(JSON.stringify(doc)).length;
}

// Cotas de lectura POR PÁGINA. Cada página del recorrido es su propia transacción; se acota
// por bytes Y por filas para que un histórico con documentos grandes no haga fallar la
// auditoría dentro de una sola página (sugerencia del auditor). 4 MiB deja margen holgado
// bajo el límite de 16 MiB; si una página llega antes al tope de bytes, devuelve menos filas
// y el bucle continúa con el cursor.
const PAGINA_MAX_FILAS = 1024;
const PAGINA_MAX_BYTES = 4 * 1024 * 1024;
const OPTS_PAGINA = { numItems: PAGINA_MAX_FILAS, maximumRowsRead: PAGINA_MAX_FILAS, maximumBytesRead: PAGINA_MAX_BYTES };

/* ── Paso 1 · auditoría de tamaños (read-only, solo devuelve números) ────────── */

export const _paginaProspectos = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({ maxBytes: v.number(), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const res = await ctx.db.query("prospectos").paginate({ ...OPTS_PAGINA, cursor });
    let maxBytes = 0;
    for (const doc of res.page) maxBytes = Math.max(maxBytes, bytesDoc(doc));
    return { maxBytes, continueCursor: res.continueCursor, isDone: res.isDone };
  },
});

export const _paginaInteracciones = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    // prospectoId viaja SOLO query→acción (dentro del deployment) para agrupar; nunca sale
    // hacia el operador. La acción devuelve únicamente números.
    filas: v.array(v.object({ prospectoId: v.id("prospectos"), bytes: v.number() })),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor }) => {
    // by_usuario_prospecto_fecha deja las interacciones CONTIGUAS por prospecto: basta un
    // contador de racha (estado O(1) en la acción), sin acumular un mapa por prospecto.
    const res = await ctx.db
      .query("interacciones")
      .withIndex("by_usuario_prospecto_fecha")
      .paginate({ ...OPTS_PAGINA, cursor });
    return {
      filas: res.page.map((d) => ({ prospectoId: d.prospectoId, bytes: bytesDoc(d) })),
      continueCursor: res.continueCursor,
      isDone: res.isDone,
    };
  },
});

export const auditarTamanos = internalAction({
  args: {},
  returns: v.object({
    maxInteraccionesPorProspecto: v.number(),
    maxBytesInteraccion: v.number(),
    maxBytesProspecto: v.number(),
  }),
  handler: async (ctx) => {
    // Prospectos: solo el mayor documento.
    let maxBytesProspecto = 0;
    let cursorP: string | null = null;
    for (;;) {
      // Tipo anotado a mano: referenciar `internal.<mismo módulo>` dentro del propio módulo
      // crea un ciclo de inferencia (TS7022); la anotación lo rompe.
      const p: { maxBytes: number; continueCursor: string; isDone: boolean } =
        await ctx.runQuery(internal.gateBorrado._paginaProspectos, { cursor: cursorP });
      maxBytesProspecto = Math.max(maxBytesProspecto, p.maxBytes);
      if (p.isDone) break;
      cursorP = p.continueCursor;
    }

    // Interacciones: mayor documento y mayor racha por prospecto (contigua en el índice).
    let maxBytesInteraccion = 0;
    let maxInteraccionesPorProspecto = 0;
    let actualPid: Id<"prospectos"> | null = null;
    let actualCount = 0;
    let cursorI: string | null = null;
    for (;;) {
      const r: {
        filas: { prospectoId: Id<"prospectos">; bytes: number }[];
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(internal.gateBorrado._paginaInteracciones, { cursor: cursorI });
      for (const fila of r.filas) {
        maxBytesInteraccion = Math.max(maxBytesInteraccion, fila.bytes);
        if (fila.prospectoId === actualPid) {
          actualCount += 1;
        } else {
          actualPid = fila.prospectoId;
          actualCount = 1;
        }
        maxInteraccionesPorProspecto = Math.max(maxInteraccionesPorProspecto, actualCount);
      }
      if (r.isDone) break;
      cursorI = r.continueCursor;
    }

    return { maxInteraccionesPorProspecto, maxBytesInteraccion, maxBytesProspecto };
  },
});

/* ── Paso 2 · medición real del borrado en entorno DESECHABLE (solo desarrollo) ── */

/** Doble sentido de la guarda: estas funciones ESCRIBEN/BORRAN; solo deben correr en un
 *  deployment desechable, nunca en producción. */
function exigirDesarrollo() {
  if (process.env.APP_ENV !== "development") {
    throw new Error("gateBorrado: bloqueado — solo en un deployment desechable (APP_ENV=development)");
  }
}

/**
 * Carácter UTF-8 de 3 bytes (BMP, `.length === 1`). Es la DENSIDAD MÁXIMA de bytes por carácter
 * que las validaciones permiten: acotan por `string.length`, NO por bytes (`convex/lib/validacion.ts`),
 * así que 2.000 caracteres CJK/símbolos ocupan 6.000 B, no 2.000. Medir con ASCII subestimaría el
 * peor caso ~3× (hallazgo de la 3ª auditoría del plan). "一" = U+4E00 = 0xE4 0xB8 0x80.
 */
const CHAR_3B = "一";
const rellenoMax = (chars: number) => CHAR_3B.repeat(Math.max(0, Math.floor(chars)));

/**
 * Email VÁLIDO de longitud máxima con caracteres de 3 bytes. Un `email` de 254 "一" pasa el esquema
 * (`v.string()`) pero NO la validación del alta pública (`EMAIL_RE`, `validacion.ts`), así que no
 * representaría un documento admisible por la mutation real. Este sí: `[^\s@]+@[^\s@]+\.[^\s@]+`,
 * longitud LONGITUD_MAX_EMAIL. `@` y `.` cuestan 1 byte (el resto 3): ~4 bytes MENOS que 254×"一",
 * diferencia despreciable → el presupuesto medido queda, si acaso, del lado conservador.
 */
function emailMaxValido(): string {
  const cuerpo = LONGITUD_MAX_EMAIL - 2; // descuenta '@' y '.'
  const local = Math.ceil(cuerpo / 2);
  const dominio = cuerpo - local - 1; // reserva 1 carácter para el TLD
  return `${CHAR_3B.repeat(local)}@${CHAR_3B.repeat(dominio)}.${CHAR_3B}`;
}

/**
 * Siembra UN prospecto al PEOR CASO ADMISIBLE EN BYTES y sus interacciones. Rellena TODOS los
 * campos de texto libre a su tope de LONGITUD (`validacion.ts`) con caracteres de 3 bytes, que es
 * el documento válido más pesado que puede existir hacia delante. Inserta por `ctx.db.insert`
 * DIRECTO (salta la validación de longitud: reproduce también históricos previos a JOS-24/JOS-74).
 * Su propia transacción; sus métricas no cuentan (medimos el borrado en `medirBorrado`).
 */
export const sembrarPeorCaso = internalMutation({
  args: {
    usuarioId: v.string(),
    numInteracciones: v.number(),
  },
  returns: v.id("prospectos"),
  handler: async (ctx, args) => {
    exigirDesarrollo();
    const prospectoId = await ctx.db.insert("prospectos", {
      usuarioId: args.usuarioId,
      nombre: rellenoMax(LONGITUD_MAX_NOMBRE),
      telefono: rellenoMax(LONGITUD_MAX_TELEFONO),
      email: emailMaxValido(),
      comoSeConocio: rellenoMax(LONGITUD_MAX_COMO_SE_CONOCIO),
      canalContactoPreferido: "phone",
      etapaActual: "contacted",
      notas: rellenoMax(LONGITUD_MAX_NOTAS),
      fechaAlta: Date.now(),
    });
    for (let i = 0; i < args.numInteracciones; i++) {
      await ctx.db.insert("interacciones", {
        usuarioId: args.usuarioId,
        prospectoId,
        fecha: Date.now(),
        tipo: "message",
        resultado: "thinking",
        queOcurrio: rellenoMax(LONGITUD_MAX_TEXTO_INTERACCION),
        siguientePasoAcordado: rellenoMax(LONGITUD_MAX_TEXTO_INTERACCION),
      });
    }
    return prospectoId;
  },
});

const metricaValidator = v.object({ used: v.number(), remaining: v.number() });

/**
 * Ejecuta el borrado REAL (`eliminarProspectoEnCascada`, el mismo helper que
 * `prospectos.eliminar`) y devuelve las cuatro métricas de la transacción. Incluye la lectura
 * y el borrado del propio prospecto, además de la cascada, con el coste de índices dentro.
 */
export const medirBorrado = internalMutation({
  args: { id: v.id("prospectos") },
  returns: v.object({
    documentsRead: metricaValidator,
    documentsWritten: metricaValidator,
    bytesRead: metricaValidator,
    bytesWritten: metricaValidator,
  }),
  handler: async (ctx, { id }) => {
    exigirDesarrollo();
    const doc = await ctx.db.get(id);
    if (doc === null) throw new Error("gateBorrado.medirBorrado: prospecto inexistente");
    await eliminarProspectoEnCascada(ctx, doc);
    const m = await ctx.meta.getTransactionMetrics();
    return {
      documentsRead: m.documentsRead,
      documentsWritten: m.documentsWritten,
      bytesRead: m.bytesRead,
      bytesWritten: m.bytesWritten,
    };
  },
});

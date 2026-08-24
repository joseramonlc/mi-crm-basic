"use client";

import * as React from "react";
import { ConvexError } from "convex/values";
import { ELIMINANDO } from "./textos";

/** Solo el NOT_FOUND (opaco) de `obtener`/`prospectoDelUsuario` cuando la mutation invalida. */
function esNotFound(error: unknown): boolean {
  return error instanceof ConvexError && (error.data as { code?: string } | null | undefined)?.code === "NOT_FOUND";
}

/** Pantalla neutra que sustituye al contenido de la Ficha mientras se completa el borrado. */
export function PantallaEliminando() {
  return (
    <p role="status" style={{ padding: "24px 16px", color: "var(--color-neutral-500)", fontSize: 15 }}>
      {ELIMINANDO}
    </p>
  );
}

interface LimiteBorradoProps {
  /**
   * true mientras hay un borrado en curso. Es un REF (no prop de estado) para que su valor más
   * reciente esté disponible en `render()` sin re-montar el límite y para que SOBREVIVA al
   * desmontaje del hijo si el límite captura. Vive en el componente PADRE del límite.
   */
  borrandoRef: React.MutableRefObject<boolean>;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Límite de error local de la Ficha (JOS-80 §6.1). Un ErrorBoundary solo captura errores de sus
 * DESCENDIENTES, así que `useQuery(obtener)` DEBE vivir en el hijo (`FichaProspectoContenido`) y
 * este componente ser su PADRE.
 *
 * Solo absorbe el NOT_FOUND reactivo ESPERADO durante un borrado (`borrandoRef.current === true` y
 * el error es un ConvexError NOT_FOUND): se muestra `fallback` («Eliminando…»), y así el desenlace no
 * depende de que el cliente de Convex haya soltado la suscripción antes de la mutation (propiedad de
 * transporte, no demostrable). CUALQUIER OTRO error —otro código de ConvexError, red, fallo de
 * render— o un error fuera de un borrado se RE-LANZA al `error.tsx` de la ruta: el límite NO
 * enmascara fallos reales ni deja al usuario atrapado en «Eliminando…».
 */
export class LimiteBorrado extends React.Component<LimiteBorradoProps, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error !== null) {
      if (this.props.borrandoRef.current && esNotFound(this.state.error)) return this.props.fallback;
      throw this.state.error;
    }
    return this.props.children;
  }
}

"use client";

import * as React from "react";
import { APP_TZ, dayKeyToday, siguienteMedianocheMs } from "../../convex/lib/fecha";

/**
 * Día visible en pantalla, compartido por las pantallas cuyo contenido depende
 * del día (Actividad Diaria JOS-22, Pipeline JOS-21).
 *
 * Las queries de Convex re-corren cuando cambian los DATOS, no el reloj: a
 * medianoche es el cliente quien renueva el dayKey. Al dispararse el timer se
 * RECOMPUTA con dayKeyToday (no se incrementa) y se re-arma — así también quedan
 * cubiertos la suspensión del navegador y los cambios de reloj, donde el timer
 * puede despertar en un día arbitrario.
 */
export function useDayKey(): string {
  const [dayKey, setDayKey] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const armar = () => {
      timer = setTimeout(() => {
        setDayKey(dayKeyToday(Date.now(), APP_TZ));
        armar();
      }, siguienteMedianocheMs(Date.now(), APP_TZ) - Date.now());
    };
    armar();
    return () => clearTimeout(timer);
  }, []);
  return dayKey;
}

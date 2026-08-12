// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConvexError } from "convex/values";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { APP_TZ, zonedMidnightToMs } from "../../../../../convex/lib/fecha";
import { fechaAcordadaAMs } from "@/lib/fechaAcordada";
import { formatearFechaEs } from "@/lib/etiquetas";
import { urlGoogleCalendar } from "@/lib/calendario";
import { SeguimientoAcordado } from "./SeguimientoAcordado";
import {
  ACCION_CALENDARIO,
  ACCION_CAMBIAR_FECHA,
  ACCION_CANCELAR_FECHA,
  ACCION_FIJAR,
  ACCION_GUARDAR_FECHA,
  ACCION_QUITAR,
  ERROR_FECHA_ACORDADA_PASADA,
  ERROR_FECHA_ACORDADA_VACIA,
  ERROR_SEGUIMIENTO_RED,
  ERROR_SEGUIMIENTO_TERMINAL,
  ETIQUETA_CAMPO_ACORDADA,
  ETIQUETA_SEGUIMIENTO_ACORDADO,
  ETIQUETA_SEGUIMIENTO_MOTOR,
  EXPLICACION_ACORDADO,
  EXPLICACION_MOTOR,
  etiquetaCanal,
} from "./textos";

// Martes 2026-07-14, 10:00 de Madrid. Date.now() fijado por espía (sin fake
// timers: waitFor sigue necesitando timers reales).
const AHORA = Date.UTC(2026, 6, 14, 8, 0);
const HOY = "2026-07-14";
const ACORDADA = "2026-07-22";
const FECHA_MOTOR = Date.UTC(2026, 6, 17, 10);
const FECHA_ACUERDO = Date.UTC(2026, 6, 22, 10);

const BASE: ProspectoPublico = {
  id: "p7",
  nombre: "Ana Pérez",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp",
  etapaActual: "contacted",
  fechaAlta: Date.UTC(2026, 5, 15, 10),
  fechaProximoSeguimiento: FECHA_MOTOR,
} as ProspectoPublico;

/** Con acuerdo vigente: la marca Y la fecha, que es lo que exige `acuerdoActivo`. */
const CON_ACUERDO = { ...BASE, fechaProximoSeguimiento: FECHA_ACUERDO, seguimientoManual: true } as ProspectoPublico;

/**
 * Fixture propio de JOS-70, exigido por la auditoría (rev. 2, Mayor 3): `BASE`
 * no trae `telefono` ni `email` —los dos son opcionales—, así que sobre él un
 * componente que se OLVIDARA de pasarlos daría exactamente el mismo href que
 * uno correcto, y la prueba del cableado pasaría con la descripción rota.
 *
 * La fecha va en medianoche real de Madrid por el mismo motivo que en
 * calendario.test.ts: `Date.UTC` no distinguiría el día civil del de UTC.
 *
 * `BASE` se deja intacto a propósito: tocarlo movería las 20 pruebas anteriores.
 */
const CON_CONTACTO = {
  ...BASE,
  telefono: "+34 600 111 222",
  email: "ana@ejemplo.com",
  fechaProximoSeguimiento: zonedMidnightToMs({ y: 2026, m: 8, d: 15 }, APP_TZ),
} as ProspectoPublico;

// Tipados: el componente exige callbacks que devuelven promesa, y un vi.fn()
// suelto no lo satisface (tsc lo cazaría aunque los tests pasaran).
let onFijar: Mock<(fechaMs: number) => Promise<unknown>>;
let onQuitar: Mock<() => Promise<unknown>>;

function montar(prospecto: ProspectoPublico = BASE) {
  return render(<SeguimientoAcordado prospecto={prospecto} onFijar={onFijar} onQuitar={onQuitar} />);
}

function boton(nombre: string): HTMLButtonElement {
  return screen.getByRole("button", { name: nombre }) as HTMLButtonElement;
}

function campoFecha(): HTMLInputElement {
  return screen.getByLabelText(ETIQUETA_CAMPO_ACORDADA) as HTMLInputElement;
}

beforeEach(() => {
  onFijar = vi.fn<(fechaMs: number) => Promise<unknown>>().mockResolvedValue(undefined);
  onQuitar = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
  vi.spyOn(Date, "now").mockReturnValue(AHORA);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("los dos estados de la misma fecha (lo crítico de JOS-69)", () => {
  it("calculada por el motor: etiqueta y explicación del sistema", () => {
    montar();
    expect(screen.getByText(ETIQUETA_SEGUIMIENTO_MOTOR)).toBeDefined();
    expect(screen.getByText(EXPLICACION_MOTOR)).toBeDefined();
    expect(screen.getByText(formatearFechaEs(FECHA_MOTOR))).toBeDefined();
    expect(screen.queryByText(ETIQUETA_SEGUIMIENTO_ACORDADO)).toBeNull();
  });

  it("acordada por el usuario: cambian etiqueta Y explicación", () => {
    montar(CON_ACUERDO);
    expect(screen.getByText(ETIQUETA_SEGUIMIENTO_ACORDADO)).toBeDefined();
    expect(screen.getByText(EXPLICACION_ACORDADO)).toBeDefined();
    expect(screen.queryByText(ETIQUETA_SEGUIMIENTO_MOTOR)).toBeNull();
  });

  it("la marca SIN fecha es anómala y se muestra como automática (mismo criterio que el backend)", () => {
    montar({ ...BASE, seguimientoManual: true, fechaProximoSeguimiento: undefined } as ProspectoPublico);
    expect(screen.getByText(ETIQUETA_SEGUIMIENTO_MOTOR)).toBeDefined();
    expect(screen.queryByText(ETIQUETA_SEGUIMIENTO_ACORDADO)).toBeNull();
    // La frase acompaña a la etiqueta aunque no haya fecha: es la otra mitad
    // de la distinción entre los dos estados.
    expect(screen.getByText(EXPLICACION_MOTOR)).toBeDefined();
  });

  it("en etapa terminal no se explica nada: no hay motor que explicar", () => {
    montar({ ...BASE, etapaActual: "discarded", fechaProximoSeguimiento: undefined } as ProspectoPublico);
    expect(screen.queryByText(EXPLICACION_MOTOR)).toBeNull();
    expect(screen.queryByText(EXPLICACION_ACORDADO)).toBeNull();
  });

  it("sin acuerdo se ofrece fijar; con acuerdo, cambiar y volver al automático", () => {
    const { unmount } = montar();
    expect(boton(ACCION_FIJAR)).toBeDefined();
    expect(screen.queryByRole("button", { name: ACCION_QUITAR })).toBeNull();
    unmount();

    montar(CON_ACUERDO);
    expect(boton(ACCION_CAMBIAR_FECHA)).toBeDefined();
    // Acción VISIBLE, no escondida en un menú: es la letra de la issue.
    expect(boton(ACCION_QUITAR)).toBeDefined();
  });
});

describe("fijar la fecha", () => {
  it("el selector no admite nada anterior a hoy y arranca vacío", () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    expect(campoFecha().getAttribute("min")).toBe(HOY);
    // Sin acuerdo previo NO se propone la fecha del motor: sería ponerle
    // palabras en la boca al usuario.
    expect(campoFecha().value).toBe("");
  });

  it("con acuerdo previo, «Cambiar fecha» precarga la vigente", () => {
    montar(CON_ACUERDO);
    fireEvent.click(boton(ACCION_CAMBIAR_FECHA));
    expect(campoFecha().value).toBe(ACORDADA);
  });

  it("guardar envía el mediodía de Madrid del día elegido", async () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    await waitFor(() => expect(onFijar).toHaveBeenCalledWith(fechaAcordadaAMs(ACORDADA)));
    expect(onFijar).toHaveBeenCalledTimes(1);
  });

  it("fecha pasada: error inline y sin llamar al servidor", () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: "2026-07-13" } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    expect(screen.getByText(ERROR_FECHA_ACORDADA_PASADA)).toBeDefined();
    expect(onFijar).not.toHaveBeenCalled();
  });

  it("HOY se acepta: el suelo es hoy, no mañana", async () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: HOY } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    await waitFor(() => expect(onFijar).toHaveBeenCalledWith(fechaAcordadaAMs(HOY)));
  });

  it("sin fecha elegida: el error dice que falta elegirla, no que esté en el pasado", () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    expect(screen.getByText(ERROR_FECHA_ACORDADA_VACIA)).toBeDefined();
    expect(screen.queryByText(ERROR_FECHA_ACORDADA_PASADA)).toBeNull();
    expect(onFijar).not.toHaveBeenCalled();
  });

  it("cancelar cierra el selector sin llamar a nada", () => {
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });
    fireEvent.click(boton(ACCION_CANCELAR_FECHA));

    expect(screen.queryByLabelText(ETIQUETA_CAMPO_ACORDADA)).toBeNull();
    expect(onFijar).not.toHaveBeenCalled();
  });

  it("dos activaciones síncronas ejecutan UNA sola llamada (guarda de reentrada)", async () => {
    let resolver: (v: unknown) => void = () => {};
    onFijar.mockImplementation(() => new Promise((r) => (resolver = r)));
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });

    fireEvent.click(boton(ACCION_GUARDAR_FECHA));
    fireEvent.click(screen.getByRole("button", { name: /Guardar|Guardando/ }));

    expect(onFijar).toHaveBeenCalledTimes(1);
    resolver(undefined);
    await waitFor(() => expect(screen.queryByLabelText(ETIQUETA_CAMPO_ACORDADA)).toBeNull());
  });
});

describe("volver al automático", () => {
  it("llama a quitar sin argumentos: la fecha la recalcula el servidor", async () => {
    montar(CON_ACUERDO);
    fireEvent.click(boton(ACCION_QUITAR));
    await waitFor(() => expect(onQuitar).toHaveBeenCalledTimes(1));
    expect(onQuitar).toHaveBeenCalledWith();
  });

  it("sin estado optimista: la etiqueta sigue siendo la del servidor hasta que la suscripción cambie", async () => {
    montar(CON_ACUERDO);
    fireEvent.click(boton(ACCION_QUITAR));
    await waitFor(() => expect(onQuitar).toHaveBeenCalled());
    expect(screen.getByText(ETIQUETA_SEGUIMIENTO_ACORDADO)).toBeDefined();
  });
});

describe("etapas terminales", () => {
  it("no se ofrece fijar: JOS-8 promete «sin seguimiento» y el servidor lo rechaza", () => {
    montar({ ...BASE, etapaActual: "joined", fechaProximoSeguimiento: undefined } as ProspectoPublico);
    expect(screen.queryByRole("button", { name: ACCION_FIJAR })).toBeNull();
    expect(screen.queryByRole("button", { name: ACCION_CAMBIAR_FECHA })).toBeNull();
  });

  it("un acuerdo que quedase colgando SÍ se puede quitar: esa mutation no rechaza", () => {
    montar({ ...CON_ACUERDO, etapaActual: "joined" } as ProspectoPublico);
    expect(boton(ACCION_QUITAR)).toBeDefined();
    expect(screen.queryByRole("button", { name: ACCION_CAMBIAR_FECHA })).toBeNull();
  });
});

describe("fallos del servidor", () => {
  it("red: banner, la fecha tecleada se conserva y el selector sigue abierto", async () => {
    onFijar.mockRejectedValue(new Error("fetch failed"));
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(ERROR_SEGUIMIENTO_RED));
    expect(campoFecha().value).toBe(ACORDADA);
  });

  it("carrera de etapa terminal: banner que lo explica, no el de conexión", async () => {
    onFijar.mockRejectedValue(new ConvexError({ code: "VALIDATION_ERROR", field: "etapaActual", message: "terminal" }));
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(ERROR_SEGUIMIENTO_TERMINAL));
    expect(screen.queryByText(ERROR_SEGUIMIENTO_RED)).toBeNull();
  });

  it("rechazo de la fecha por el servidor: error bajo el campo, no banner", async () => {
    onFijar.mockRejectedValue(new ConvexError({ code: "VALIDATION_ERROR", field: "fecha", message: "en el pasado" }));
    montar();
    fireEvent.click(boton(ACCION_FIJAR));
    fireEvent.change(campoFecha(), { target: { value: ACORDADA } });
    fireEvent.click(boton(ACCION_GUARDAR_FECHA));

    await waitFor(() => expect(screen.getByText(ERROR_FECHA_ACORDADA_PASADA)).toBeDefined());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

/**
 * JOS-70. Lo que se prueba aquí es el CABLEADO, no el formato de la URL: eso ya
 * lo cubren las diez pruebas de calendario.test.ts. Sin estas, el enlace podía
 * quedar mal conectado —o sin poner— con aquellas diez en verde.
 */
describe("enlace «Añadir a mi calendario» (JOS-70)", () => {
  function enlace(): HTMLAnchorElement {
    return screen.getByRole("link", { name: ACCION_CALENDARIO }) as HTMLAnchorElement;
  }

  it("I1 · con fecha de seguimiento, el enlace está", () => {
    montar();
    expect(enlace()).toBeDefined();
  });

  it("I2 · el href lleva nombre, canal, teléfono, email y fecha del prospecto", () => {
    montar(CON_CONTACTO);

    expect(enlace().href).toBe(
      urlGoogleCalendar({
        nombre: CON_CONTACTO.nombre,
        fechaMs: CON_CONTACTO.fechaProximoSeguimiento!,
        canalEtiqueta: etiquetaCanal(CON_CONTACTO.canalContactoPreferido),
        telefono: CON_CONTACTO.telefono,
        email: CON_CONTACTO.email,
      }),
    );
  });

  it("I3 · abre fuera con el rel completo (primer enlace externo de la app)", () => {
    montar(CON_CONTACTO);

    expect(enlace().target).toBe("_blank");
    expect(enlace().rel).toContain("noopener");
    expect(enlace().rel).toContain("noreferrer");
  });

  it("I4 · sin fecha de seguimiento no hay enlace", () => {
    montar({ ...BASE, fechaProximoSeguimiento: undefined } as ProspectoPublico);
    expect(screen.queryByRole("link", { name: ACCION_CALENDARIO })).toBeNull();
  });

  it("I5 · en etapa terminal con fecha colgando, el enlace se conserva (D5)", () => {
    montar({ ...CON_CONTACTO, etapaActual: "discarded", seguimientoManual: true } as ProspectoPublico);
    expect(enlace()).toBeDefined();
  });
});

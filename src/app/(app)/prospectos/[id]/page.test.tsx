// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { escribirFlash, consumirFlash } from "@/lib/flash";
import { formatearFechaEs } from "@/lib/etiquetas";
import { fechaAcordadaAMs } from "@/lib/fechaAcordada";
import { BANNER_ERROR_RED } from "../nuevo/textos";
import {
  ACCION_FIJAR,
  ACCION_GUARDAR_FECHA,
  ACCION_QUITAR,
  CARGANDO_HISTORIAL,
  CARGANDO_PROSPECTO,
  ERROR_CAMBIO_ETAPA,
  ETIQUETA_CAMPO_ACORDADA,
  ETIQUETA_EDITAR,
  ETIQUETA_ELIMINAR,
  ACCION_CONFIRMAR_ELIMINAR,
  ACCION_CANCELAR_ELIMINAR,
  TOAST_PROSPECTO_ELIMINADO,
  ERROR_ELIMINAR,
  TITULO_ELIMINAR_INCIERTO,
  ACCION_ELIMINAR_INCIERTO,
  ELIMINANDO,
  ETIQUETA_CORREGIR_INTERACCION,
  ETIQUETA_ELIMINAR_INTERACCION,
  ACCION_CONFIRMAR_ELIMINAR_INTERACCION,
  TOAST_INTERACCION_ELIMINADA,
  ERROR_ELIMINAR_INTERACCION,
  TOAST_INTERACCION_INCIERTO,
  TITULO_EDICION,
  TOAST_ACUERDO_FIJADO,
  TOAST_ACUERDO_QUITADO,
  TOAST_DATOS_GUARDADOS,
  SIN_CONTACTO,
  SIN_NOTAS,
  SIN_SEGUIMIENTO,
  TITULO_FALLBACK,
  VACIO_DESCRIPCION,
} from "./textos";
import FichaProspectoPage from "./page";

// Sin proveedor Convex real (estrategia de JOS-22/M3): se mockean las dos
// suscripciones, las mutations (etapa y actualización) y la navegación.
const {
  useQueryMock,
  usePaginatedQueryMock,
  useMutationMock,
  cambiarEtapaMock,
  actualizarMock,
  fijarMock,
  quitarMock,
  eliminarMock,
  eliminarInteraccionMock,
  loadMoreMock,
  replaceMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  usePaginatedQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  cambiarEtapaMock: vi.fn(),
  actualizarMock: vi.fn(),
  fijarMock: vi.fn(),
  quitarMock: vi.fn(),
  eliminarMock: vi.fn(),
  eliminarInteraccionMock: vi.fn(),
  loadMoreMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: useQueryMock,
  usePaginatedQuery: usePaginatedQueryMock,
  useMutation: useMutationMock,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p7" }),
  useRouter: () => ({ replace: replaceMock }),
}));

const RUTA_REGISTRAR = "/prospectos/p7/interacciones/nueva";

const FECHA_ALTA = Date.UTC(2026, 5, 15, 10); // 15 jun 2026
const FECHA_ULTIMO = Date.UTC(2026, 6, 10, 10); // 10 jul 2026
const FECHA_PROXIMO = Date.UTC(2026, 6, 20, 10); // lunes, 20 de julio

const PROSPECTO = {
  id: "p7",
  nombre: "Ana Pérez",
  telefono: "+34 600 111 222",
  email: "ana@ejemplo.com",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp" as const,
  etapaActual: "contacted" as const,
  notas: "Le interesa el producto.\nPrefiere que la llamen por las tardes.",
  fechaAlta: FECHA_ALTA,
  fechaUltimoContacto: FECHA_ULTIMO,
  fechaProximoSeguimiento: FECHA_PROXIMO,
  // JOS-50: la proyección pública SIEMPRE resuelve la prioridad, así que el
  // fixture también la trae. "medium" (el defecto) para que "elegir Alta" en la
  // edición genere un diff real (JOS-52).
  prioridad: "medium" as const,
};

const INTERACCIONES = [
  {
    id: "i2",
    prospectoId: "p7",
    fecha: FECHA_ULTIMO,
    tipo: "call" as const,
    resultado: "interested" as const,
    queOcurrio:
      "Charla larga sobre el plan de carrera, sus dudas con la inversión inicial y los siguientes pasos del proceso de incorporación al equipo.",
    siguientePasoAcordado: "Enviar el vídeo de presentación",
  },
  {
    id: "i1",
    prospectoId: "p7",
    fecha: FECHA_ALTA,
    tipo: "message" as const,
    resultado: "thinking" as const,
    queOcurrio: "Primer mensaje de contacto.",
  },
];

type Historial = {
  results: typeof INTERACCIONES;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  isLoading: boolean;
  loadMore: typeof loadMoreMock;
};

function prepararHistorial(sobrescribir: Partial<Historial> = {}) {
  usePaginatedQueryMock.mockReturnValue({
    results: INTERACCIONES,
    status: "Exhausted",
    isLoading: false,
    loadMore: loadMoreMock,
    ...sobrescribir,
  });
}

function textosDeStatus(): string[] {
  return screen.queryAllByRole("status").map((el) => el.textContent ?? "");
}

/** Copia del fixture sin los campos indicados (opcionales ausentes de la API). */
function sin<T extends object, K extends keyof T>(objeto: T, ...claves: K[]): Omit<T, K> {
  const copia = { ...objeto };
  for (const clave of claves) delete copia[clave];
  return copia;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  useQueryMock.mockReturnValue(PROSPECTO);
  // Cada mutation recibe su mock por nombre canónico (desde JOS-69 son cuatro).
  const MOCKS: Record<string, ReturnType<typeof vi.fn>> = {
    "prospectos:actualizar": actualizarMock,
    "prospectos:fijarSeguimientoAcordado": fijarMock,
    "prospectos:quitarSeguimientoAcordado": quitarMock,
    "prospectos:eliminar": eliminarMock,
    "interacciones:eliminar": eliminarInteraccionMock,
  };
  useMutationMock.mockImplementation((referencia) => MOCKS[getFunctionName(referencia)] ?? cambiarEtapaMock);
  prepararHistorial();
});

afterEach(cleanup);

describe("contrato de ruta y header (bloqueo 4 de la rev. 2)", () => {
  it("el id de la ruta se convierte una vez y alimenta AMBAS consultas", () => {
    render(<FichaProspectoPage />);
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), { id: "p7" });
    expect(usePaginatedQueryMock).toHaveBeenCalledWith(expect.anything(), { prospectoId: "p7" }, { initialNumItems: 50 });
  });

  it("h1 con fallback durante la carga y con el nombre al resolver — nunca vacío", () => {
    useQueryMock.mockReturnValue(undefined);
    const { unmount } = render(<FichaProspectoPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(TITULO_FALLBACK);
    expect(textosDeStatus()).toContain(CARGANDO_PROSPECTO);

    unmount();
    useQueryMock.mockReturnValue(PROSPECTO);
    render(<FichaProspectoPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ana Pérez");
  });

  it("la flecha atrás navega SIEMPRE con replace a /actividad (contrato M3)", () => {
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: "Volver a Inicio" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });
});

describe("sección de datos (P3) y notas (P8)", () => {
  it("muestra etapa, prioridad, canal con etiqueta de producto, contacto, cómo se conoció y fecha de alta", () => {
    render(<FichaProspectoPage />);
    // "Contactado" aparece en el StageBadge de cabecera Y en el selector de etapa (bocado 2).
    expect(screen.getAllByText("Contactado").length).toBeGreaterThanOrEqual(1);
    // JOS-52: la prioridad (Media, del fixture) se ve en lectura junto a la etapa.
    expect(screen.getByText("Media")).toBeDefined();
    // Acotado a la sección de datos: desde JOS-83 "WhatsApp" es también la
    // etiqueta del botón de contactar, y sin acotar la búsqueda es ambigua.
    expect(within(screen.getByRole("region", { name: "Datos del prospecto" })).getByText("WhatsApp")).toBeDefined();
    expect(screen.getByText("+34 600 111 222")).toBeDefined();
    expect(screen.getByText("ana@ejemplo.com")).toBeDefined();
    expect(screen.getByText("Evento")).toBeDefined();
    expect(screen.getByText(/^Añadido el /)).toBeDefined();
    expect(screen.getByText(/Le interesa el producto\./)).toBeDefined();
  });

  it("omite teléfono y email ausentes y muestra el vacío de notas", () => {
    useQueryMock.mockReturnValue(sin(PROSPECTO, "telefono", "email", "notas"));
    render(<FichaProspectoPage />);
    expect(screen.queryByText("+34 600 111 222")).toBeNull();
    expect(screen.queryByText("ana@ejemplo.com")).toBeNull();
    expect(screen.getByText(SIN_NOTAS)).toBeDefined();
  });
});

// Desde JOS-69 la fecha de próximo contacto es editable; "Último contacto"
// sigue siendo del motor. La edición se prueba en SeguimientoAcordado.test.tsx
// y su cableado más abajo.
describe("tarjeta de seguimiento (P5)", () => {
  it("muestra las dos fechas del motor formateadas", () => {
    render(<FichaProspectoPage />);
    expect(screen.getByText(formatearFechaEs(FECHA_PROXIMO))).toBeDefined();
    // La fecha del último contacto coincide con la de la interacción i2 del
    // historial: ambas presencias son correctas.
    expect(screen.getAllByText(formatearFechaEs(FECHA_ULTIMO)).length).toBeGreaterThanOrEqual(2);
  });

  it("etapa terminal sin seguimiento y prospecto sin contacto: textos neutros", () => {
    useQueryMock.mockReturnValue({ ...sin(PROSPECTO, "fechaProximoSeguimiento", "fechaUltimoContacto"), etapaActual: "joined" as const });
    render(<FichaProspectoPage />);
    expect(screen.getByText(SIN_SEGUIMIENTO)).toBeDefined();
    expect(screen.getByText(SIN_CONTACTO)).toBeDefined();
  });
});

describe("historial (P9/P10/P11 — JOS-20)", () => {
  it("cada entrada muestra fecha, tipo, resultado, texto ÍNTEGRO y siguiente paso condicional", () => {
    render(<FichaProspectoPage />);
    expect(screen.getByText("Llamada")).toBeDefined();
    expect(screen.getByText("Mensaje")).toBeDefined();
    expect(screen.getByText("Interesado")).toBeDefined();
    expect(screen.getByText("Necesita pensar")).toBeDefined();
    // Texto completo sin truncar (letra de JOS-20).
    expect(screen.getByText(INTERACCIONES[0].queOcurrio)).toBeDefined();
    expect(screen.getByText("Primer mensaje de contacto.")).toBeDefined();
    // "Siguiente paso" solo en la entrada que lo registró.
    expect(screen.getAllByText(/^Siguiente paso: /)).toHaveLength(1);
    expect(screen.getByText("Siguiente paso: Enviar el vídeo de presentación")).toBeDefined();
  });

  it("respeta el orden del servidor: la más reciente primero", () => {
    render(<FichaProspectoPage />);
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("Charla larga");
    expect(items[1].textContent).toContain("Primer mensaje");
  });

  it("drenaje automático: con CanLoadMore pide el siguiente bloque de 50", () => {
    prepararHistorial({ status: "CanLoadMore" });
    render(<FichaProspectoPage />);
    expect(loadMoreMock).toHaveBeenCalledWith(50);
  });

  it("con Exhausted no vuelve a pedir y aparece el contador exacto", () => {
    render(<FichaProspectoPage />);
    expect(loadMoreMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Historial (2)" })).toBeDefined();
  });

  it("durante el drenaje: título sin número, carga progresiva visible y NINGÚN control de paginación", () => {
    prepararHistorial({ status: "CanLoadMore" });
    render(<FichaProspectoPage />);
    expect(screen.getByRole("heading", { name: "Historial" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Historial \(/ })).toBeNull();
    // Las entradas ya recibidas se muestran mientras llega el resto (P11).
    expect(screen.getByText("Primer mensaje de contacto.")).toBeDefined();
    expect(textosDeStatus()).toContain(CARGANDO_HISTORIAL);
    expect(screen.queryByRole("button", { name: /Ver más/i })).toBeNull();
  });

  it("primera página cargando: estado de carga del historial", () => {
    prepararHistorial({ results: [], status: "LoadingFirstPage", isLoading: true });
    render(<FichaProspectoPage />);
    expect(textosDeStatus()).toContain(CARGANDO_HISTORIAL);
  });

  it("vacío: copy literal de JOS-20 y CTA hacia registrar interacción", () => {
    prepararHistorial({ results: [] });
    render(<FichaProspectoPage />);
    expect(screen.getByText(VACIO_DESCRIPCION)).toBeDefined();
    const enlaces = screen.getAllByRole("link", { name: /Registrar interacción/ });
    expect(enlaces.length).toBeGreaterThanOrEqual(3); // barra fija + cabecera lg + EmptyState
    for (const enlace of enlaces) {
      expect(enlace.getAttribute("href")).toBe(RUTA_REGISTRAR);
    }
  });
});

describe("CTA fija y reserva de espacio (P6/P16, bloqueo de la rev. 2)", () => {
  it("todos los accesos a registrar interacción llevan a la ruta del prospecto", () => {
    render(<FichaProspectoPage />);
    const enlaces = screen.getAllByRole("link", { name: "Registrar interacción" });
    expect(enlaces.length).toBeGreaterThanOrEqual(2); // barra fija móvil + cabecera lg
    for (const enlace of enlaces) {
      expect(enlace.getAttribute("href")).toBe(RUTA_REGISTRAR);
    }
  });

  it("única fuente --ficha-cta: la definen la raíz, el padding del contenido y el toast", () => {
    const { container } = render(<FichaProspectoPage />);
    const raiz = container.firstElementChild as HTMLElement;
    // La medida ya no se escribe aquí: la raíz delega en el token compartido,
    // del que también se apoya el FAB del AppShell (JOS-26). Sigue habiendo
    // una sola fuente; lo que cambia es dónde vive.
    expect(raiz.style.getPropertyValue("--ficha-cta")).toBe("var(--layout-ficha-cta)");
    expect(raiz.style.getPropertyValue("--toast-bottom")).toBe("calc(var(--ficha-cta) + 16px)");
    expect(container.querySelector('[class*="pb-[var(--ficha-cta)]"]')).not.toBeNull();
  });
});

describe("toast del flash conservado (P13)", () => {
  it("muestra el toast del flash UNA sola vez (leer-y-borrar)", () => {
    escribirFlash("Interacción registrada, próximo contacto: lunes, 20 de julio");
    const { unmount } = render(<FichaProspectoPage />);

    expect(textosDeStatus().some((t) => t.includes("Interacción registrada"))).toBe(true);
    expect(consumirFlash()).toBeNull(); // ya consumido por la ficha

    unmount();
    render(<FichaProspectoPage />);
    expect(textosDeStatus().some((t) => t.includes("Interacción registrada"))).toBe(false);
  });

  it("sin flash pendiente no hay toast", () => {
    render(<FichaProspectoPage />);
    expect(textosDeStatus().some((t) => t.includes("Interacción registrada"))).toBe(false);
  });

  it("Strict Mode (efecto doble): el toast sobrevive — el flash se consume UNA vez y no se pisa con null", () => {
    escribirFlash("Interacción registrada");
    render(
      <React.StrictMode>
        <FichaProspectoPage />
      </React.StrictMode>,
    );
    expect(textosDeStatus().some((t) => t.includes("Interacción registrada"))).toBe(true);
    expect(consumirFlash()).toBeNull();
  });
});

describe("cambio de etapa (JOS-19, bocado 2)", () => {
  const FECHA_RECALCULADA = Date.UTC(2026, 6, 17, 10);

  it("la sección va entre la tarjeta de seguimiento y las notas (orden JOS-59)", () => {
    const { container } = render(<FichaProspectoPage />);
    const secciones = Array.from(container.querySelectorAll("section[aria-label]")).map((s) => s.getAttribute("aria-label"));
    // JOS-80: "Eliminar prospecto" es la última sección de la columna izquierda, antes del historial.
    // JOS-83: "Contactar" va pegada a los datos, con los que se construye.
    expect(secciones).toEqual([
      "Datos del prospecto",
      "Contactar",
      "Seguimiento",
      "Etapa del pipeline",
      "Notas",
      "Eliminar prospecto",
      "Historial",
    ]);
  });

  it("activar otra etapa llama UNA vez a cambiarEtapa con el id de la ruta y muestra el toast con la fecha recalculada", async () => {
    cambiarEtapaMock.mockResolvedValue({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_RECALCULADA });
    render(<FichaProspectoPage />);

    fireEvent.click(screen.getByRole("radio", { name: "Presentación realizada" }));

    await waitFor(() =>
      expect(textosDeStatus()).toContain(
        `Etapa actualizada: Presentación realizada. Próximo contacto: ${formatearFechaEs(FECHA_RECALCULADA)}`,
      ),
    );
    expect(cambiarEtapaMock).toHaveBeenCalledTimes(1);
    expect(cambiarEtapaMock).toHaveBeenCalledWith({ id: "p7", etapa: "presented" });
  });

  it("dos etapas DISTINTAS activadas antes de resolver la primera mutation: UNA sola llamada (guarda useRef, condición de auditoría)", async () => {
    let resolver: (v: unknown) => void = () => {};
    cambiarEtapaMock.mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<FichaProspectoPage />);

    const presentacion = screen.getByRole("radio", { name: "Presentación realizada" });
    const valoracion = screen.getByRole("radio", { name: "En valoración" });
    act(() => {
      // Misma tarea síncrona: el estado `guardandoEtapa` aún no se ha aplicado
      // al segundo click — solo el ref puede cortarlo.
      presentacion.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      valoracion.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(cambiarEtapaMock).toHaveBeenCalledTimes(1);
    expect(cambiarEtapaMock).toHaveBeenCalledWith({ id: "p7", etapa: "presented" });

    await act(async () => {
      resolver({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_RECALCULADA });
    });
    expect(textosDeStatus().some((t) => t.startsWith("Etapa actualizada: Presentación realizada."))).toBe(true);
  });

  it("ventana entre el éxito de la mutation y la suscripción: re-activar NO relanza; el nuevo valor re-habilita (hallazgo 1 del NO-GO)", async () => {
    cambiarEtapaMock.mockResolvedValue({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_RECALCULADA });
    const { rerender } = render(<FichaProspectoPage />);
    const objetivo = screen.getByRole("radio", { name: "Presentación realizada" });
    fireEvent.click(objetivo);
    await waitFor(() => expect(textosDeStatus().some((t) => t.startsWith("Etapa actualizada"))).toBe(true));

    // La suscripción aún devuelve la etapa ANTIGUA: las pills siguen
    // deshabilitadas y re-activar la etapa pedida no produce segunda llamada.
    expect(objetivo.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(objetivo);
    fireEvent.keyDown(objetivo, { key: "Enter" });
    expect(cambiarEtapaMock).toHaveBeenCalledTimes(1);

    // La suscripción entrega la nueva etapa: pills re-habilitadas y actual marcada.
    useQueryMock.mockReturnValue({ ...PROSPECTO, etapaActual: "presented" as const, fechaProximoSeguimiento: FECHA_RECALCULADA });
    rerender(<FichaProspectoPage />);
    expect(objetivo.getAttribute("aria-disabled")).toBeNull();
    expect(objetivo.getAttribute("aria-checked")).toBe("true");
  });

  it("teclado contra el servidor: la flecha NO llama a la mutation; Enter llama UNA vez (condición de auditoría)", async () => {
    cambiarEtapaMock.mockResolvedValue({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_RECALCULADA });
    render(<FichaProspectoPage />);
    const radios = screen.getAllByRole("radio");

    act(() => radios[1].focus()); // etapa actual: Contactado
    fireEvent.keyDown(radios[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[2]);
    expect(cambiarEtapaMock).not.toHaveBeenCalled();

    fireEvent.keyDown(radios[2], { key: "Enter" });
    await waitFor(() => expect(cambiarEtapaMock).toHaveBeenCalledTimes(1));
    expect(cambiarEtapaMock).toHaveBeenCalledWith({ id: "p7", etapa: "presented" });
  });

  it("tocar la etapa ACTUAL no llama al servidor", () => {
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Contactado" }));
    expect(cambiarEtapaMock).not.toHaveBeenCalled();
  });

  it("toast de etapa terminal: Incorporado y Descartado con sus textos exactos", async () => {
    cambiarEtapaMock.mockResolvedValue({ ...sin(PROSPECTO, "fechaProximoSeguimiento"), etapaActual: "joined" });
    const { unmount } = render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Incorporado" }));
    await waitFor(() => expect(textosDeStatus()).toContain("¡Incorporado al equipo! Sale de la actividad diaria."));

    unmount();
    cambiarEtapaMock.mockResolvedValue({ ...sin(PROSPECTO, "fechaProximoSeguimiento"), etapaActual: "discarded" });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Descartado" }));
    await waitFor(() => expect(textosDeStatus()).toContain("Prospecto descartado. Sale de la actividad diaria."));
  });

  it("error de la mutation: alert con el texto exacto, sin toast, pills re-habilitadas y etapa del servidor intacta", async () => {
    cambiarEtapaMock.mockRejectedValue(new Error("fetch failed"));
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Descartado" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(ERROR_CAMBIO_ETAPA));
    expect(textosDeStatus().some((t) => t.startsWith("Etapa actualizada") || t.includes("descartado"))).toBe(false);
    const descartado = screen.getByRole("radio", { name: "Descartado" });
    expect(descartado.getAttribute("aria-disabled")).toBeNull();
    // Sin estado optimista: la etapa marcada sigue siendo la de la suscripción.
    expect(screen.getByRole("radio", { name: "Contactado" }).getAttribute("aria-checked")).toBe("true");
  });

  it("cambiar de etapa NO registra interacción: la ficha solo instancia etapa y actualización, nunca interacciones.crear (P7)", () => {
    render(<FichaProspectoPage />);
    // getFunctionName: el proxy del api genera referencias nuevas por acceso;
    // el nombre canónico es la identidad estable de la función Convex. Desde
    // JOS-69 conviven varias mutations (contacto acordado); JOS-80 suma `prospectos:eliminar` y, en
    // el Trozo B, `interacciones:eliminar` (borrar una interacción suelta) — y sigue sin estar
    // interacciones.crear, que es lo que este test protege.
    const mutations = useMutationMock.mock.calls.map((llamada) => getFunctionName(llamada[0]));
    expect(mutations).toEqual([
      "prospectos:cambiarEtapa",
      "prospectos:actualizar",
      "prospectos:fijarSeguimientoAcordado",
      "prospectos:quitarSeguimientoAcordado",
      "prospectos:eliminar",
      "interacciones:eliminar",
    ]);
    expect(mutations).not.toContain("interacciones:crear");
  });

  it("el selector de etapa sigue operativo durante la edición, con el formulario abierto (P2 bocado 3)", async () => {
    cambiarEtapaMock.mockResolvedValue({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_RECALCULADA });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));
    fireEvent.click(screen.getByRole("radio", { name: "Presentación realizada" }));

    await waitFor(() => expect(cambiarEtapaMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("form", { name: TITULO_EDICION })).toBeDefined();
  });

  it("indicador terminal en la tarjeta (D1): presente en joined/discarded, ausente en etapas activas", () => {
    useQueryMock.mockReturnValue({ ...sin(PROSPECTO, "fechaProximoSeguimiento"), etapaActual: "joined" as const });
    const { unmount } = render(<FichaProspectoPage />);
    expect(screen.getByText("Incorporado — fuera del pipeline activo")).toBeDefined();

    unmount();
    useQueryMock.mockReturnValue({ ...sin(PROSPECTO, "fechaProximoSeguimiento"), etapaActual: "discarded" as const });
    const segunda = render(<FichaProspectoPage />);
    expect(screen.getByText("Descartado — fuera del pipeline activo")).toBeDefined();

    segunda.unmount();
    useQueryMock.mockReturnValue(PROSPECTO);
    render(<FichaProspectoPage />);
    expect(screen.queryByText(/fuera del pipeline activo/)).toBeNull();
  });
});

describe("edición de datos (JOS-18, bocado 3)", () => {
  it("«Editar» sustituye la vista de datos por el formulario y oculta las notas de lectura (P2)", () => {
    render(<FichaProspectoPage />);
    // En lectura: la sección de datos y las notas de lectura están; el formulario no.
    expect(screen.getByRole("region", { name: "Datos del prospecto" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Notas" })).toBeDefined();
    expect(screen.queryByRole("form", { name: TITULO_EDICION })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));

    expect(screen.getByRole("form", { name: TITULO_EDICION })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Datos del prospecto" })).toBeNull();
    // Las notas de lectura desaparecen (su campo está en el formulario)…
    expect(screen.queryByRole("region", { name: "Notas" })).toBeNull();
    // …pero seguimiento y etapa siguen presentes y operativos.
    expect(screen.getByRole("region", { name: "Seguimiento" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Etapa del pipeline" })).toBeDefined();
  });

  it("«Contactar» también desaparece al editar: sus datos están en el formulario (JOS-83)", () => {
    // Mismo criterio que las notas: unos botones construidos con el teléfono y el
    // email YA GUARDADOS contradirían lo que el usuario está escribiendo.
    render(<FichaProspectoPage />);
    expect(screen.getByRole("region", { name: "Contactar" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));

    expect(screen.queryByRole("region", { name: "Contactar" })).toBeNull();
  });

  it("guardar con cambios: llama a actualizar con el diff + id de la ruta, toast literal y vuelta a lectura (P5/P6)", async () => {
    actualizarMock.mockResolvedValue({ ...PROSPECTO, nombre: "Ana López" });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana López" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(textosDeStatus()).toContain(TOAST_DATOS_GUARDADOS));
    expect(actualizarMock).toHaveBeenCalledTimes(1);
    expect(actualizarMock).toHaveBeenCalledWith({ id: "p7", nombre: "Ana López" });
    // Vuelta a lectura: el formulario desaparece.
    expect(screen.queryByRole("form", { name: TITULO_EDICION })).toBeNull();
    expect(screen.getByRole("region", { name: "Datos del prospecto" })).toBeDefined();
  });

  it("editar → elegir Alta → guardar: cablea prioridad con la mutation, toast y vuelta a lectura (JOS-52)", async () => {
    actualizarMock.mockResolvedValue({ ...PROSPECTO, prioridad: "high" });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));
    // "Alta" es exclusivo del selector de prioridad (las etapas no lo usan).
    fireEvent.click(screen.getByRole("radio", { name: "Alta" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(textosDeStatus()).toContain(TOAST_DATOS_GUARDADOS));
    expect(actualizarMock).toHaveBeenCalledTimes(1);
    expect(actualizarMock).toHaveBeenCalledWith({ id: "p7", prioridad: "high" });
    // Vuelta a lectura: el formulario desaparece y la sección de datos vuelve.
    expect(screen.queryByRole("form", { name: TITULO_EDICION })).toBeNull();
    expect(screen.getByRole("region", { name: "Datos del prospecto" })).toBeDefined();
  });

  it("error de actualizar: mantiene el modo edición con lo tecleado y sin toast (P7)", async () => {
    actualizarMock.mockRejectedValue(new Error("fetch failed"));
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana López" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(BANNER_ERROR_RED));
    expect(screen.getByRole("form", { name: TITULO_EDICION })).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana López");
    expect(textosDeStatus()).not.toContain(TOAST_DATOS_GUARDADOS);
  });

  it("cancelar vuelve a lectura sin llamar a actualizar (P8)", () => {
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_EDITAR }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Descartar" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(actualizarMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("form", { name: TITULO_EDICION })).toBeNull();
    expect(screen.getByRole("region", { name: "Datos del prospecto" })).toBeDefined();
  });
});

describe("contacto acordado en la ficha (JOS-69)", () => {
  const ACORDADA = "2026-07-22";
  const FECHA_ACUERDO = Date.UTC(2026, 6, 22, 10);
  const AHORA = Date.UTC(2026, 6, 14, 8, 0); // martes 2026-07-14, 10:00 Madrid

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(AHORA);
  });

  it("fijar: llama a la mutation con el día elegido y avisa", async () => {
    fijarMock.mockResolvedValue({ ...PROSPECTO, fechaProximoSeguimiento: FECHA_ACUERDO, seguimientoManual: true });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ACCION_FIJAR }));
    fireEvent.change(screen.getByLabelText(ETIQUETA_CAMPO_ACORDADA), { target: { value: ACORDADA } });
    fireEvent.click(screen.getByRole("button", { name: ACCION_GUARDAR_FECHA }));

    await waitFor(() => expect(fijarMock).toHaveBeenCalledWith({ id: "p7", fecha: fechaAcordadaAMs(ACORDADA) }));
    expect(textosDeStatus()).toContain(TOAST_ACUERDO_FIJADO);
  });

  it("quitar: llama a la mutation que RECALCULA con el motor y avisa", async () => {
    useQueryMock.mockReturnValue({ ...PROSPECTO, fechaProximoSeguimiento: FECHA_ACUERDO, seguimientoManual: true });
    quitarMock.mockResolvedValue({ ...PROSPECTO });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: ACCION_QUITAR }));

    await waitFor(() => expect(quitarMock).toHaveBeenCalledWith({ id: "p7" }));
    expect(textosDeStatus()).toContain(TOAST_ACUERDO_QUITADO);
  });

  it("cambiar de etapa con acuerdo vigente: el aviso dice que la fecha SE MANTIENE", async () => {
    // El acuerdo gana sobre la regla de la etapa (JOS-67): anunciar "próximo
    // contacto" haría creer que el cambio de etapa recalculó la fecha.
    cambiarEtapaMock.mockResolvedValue({
      ...PROSPECTO,
      etapaActual: "presented",
      fechaProximoSeguimiento: FECHA_ACUERDO,
      seguimientoManual: true,
    });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Presentación realizada" }));

    await waitFor(() =>
      expect(textosDeStatus()).toContain(
        `Etapa actualizada: Presentación realizada. Se mantiene el contacto acordado: ${formatearFechaEs(FECHA_ACUERDO)}`,
      ),
    );
  });

  it("la marca SIN fecha no presume un acuerdo: el aviso no habla de contacto acordado", async () => {
    // Caso anómalo que el backend contempla defensivamente: seguimientoManual
    // sin fecha NO es un acuerdo vigente.
    cambiarEtapaMock.mockResolvedValue({
      ...sin(PROSPECTO, "fechaProximoSeguimiento"),
      etapaActual: "presented",
      seguimientoManual: true,
    });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Presentación realizada" }));

    await waitFor(() => expect(textosDeStatus()).toContain("Etapa actualizada: Presentación realizada."));
    expect(textosDeStatus().some((t) => t.includes("contacto acordado"))).toBe(false);
  });

  it("el aviso sale del prospecto DEVUELTO, no de la suscripción (que puede ir desfasada)", async () => {
    // La suscripción todavía muestra el acuerdo; el servidor ya devolvió una
    // fecha del motor. Manda lo devuelto.
    useQueryMock.mockReturnValue({ ...PROSPECTO, fechaProximoSeguimiento: FECHA_ACUERDO, seguimientoManual: true });
    cambiarEtapaMock.mockResolvedValue({ ...PROSPECTO, etapaActual: "presented", fechaProximoSeguimiento: FECHA_ACUERDO });
    render(<FichaProspectoPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Presentación realizada" }));

    await waitFor(() =>
      expect(textosDeStatus()).toContain(
        `Etapa actualizada: Presentación realizada. Próximo contacto: ${formatearFechaEs(FECHA_ACUERDO)}`,
      ),
    );
  });
});

describe("eliminar prospecto (JOS-80)", () => {
  function abrirDialogo() {
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_ELIMINAR }));
    return within(screen.getByRole("dialog"));
  }

  it("el botón abre la confirmación", () => {
    render(<FichaProspectoPage />);
    expect(screen.queryByRole("dialog")).toBeNull();
    abrirDialogo();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("cancelar cierra sin borrar", () => {
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    fireEvent.click(dialogo.getByRole("button", { name: ACCION_CANCELAR_ELIMINAR }));
    expect(eliminarMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirmar borra: llama eliminar, corta la suscripción (skip), escribe flash y navega con replace", async () => {
    eliminarMock.mockResolvedValue(null);
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    expect(eliminarMock).toHaveBeenCalledWith({ id: "p7" });
    // La suscripción pasa a "skip" (best-effort): tras el borrado, `obtener` daría NOT_FOUND.
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), "skip");
    // Orden determinista de éxito: flash → replace a /actividad.
    expect(consumirFlash()).toBe(TOAST_PROSPECTO_ELIMINADO);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("NOT_FOUND reactivo durante el borrado: muestra «Eliminando…» y NO propaga al límite de la ruta (§6.1)", async () => {
    // React registra el error capturado por el límite en console.error; se silencia para no ensuciar.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolver: (v: null) => void = () => {};
    eliminarMock.mockReturnValue(new Promise<null>((r) => (resolver = r)));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    // Tras confirmar, `obtener` pasa a LANZAR NOT_FOUND (invalidación reactiva del borrado).
    useQueryMock.mockImplementation(() => {
      throw new ConvexError({ code: "NOT_FOUND" });
    });
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    // El límite LOCAL lo absorbió: pantalla neutra, y el render NO lanzó (no hay error.tsx de ruta).
    expect(textosDeStatus()).toContain(ELIMINANDO);
    expect(eliminarMock).toHaveBeenCalledTimes(1);
    await act(async () => resolver(null));
    spy.mockRestore();
  });

  it("rechazo NOT_FOUND (ya borrado): se trata como ÉXITO — flash + replace", async () => {
    eliminarMock.mockRejectedValue(new ConvexError({ code: "NOT_FOUND" }));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    expect(consumirFlash()).toBe(TOAST_PROSPECTO_ELIMINADO);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("rechazo ConvexError (otro código): diálogo con error accesible y REINTENTO; no navega ni flash", async () => {
    eliminarMock.mockRejectedValue(new ConvexError({ code: "UNAUTHENTICATED" }));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    expect(screen.getByRole("alert").textContent).toBe(ERROR_ELIMINAR);
    expect(screen.getByRole("dialog")).toBeDefined();
    // Reintento disponible: el botón de confirmar sigue presente y habilitado.
    expect(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR })).toHaveProperty("disabled", false);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(consumirFlash()).toBeNull();
  });

  it("rechazo de RED (incierto): «no confirmado» con acción única de salir, SIN reintento", async () => {
    eliminarMock.mockRejectedValue(new Error("network"));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    const alerta = within(screen.getByRole("alertdialog"));
    expect(screen.getByText(TITULO_ELIMINAR_INCIERTO)).toBeDefined();
    // No hay reintento (no está el botón "Eliminar"); solo "Salir".
    expect(alerta.queryByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR })).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(eliminarMock).toHaveBeenCalledTimes(1);
    fireEvent.click(alerta.getByRole("button", { name: ACCION_ELIMINAR_INCIERTO }));
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("resultado incierto: el modal ATRAPA el foco (Tab y Shift+Tab no lo sacan)", async () => {
    eliminarMock.mockRejectedValue(new Error("network"));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR }));
    });
    const modal = screen.getByRole("alertdialog");
    const salir = within(modal).getByRole("button", { name: ACCION_ELIMINAR_INCIERTO });
    expect(document.activeElement).toBe(salir); // foco inicial en la única acción
    fireEvent.keyDown(modal, { key: "Tab" });
    expect(document.activeElement).toBe(salir);
    fireEvent.keyDown(modal, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(salir);
  });

  it("doble activación rápida: emite UNA sola mutation (guarda síncrona por ref)", async () => {
    let resolver: (v: null) => void = () => {};
    eliminarMock.mockReturnValue(new Promise<null>((r) => (resolver = r)));
    render(<FichaProspectoPage />);
    const dialogo = abrirDialogo();
    const confirmar = dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR });
    await act(async () => {
      fireEvent.click(confirmar);
      fireEvent.click(confirmar);
    });
    expect(eliminarMock).toHaveBeenCalledTimes(1);
    await act(async () => resolver(null));
  });
});

describe("corregir / eliminar interacción en el historial (JOS-80 Trozo B)", () => {
  /** Los botones "Eliminar" de las entradas (no el "Eliminar prospecto"). Orden: i2, luego i1. */
  function botonesEliminarInteraccion() {
    return screen.getAllByRole("button", { name: ETIQUETA_ELIMINAR_INTERACCION });
  }

  it("cada entrada trae enlace «Corregir» a su edición y botón «Eliminar»", () => {
    render(<FichaProspectoPage />);
    const corregir = screen.getAllByRole("link", { name: ETIQUETA_CORREGIR_INTERACCION });
    expect(corregir).toHaveLength(2);
    // Orden del servidor: i2 (más reciente) primero.
    expect(corregir[0].getAttribute("href")).toBe("/prospectos/p7/interacciones/i2/editar");
    expect(corregir[1].getAttribute("href")).toBe("/prospectos/p7/interacciones/i1/editar");
    expect(botonesEliminarInteraccion()).toHaveLength(2);
  });

  it("«Eliminar» abre la confirmación; cancelar cierra sin borrar", () => {
    render(<FichaProspectoPage />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const dialogo = within(screen.getByRole("dialog"));
    fireEvent.click(dialogo.getByRole("button", { name: ACCION_CANCELAR_ELIMINAR }));
    expect(eliminarInteraccionMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirmar borra i2: llama a interacciones.eliminar con su id, avisa, cierra y NO navega", async () => {
    eliminarInteraccionMock.mockResolvedValue(null);
    render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const dialogo = within(screen.getByRole("dialog"));
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION }));
    });
    expect(eliminarInteraccionMock).toHaveBeenCalledWith({ id: "i2" });
    expect(textosDeStatus()).toContain(TOAST_INTERACCION_ELIMINADA);
    expect(screen.queryByRole("dialog")).toBeNull();
    // Borrar una interacción no saca de la Ficha (a diferencia de borrar el prospecto).
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("rechazo NOT_FOUND (ya borrada) → ÉXITO: avisa y cierra, sin error", async () => {
    eliminarInteraccionMock.mockRejectedValue(new ConvexError({ code: "NOT_FOUND" }));
    render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const dialogo = within(screen.getByRole("dialog"));
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION }));
    });
    expect(textosDeStatus()).toContain(TOAST_INTERACCION_ELIMINADA);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("rechazo ConvexError (otro código) → diálogo con error y REINTENTO; no cierra ni avisa de borrado", async () => {
    eliminarInteraccionMock.mockRejectedValue(new ConvexError({ code: "UNAUTHENTICATED" }));
    render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const dialogo = within(screen.getByRole("dialog"));
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION }));
    });
    expect(screen.getByRole("alert").textContent).toBe(ERROR_ELIMINAR_INTERACCION);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION })).toHaveProperty("disabled", false);
    expect(textosDeStatus()).not.toContain(TOAST_INTERACCION_ELIMINADA);
  });

  it("rechazo de TRANSPORTE (posterior al commit) → INCIERTO: cierra el diálogo, avisa y NO ofrece reintento ciego", async () => {
    eliminarInteraccionMock.mockRejectedValue(new Error("network"));
    render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const dialogo = within(screen.getByRole("dialog"));
    await act(async () => {
      fireEvent.click(dialogo.getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION }));
    });
    // No se afirma que la entrada permanece ni se reintenta a ciegas: el diálogo se cierra…
    expect(screen.queryByRole("dialog")).toBeNull();
    // …y un aviso explícito lo dice (la lista viva reconciliará la verdad).
    expect(textosDeStatus()).toContain(TOAST_INTERACCION_INCIERTO);
    expect(eliminarInteraccionMock).toHaveBeenCalledTimes(1);
  });

  it("reconciliación: si la entrada desaparece de la lista con el diálogo abierto, el diálogo se cierra solo", () => {
    const { rerender } = render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]); // confirma i2
    expect(screen.getByRole("dialog")).toBeDefined();
    // La suscripción viva deja de traer i2 (borrada, aquí o desde otra pestaña).
    prepararHistorial({ results: [INTERACCIONES[1]] });
    rerender(<FichaProspectoPage />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("doble activación rápida: emite UNA sola mutation (guarda síncrona por ref)", async () => {
    let resolver: (v: null) => void = () => {};
    eliminarInteraccionMock.mockReturnValue(new Promise<null>((r) => (resolver = r)));
    render(<FichaProspectoPage />);
    fireEvent.click(botonesEliminarInteraccion()[0]);
    const confirmar = within(screen.getByRole("dialog")).getByRole("button", { name: ACCION_CONFIRMAR_ELIMINAR_INTERACCION });
    await act(async () => {
      fireEvent.click(confirmar);
      fireEvent.click(confirmar);
    });
    expect(eliminarInteraccionMock).toHaveBeenCalledTimes(1);
    await act(async () => resolver(null));
  });
});

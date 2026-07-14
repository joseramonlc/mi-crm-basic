// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { escribirFlash, consumirFlash } from "@/lib/flash";
import { formatearFechaEs } from "@/lib/etiquetas";
import {
  CARGANDO_HISTORIAL,
  CARGANDO_PROSPECTO,
  SIN_CONTACTO,
  SIN_NOTAS,
  SIN_SEGUIMIENTO,
  TITULO_FALLBACK,
  VACIO_DESCRIPCION,
} from "./textos";
import FichaProspectoPage from "./page";

// Sin proveedor Convex real (estrategia de JOS-22/M3): se mockean las dos
// suscripciones y la navegación, y se inspeccionan argumentos y render.
const { useQueryMock, usePaginatedQueryMock, loadMoreMock, replaceMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  usePaginatedQueryMock: vi.fn(),
  loadMoreMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock, usePaginatedQuery: usePaginatedQueryMock }));
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
  it("muestra etapa, canal con etiqueta de producto, contacto, cómo se conoció y fecha de alta", () => {
    render(<FichaProspectoPage />);
    expect(screen.getByText("Contactado")).toBeDefined();
    expect(screen.getByText("WhatsApp")).toBeDefined();
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

describe("tarjeta de seguimiento (P5, solo lectura)", () => {
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
    expect(raiz.style.getPropertyValue("--ficha-cta")).toBe("76px");
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

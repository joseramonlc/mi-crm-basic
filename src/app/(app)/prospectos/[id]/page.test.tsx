// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { escribirFlash, consumirFlash } from "@/lib/flash";
import FichaProspectoPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p7" }) }));

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(cleanup);

describe("stub de la ficha (cambios de M3, P9)", () => {
  it("ofrece la entrada a Registrar interacción del prospecto en contexto", () => {
    render(<FichaProspectoPage />);
    const enlace = screen.getByRole("link", { name: "Registrar interacción" });
    expect(enlace.getAttribute("href")).toBe("/prospectos/p7/interacciones/nueva");
  });

  it("muestra el toast del flash UNA sola vez (leer-y-borrar)", () => {
    escribirFlash("Interacción registrada, próximo contacto: lunes, 20 de julio");
    const { unmount } = render(<FichaProspectoPage />);

    expect(screen.getByRole("status").textContent).toContain("Interacción registrada");
    expect(consumirFlash()).toBeNull(); // ya consumido por la ficha

    unmount();
    render(<FichaProspectoPage />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sin flash pendiente no hay toast", () => {
    render(<FichaProspectoPage />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("Strict Mode (efecto doble): el toast sobrevive — el flash se consume UNA vez y no se pisa con null", () => {
    // Reproduce el bloqueo 1 del NO-GO: sin la guarda del ref, la segunda
    // pasada del efecto consume un flash ya vacío y sobrescribe el aviso.
    escribirFlash("Interacción registrada");
    render(
      <React.StrictMode>
        <FichaProspectoPage />
      </React.StrictMode>,
    );
    expect(screen.getByRole("status").textContent).toContain("Interacción registrada");
    expect(consumirFlash()).toBeNull();
  });
});

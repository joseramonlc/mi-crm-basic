import { describe, expect, it } from "vitest";
import { destinoAlSalir, ORIGEN_ACTIVIDAD, rutaRegistrarDesdeActividad, RUTA_ACTIVIDAD } from "./volver";

const ID = "j57abc123";

describe("destinoAlSalir", () => {
  it("vuelve a la Actividad Diaria cuando el origen es exactamente el esperado", () => {
    expect(destinoAlSalir(ORIGEN_ACTIVIDAD, ID)).toBe(RUTA_ACTIVIDAD);
  });

  it("sin origen mantiene el contrato de M3: vuelve a la Ficha", () => {
    expect(destinoAlSalir(null, ID)).toBe(`/prospectos/${ID}`);
    expect(destinoAlSalir(undefined, ID)).toBe(`/prospectos/${ID}`);
    expect(destinoAlSalir("", ID)).toBe(`/prospectos/${ID}`);
  });

  it("un origen inventado se ignora y no puede convertirse en el destino", () => {
    // El parámetro solo se compara; nunca se usa para construir la ruta. Cada
    // uno de estos valores sería una redirección abierta si se concatenara.
    for (const hostil of [
      "https://ejemplo.invalido",
      "//ejemplo.invalido",
      "/actividad/../../otra",
      "ACTIVIDAD",
      " actividad",
      "actividad ",
    ]) {
      expect(destinoAlSalir(hostil, ID)).toBe(`/prospectos/${ID}`);
    }
  });
});

describe("rutaRegistrarDesdeActividad", () => {
  it("apunta al formulario del prospecto marcando el origen", () => {
    expect(rutaRegistrarDesdeActividad(ID)).toBe(`/prospectos/${ID}/interacciones/nueva?volver=actividad`);
  });

  it("el destino de ida y el de vuelta son coherentes entre sí", () => {
    const url = new URL(rutaRegistrarDesdeActividad(ID), "https://crm.invalido");
    expect(destinoAlSalir(url.searchParams.get("volver"), ID)).toBe(RUTA_ACTIVIDAD);
  });
});

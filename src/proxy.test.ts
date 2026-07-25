// @vitest-environment edge-runtime
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

/**
 * El matcher de Next decide qué rutas llegan siquiera al middleware: lo que no
 * casa queda fuera de la protección de Clerk sin pasar por `auth.protect()`.
 * Estas pruebas fijan ese contrato sin red ni sesión — la decisión pública vs
 * protegida se verifica a mano (ver plan de JOS-66).
 */
function casaElMatcher(pathname: string) {
  return config.matcher.some((patron) => new RegExp(`^${patron}$`).test(pathname));
}

describe("proxy: alcance del matcher", () => {
  it.each(["/login", "/registro", "/recuperar", "/actividad", "/prospectos/p7", "/api/convex", "/__clerk/handshake"])(
    "%s entra en el middleware",
    (ruta) => {
      expect(casaElMatcher(ruta)).toBe(true);
    },
  );

  it.each(["/_next/static/chunk.js", "/brand/logo-mark.svg", "/favicon.ico"])(
    "%s queda fuera: estáticos y assets no pagan el coste del middleware",
    (ruta) => {
      expect(casaElMatcher(ruta)).toBe(false);
    },
  );
});

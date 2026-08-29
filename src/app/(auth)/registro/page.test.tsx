// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import RegistroPage from "./page";

// Basta con que `signUp` sea truthy y no haya sesión: el paso "datos" (Nombre,
// Email, Contraseña) se renderiza y no se envía nada. El registro no tiene toggle
// "Mostrar contraseña", así que la contraseña se comprueba con type="password".
const { useSignUpMock, useAuthMock, replaceMock } = vi.hoisted(() => ({
  useSignUpMock: vi.fn(),
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({
  useSignUp: () => useSignUpMock(),
  useAuth: () => useAuthMock(),
}));

/** Los tres atributos que PIDEN al navegador/teclado no autocapitalizar ni autocorregir lo tecleado
 *  (son hints: los navegadores compatibles los respetan, no lo garantizan en todos los SO/teclados). */
function assertEndurecido(input: HTMLElement) {
  expect(input.getAttribute("autocapitalize")).toBe("none");
  expect(input.getAttribute("autocorrect")).toBe("off");
  expect(input.getAttribute("spellcheck")).toBe("false");
}

beforeEach(() => {
  replaceMock.mockReset();
  useSignUpMock.mockReturnValue({ signUp: { password: vi.fn() }, fetchStatus: "idle" });
  useAuthMock.mockReturnValue({ isSignedIn: false });
});
afterEach(cleanup);

describe("RegistroPage — endurecimiento de inputs (JOS-176)", () => {
  it("email y contraseña desactivan autocapitalización, autocorrección y corrector", () => {
    render(<RegistroPage />);
    const email = screen.getByLabelText("Email");
    assertEndurecido(email);
    expect(email.getAttribute("inputmode")).toBe("email");
    expect(screen.getByLabelText("Contraseña").getAttribute("type")).toBe("password");
    assertEndurecido(screen.getByLabelText("Contraseña"));
  });

  it("el campo Nombre NO se endurece (un nombre propio debe capitalizarse)", () => {
    render(<RegistroPage />);
    expect(screen.getByLabelText("Nombre").getAttribute("autocapitalize")).toBeNull();
  });
});

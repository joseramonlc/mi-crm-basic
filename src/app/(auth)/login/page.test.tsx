// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LoginPage from "./page";

// La página lee la sesión y el flujo de sign-in de Clerk. Para este test de
// endurecimiento basta con que `signIn` sea truthy (el formulario se renderiza)
// y que no haya sesión abierta; no se envía nada.
const { useSignInMock, useAuthMock, replaceMock } = vi.hoisted(() => ({
  useSignInMock: vi.fn(),
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => useSignInMock(),
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
  useSignInMock.mockReturnValue({
    signIn: { password: vi.fn(), finalize: vi.fn(), status: "needs_first_factor" },
    fetchStatus: "idle",
  });
  useAuthMock.mockReturnValue({ isSignedIn: false });
});
afterEach(cleanup);

describe("LoginPage — endurecimiento de inputs (JOS-176)", () => {
  it("el email desactiva autocapitalización, autocorrección y corrector", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    assertEndurecido(email);
    expect(email.getAttribute("inputmode")).toBe("email");
  });

  it("la contraseña sigue endurecida al pulsar «Mostrar contraseña» (type=text)", () => {
    render(<LoginPage />);
    const pass = screen.getByLabelText("Contraseña");
    expect(pass.getAttribute("type")).toBe("password");
    assertEndurecido(pass);
    // El incidente ocurría con la contraseña VISIBLE: al revelarla el campo pasa
    // a type=text y es entonces cuando el teclado del móvil la alteraba.
    fireEvent.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(pass.getAttribute("type")).toBe("text");
    assertEndurecido(pass);
  });
});

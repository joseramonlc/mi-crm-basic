// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RecuperarPage from "./page";
import { MSG_CODIGO_INCORRECTO } from "@/lib/authErrores";

// La página lee la sesión y el flujo de reset de Clerk; en el test los métodos
// Future son spies y `status` es mutable (lo van moviendo verifyCode/submitPassword,
// igual que hace Clerk en real). El router expone `replace` como espía.
const { signInMock, useSignInMock, useAuthMock, replaceMock } = vi.hoisted(() => {
  const signInMock = {
    status: "needs_first_factor" as string,
    create: vi.fn(),
    resetPasswordEmailCode: {
      sendCode: vi.fn(),
      verifyCode: vi.fn(),
      submitPassword: vi.fn(),
    },
    finalize: vi.fn(),
  };
  return {
    signInMock,
    replaceMock: vi.fn(),
    useSignInMock: vi.fn(),
    useAuthMock: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => useSignInMock(),
  useAuth: () => useAuthMock(),
}));

const NEUTRO = "Si existe una cuenta con ese email, te habremos enviado un código nuevo.";
const SIN_RED = "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/** Error con la forma REAL de runtime (ClerkAPIResponseError): el code específico
 *  viaja anidado en errors[], y el superior es el genérico api_response_error. */
function apiError(code: string) {
  return { code: "api_response_error", errors: [{ code }] };
}

/** Envía el formulario visible (solo hay uno en pantalla en cada paso). */
function enviar(container: HTMLElement) {
  fireEvent.submit(container.querySelector("form")!);
}

/** Rellena el email y envía → deja la vista en el paso "codigo". */
async function irAPasoCodigo(container: HTMLElement, email = "ana@mail.com") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  enviar(container);
  await screen.findByText("Crea una contraseña nueva");
}

beforeEach(() => {
  signInMock.status = "needs_first_factor";
  signInMock.create.mockReset().mockResolvedValue({ error: null });
  signInMock.resetPasswordEmailCode.sendCode.mockReset().mockResolvedValue({ error: null });
  signInMock.resetPasswordEmailCode.verifyCode.mockReset().mockResolvedValue({ error: null });
  signInMock.resetPasswordEmailCode.submitPassword.mockReset().mockResolvedValue({ error: null });
  signInMock.finalize.mockReset().mockResolvedValue({ error: null });
  replaceMock.mockReset();
  useSignInMock.mockReturnValue({ signIn: signInMock, fetchStatus: "idle" });
  useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
});
afterEach(cleanup);

describe("RecuperarPage — envío del código", () => {
  it("email válido: llama create + sendCode y avanza al paso de código", async () => {
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container, "ana@mail.com");
    expect(signInMock.create).toHaveBeenCalledWith({ identifier: "ana@mail.com" });
    expect(signInMock.resetPasswordEmailCode.sendCode).toHaveBeenCalled();
  });

  it("guarda síncrona: dos submits en la misma tarea solo llaman create una vez", async () => {
    // create queda colgado para que el ref siga en true durante el segundo submit.
    let resolver!: () => void;
    signInMock.create.mockReturnValue(
      new Promise((r) => {
        resolver = () => r({ error: null });
      }),
    );
    const { container } = render(<RecuperarPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@mail.com" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(signInMock.create).toHaveBeenCalledTimes(1);
    resolver();
    await screen.findByText("Crea una contraseña nueva");
  });

  it("no enumeración (forma anidada real): si create devuelve form_identifier_not_found en errors[], avanza a código SIN alert", async () => {
    signInMock.create.mockResolvedValue({ error: apiError("form_identifier_not_found") });
    const { container } = render(<RecuperarPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "noexiste@mail.com" } });
    enviar(container);
    await screen.findByText("Crea una contraseña nueva");
    expect(signInMock.resetPasswordEmailCode.sendCode).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("no enumeración (forma plana): si sendCode devuelve form_identifier_not_found en el nivel superior, avanza a código SIN alert", async () => {
    signInMock.resetPasswordEmailCode.sendCode.mockResolvedValue({ error: { code: "form_identifier_not_found" } });
    const { container } = render(<RecuperarPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "x@mail.com" } });
    enviar(container);
    await screen.findByText("Crea una contraseña nueva");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("RecuperarPage — reenviar", () => {
  it("tras flujo neutral NO llama a Clerk y muestra el mismo aviso neutro", async () => {
    signInMock.create.mockResolvedValue({ error: { code: "form_identifier_not_found" } });
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container, "noexiste@mail.com");
    signInMock.resetPasswordEmailCode.sendCode.mockClear();

    fireEvent.click(screen.getByText("Reenviar código"));
    await screen.findByText(NEUTRO);
    expect(signInMock.resetPasswordEmailCode.sendCode).not.toHaveBeenCalled();
  });

  it("en flujo normal reenvía llamando a sendCode", async () => {
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container);
    signInMock.resetPasswordEmailCode.sendCode.mockClear();

    fireEvent.click(screen.getByText("Reenviar código"));
    await screen.findByText(NEUTRO);
    expect(signInMock.resetPasswordEmailCode.sendCode).toHaveBeenCalled();
  });
});

describe("RecuperarPage — cambio de contraseña", () => {
  it("verifica, cambia con signOutOfOtherSessions y finaliza, en ese orden", async () => {
    const orden: string[] = [];
    signInMock.resetPasswordEmailCode.verifyCode.mockImplementation(async () => {
      orden.push("verify");
      signInMock.status = "needs_new_password";
      return { error: null };
    });
    signInMock.resetPasswordEmailCode.submitPassword.mockImplementation(async () => {
      orden.push("submit");
      signInMock.status = "complete";
      return { error: null };
    });
    signInMock.finalize.mockImplementation(async () => {
      orden.push("finalize");
      return { error: null };
    });

    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container);
    fireEvent.change(screen.getByLabelText("Código de verificación"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "nuevaClave8" } });
    enviar(container);

    await waitFor(() => expect(signInMock.finalize).toHaveBeenCalled());
    expect(orden).toEqual(["verify", "submit", "finalize"]);
    expect(signInMock.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({
      password: "nuevaClave8",
      signOutOfOtherSessions: true,
    });
  });

  it("cuenta real + código incorrecto (forma anidada): muestra MSG_CODIGO_INCORRECTO y no llama a submitPassword ni finalize", async () => {
    signInMock.resetPasswordEmailCode.verifyCode.mockResolvedValue({ error: apiError("form_code_incorrect") });
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container);
    fireEvent.change(screen.getByLabelText("Código de verificación"), { target: { value: "000000" } });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "nuevaClave8" } });
    enviar(container);

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe(MSG_CODIGO_INCORRECTO);
    expect(signInMock.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
    expect(signInMock.finalize).not.toHaveBeenCalled();
  });

  it("anti-oracle: en flujo neutro NO se llama a Clerk y sale el MISMO mensaje que un código incorrecto real", async () => {
    // La cuenta no existe (create anidado form_identifier_not_found) → flujo neutro.
    // Al enviar el código, la página NO debe tocar Clerk y debe mostrar exactamente
    // MSG_CODIGO_INCORRECTO, idéntico al caso "cuenta real + código incorrecto", para
    // que un atacante no pueda distinguir por el mensaje si la cuenta existe.
    signInMock.create.mockResolvedValue({ error: apiError("form_identifier_not_found") });
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container, "noexiste@mail.com");
    fireEvent.change(screen.getByLabelText("Código de verificación"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "nuevaClave8" } });
    enviar(container);

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe(MSG_CODIGO_INCORRECTO);
    expect(signInMock.resetPasswordEmailCode.verifyCode).not.toHaveBeenCalled();
    expect(signInMock.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
  });
});

describe("RecuperarPage — robustez de red", () => {
  it("si el método rechaza (TypeError), muestra sin conexión", async () => {
    signInMock.create.mockRejectedValue(new TypeError("Failed to fetch"));
    const { container } = render(<RecuperarPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@mail.com" } });
    enviar(container);
    expect((await screen.findByRole("alert")).textContent).toBe(SIN_RED);
  });

  it("si el método devuelve { error: TypeError }, muestra sin conexión", async () => {
    signInMock.create.mockResolvedValue({ error: new TypeError("Failed to fetch") });
    const { container } = render(<RecuperarPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@mail.com" } });
    enviar(container);
    expect((await screen.findByRole("alert")).textContent).toBe(SIN_RED);
  });
});

describe("RecuperarPage — guard de sesión", () => {
  it("con sesión activa no renderiza el formulario y redirige a /actividad", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    render(<RecuperarPage />);
    expect(screen.queryByLabelText("Email")).toBeNull();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/actividad"));
  });

  it("mientras Clerk carga (isLoaded false) no renderiza el formulario ni redirige", () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: undefined });
    render(<RecuperarPage />);
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe("RecuperarPage — endurecimiento de inputs (JOS-176)", () => {
  /** Los tres atributos que PIDEN al navegador/teclado no autocapitalizar ni autocorregir lo tecleado
   *  (son hints: los navegadores compatibles los respetan, no lo garantizan en todos los SO/teclados). */
  function assertEndurecido(input: HTMLElement) {
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("spellcheck")).toBe("false");
  }

  it("el email desactiva autocapitalización, autocorrección y corrector", () => {
    render(<RecuperarPage />);
    const email = screen.getByLabelText("Email");
    assertEndurecido(email);
    expect(email.getAttribute("inputmode")).toBe("email");
  });

  it("la contraseña nueva sigue endurecida al pulsar «Mostrar contraseña» (type=text)", async () => {
    const { container } = render(<RecuperarPage />);
    await irAPasoCodigo(container);
    const pass = screen.getByLabelText("Contraseña nueva");
    expect(pass.getAttribute("type")).toBe("password");
    assertEndurecido(pass);
    // El incidente ocurría con la contraseña VISIBLE: al revelarla el campo pasa
    // a type=text y es entonces cuando el teclado del móvil la alteraba.
    fireEvent.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(pass.getAttribute("type")).toBe("text");
    assertEndurecido(pass);
  });
});

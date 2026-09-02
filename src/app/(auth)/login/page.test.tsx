// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import {
  MSG_COMPROBACION_SEGURIDAD,
  MSG_ESTADO_GENERICO,
  MSG_INTENTO_CADUCADO,
  MSG_NUEVA_CONTRASENA,
  MSG_SEGUNDO_FACTOR_ENLACE,
} from "@/lib/authEstados";

// La página lee la sesión y el flujo de sign-in de Clerk. Los métodos Future son
// spies y `status` es mutable (lo mueven password/verify*, igual que Clerk en
// real). `setActive` vive en el objeto Clerk, no en useSignIn, y LANZA en vez de
// devolver { error }: por eso es un mock aparte con mockRejectedValue.
const { signInMock, useSignInMock, useAuthMock, replaceMock, setActiveMock } = vi.hoisted(() => {
  const signInMock = {
    status: "complete" as string,
    supportedSecondFactors: [] as { strategy: string; safeIdentifier?: string }[],
    existingSession: undefined as { sessionId: string } | undefined,
    password: vi.fn(),
    finalize: vi.fn(),
    reset: vi.fn(),
    mfa: {
      sendEmailCode: vi.fn(),
      verifyEmailCode: vi.fn(),
      sendPhoneCode: vi.fn(),
      verifyPhoneCode: vi.fn(),
      verifyTOTP: vi.fn(),
      verifyBackupCode: vi.fn(),
    },
  };
  return {
    signInMock,
    replaceMock: vi.fn(),
    setActiveMock: vi.fn(),
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
  useClerk: () => ({ setActive: setActiveMock }),
}));

const SIN_RED = "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";
const GENERICO_ERROR = "No hemos podido completar la operación. Inténtalo de nuevo.";
const EMAIL_TAPADO = "j***@gmail.com";

/** Error con la forma REAL de runtime (ClerkAPIResponseError). */
function apiError(code: string) {
  return { code: "api_response_error", errors: [{ code }] };
}

/** Los tres atributos que PIDEN al navegador/teclado no autocapitalizar ni autocorregir lo tecleado
 *  (son hints: los navegadores compatibles los respetan, no lo garantizan en todos los SO/teclados). */
function assertEndurecido(input: HTMLElement) {
  expect(input.getAttribute("autocapitalize")).toBe("none");
  expect(input.getAttribute("autocorrect")).toBe("off");
  expect(input.getAttribute("spellcheck")).toBe("false");
}

function enviar(container: HTMLElement) {
  fireEvent.submit(container.querySelector("form")!);
}

/** Rellena credenciales y envía el formulario de acceso. */
function entrar(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@mail.com" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Secreta123" } });
  enviar(container);
}

/** Deja `signIn` pidiendo segundo factor con la estrategia indicada. */
function conSegundoFactor(strategy: string, safeIdentifier?: string, estado = "needs_second_factor") {
  signInMock.status = estado;
  signInMock.supportedSecondFactors = [{ strategy, safeIdentifier }];
}

beforeEach(() => {
  signInMock.status = "complete";
  signInMock.supportedSecondFactors = [];
  signInMock.existingSession = undefined;
  signInMock.password.mockReset().mockResolvedValue({ error: null });
  signInMock.finalize.mockReset().mockResolvedValue({ error: null });
  signInMock.reset.mockReset().mockResolvedValue({ error: null });
  for (const espia of Object.values(signInMock.mfa)) espia.mockReset().mockResolvedValue({ error: null });
  replaceMock.mockReset();
  setActiveMock.mockReset().mockResolvedValue(undefined);
  useSignInMock.mockReturnValue({ signIn: signInMock, fetchStatus: "idle" });
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

describe("LoginPage — el camino que ya funcionaba (JOS-184: no romperlo)", () => {
  it("contraseña aceptada y status complete → finalize()", async () => {
    const { container } = render(<LoginPage />);
    entrar(container);
    await waitFor(() => expect(signInMock.finalize).toHaveBeenCalled());
    expect(signInMock.password).toHaveBeenCalledWith({ identifier: "ana@mail.com", password: "Secreta123" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("contraseña incorrecta sigue diciendo «Email o contraseña incorrectos»", async () => {
    signInMock.password.mockResolvedValue({ error: apiError("form_password_incorrect") });
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain("Email o contraseña incorrectos.");
    // Un error de credenciales NO es un estado: no se enseña código de diagnóstico.
    expect(screen.queryByText(/Código de diagnóstico/)).toBeNull();
  });

  it("fallo de finalize() se muestra traducido", async () => {
    signInMock.finalize.mockResolvedValue({ error: apiError("too_many_requests") });
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain("Demasiados intentos.");
  });
});

describe("LoginPage — segundo factor por código", () => {
  it("needs_second_factor con email_code: envía el código y muestra la pantalla con el email tapado", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    expect(signInMock.mfa.sendEmailCode).toHaveBeenCalled();
    expect(screen.getByText(new RegExp(EMAIL_TAPADO.replace(/\*/g, "\\*")))).toBeDefined();
    expect(signInMock.finalize).not.toHaveBeenCalled();
  });

  it("needs_client_trust (dispositivo nuevo) lleva a la MISMA pantalla", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO, "needs_client_trust");
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    expect(signInMock.mfa.sendEmailCode).toHaveBeenCalled();
  });

  it.each([
    ["email_code", "verifyEmailCode", "sendEmailCode"],
    ["phone_code", "verifyPhoneCode", "sendPhoneCode"],
    ["totp", "verifyTOTP", null],
    ["backup_code", "verifyBackupCode", null],
  ] as const)("%s verifica con el método correcto y termina en finalize()", async (strategy, verificador, enviador) => {
    conSegundoFactor(strategy, strategy === "phone_code" ? "••• ••• 123" : EMAIL_TAPADO);
    // Clerk mueve el status al verificar, igual que en real.
    signInMock.mfa[verificador].mockImplementation(async () => {
      signInMock.status = "complete";
      return { error: null };
    });
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    if (enviador) expect(signInMock.mfa[enviador]).toHaveBeenCalled();
    else {
      // TOTP y códigos de recuperación no envían nada: no se llama a ningún envío.
      expect(signInMock.mfa.sendEmailCode).not.toHaveBeenCalled();
      expect(signInMock.mfa.sendPhoneCode).not.toHaveBeenCalled();
    }
    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "123456" } });
    enviar(container);
    await waitFor(() => expect(signInMock.mfa[verificador]).toHaveBeenCalledWith({ code: "123456" }));
    await waitFor(() => expect(signInMock.finalize).toHaveBeenCalled());
  });

  it("el copy del SMS no habla de email, y solo email/SMS ofrecen reenviar", async () => {
    conSegundoFactor("phone_code", "••• ••• 123");
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText(/SMS/);
    expect(screen.getByRole("button", { name: /reenviar código/i })).toBeDefined();
    cleanup();

    signInMock.mfa.sendPhoneCode.mockClear();
    conSegundoFactor("totp");
    const segunda = render(<LoginPage />);
    entrar(segunda.container);
    await screen.findByText(/aplicación de autenticación/);
    expect(screen.queryByRole("button", { name: /reenviar código/i })).toBeNull();
  });

  it("el campo del código de RECUPERACIÓN no fuerza el teclado numérico", async () => {
    conSegundoFactor("backup_code");
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText(/códigos de recuperación/);
    const campo = screen.getByLabelText("Código de recuperación");
    // Pueden llevar letras: con inputmode=numeric el móvil no dejaría teclearlas.
    expect(campo.getAttribute("inputmode")).toBe("text");
    expect(campo.getAttribute("autocomplete")).toBe("off");
  });

  it("el campo del código por email sí pide teclado numérico y autorrelleno", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    const campo = screen.getByLabelText("Código de verificación");
    expect(campo.getAttribute("inputmode")).toBe("numeric");
    expect(campo.getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("reenviar vuelve a pedir el código y avisa", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    fireEvent.click(screen.getByRole("button", { name: /reenviar código/i }));
    expect((await screen.findByRole("status")).textContent).toContain("Te hemos enviado un código nuevo.");
    expect(signInMock.mfa.sendEmailCode).toHaveBeenCalledTimes(2);
  });

  it("si falla el ENVÍO del código no se avanza de pantalla", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    signInMock.mfa.sendEmailCode.mockResolvedValue({ error: apiError("too_many_requests") });
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain("Demasiados intentos.");
    expect(screen.queryByText("Confirma que eres tú")).toBeNull();
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_second_factor");
  });

  it("si falla la VERIFICACIÓN el usuario se queda en la pantalla del código", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    signInMock.mfa.verifyEmailCode.mockResolvedValue({ error: apiError("form_code_incorrect") });
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "000000" } });
    enviar(container);
    expect((await screen.findByRole("alert")).textContent).toContain("El código no es correcto.");
    expect(screen.getByText("Confirma que eres tú")).toBeDefined();
    expect(signInMock.finalize).not.toHaveBeenCalled();
  });

  it("verificación correcta pero status que no es complete → mensaje con código, sin finalize", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    signInMock.mfa.verifyEmailCode.mockImplementation(async () => {
      signInMock.status = "needs_protect_check";
      return { error: null };
    });
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: "123456" } });
    enviar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_COMPROBACION_SEGURIDAD);
    expect(signInMock.finalize).not.toHaveBeenCalled();
  });

  it("SOLO email_link: lo dice claramente y NO intenta enviar un código", async () => {
    conSegundoFactor("email_link", EMAIL_TAPADO);
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_SEGUNDO_FACTOR_ENLACE);
    // El bloqueante nº2 de la auditoría: la red de seguridad NO puede dispararse aquí.
    expect(signInMock.mfa.sendEmailCode).not.toHaveBeenCalled();
    expect(signInMock.mfa.sendPhoneCode).not.toHaveBeenCalled();
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_second_factor · email_link");
    expect(screen.queryByText("Confirma que eres tú")).toBeNull();
  });

  it("lista de factores vacía: red de seguridad, se intenta el código por email", async () => {
    signInMock.status = "needs_second_factor";
    signInMock.supportedSecondFactors = [];
    const { container } = render(<LoginPage />);
    entrar(container);
    await screen.findByText("Confirma que eres tú");
    expect(signInMock.mfa.sendEmailCode).toHaveBeenCalled();
    // Sin safeIdentifier el texto no puede nombrar la cuenta, pero sigue teniendo sentido.
    expect(screen.getByText(/código a tu correo/)).toBeDefined();
  });
});

describe("LoginPage — los demás estados, sin callejones sin salida", () => {
  it("needs_new_password manda a «¿Olvidaste tu contraseña?», no a reintentar", async () => {
    signInMock.status = "needs_new_password";
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_NUEVA_CONTRASENA);
    expect((screen.getByRole("link", { name: /olvidaste tu contraseña/i })).getAttribute("href")).toBe("/recuperar");
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_new_password");
  });

  it("needs_protect_check muestra el mensaje honesto con su código", async () => {
    signInMock.status = "needs_protect_check";
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_COMPROBACION_SEGURIDAD);
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_protect_check");
  });

  it("needs_first_factor reinicia el intento y pide credenciales otra vez", async () => {
    signInMock.status = "needs_first_factor";
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_INTENTO_CADUCADO);
    expect(signInMock.reset).toHaveBeenCalled();
  });

  it("si reset() devuelve error, se muestra ese error traducido (contrato uniforme)", async () => {
    signInMock.status = "needs_identifier";
    signInMock.reset.mockResolvedValue({ error: apiError("too_many_requests") });
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain("Demasiados intentos.");
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_identifier");
  });

  it("un estado desconocido cae en el genérico PERO enseña su código", async () => {
    signInMock.status = "needs_algo_nuevo_de_clerk";
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(MSG_ESTADO_GENERICO);
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("needs_algo_nuevo_de_clerk");
  });
});

describe("LoginPage — sesión ya existente en este dispositivo", () => {
  it("ACTIVA la sesión con setActive (no navega sin activarla)", async () => {
    signInMock.existingSession = { sessionId: "sess_123" };
    signInMock.status = "needs_second_factor"; // se ignora: existingSession manda
    const { container } = render(<LoginPage />);
    entrar(container);
    await waitFor(() =>
      expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_123", redirectUrl: "/actividad" }),
    );
    expect(signInMock.mfa.sendEmailCode).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si setActive LANZA, se muestra el error (no se queda mudo)", async () => {
    signInMock.existingSession = { sessionId: "sess_123" };
    // setActive devuelve Promise<void> y lanza: no sigue el patrón { error }.
    setActiveMock.mockRejectedValue(new Error("boom"));
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(GENERICO_ERROR);
    expect((screen.getByText(/Código de diagnóstico/)).textContent).toContain("existing_session");
  });
});

describe("LoginPage — concurrencia y red", () => {
  it("guarda síncrona: dos submits en la misma tarea solo llaman password una vez", async () => {
    let resolver!: () => void;
    signInMock.password.mockReturnValue(
      new Promise((r) => {
        resolver = () => r({ error: null });
      }),
    );
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Secreta123" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(signInMock.password).toHaveBeenCalledTimes(1);
    resolver();
    await waitFor(() => expect(signInMock.finalize).toHaveBeenCalled());
  });

  it("un fallo de red se traduce a «sin conexión» y la guarda queda liberada", async () => {
    // El TypeError de fetch RECHAZA la promesa: sin try/catch se perdería.
    signInMock.password.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(SIN_RED);
    // La guarda se liberó en el finally: un segundo intento sí sale.
    enviar(container);
    await waitFor(() => expect(signInMock.password).toHaveBeenCalledTimes(2));
  });

  it("un rechazo de red durante el segundo factor también se traduce", async () => {
    conSegundoFactor("email_code", EMAIL_TAPADO);
    signInMock.mfa.sendEmailCode.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { container } = render(<LoginPage />);
    entrar(container);
    expect((await screen.findByRole("alert")).textContent).toContain(SIN_RED);
  });
});

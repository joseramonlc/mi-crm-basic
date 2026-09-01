/**
 * Enlaces de contacto (JOS-83): abrir WhatsApp o el gestor de correo DEL PROPIO
 * USUARIO con el destinatario ya puesto. El CRM no envía nada por su cuenta
 * (decisión de producto de la Mejora #9); esto es un enlace, no una integración.
 *
 * Todo son funciones puras: no tocan el DOM, ni la red, ni el backend.
 *
 * La regla que gobierna el fichero: **el teléfono y el email del prospecto son
 * datos NO CONFIABLES en el punto de uso**. `EMAIL_RE` (convex/lib/validacion.ts)
 * acepta `?`, `#`, `&` y `%`, y el campo `telefono` es de formato libre. Endurecer
 * esa validación sería otra issue; aquí la frontera es la construcción del enlace,
 * y se cierra en dos direcciones:
 *
 * 1. **Direccionamiento** (a quién se escribe) → se valida y se **rechaza**
 *    devolviendo `null`, para que la pantalla desactive el botón. Nunca se
 *    construye un enlace a medias.
 * 2. **Contenido** (asunto, cuerpo, texto) → se **sanea**, no se rechaza.
 *
 * Y una invariante transversal: **ninguna de las tres funciones exportadas puede
 * lanzar**, sea cual sea la entrada. Renderizar la Ficha no debe reventar por un
 * dato viejo o escrito a mano.
 */

const ORIGEN_WHATSAPP = "https://wa.me/";

/**
 * E.164, el formato que exige `wa.me`: primer dígito 1–9 y 8–15 dígitos en total.
 * El "primer dígito 1–9" no es cosmético: un 0 inicial (p. ej. `+00 12345678`,
 * que resuelve a `0012345678`) es E.164 inválido y generaría un enlace roto pero
 * de aspecto habilitado.
 */
const E164 = /^[1-9]\d{7,14}$/;

/** Separadores de formato que se toleran al escribir un teléfono a mano. */
const SEPARADORES = /[ \-().]/g;

/** Lo que puede quedar tras quitarlos: dígitos, con un único `+` INICIAL opcional. */
const SOLO_DIGITOS = /^\+?\d+$/;

/**
 * Caracteres de control, incluidos CR y LF. En el destinatario de un `mailto:`
 * son el vector clásico de inyección de cabeceras, así que ahí se rechazan.
 * Sin bandera `g`: un regex global usado con `.test()` arrastra `lastIndex` y
 * devuelve resultados alternos entre llamadas.
 */
const CONTROL = /[\u0000-\u001F\u007F]/;

const PREFIJO_ES = "34";
const LONGITUD_NACIONAL_ES = 9;

/** U+FFFD, el reemplazo estándar para un surrogate suelto. */
const REEMPLAZO = "\uFFFD";

/**
 * Sustituye a mano los *surrogates* UTF-16 sueltos por U+FFFD. Es la rama de
 * respaldo de `bienFormado` cuando el runtime no trae `String.prototype.toWellFormed`.
 *
 * Se recorre a mano y NO con una expresión regular con `lookbehind`: el lookbehind
 * es ES2018 y en un navegador que no lo soporte el fallo sería un `SyntaxError`
 * **al cargar el módulo** —es decir, la Ficha entera en blanco—, que es peor que
 * el problema que evita. Un bucle sobre unidades de código funciona en cualquier parte.
 *
 * Un par válido (un emoji, por ejemplo) se copia intacto: solo caen los sueltos.
 */
function sustituirSurrogatesSueltos(valor: string): string {
  let salida = "";
  for (let i = 0; i < valor.length; i += 1) {
    const codigo = valor.charCodeAt(i);
    if (codigo >= 0xd800 && codigo <= 0xdbff) {
      // Surrogate alto: solo es legítimo si le sigue uno bajo.
      const siguiente = valor.charCodeAt(i + 1); // NaN al final: las comparaciones fallan y cae al reemplazo.
      if (siguiente >= 0xdc00 && siguiente <= 0xdfff) {
        salida += valor[i] + valor[i + 1];
        i += 1;
        continue;
      }
      salida += REEMPLAZO;
      continue;
    }
    if (codigo >= 0xdc00 && codigo <= 0xdfff) {
      // Surrogate bajo suelto: los que formaban par ya se consumieron arriba.
      salida += REEMPLAZO;
      continue;
    }
    salida += valor[i];
  }
  return salida;
}

/**
 * `valor` sin surrogates UTF-16 sueltos. **Detecta** `toWellFormed` (ES2024) y solo
 * lo llama si existe; si no, usa la sustitución manual. Nunca invoca un método
 * ausente, así que no puede lanzar `TypeError` en un navegador soportado sin ES2024.
 */
function bienFormado(valor: string): string {
  const metodo = (valor as { toWellFormed?: () => string }).toWellFormed;
  if (typeof metodo === "function") {
    try {
      return metodo.call(valor);
    } catch {
      return sustituirSurrogatesSueltos(valor);
    }
  }
  return sustituirSurrogatesSueltos(valor);
}

/** ¿`valor` está ya bien formado? Se apoya solo en `bienFormado`, nunca en ES2024 a pelo. */
function esBienFormado(valor: string): boolean {
  return valor === bienFormado(valor);
}

/**
 * Codificación segura de un componente de URL. `encodeURIComponent` **lanza
 * `URIError`** ante un surrogate suelto, así que primero se sanea y además se
 * envuelve en `try/catch`: en el caso imposible devuelve cadena vacía, nunca lanza.
 */
function codificarComponente(valor: string): string {
  try {
    return encodeURIComponent(bienFormado(valor));
  } catch {
    return "";
  }
}

/**
 * Teléfono libre → dígitos E.164 sin `+`, que es lo que espera `wa.me`. `null` si
 * no se puede garantizar que el enlace resultante sea correcto.
 *
 * Se **rechaza**, no se «limpia a la fuerza»: borrar los caracteres raros de
 * `600abc111` daría `600111`, un número que el usuario nunca escribió y al que
 * se acabaría escribiendo a un desconocido.
 */
export function normalizarTelefonoES(raw: string | undefined): string | null {
  if (raw === undefined) return null;

  const limpio = raw.trim().replace(SEPARADORES, "");
  if (limpio === "") return null;
  if (!SOLO_DIGITOS.test(limpio)) return null;

  let digitos: string;
  if (limpio.startsWith("+")) {
    digitos = limpio.slice(1);
  } else if (limpio.startsWith("00")) {
    digitos = limpio.slice(2);
  } else {
    // Sin prefijo = nacional: en España son exactamente 9 dígitos. Cualquier
    // otra longitud es ambigua (¿le falta el prefijo?, ¿sobra un dígito?) y no
    // se adivina.
    if (limpio.length !== LONGITUD_NACIONAL_ES) return null;
    digitos = PREFIJO_ES + limpio;
  }

  return E164.test(digitos) ? digitos : null;
}

/**
 * Enlace *Click to Chat* de WhatsApp, o `null` si `telefono` no es E.164.
 *
 * **Vuelve a validar** aunque `normalizarTelefonoES` ya garantice el formato: así
 * no confía en que el llamante haya normalizado (una integración futura podría no
 * hacerlo), y la garantía deja de ser una precondición que TypeScript no sabe
 * representar. Con dígitos puros, `wa.me/<digitos>` no admite inyección.
 *
 * `texto` queda listo para JOS-36; hoy la Ficha llama sin él y WhatsApp abre el
 * chat con el mensaje vacío.
 */
export function enlaceWhatsApp(telefono: string, texto?: string): string | null {
  if (!E164.test(telefono)) return null;
  const base = `${ORIGEN_WHATSAPP}${telefono}`;
  return texto === undefined ? base : `${base}?text=${codificarComponente(texto)}`;
}

/**
 * Enlace `mailto:`, o `null` si el destinatario no se puede serializar con garantías.
 *
 * **Destinatario — se falla en cerrado.** Un email con un surrogate suelto o con
 * caracteres de control es una dirección basura: se devuelve `null` y la pantalla
 * desactiva el botón, en vez de fabricar un `href` roto.
 *
 * Si es válido, se codifica **entero**. Eso convierte `?`, `#`, `&`, `%` y `@` en
 * `%xx`, así que un email como `ana@ejemplo.com?subject=Pwned&cc=malo@x.com` queda
 * como UN único destinatario y no puede inyectar parámetros ni un fragmento. Los
 * clientes de correo aceptan la forma codificada (`ana%40ejemplo.com`).
 *
 * **Asunto y cuerpo** son contenido, no direccionamiento: se sanean en vez de
 * rechazarse. Se codifican con el mismo helper y NO con `URLSearchParams`, que
 * codifica el espacio como `+` y algunos clientes lo muestran literal.
 */
export function enlaceEmail(email: string, asunto?: string, cuerpo?: string): string | null {
  if (email.trim() === "") return null;
  if (!esBienFormado(email)) return null;
  if (CONTROL.test(email)) return null;

  const base = `mailto:${codificarComponente(email)}`;

  const params: string[] = [];
  if (asunto !== undefined) params.push(`subject=${codificarComponente(asunto)}`);
  if (cuerpo !== undefined) params.push(`body=${codificarComponente(cuerpo)}`);

  return params.length === 0 ? base : `${base}?${params.join("&")}`;
}

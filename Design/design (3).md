# Design System — Evolución Líder · CRM Networker (v2.0)

> Sistema de diseño **mobile-first** para gestionar prospectos y hacer crecer una red comercial. Documento consolidado que refleja el sistema construido (tokens, componentes, UI kit y templates). Sustituye a la spec v1.0.

- **Marca:** Evolución Líder · **Producto:** CRM Networker · **Dominio:** evolucionlider.com
- **Uso:** CRM personal de un solo usuario — una persona gestionando su propio pipeline de candidatos.
- **Idioma:** Español (España), tono informal *tú*.
- **Personalidad:** profesional pero accesible · orientado a la acción · limpio y sin fricción · fiable.

---

## 1. Fundamentos de contenido (voz y tono)

- **Persona:** siempre *tú*, nunca *usted*. Directo, cálido, profesional. La app habla como tu asistente: *"Tienes 3 tareas hoy"*, *"Llama a María antes del viernes"*.
- **Voz:** primero la acción. Botones y tareas empiezan con verbo en imperativo — *"Añadir prospecto"*, *"Guardar"*, *"Registrar interacción"*, *"Llamar"*. La carga usa gerundio — *"Guardando…"*.
- **Mayúsculas:** sentence case en todo — etiquetas, botones, títulos. La única excepción es el token `Label` (versalitas con tracking) para labels de campo / eyebrows de sección (ej. *ETAPA*).
- **Longitud:** conciso. Los metadatos de tarjeta son fragmentarios — *"Última llamada · hace 2 días"*. Los estados vacíos son un título corto + una frase + un CTA.
- **Números y fechas:** formato español (`1.450 €`, `hace 2 días`, `Lunes, 29 de junio`). Cifras con figuras tabulares para que alineen en columnas.
- **Sin emoji.** La iconografía carga el significado visual. Sin signos de exclamación de más, sin hype.
- **Vocabulario de dominio:** *Prospecto*, *Pipeline*, *Etapa*, *Ficha*, *Interacción*, *Incorporado*. Etapas en orden de flujo: Nuevo → Contactado → Presentación realizada → En valoración → Incorporado → Descartado.

---

## 2. Fundamentos visuales

### Color
Un solo color de acción — **verde** (`#16A34A`, "trust green"). Señala toda acción primaria y el estado activo/positivo. El violeta (`#7C3AED`) es un acento secundario raro (etapa "Presentación realizada"). Todo lo demás es **Slate** neutro. Sin degradados, sin color decorativo.

**Primary · Green**
```
50 #ECFDF3 · 100 #D1FADF · 200 #A6F4C5 · 300 #6CE9A6 · 400 #32D583
500 #16A34A (base) · 600 #15803D · 700 #166534 · 800 #14532D · 900 #052E16
```
**Neutrals · Slate**
```
white #FFFFFF · 50 #F8FAFC · 100 #F1F5F9 · 200 #E2E8F0 · 300 #CBD5E1
400 #94A3B8 · 500 #64748B · 600 #475569 · 700 #334155 · 800 #1E293B · 900 #0F172A · black #020617
```
**Semánticos:** success `#16A34A` · warning `#F59E0B` · error `#EF4444` · info `#3B82F6` · accent `#7C3AED`.

**Etapas del pipeline** (bg / text / dot):
```
Nuevo        #EEF2F7 / #475569 / #64748B
Contactado   #EEF2FF / #4338CA / #4F46E5
Presentación #F5F3FF / #6D28D9 / #7C3AED
Valoración   #FFF7ED / #C2410C / #EA580C
Incorporado  #ECFDF3 / #15803D / #16A34A
Descartado   #F1F5F9 / #64748B / #94A3B8
```
**Prioridad:** Alta (rojo) · Media (ámbar) · Baja (verde).

**Alias semánticos:** `--surface-app` slate-100 · `--surface-card` white · `--text-strong` #0F172A · `--text-body` #475569 · `--action` #16A34A (hover #15803D, pressed #166534).

### Tipografía
**Inter** (Google Fonts), pesos 400/500/600/700. Escala:
```
Display 32/700  H1 28/700  H2 22/600  H3 18/600
Body Large 17/400  Body 15/400  Body Small 13/400
Label 13/600 (versalitas)  Caption 12/400
```
Tracking ajustado en titulares (−0.02 a −0.01em). Figuras tabulares (`tnum`) en KPIs, importes y tablas.

### Espaciado, radios, elevación
- **Espaciado:** base 4px → `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40, `12`=48, `16`=64, `20`=80, `24`=96.
- **Radios:** sm 4 · md 8 (botones/inputs/cards) · lg 12 (modales/sheets) · card 14 (tarjeta de prospecto) · xl 16 · full (pills, FAB, avatares).
- **Elevación:** 0 plano (superficies primarias) · 1 cards en reposo · 2 dropdowns/elevado · 3 modales y bottom sheets. Sombras frías slate, nunca negro.
- **Bordes / foco:** 1px `--border-default` #E2E8F0 (cards/divisores), inputs `--border-strong` #CBD5E1. Anillo de foco = `0 0 0 3px` del color de foco al 15% (verde) / error al 15% (rojo).

### Movimiento e interacción
- **Animación:** sutil y rápida, sin rebote. Transiciones 120–240ms en `cubic-bezier(0.2,0,0,1)`. Fades para overlays/dropdowns, slide-up para el bottom sheet, transición de color en hover/active. Spinner en botón de carga. Nada decorativo ni en bucle.
- **Hover:** primary → verde más oscuro (#15803D); secondary → relleno slate-50; ghost → relleno verde-50. **Press:** un paso más oscuro (primary #166534); sin escalado.
- **Transparencia/blur:** solo el scrim de modal/sheet (`rgba(15,23,42,.45)`). Sin glassmorphism.

### Layout (mobile)
Header 56px (root sin back; detalle/form con flecha atrás). Tab bar 60px, blanca, borde superior sutil, 3 destinos raíz (Inicio · Prospectos · Resumen) — sin pestaña de perfil. Tab activo = color primario + label en bold + indicador superior de 3px. FAB `+` 56px verde circular (shadow-2) abajo a la derecha, presente solo en las 3 pantallas raíz, ausente en Ficha/formularios. Desktop cambia la tab bar por sidebar de 224px; sin FAB (botón "Añadir prospecto" en su lugar).

---

## 3. Iconografía

- **Librería:** **Lucide Icons** (open source), desde CDN `https://unpkg.com/lucide@latest`.
- **Estilo:** trazo 2px, remates redondos, `currentColor`. Tamaño base 24px; 16px en contextos compactos.
- **Set del sistema (29):** home, users, bar-chart-3, phone, message-circle, mail, instagram, plus, square-pen, save, arrow-left, filter, menu, calendar, clock, chevron-right, check, x, user, sticky-note, layers, alert-circle, info, star, trash-2, more-vertical, eye, eye-off, log-out. Canales: phone→`phone`, WhatsApp→`message-circle`, Instagram→`instagram`, email→`mail`.
- **Sin emoji ni glifos unicode como iconos.** Logo (`assets/logo-mark.svg`) = barras ascendentes (crecimiento) en cuadrado verde redondeado; `logo-lockup.svg` añade el wordmark.

---

## 4. Componentes (`window.EvoluciNLDerDesignSystem_8c407a`)

- **core/** — `Button` (primary/secondary/destructive/ghost; sm/md/lg; loading, iconLeft/Right), `Avatar` (iniciales, dot de prioridad opcional), `Card` (elevación 0–3), `Icon` (Lucide por nombre), `Divider` (separador 1px, horizontal/vertical).
- **feedback/** — `Badge` + `CountBadge`, `StageBadge` (6 etapas), `PriorityBadge` (pill o dot).
- **forms/** — `Input` (label, foco verde, error, multiline), `Select` (dropdown con check en fila verde), `Switch`.
- **prospects/** — `ProspectCard` (unidad principal de lista: avatar, nombre, dot de prioridad, etapa, meta de canal + acciones Llamar/WhatsApp/Nota), `FilterChip` (pill de filtro), `EmptyState`.

---

## 5. UI kits

**Móvil — `ui_kits/crm-networker/`.** Recreación móvil interactiva. Pantallas: **Actividad Diaria** (Inicio), **Pipeline** (Prospectos, con filtros), **Resumen** (embudo por etapa + conversión), **Ficha del Prospecto** (cabecera + acciones rápidas + historial), **Nuevo Prospecto** (bottom sheet). **Menú de cuenta:** avatar de iniciales (28px) en la esquina superior derecha del header de las 3 pantallas raíz → bottom sheet (`--shadow-3`, `--radius-lg`) con nombre/email y botón "Cerrar sesión" (icono `log-out`, color error). Entrada `index.html`; piezas en `shell.jsx` + `screens.jsx`. Incluye también `login.html` y `registro.html` como demos.

**Escritorio — `ui_kits/crm-networker-desktop/`.** Sidebar fijo de **224px** (logo arriba · botón **"Añadir prospecto"** en lugar del FAB · navegación de los 3 destinos con ítem activo en verde-50 · bloque avatar+nombre abajo, interactivo → **popover de cuenta** con "Cerrar sesión"). Contenido fluido con grid responsivo de tarjetas de prospecto, **Ficha** como panel lateral derecho (drawer) y **Nuevo prospecto** como modal centrado. Entrada `index.html`; app en `app.jsx`.

**Prototipo navegable unificado — `ui_kits/crm-networker/prototype.html`.** Conecta Login → Registro → app completa (con datos reales, no el estado vacío), con un selector fijo Móvil/Escritorio (reutiliza `FilterChip`) que alterna toda la superficie conservando la sesión, y "Cerrar sesión" (desde el menú de cuenta de cualquiera de las dos plataformas) devuelve al Login. Es el archivo a compartir para un recorrido de punta a punta.

---

## 6. Templates (puntos de arranque reutilizables) — `templates/`

Cada template es un `.dc.html` que carga el sistema con una sola línea (`ds-base.js`).

- **`templates/login/`** — pantalla **Login**: email, contraseña con mostrar/ocultar, estado de error, enlaces a recuperación y registro.
- **`templates/registro/`** — pantalla **Registro**: nombre, email, contraseña con validación por campo; al completar → Actividad Diaria vacía.
- **`templates/crm-app/`** — **App CRM Networker** completa e interactiva.

**Cómo usarlos desde otro proyecto:** tras enganchar este sistema de diseño, edita la única línea `base` del `ds-base.js` del template para que apunte a la carpeta del sistema (p. ej. `_ds/<carpeta>` en la raíz, o `../_ds/<carpeta>` un nivel más abajo). Nada más. Los iconos se cargan desde Lucide (CDN) en el `<helmet>`.

---

## 7. Manifiesto de archivos

- `styles.css` — entrada global (único archivo que enlazan los consumidores). Solo `@import`.
- `tokens/` — colors, typography, spacing, radius, shadows, borders, animation, fonts.
- `assets/` — logo-mark.svg, logo-lockup.svg.
- `guidelines/` — cards de especímenes (Colores, Tipo, Espaciado, Marca).
- `components/`, `ui_kits/`, `templates/` — ver secciones 4–6.
- `readme.md` — documentación viva · `SKILL.md` — skill descargable para Claude Code.
- `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` — generados automáticamente, no editar a mano.

---

*Nota de sustitución de fuente: Inter se carga vía Google Fonts (no hay binarios .woff en el repo). Si quieres empaquetar las fuentes para uso offline, aporta los archivos y se añaden reglas `@font-face`.*

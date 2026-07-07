# Design System — Evolución Líder · CRM Networker

> Sistema de diseño **mobile-first** para gestionar prospectos y hacer crecer una red comercial.
> Profesional pero accesible · orientado a la acción · limpio y sin fricción · confiable.

- **Marca:** Evolución Líder
- **Producto:** CRM Networker
- **Dominio:** evolucionlider.com
- **Referencias:** Brevo (verde de confianza), Attio y Linear (base neutra y limpia)
- **Filosofía:** 375px es el sistema base; el escritorio es una expansión, no un sistema paralelo
- **Versión:** 1.0

---

## 1 · Color

### Primario · Verde (acción y confianza)

| Token | HEX |
|---|---|
| `--color-primary-50` | `#ECFDF3` |
| `--color-primary-100` | `#D1FADF` |
| `--color-primary-200` | `#A6F4C5` |
| `--color-primary-300` | `#6CE9A6` |
| `--color-primary-400` | `#32D583` |
| `--color-primary-500` | `#16A34A` ← base |
| `--color-primary-600` | `#15803D` |
| `--color-primary-700` | `#166534` |
| `--color-primary-800` | `#14532D` |
| `--color-primary-900` | `#052E16` |

### Acento · Violeta (highlights secundarios)

| Token | HEX |
|---|---|
| `--color-accent-50` | `#F5F3FF` |
| `--color-accent-100` | `#EDE9FE` |
| `--color-accent-500` | `#7C3AED` ← base |
| `--color-accent-700` | `#6D28D9` |

### Neutros · Slate

| Token | HEX |
|---|---|
| `--color-neutral-white` | `#FFFFFF` |
| `--color-neutral-50` | `#F8FAFC` |
| `--color-neutral-100` | `#F1F5F9` |
| `--color-neutral-200` | `#E2E8F0` |
| `--color-neutral-300` | `#CBD5E1` |
| `--color-neutral-400` | `#94A3B8` |
| `--color-neutral-500` | `#64748B` |
| `--color-neutral-600` | `#475569` |
| `--color-neutral-700` | `#334155` |
| `--color-neutral-800` | `#1E293B` |
| `--color-neutral-900` | `#0F172A` |
| `--color-neutral-black` | `#020617` |

### Semánticos

| Token | Base | Fondo | Texto |
|---|---|---|---|
| `--color-success` | `#16A34A` | `#ECFDF3` | `#15803D` |
| `--color-warning` | `#F59E0B` | `#FFFBEB` | `#B45309` |
| `--color-error` | `#EF4444` | `#FEF2F2` | `#DC2626` |
| `--color-info` | `#3B82F6` | `#EFF6FF` | `#2563EB` |

### Etapas del pipeline (6)

| Etapa | Token | Fondo | Texto | Punto |
|---|---|---|---|---|
| Nuevo | `--color-stage-new` | `#EEF2F7` | `#475569` | `#64748B` |
| Contactado | `--color-stage-contacted` | `#EEF2FF` | `#4338CA` | `#4F46E5` |
| Presentación realizada | `--color-stage-presented` | `#F5F3FF` | `#6D28D9` | `#7C3AED` |
| En valoración | `--color-stage-evaluating` | `#FFF7ED` | `#C2410C` | `#EA580C` |
| Incorporado | `--color-stage-joined` | `#ECFDF3` | `#15803D` | `#16A34A` |
| Descartado | `--color-stage-discarded` | `#F1F5F9` | `#64748B` | `#94A3B8` |

Flujo: **Nuevo → Contactado → Presentación realizada → En valoración → Incorporado → Descartado**

### Prioridades (3)

| Nivel | Token | Fondo | Texto | Punto |
|---|---|---|---|---|
| Alta | `--color-priority-high` | `#FEF2F2` | `#DC2626` | `#EF4444` |
| Media | `--color-priority-medium` | `#FFFBEB` | `#B45309` | `#F59E0B` |
| Baja | `--color-priority-low` | `#F0FDF4` | `#15803D` | `#86EFAC` |

---

## 2 · Tipografía — Inter

Fuente única (Google Fonts). Pesos: Regular 400 · Medium 500 · SemiBold 600 · Bold 700.

| Nivel | Tamaño | Peso | Line-height | Letter-spacing |
|---|---|---|---|---|
| Display | 32px | 700 | 1.15 | −0.02em |
| Heading 1 | 28px | 700 | 1.2 | −0.02em |
| Heading 2 | 22px | 600 | 1.25 | −0.01em |
| Heading 3 | 18px | 600 | 1.3 | −0.01em |
| Body Large | 17px | 400 | 1.5 | 0 |
| Body | 15px | 400 | 1.5 | 0 |
| Body Small | 13px | 400 | 1.45 | 0 |
| Caption | 12px | 400 | 1.4 | 0.01em |
| Label | 13px | 600 | 1.2 | 0.02em (mayúsculas) |

### Numérico / tabular

Para números, importes y tablas. Alinea las cifras en columnas.

```css
--font-numeric: 'Inter';
font-feature-settings: "tnum" 1, "lnum" 1;
```

| Uso | Tamaño / peso |
|---|---|
| Stat / KPI | 32px / 700 / tnum |
| Importe | 22px / 600 / tnum |
| Nº en tabla | 15px / 500 / tnum |

---

## 3 · Espaciado — base 4px

| Token | px |
|---|---|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |
| `--space-16` | 64 |
| `--space-20` | 80 |
| `--space-24` | 96 |

---

## 4 · Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `--radius-none` | 0 | — |
| `--radius-sm` | 4px | inputs pequeños |
| `--radius-md` | 8px | cards, inputs estándar |
| `--radius-lg` | 12px | modales, sheets |
| `--radius-xl` | 16px | cards grandes |
| `--radius-full` | 9999px | badges, pills, FAB |

---

## 5 · Sombras / Elevación

| Nivel | Token | Valor | Uso |
|---|---|---|---|
| 0 | `--shadow-0` | `none` | superficies primarias (flat) |
| 1 | `--shadow-1` | `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.08)` | cards en reposo |
| 2 | `--shadow-2` | `0 4px 12px rgba(15,23,42,.1)` | cards elevadas, dropdowns |
| 3 | `--shadow-3` | `0 12px 32px rgba(15,23,42,.18)` | modales, bottom sheets |

---

## 5b · Bordes

| Token | Valor | Uso |
|---|---|---|
| `--border-width` | 1px | estándar |
| `--border-width-thick` | 2px | focus, estados activos |
| `--border-default` | `#E2E8F0` | cards, dividers |
| `--border-strong` | `#CBD5E1` | inputs |
| `--border-focus` | `#16A34A` | foco |
| `--border-error` | `#DC2626` | error |

**Focus ring:** halo `box-shadow: 0 0 0 3px` con el color de foco/error al 15%.

---

## 6 · Iconografía — Lucide

- **Librería:** Lucide Icons (open source)
- **Grosor de trazo:** `stroke-width: 2px`
- **Tamaño base:** 24×24px (16px en contextos compactos)
- **Color:** `currentColor` (hereda del contexto)
- **Terminaciones:** `stroke-linecap: round`, `stroke-linejoin: round`

### Iconos del sistema (25)

`home` (Inicio) · `users` (Prospectos) · `bar-chart-3` (Resumen/Dashboard) · `phone` (Llamada) · `message-circle` (WhatsApp) · `mail` (Email) · `instagram` (Instagram) · `plus` (Añadir) · `square-pen` (Editar) · `save` (Guardar) · `arrow-left` (Volver) · `filter` (Filtrar) · `menu` (Más filtros) · `calendar` (Fecha) · `clock` (Tiempo) · `chevron-right` · `check` · `x` (Cerrar) · `user` (Avatar) · `sticky-note` (Nota) · `layers` (Pipeline) · `alert-circle` (Alerta) · `info` · `star` (Prioridad) · `trash-2` (Eliminar) · `more-vertical` (Más opciones)

> Nota: el glyph de Instagram se inyecta como SVG inline (mismo trazo 2px) por compatibilidad con el build de Lucide.

---

## 7 · Breakpoints & Layout

| Breakpoint | Rango | Comportamiento |
|---|---|---|
| Mobile (primario) | < 768px | columna única · nav inferior (tab bar) |
| Tablet | 768 – 1023px | adaptación compacta, similar a desktop |
| Desktop | ≥ 1024px | sidebar lateral 224px |

- **Ancho de contenido en escritorio:** varía por pantalla (Resumen/Actividad ~640–960px, Pipeline sin límite), gutters internos 24–32px.
- **Sidebar:** 224px.
- **Header de pantalla:** 56px (+ status bar). Raíz = sin back; detalle/formulario = con back `←`.

### Navegación principal (móvil) — shell oficial

La app tiene **3 secciones raíz**. Etiquetas de tab vs. título de pantalla:

| Tab (nav) | Título de pantalla | Icono |
|---|---|---|
| Inicio | Actividad Diaria | `home` |
| Prospectos | Prospectos (Pipeline) | `users` |
| Resumen | Resumen (Dashboard) | `bar-chart-3` |

- **Tab bar inferior:** **60px + safe-area**, fondo blanco con borde/sombra superior sutil.
- **3 destinos** (sin pestaña Perfil). Activo: color primario + label bold + indicador (línea superior). Inactivo: `--color-neutral-400`. Área táctil ≥ 44px.
- **FAB `+`:** circular **56px**, color primario, sombra nivel 2, **flotante en la esquina inferior derecha** (gap ~8px sobre la tab bar). Presente solo en las 3 pantallas raíz; **ausente** en Ficha y formularios. Abre **Nuevo Prospecto** (bottom sheet).
- **Desktop:** la tab bar se sustituye por el **sidebar 224px** (logo arriba · 3 ítems · avatar+nombre del usuario abajo). **Sin FAB**: en su lugar, botón "Añadir prospecto" en el sidebar/cabecera.

---

## 8 · Componentes atómicos

### Botones

Variantes: **primario · secundario · destructivo · ghost**
Estados: **default · hover · pressed · disabled · loading**

| Variante | Fondo (default) | Texto | Hover | Pressed |
|---|---|---|---|---|
| Primario | `#16A34A` | `#fff` | `#15803D` | `#166534` |
| Secundario | `#fff` + borde `#CBD5E1` | `#0F172A` | `#F8FAFC` | `#F1F5F9` |
| Destructivo | `#DC2626` | `#fff` | `#B91C1C` | `#991B1B` |
| Ghost | transparente | `#15803D` | `#ECFDF3` | `#D1FADF` |

- **Disabled:** versión clara del fondo con texto atenuado, `cursor: not-allowed`.
- **Loading:** spinner + texto en gerundio.
- Altura estándar ~40px (botones de lista 36px; CTA grande 48px). Radio `--radius-md` (8px).

### Badges

- **Etapa:** pill (`--radius-full`) con punto de color + texto. Colores en §1 (Etapas).
- **Prioridad:** pill con punto de color + texto (Alta / Media / Baja). Colores en §1 (Prioridades).

### Inputs

- **Texto:** estados default / focus / filled / error / disabled. Borde `#CBD5E1`; focus borde `#16A34A` + halo; error borde `#DC2626` + halo + icono `alert-circle` + mensaje.
- **Textarea:** default / focus / error.
- **Selector / Dropdown:** closed / open (opción activa marcada con `check` y fondo `#ECFDF3`).
- Radio `--radius-md` (8px), padding `10px 12px`.

### Otros

- **Toggle / Switch:** on (`#16A34A`) / off (`#CBD5E1`), pulgar blanco 20px.
- **Avatar con iniciales:** fondo `#ECFDF3`, texto `#15803D`. Tamaños sm 28px / md 40px / lg 56px.
- **Divider:** línea 1px `#E2E8F0` (variante con etiqueta centrada).

---

## 9 · Tarjeta de prospecto & Filtros

### Tarjeta de prospecto (cómoda — densidad principal)

Estructura:
- **Avatar** (md 44px) con iniciales.
- **Nombre** (Heading 3) + **punto de prioridad** + `chevron-right`.
- **Badge de etapa** (pill con color).
- **Meta:** icono de canal (`phone` / `message-circle` / `instagram` / `mail`) + última interacción + `clock` + tiempo.
- **Acciones siempre visibles** (separadas por divider): `Llamar` · `WhatsApp` · botón de `Nota`.

Card: fondo `#fff`, borde `--border-default`, radio `--radius-lg`+ (14px), `--shadow-1`.

> Densidad secundaria disponible: **compacta** (una fila por prospecto, prioridad como punto sobre el avatar, 2 acciones en iconos).

### Barra de filtros

- ~4 chips visibles; el resto se revela **deslizando** horizontalmente.
- Botón **menú (tres líneas, `menu`) fijo a la derecha**, siempre visible, con **contador** (badge verde) de filtros adicionales → abre todos los filtros.
- Chip activo: fondo `--color-primary-500`, texto blanco. Chip inactivo: fondo `--color-neutral-100`, texto `--color-neutral-600`.

### Estado vacío

Icono `users` en círculo `#ECFDF3`, título, texto de apoyo y CTA primario "Añadir prospecto". Se muestra cuando el usuario aún no tiene prospectos.

---

## Estructura de la app

3 secciones principales:
1. **Actividad Diaria** (inicio) — tab "Inicio"
2. **Pipeline de Prospectos** — tab "Prospectos"
3. **Resumen** (Dashboard) — tab "Resumen"

Pantallas de detalle/formulario (sin tab bar): **Ficha del Prospecto**, **Nuevo Prospecto**, **Registrar Interacción**.

Uso estrictamente individual — una persona gestionando su propia red de candidatos.

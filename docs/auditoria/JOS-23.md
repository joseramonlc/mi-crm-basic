# Auditoría — JOS-23 · Acción rápida "Ya contacté" (implementación)

| | |
|---|---|
| **Issue** | [JOS-23 · Acción rápida "Ya contacté" desde la Actividad Diaria](https://linear.app/jose-lumbreras/issue/JOS-23/accion-rapida-ya-contacte-desde-la-actividad-diaria) |
| **Milestone** | M6 · Actividad Diaria (proyecto CRM-MVP) · prioridad Urgent |
| **Rama** | `joseramonlc/jos-23-accion-rapida-ya-contacte-desde-la-actividad-diaria` (desde `master` `61e9886`) |
| **Estado del código** | En árbol de trabajo, **sin commitear**. No hay commit, ni push, ni PR. |
| **Plan aprobado** | `docs/auditoria/JOS-23-plan.md` rev. 2 — **GO condicionado** (4 observaciones menores) |
| **Diff completo** | `docs/auditoria/JOS-23.diff` (620 líneas, 9 ficheros) |
| **Gates** | `docs/auditoria/JOS-23-gates.txt` |
| **Fecha del documento** | 2026-08-02 |
| **Preparado para** | **Auditoría de implementación** (el veredicto GO/NO-GO lo emite el departamento de auditoría, no el autor) |

> Este documento **describe** el cambio para su auditoría; no es un veredicto. El §4 recoge el cumplimiento de las cuatro observaciones del GO condicionado, y el §6 lo que **no** se ha hecho y por qué.

---

## 1. Qué se ha construido

Desde la Actividad Diaria, cada tarjeta lleva un botón **"Ya contacté"** que abre el formulario de interacción del prospecto y, al guardar o cancelar, devuelve **a la Actividad Diaria** en vez de a la Ficha. El flujo pasa de 4 pasos a 2.

**9 ficheros: 2 nuevos, 7 modificados.** No toca el esquema, ni la lógica de Convex, ni el motor de seguimiento, ni el Pipeline, ni la Ficha.

```
 src/lib/volver.ts                             (NUEVO) origen → destino, 3 constantes + 2 funciones
 src/lib/volver.test.ts                        (NUEVO) 5 tests
 src/components/ui/ProspectCard.tsx            |  18 +  prop opcional onContacted + botón
 src/components/ui/ProspectCard.test.tsx       |  23 +  3 tests nuevos
 src/app/(app)/actividad/page.tsx              |  34 +  botón en ambas secciones, flash+toast en la raíz
 src/app/(app)/actividad/page.test.tsx         | 148 +  11 tests nuevos
 .../interacciones/nueva/page.tsx              |  46 +  Suspense + destino según origen
 .../interacciones/nueva/page.test.tsx         |  48 +  3 tests nuevos
 convex/prospectos.ts                          |   4 +- SOLO comentario (líneas 102-104)
```

---

## 2. Los tres cambios funcionales

### A · El botón en la tarjeta

`ProspectCard` gana una prop **opcional** `onContacted`. Cuando se pasa, renderiza en el pie el botón verde sólido del prototipo (`Button` variante primary del design system, icono `check`), **hermano** del `<button>` que abre la ficha — nunca anidado.

Es opt-in: **el Pipeline no la pasa y su tarjeta no cambia** (hay un test que lo fija, incluido que sigue habiendo un único botón por tarjeta).

El nombre accesible incluye el del prospecto — *"Ya contacté con Marta Ruiz"* — porque en una lista hay tantos botones idénticos como tarjetas.

### B · El destino de salida del formulario

El contrato rev. 2 de M3 fija salida **determinista** con `replace`, nunca `history.back()`. JOS-23 rompe la premisa de que ese destino sea único, así que el origen viaja en la URL como `?volver=actividad`.

Toda la decisión vive en `src/lib/volver.ts`:

```ts
export function destinoAlSalir(origen: string | null | undefined, prospectoId: string): string {
  return origen === ORIGEN_ACTIVIDAD ? RUTA_ACTIVIDAD : `/prospectos/${prospectoId}`;
}
```

El parámetro **se compara, no se concatena**: los dos destinos posibles son constantes del código. Hay un test que recorre seis valores hostiles (`https://…`, `//…`, `/actividad/../../otra`, variantes de mayúsculas y espacios) y comprueba que todos caen en el destino por defecto.

Se aplica a los **dos** caminos de salida: guardar y cancelar/flecha atrás.

### C · La confirmación al volver

El consumo del flash vive en **`ActividadPage`** —el componente raíz—, no en `Actividad`. Es la corrección del bloqueante de la rev. 1: `Actividad` solo se monta cuando hay tarjetas, y el caso en que la confirmación más importa es justo cuando **no queda ninguna**.

Mismo patrón que la Ficha: efecto de lectura única con guarda de `ref` contra la doble ejecución del Strict Mode.

---

## 3. Sobre la barrera `Suspense` — dato que matiza el plan

El plan justificaba el `Suspense` diciendo que sin él **la compilación de producción podría fallar**. Se ha añadido y `npm run build` pasa, pero **la salida del build muestra que esa ruta no se prerenderiza**:

```
ƒ /prospectos/[id]/interacciones/nueva      ƒ (Dynamic) server-rendered on demand
```

Al ser dinámica (segmento `[id]` sin `generateStaticParams`), no hay prerenderizado y **el error de bailout no se habría producido hoy aunque no hubiera barrera**. No se ha ejecutado el contrafactual —compilar sin `Suspense`— así que esto se afirma a partir de la clasificación de la ruta, no de una prueba directa.

Se mantiene la barrera por dos razones: es la recomendación explícita de la documentación de Next 16 para este hook, y protege de que un cambio futuro (añadir `generateStaticParams`, activar PPR) convierta esto en un fallo de build. **Pero la auditoría debe saber que es seguro por diseño, no un fallo evitado.**

---

## 4. Cumplimiento de las cuatro observaciones del GO condicionado

| # | Condición | Cómo se ha cumplido |
|---|---|---|
| 1 | Conservar `git pull` como puerta previa | Ejecutado: `master` local subió de `9c5c479` a `61e9886` antes de crear la rama. Traza en `JOS-23-gates.txt`. |
| 2 | Los tests de los 4 estados deben montar `ActividadPage` de verdad con flash pendiente, y el de Strict Mode comprobar que el mensaje **permanece** | 6 tests en `describe("toast de confirmación…")`. Todos hacen `escribirFlash(...)` + `render(<ActividadPage />)` y afirman sobre el texto renderizado. El de Strict Mode monta dentro de `<React.StrictMode>` y comprueba **las dos cosas**: el mensaje sigue visible y el almacenamiento quedó vacío. |
| 3 | Un test debe rerenderizar la query ya actualizada y confirmar la desaparición | `describe("reactividad tras registrar el contacto")`: 2 tests que rerenderizan con la query reemitida — uno comprueba que el prospecto sale de "Para hoy", baja el contador de la cabecera y sube el de ritmo; el otro, que si era el último la pantalla pasa a "¡Todo al día!". |
| 4 | Buscar el botón por su nombre completo y comprobar que no llama a `onOpen` | En `ProspectCard.test.tsx`, por nombre exacto `"Ya contacté con Ana García"`, afirmando `onOpen` **no** llamado. En la pantalla, además, que `push` va al formulario y **no** a `/prospectos/p1`. |

---

## 5. Tests

**22 tests nuevos**, ninguno existente modificado ni eliminado.

| Fichero | Nuevos | Cubren |
|---|---|---|
| `src/lib/volver.test.ts` | 5 | destino con origen, sin origen, 6 valores hostiles, ida y vuelta coherentes |
| `ProspectCard.test.tsx` | 3 | ausencia de la prop (no-regresión del Pipeline), nombre accesible, no dispara `onOpen` |
| `actividad/page.test.tsx` | 11 | navegación desde ambas secciones, un botón por tarjeta, reactividad (2), toast en los 4 estados, Strict Mode, ausencia de toast sin flash |
| `nueva/page.test.tsx` | 3 | guardar y cancelar con origen, origen inventado ignorado |

Los tests preexistentes del formulario siguen afirmando el destino `/prospectos/p7`, así que **el contrato de M3 queda fijado como no-regresión**: si alguien hiciera que la salida fuese siempre a Actividad, esos tests caen.

---

## 6. Lo que NO se ha hecho

* **Contador de ritmo exacto** → **[JOS-77](https://linear.app/jose-lumbreras/issue/JOS-77/contador-de-ritmo-exacto-calcular-completados-sobre-interacciones-no)**, creada antes de programar. Los comentarios de `convex/prospectos.ts:102-104` y `actividad/page.tsx` ya no citan JOS-23: dicen explícitamente que JOS-23 no cambia el cálculo y apuntan a JOS-77.
* **Botones de Llamar/WhatsApp** en la tarjeta: fuera de alcance.
* **JOS-24** (Dashboard; el enlace "Resumen" de la navegación sigue en 404), **JOS-74**, **JOS-75**, **JOS-76**: fuera de alcance.
* **Caso límite documentado, no corregido:** si se registra el contacto con **fecha de un día anterior**, el prospecto puede seguir apareciendo como vencido y el contador de hoy no sube, porque el contacto no fue hoy. Es el comportamiento correcto del motor, aunque contradiga literalmente el punto 7 del issue. No se añadió caso especial.
* **Prueba en navegador real (E2E):** no se ha ejecutado — **residuo de verificación explícito**. Los tests de navegación usan el router de Next mockeado, lo cual es adecuado para esta rebanada pero **no demuestra** el recorrido completo con sesión real: pulsar el botón, guardar y ver el prospecto desaparecer de la lista. Todo lo verificado aquí es suite de tests, lint y build.

---

## 7. Puertas ejecutadas

Detalle completo en `docs/auditoria/JOS-23-gates.txt`.

| Puerta | Resultado |
|---|---|
| `git pull` previo (condición 1 del GO) | `master` de `9c5c479` → `61e9886`; rama creada desde ahí |
| `npx tsc --noEmit` | Solo los **4 errores preexistentes** de `import.meta.glob`, los mismos que ya documentaba JOS-21 sobre master. Ninguno en ficheros de JOS-23 |
| `npm run lint` | Sin hallazgos |
| `npm run build` | Compila; TypeScript en verde. Ver el matiz del §3 |
| Tests<br />`npm run test -- --pool=threads --no-file-parallelism` | **35/35 ficheros, 347/347 en verde** (325 preexistentes + 22 nuevos) |

### Incidencia de infraestructura que la auditoría debe conocer

La primera ejecución de la suite completa **salió con código 0 pero no ejecutó todos los tests**. Reportó `34 passed (34)` y, en paralelo, este error:

```
Failed to start threads worker for test files
src/app/(app)/prospectos/nuevo/page.test.tsx
Caused by: Timeout waiting for worker to respond
```

El repositorio tiene **35** ficheros de test. Ese fichero no llegó a arrancar y **quedó fuera del recuento sin marcar el run como fallido**: la puerta parecía cerrada sin estarlo. Se detectó comparando el recuento con `find`, y se ejecutó aparte: **12 tests, en verde**.

Es un problema de entorno, no de código —el proyecto vive en `/mnt/c` dentro de Dropbox y vitest en paralelo deja workers sin arrancar; todas las ejecuciones van con `--pool=threads --no-file-parallelism`—, pero conviene tenerlo presente: **en este proyecto un "verde" de vitest no garantiza por sí solo que se hayan ejecutado todos los ficheros.** Refuerza el residuo abierto de migrar el repositorio fuera de Dropbox y de `/mnt/c`.

# JOS-24 · Medición contra deployment real — guión

> **Estado: PARCIALMENTE EJECUTADO.** Lo que no exige sesión autenticada ya está hecho y verificado (§1). La medición de latencia y consumo (§3) **no se puede completar todavía**: ver §2.
>
> Cubre el gate declarado en `JOS-24-plan.md` §4.3. Fecha de la parte ejecutada: `2026-08-03`.
> Deployment: `jose-lumbreras:crm-networker:dev` → `adamant-mockingbird-816.eu-west-1.convex.cloud`

---

## 1. Ya ejecutado y verificado (no requiere sesión)

Autorizado por el product owner el 2026-08-03 ("Ok al despliegue en convex").

| Comprobado | Resultado |
|---|---|
| `npx convex dev --once` empuja esquema y funciones al deployment de desarrollo | ✅ `Convex functions ready! (2.58s)`, `EXIT_REAL=0` |
| El **índice nuevo `by_usuario_fecha`** se publica contra un deployment real | ✅ El push valida el esquema; sin índice válido habría fallado |
| La query `resumen:resumen` queda desplegada | ✅ Invocable |
| **La guarda de sesión actúa en el deployment real** | ✅ `npx convex run resumen:resumen '{"dayKey":"2026-08-03","periodo":"mes"}'` → `ConvexError {"code":"UNAUTHENTICATED","message":"Se requiere sesión"}`, lanzado en `requireUsuario` (`convex/lib/usuario.ts:16`) desde `convex/resumen.ts:99` |

Esa última línea vale como prueba de dos cosas a la vez: la función está viva en el servidor **y** aborta sin identidad sin llegar a tocar la base de datos.

---

## 2. ⚠️ Por qué la medición NO puede completarse en el bocado A

`resumen` exige identidad de sesión (`requireUsuario`). Para medirla con datos reales hace falta **invocarla autenticado**, y hoy no hay forma de hacerlo:

- `npx convex run` **no lleva identidad** — es justo lo que demuestra §1.
- **No existe ninguna pantalla que la llame**: `/resumen` es el bocado B y no está construido. El build lo confirma (la ruta no aparece en la tabla).
- El proyecto **no tiene automatización de navegador**. Es la misma conclusión a la que llegó el departamento de auditoría en JOS-21: *"lo que queda solo lo puede hacer una persona con navegador y sesión iniciada. No es automatizable con lo que hay hoy en el proyecto."*

En JOS-21 esto no fue un problema porque la pantalla `pipeline` **formaba parte del mismo bocado** y se midió usándola. Aquí el plan separó backend y UI en dos bocados, y la consecuencia —no prevista al redactarlo— es que **el gate de medición no puede cerrarse hasta que exista la pantalla**.

### Opciones

| Opción | Qué implica |
|---|---|
| **A — Mover el gate al final del bocado B** ✅ recomendada | La pantalla llama a la query con sesión real y se mide igual que en JOS-21. Coste cero, y es como se hizo lo anterior |
| B — Runner del dashboard de Convex con identidad | Solo si esa versión del dashboard permite ejecutar como usuario autenticado. **Sin verificar**: no afirmar que existe sin comprobarlo |
| C — Automatización de navegador | Introducir Playwright o similar. Herramienta nueva, alcance propio, desproporcionado para cerrar un gate |

**Propuesta: opción A.** El bocado A se audita con la guarda de presupuesto de los tests (que sí acota el peor caso admisible y ya está en verde) y §1 de este documento; el gate de deployment real se ejecuta al cerrar el bocado B, con este mismo guión.

---

## 3. Guión pendiente de ejecución (al cerrar el bocado B)

### 3.0 Preparar el entorno

⚠️ **Dropbox bloquea `.next`** y tumba el dev server con `EACCES: rmdir`. Pausar la sincronización antes.

```bash
rm -rf .next
npx concurrently -n next,convex -c blue,green "next dev --webpack" "convex dev"
```

⚠️ **Clerk en desarrollo solo carga en `localhost` / `127.0.0.1`**, no en la IP de WSL. Abrir siempre `http://localhost:3000`.

### 3.1 Obtener el `tokenIdentifier`

Con sesión iniciada y al menos un prospecto creado:

```bash
npx convex data prospectos     # el campo usuarioId de cualquier fila
```

### 3.2 Sembrar el peor caso

> 🔴 **EL SEED BORRA los prospectos e interacciones existentes de ese tenant.** Es un borrado en cascada, por diseño desde JOS-22, para que el escenario sea reproducible. Es el deployment de **desarrollo** y son datos de prueba, pero si hubiera algo que quieras conservar, sácalo antes con `npx convex data prospectos`.

```bash
npx convex run seed:seed '{"scenario":"resumen","usuarioId":"<tokenIdentifier>"}'
```

Debe responder `insertados: 1201`. Siembra:

- **1.201 prospectos** (= `MAX_RESUMEN_PROSPECTOS + 1`) repartidos por las 6 etapas.
- **501 interacciones** (= `MAX_RESUMEN_INTERACCIONES + 1`) dentro de la ventana de 30 días.

Con **los siete campos libres en su tope**, que es lo que convierte esto en el peor caso *admisible* y no en uno cómodo (plan §4.4-quater):

| Tabla | Campos al máximo |
|---|---|
| `prospectos` | `notas` 2.000 · `nombre` 80 · `comoSeConocio` 120 · `telefono` 25 · `email` 254 |
| `interacciones` | `queOcurrio` 2.000 · `siguientePasoAcordado` 2.000 |

Ambas lecturas truncan **a la vez**, que es la condición que exige §4.3 del plan: medirlas por separado no valdría.

### 3.3 Abrir `/resumen` y anotar

En el **dashboard de Convex → Functions → `resumen:resumen`**:

| Métrica | Valor medido | Referencia |
|---|---|---|
| Ejecución **en frío** (cache hit rate 0 %) | `______ ms` | JOS-21 midió 277 ms en su peor caso |
| Ejecución **en caliente** (cache hit rate 100 %) | `______ ms` | |
| **Documentos leídos** | `______` | límite 32.000 · peor caso previsto **1.702** (5,3 %) |
| **Bytes leídos** | `______` | límite 16 MiB · peor caso previsto **5.485.256 B (32,7 %)** |
| ¿Errores de límite excedido? | `SÍ / NO` | debe ser **NO** |

Las dos cifras de referencia salen de la guarda de `convex/resumen.test.ts`, medida con `convex-test` **en memoria**. El objetivo de esta ejecución es contrastarlas contra el servidor real: si difieren de forma apreciable, manda el servidor y hay que revisar las cotas.

### 3.4 Comprobaciones de parcialidad (con el peor caso sembrado)

| # | Qué comprobar | OK / KO |
|---|---|---|
| 1 | Los recuentos por etapa se declaran **parciales** (`prospectos.exacto === false`) | |
| 2 | **"Nuevos prospectos"** también aparece marcado como parcial — es la métrica que la 2ª auditoría detectó sin marcar | |
| 3 | Los totales (activos / incorporados / descartados) **no** se presentan como "totales" | |
| 4 | La serie declara su parcialidad y los días anteriores a `diaCompletoDesde` **no** se dibujan como 0 | |
| 5 | Los días **más recientes** del gráfico están completos (consecuencia del orden descendente) | |

### 3.5 Limpieza

Devolver el tenant a un escenario normal de trabajo:

```bash
npx convex run seed:seed '{"scenario":"populated","usuarioId":"<tokenIdentifier>"}'
```

# JOS-24 · Medición contra deployment real — guión

> ## ✅ EJECUTADO POR COMPLETO el 2026-08-04
>
> §1 se ejecutó el 2026-08-03 (parte no autenticada). **§3 se ejecutó el 2026-08-04**, al cerrar el bocado B, tal como estableció el traslado del gate (`JOS-24-plan.md` §4.4-ter).
>
> **Los resultados NO están en este documento: están en [`JOS-24-bocado-B-gates.txt`](./JOS-24-bocado-B-gates.txt), sección "MEDICIÓN CONTRA DEPLOYMENT REAL"**, con horas de congelación, cifras, verificación de la restauración y las cinco comprobaciones de parcialidad.
>
> Resumen de una línea: **1.702 documentos (5,3 %) y 5.686.323 B (33,9 %), 231,5 ms en frío, sin errores de límite.** El recuento de documentos coincidió EXACTO con lo previsto; los bytes salieron un 3,67 % por encima. Margen 2,95×. No procede revisar las cotas.
>
> ⚠️ **Corrección al §3.3 de abajo:** la medición debe hacerse en **"Últimos 30 días"**, no en la vista por defecto. Con 7 días las interacciones no se truncan (el seed las reparte en 30 días, así que solo caen ~119 de 501) y no se cumpliría la condición de que **ambas lecturas truncan a la vez**. Detectado durante la ejecución.
>
> ⚠️ **§3.5 REESCRITO.** Antes proponía restaurar sembrando datos de ejemplo, que los **fabrica** en vez de recuperar los originales. La restauración correcta es `npx convex import --replace-all` desde el snapshot de §3.0-bis. **El comando descartado no se reproduce en ningún punto de este documento**, ni siquiera como contraejemplo: un guion operativo se copia y se pega.
>
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

### 3.0-bis Congelar la app publicada y hacer el snapshot

**Sin este paso, §3.5 no tiene de dónde restaurar.** Primero se cierra la ventana de escritura y después se copia; en ese orden, o el snapshot podría no reflejar lo último escrito desde la web.

Congelar la app publicada mientras dure la medición: mientras Railway apunte al mismo deployment de Convex, es una segunda vía de escritura que el `import --replace-all` se llevaría por delante.

```bash
npx @railway/cli down -y                                  # ANOTAR LA HORA
curl -s -o /dev/null -w "%{http_code}\n" <URL>/login      # debe dejar de ser 200
```

La reactivación es el **§3.6**, al final del guion. La ventana queda así acotada por escrito entre dos horas anotadas, que es lo que permite afirmar que ninguna escritura ajena entró.

Con la ventana ya cerrada, el snapshot. Va **fuera del repositorio** y fuera de Dropbox:

```bash
mkdir -p ~/crm-backups
npx convex export --path ~/crm-backups/JOS-24-backup-pre-medicion.zip
npx convex data prospectos      # anotar recuento + un _id propio y otro de otro inquilino
npx convex data interacciones   # anotar recuento
```

### 3.1 Obtener el `tokenIdentifier`

Sale del mismo `npx convex data prospectos` de §3.0-bis: es el campo `usuarioId`.

⚠️ **Puede haber VARIOS inquilinos en el deployment de desarrollo** (el 2026-08-04 había tres). El seed borra los datos de UNO, así que hay que elegir el correcto: pedir a quien tenga la sesión abierta **el nombre de un prospecto que vea en pantalla** y buscar su fila. Sembrar el inquilino equivocado mide contra un tenant vacío y borra datos de otro.

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

| Métrica | Valor medido (2026-08-04) | Referencia |
|---|---|---|
| Ejecución **en frío** (cache hit rate 0 %) | **231,5 ms** | JOS-21 midió 277 ms en su peor caso |
| Ejecución **en caliente** (cache hit rate 100 %) | **~0,03 ms** | |
| **Documentos leídos** | **1.702** (5,3 %) | límite 32.000 · peor caso previsto **1.702** |
| **Bytes leídos** | **5.686.323 B** (33,9 %) | límite 16 MiB · peor caso previsto **5.485.256 B (32,7 %)** |
| ¿Errores de límite excedido? | **NO** | debe ser **NO** |

⚠️ **Medir en "Últimos 30 días", no en la vista por defecto.** Con 7 días las interacciones no se truncan (el seed las reparte en 30 días: solo caen ~119 de 501) y no se cumple la condición de que **ambas lecturas truncan a la vez**. La vista de 7 días da 1.320 documentos y 4.005.141 B — no comparable con la referencia.

Las dos cifras de referencia salen de la guarda de `convex/resumen.test.ts`, medida con `convex-test` **en memoria**. El objetivo de esta ejecución es contrastarlas contra el servidor real: si difieren de forma apreciable, manda el servidor y hay que revisar las cotas.

### 3.4 Comprobaciones de parcialidad (con el peor caso sembrado)

| # | Qué comprobar | Resultado 2026-08-04 |
|---|---|---|
| 1 | Los recuentos por etapa se declaran **parciales** (`prospectos.exacto === false`) | ✅ las 6 etapas muestran `200+` |
| 2 | **"Nuevos prospectos"** también aparece marcado como parcial — es la métrica que la 2ª auditoría detectó sin marcar | ✅ `1200+ prospectos nuevos` |
| 3 | Los totales (activos / incorporados / descartados) **no** se presentan como "totales" | ✅ encabezado `Recuento parcial` |
| 4 | La serie declara su parcialidad y los días anteriores a `diaCompletoDesde` **no** se dibujan como 0 | ✅ aviso *"Datos completos desde el 7 de julio…"* y la barra del 6 de julio sale **rayada** |
| 5 | Los días **más recientes** del gráfico están completos (consecuencia del orden descendente) | ✅ del 7 de julio en adelante, barras normales |

Además, verificado en pantalla y no solo en test: el banner dice *"Estás viendo **1200** prospectos"*, sin separador de millar — norma española para cuatro cifras.

### 3.5 Restauración

> ⚠️ **Corregido el 2026-08-04 (4ª auditoría).** Este apartado se llamaba *"Limpieza"* y proponía
> restaurar **sembrando un escenario de datos de ejemplo**. Esa estrategia queda descartada: no
> recupera los datos originales —los fabrica— y, ejecutada sobre un estado ya restaurado, lo
> sobrescribiría. La ejecución real del 2026-08-04 no la usó; restauró con el snapshot.
>
> **El comando anterior no se reproduce aquí, ni siquiera como ejemplo de lo que no hay que hacer.**
> Un guion operativo se copia y se pega: un comando destructivo a la vista es un riesgo aunque
> lleve encima un cartel de advertencia.

Restaurar **es importar el snapshot de §3.0-bis**, siempre y como primer paso. No está
condicionado a ninguna comprobación previa:

```bash
npx convex import --replace-all -y ~/crm-backups/JOS-24-backup-pre-medicion.zip
```

`--replace-all` y no `--replace`: devuelve el deployment al estado del snapshot **borrando
además las tablas que el import no contenga**, de modo que nada sembrado por el escenario
`resumen` sobreviva.

Solo **después** se verifica. Las comprobaciones acreditan el resultado; no deciden qué hacer:

```bash
npx convex data prospectos      # ¿coincide con el recuento anotado en §3.0-bis?
npx convex data interacciones
```

| # | Qué comprobar | OK / KO |
|---|---|---|
| 1 | Recuento de `prospectos` = el anotado antes de sembrar | |
| 2 | Recuento de `interacciones` = el anotado antes de sembrar | |
| 3 | **Contenido representativo**: el `_id` anotado vuelve con su mismo nombre, etapa y fechas | |
| 4 | **Un `_id` de OTRO inquilino** también vuelve — delata un borrado que se haya ido de madre | |
| 5 | `/resumen` y `/actividad` cargan y muestran datos coherentes | |

Los puntos 3 y 4 son los que distinguen una restauración real de una coincidencia de cifras:
doce documentos fabricados también suman doce.

### 3.6 Reactivar la app publicada

```bash
npx @railway/cli deployment redeploy --from-source -y     # ANOTAR LA HORA
npx @railway/cli deployment list                          # debe quedar en SUCCESS
curl -s -o /dev/null -w "%{http_code}\n" <URL>/login      # debe volver a 200
```

`--from-source` reconstruye desde el último commit de `master`, que es lo desplegado. Las dos horas anotadas (§3.0-bis y esta) y los dos `curl` son la evidencia de aislamiento que va al fichero de gates.

**Ejecución del 2026-08-04:** congelada 13:58:29 → reactivada 14:14:02 (HTTP 200 confirmado). Ventana de 15 min 33 s.

# Evidencia e2e manual — Fix enumeración JOS-71 (rev.3)

| | |
|---|---|
| **Fecha** | 2026-07-25 |
| **Ejecutado por** | Jose Lumbreras (responsable del proyecto) |
| **Entorno** | **Build de producción** (`.next` limpio → `next build` → `next start`, Next 16.2.10) en WSL2, servido en `http://localhost:3000`, Clerk instance de desarrollo. (Se había verificado antes también con `next dev --webpack`; a petición de la auditoría de código se repitió sobre el bundle de producción.) |
| **Propósito** | Cerrar la **condición 1** del GO condicionado de la auditoría de código (e2e manual completado sobre build de producción y registrado). |

> **Nota de entorno (para reproducir):** el instance de desarrollo de Clerk solo se inicializa en orígenes permitidos (`localhost` / `127.0.0.1`). Accediendo por la IP cruda de WSL (`172.21.179.77:3000`) Clerk no carga (`isLoaded` se queda en `false`) y la página de recuperación devuelve `null` (solo se ve el logo del layout). Las pruebas se hicieron por `localhost`, en ventana de incógnito (sesión limpia).

## Resultados

| # | Escenario | Esperado | Observado | Resultado |
|---|---|---|---|---|
| **①** | Email **inexistente** (`manolorull@hotmail.com`) → "Enviar código" | Avance neutro al paso de código, con copy "Si existe una cuenta con…", **sin error** | Avanza a "Crea una contraseña nueva" con el copy neutro; sin error rojo | ✅ |
| **②a** | Sobre ①, código cualquiera (`123456`) + contraseña → "Cambiar contraseña y entrar" | "El código no es correcto. Revísalo e inténtalo de nuevo." (no genérico), **sin llamar a Clerk** | Muestra exactamente "El código no es correcto. Revísalo e inténtalo de nuevo." | ✅ |
| **②b** | Cuenta **real** (`joseramonlc@gmail.com`) + código **erróneo** (`000000`) | **Mismo** mensaje que ②a | "El código no es correcto. Revísalo e inténtalo de nuevo." — idéntico a ②a | ✅ |
| **③** | Cuenta real + **código real** del email + contraseña nueva | Recuperación completa: `finalize` + sesión iniciada, redirige a `/actividad` | Completa y entra a `/actividad` (contraseña real cambiada) | ✅ |
| **④** | `/login` con `joseramonlc@gmail.com` + contraseña **incorrecta** | "Email o contraseña incorrectos." (no genérico) | Muestra "Email o contraseña incorrectos." | ✅ |

## Conclusión

Los cuatro escenarios exigidos por la auditoría de código se comportan como especifica `JOS-71-fix-enumeracion.md` (rev.3):

- No-enumeración a nivel de UI/mensaje verificada de extremo a extremo: email inexistente y existente son **indistinguibles** tanto en el avance como en el mensaje de código incorrecto.
- El happy path de recuperación completa (código correcto → cambio de contraseña → sesión) funciona.
- La corrección del helper compartido arregla también el mensaje de **login** con contraseña incorrecta.

Con esto queda **cumplida y registrada la condición 1** del GO condicionado. La observación menor (acceso a `MENSAJES` con comprobación de propiedad propia) quedó resuelta en el código y cubierta por test (ver `JOS-71-fix-gates.txt`, 286 tests).

> El residuo de red/timing (JOS-73) queda fuera de este e2e por decisión aceptada en el modelo de amenaza.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Login, registro y recuperación de contraseña son las únicas rutas accesibles
 * sin sesión. El resto del CRM queda tras `auth.protect()`, que redirige a
 * NEXT_PUBLIC_CLERK_SIGN_IN_URL (= /login) cuando no hay identidad.
 */
const esRutaPublica = createRouteMatcher(["/login(.*)", "/registro(.*)", "/recuperar(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!esRutaPublica(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Endpoints internos del cliente de Clerk (handshake de sesión): sin esto
    // quedarían fuera del middleware y el refresco de sesión falla.
    "/__clerk/:path*",
  ],
};

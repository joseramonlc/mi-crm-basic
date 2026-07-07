import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Next.js 16 renamed "Middleware" to "Proxy" (same functionality, new file
// name/convention — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
// This file is that proxy; @convex-dev/auth's `convexAuthNextjsMiddleware`
// still returns a plain (request, event) => Response handler, which is all
// the `proxy` convention requires.

const isPublicAuthRoute = createRouteMatcher(["/login", "/registro"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

  if (isPublicAuthRoute(request)) {
    if (authenticated) return nextjsMiddlewareRedirect(request, "/actividad");
    return;
  }

  if (!authenticated) return nextjsMiddlewareRedirect(request, "/login");
});

export const config = {
  // Runs on every route except static assets / Next internals.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

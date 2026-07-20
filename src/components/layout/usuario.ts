/** Lo que la navegación necesita del usuario de Clerk (el resto es irrelevante aquí). */
type UsuarioMostrable = {
  fullName?: string | null;
  firstName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
} | null | undefined;

/**
 * Nombre para el avatar y la ficha de cuenta. `useUser()` devuelve `undefined`
 * mientras Clerk carga y el nombre es opcional en la instancia, así que la
 * cadena de respaldo termina en un literal: el hueco nunca queda vacío.
 */
export function nombreDeUsuario(user: UsuarioMostrable): string {
  return user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "Mi cuenta";
}

import { redirect } from "next/navigation";

// La raíz manda siempre a la pantalla de inicio; no comprueba la sesión porque
// /actividad ya está protegida en src/proxy.ts, que redirige a /login cuando no
// hay identidad (JOS-66).
export default function RootPage() {
  redirect("/actividad");
}

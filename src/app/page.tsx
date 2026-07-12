import { redirect } from "next/navigation";

// Sin protección de rutas todavía: la raíz manda siempre a la pantalla de
// inicio, pública de forma temporal en desarrollo. Cuando JOS-5 aporte auth,
// aquí se decidirá entre /actividad y /login según la sesión.
export default function RootPage() {
  redirect("/actividad");
}

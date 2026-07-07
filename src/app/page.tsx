import { redirect } from "next/navigation";

// src/proxy.ts already keeps unauthenticated requests to "/" from reaching
// this point (redirected to /login), so getting here always means "go home".
export default function RootPage() {
  redirect("/actividad");
}

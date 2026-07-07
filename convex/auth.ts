import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // JOS-7: "nombre" es obligatorio en el alta de Usuario. El provider
      // Password solo pide email+password por defecto; este profile()
      // recoge también el "name" que el formulario de registro debe enviar.
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
    }),
  ],
});

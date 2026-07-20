/**
 * Proveedor de identidad de Convex (ADR 0001). `applicationID` debe coincidir
 * con el nombre del JWT template de Clerk ("convex"); el dominio emisor se
 * inyecta como variable del deployment, nunca se escribe aquí.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;

// Tipado ambiental de `import.meta.glob` (Vite/Vitest), que `convex-test` usa para cargar el mapa
// de módulos de funciones en los tests (`convexTest(schema, modules)`). `npx tsc --noEmit` incluye
// los `*.test.ts` del proyecto pero NO conoce esta construcción —es de Vite, no de TypeScript— y sin
// esto falla con TS2339 «Property 'glob' does not exist on type 'ImportMeta'». Firma acotada al uso
// real y compatible con el `modules` de convexTest (`Record<string, () => Promise<any>>`).
//
// Se declara aquí (fichero SIN import/export = ámbito global) en vez de referenciar `vite/client`
// para no arrastrar sus declaraciones de módulos de assets (`*.css`, etc.). Resuelve el punto 3 de
// la auditoría del código de JOS-80.
interface ImportMeta {
  glob(
    patterns: string | string[],
    options?: { eager?: boolean; import?: string; query?: string | Record<string, string> },
  ): Record<string, () => Promise<Record<string, unknown>>>;
}

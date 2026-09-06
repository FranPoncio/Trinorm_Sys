/**
 * Une el `base` de Astro con una ruta. Sin esto, un `href="/procesos/"`
 * apunta a la raíz del dominio y no a la de la app, que en Pages cuelga de
 * /Trinorm_Sys/.
 */
const base = import.meta.env.BASE_URL;

export function conBase(ruta: string): string {
  return `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`.replace(/\/{2,}/g, '/');
}

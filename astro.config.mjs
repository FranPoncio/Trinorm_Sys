// @ts-check
import { defineConfig } from 'astro/config';

/**
 * La app se publica en GitHub Pages dentro del repo `Trinorm_Sys`, así que
 * cuelga de /Trinorm_Sys/ y no de la raíz. Por eso el `base`: sin él, todos
 * los links internos apuntarían a franponcio.github.io/... y darían 404.
 *
 * Si algún día va a dominio propio, `base` pasa a '/' y no hay que tocar nada
 * más: los links se arman con `conBase()`.
 */
export default defineConfig({
  site: 'https://franponcio.github.io',
  base: '/Trinorm_Sys/',
  build: { format: 'directory' },
});

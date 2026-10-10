/**
 * Un renderizador de Markdown mínimo y seguro, para mostrar los documentos.
 *
 * Por qué no una librería: el subconjunto que usan los documentos es chico
 * (títulos, listas, tablas, negrita), y lo que importa acá es otra cosa: que
 * el texto que escribe una persona NUNCA se interprete como HTML. Se escapa
 * TODO antes de agregar una sola etiqueta propia, así que no hay camino por
 * el que un `<script>` pegado en un documento llegue a ejecutarse.
 *
 * Es el único lugar de la app donde texto del usuario se vuelve HTML, y por
 * eso tiene sus tests.
 */

export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formato dentro de una línea. Recibe texto SIN escapar y devuelve HTML seguro. */
function enLinea(texto: string): string {
  return esc(texto)
    .replace(/⟦COMPLETAR([^⟧]*)⟧/g, '<mark class="falta">⟦COMPLETAR$1⟧</mark>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
}

const celdas = (linea: string): string[] =>
  linea
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

const esSeparador = (linea: string): boolean => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(linea.trim());

export function renderizar(markdown: string): string {
  const lineas = markdown.replace(/\r\n/g, '\n').split('\n');
  const salida: string[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];

    if (linea.trim() === '') {
      i++;
      continue;
    }

    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    if (titulo) {
      const n = titulo[1].length;
      salida.push(`<h${n}>${enLinea(titulo[2])}</h${n}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(linea)) {
      salida.push('<hr>');
      i++;
      continue;
    }

    // Tabla: una línea con barras seguida de un separador.
    if (linea.trim().startsWith('|') && i + 1 < lineas.length && esSeparador(lineas[i + 1])) {
      const cabecera = celdas(linea);
      i += 2;
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        filas.push(celdas(lineas[i]));
        i++;
      }
      salida.push(
        `<div class="tabla-doc"><table><thead><tr>${cabecera.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>${filas
          .map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(linea)) {
      const items: string[] = [];
      while (i < lineas.length && /^\d+\.\s+/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      salida.push(`<ol>${items.map((t) => `<li>${enLinea(t)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^-\s+/.test(linea)) {
      const items: string[] = [];
      while (i < lineas.length && /^-\s+/.test(lineas[i])) {
        items.push(lineas[i].replace(/^-\s+/, ''));
        i++;
      }
      salida.push(`<ul>${items.map((t) => `<li>${enLinea(t)}</li>`).join('')}</ul>`);
      continue;
    }

    // Párrafo: hasta la próxima línea vacía o el próximo bloque.
    const parrafo: string[] = [];
    while (
      i < lineas.length &&
      lineas[i].trim() !== '' &&
      !/^(#{1,3}\s|---+\s*$|\d+\.\s|-\s|\|)/.test(lineas[i])
    ) {
      parrafo.push(lineas[i]);
      i++;
    }
    if (parrafo.length === 0) {
      // Una línea que parece un bloque pero no lo es (p. ej. "|" suelta): se muestra como texto.
      parrafo.push(lineas[i]);
      i++;
    }
    salida.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`);
  }

  return salida.join('\n');
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { esc, renderizar } from '../markdown.ts';
import { plantillas } from '../plantillas.ts';
import { redactar } from '../generador.ts';
import { HOY, orgCompleta } from './fabrica.ts';

/*
 * Este renderizador es el único punto donde texto que escribe una persona se
 * vuelve HTML. Si falla, un documento pegado desde cualquier lado ejecuta
 * código en la página. Por eso se lo prueba contra entradas hostiles y no
 * sólo contra el caso feliz.
 */

const hostiles = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  "'; alert(1); //",
  'javascript:alert(1)',
  '**<b onmouseover=alert(1)>negrita</b>**',
  '| <script> | b |\n| --- | --- |\n| <img src=x onerror=1> | y |',
  '# <script>alert(1)</script>',
  '- <iframe src=javascript:alert(1)>',
  '1. <a href="javascript:alert(1)">x</a>',
  '⟦COMPLETAR: <script>alert(1)</script>⟧',
];

/** Las etiquetas que el renderizador SÍ genera. Cualquier otra en la salida es una fuga. */
const PERMITIDAS = new Set(['h1', 'h2', 'h3', 'hr', 'p', 'br', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'mark']);

function etiquetasDe(html: string): string[] {
  return [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1].toLowerCase());
}

describe('seguridad', () => {
  test('esc neutraliza los cinco caracteres peligrosos', () => {
    assert.equal(esc(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  test('ninguna entrada hostil produce una etiqueta que el renderizador no genera', () => {
    for (const h of hostiles) {
      const fuera = etiquetasDe(renderizar(h)).filter((t) => !PERMITIDAS.has(t));
      assert.deepEqual(fuera, [], `se coló <${fuera.join('>, <')}> con: ${h}`);
    }
  });

  test('el HTML pegado sale como texto visible', () => {
    const html = renderizar('<script>alert(1)</script>');
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script/);
  });

  test('ningún atributo con comillas sin escapar: nada puede abrir un atributo nuevo', () => {
    for (const h of hostiles) {
      const html = renderizar(h);
      // Las únicas comillas crudas en la salida son las de class="..." que pone el renderizador.
      const sinPropias = html.replace(/ class="(falta|tabla-doc)"/g, '');
      assert.doesNotMatch(sinPropias, /<[^>]*"/, h);
    }
  });

  test('los documentos generados con datos hostiles tampoco filtran HTML', () => {
    const org = orgCompleta(['9001', '14001', '45001'], {
      actividad: '<script>alert(1)</script>',
      riesgos: '<img src=x onerror=alert(1)> | x\n"><svg onload=alert(1)>',
      objetivos: '<b>uno</b> — <i>dos</i> — <u>tres</u>',
    });
    org.nombre = '<img src=x onerror=alert(1)>';
    for (const p of plantillas) {
      const fuera = etiquetasDe(renderizar(redactar(p, org, plantillas, HOY))).filter((t) => !PERMITIDAS.has(t));
      assert.deepEqual(fuera, [], `${p.id} filtró <${fuera.join('>, <')}>`);
    }
  });
});

describe('formato', () => {
  test('títulos, hasta tres niveles', () => {
    assert.equal(renderizar('# Uno\n\n## Dos\n\n### Tres'), '<h1>Uno</h1>\n<h2>Dos</h2>\n<h3>Tres</h3>');
    assert.match(renderizar('#### Cuatro'), /<p>#### Cuatro<\/p>/);
  });

  test('listas con y sin orden', () => {
    assert.equal(renderizar('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
    assert.equal(renderizar('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  });

  test('tablas con cabecera y celdas vacías', () => {
    const html = renderizar('| A | B |\n| --- | --- |\n| x |  |\n| y | z |');
    assert.match(html, /<th>A<\/th><th>B<\/th>/);
    assert.match(html, /<td>x<\/td><td><\/td>/);
    assert.equal((html.match(/<tr>/g) ?? []).length, 3);
  });

  test('las marcas de completar salen resaltadas', () => {
    assert.match(renderizar('Hola ⟦COMPLETAR: algo⟧ fin'), /<mark class="falta">⟦COMPLETAR: algo⟧<\/mark>/);
  });

  test('negrita, y una negrita sin cerrar queda como texto', () => {
    assert.equal(renderizar('Un **dato** acá'), '<p>Un <strong>dato</strong> acá</p>');
    assert.equal(renderizar('Un **dato sin cerrar'), '<p>Un **dato sin cerrar</p>');
  });

  test('un párrafo de varias líneas conserva los saltos', () => {
    assert.equal(renderizar('uno\ndos'), '<p>uno<br>dos</p>');
  });

  test('una barra suelta no deja el renderizador en un bucle', () => {
    assert.match(renderizar('|'), /<p>\|<\/p>/);
    assert.match(renderizar('| a |\nsin separador'), /<p>/);
  });

  test('entrada vacía y finales de línea de Windows', () => {
    assert.equal(renderizar(''), '');
    assert.equal(renderizar('# A\r\n\r\ntexto'), '<h1>A</h1>\n<p>texto</p>');
  });

  test('renderiza todos los documentos del catálogo sin lanzar y sin dejar texto de Markdown a la vista', () => {
    for (const p of plantillas) {
      const html = renderizar(redactar(p, orgCompleta(), plantillas, HOY));
      assert.ok(html.length > 100, p.id);
      assert.doesNotMatch(html, /\| --- \|/, `${p.id} dejó una tabla sin renderizar`);
    }
  });
});

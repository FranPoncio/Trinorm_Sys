import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { vistaDatos, vistaDocumento, vistaDocumentos, vistaEntrevista, vistaEvidencia, vistaInicio, vistaPanel } from '../vistas.ts';
import { redactar, nuevoDocumento } from '../../lib/sgi/generador.ts';
import { plantillas } from '../../lib/sgi/plantillas.ts';
import { HOY, conDocumentosAprobados, orgCompleta } from '../../lib/sgi/__tests__/fabrica.ts';
import type { Organizacion } from '../../lib/sgi/organizacion.ts';

/*
 * Las vistas arman HTML con todo lo que la persona escribió. Si una sola
 * interpolación se escapa sin `esc()`, un nombre de organización o una
 * respuesta pegados de cualquier lado ejecutan código en la página. Estos
 * tests llenan TODO con datos hostiles y miran que ninguna etiqueta ajena
 * llegue a la salida.
 */

const VENENO = '<img src=x onerror=alert(1)>';
const COMILLAS = '"><svg onload=alert(1)>';

/** Etiquetas que las vistas generan a propósito. Cualquier otra es una fuga. */
const PROPIAS = new Set([
  'a', 'article', 'aside', 'br', 'button', 'code', 'dialog', 'div', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'header', 'hr', 'input', 'label',
  'legend', 'li', 'mark', 'nav', 'ol', 'option', 'p', 'section', 'select', 'span', 'strong', 'table', 'tbody', 'td', 'textarea', 'th', 'thead', 'tr', 'ul',
]);

const etiquetas = (html: string): string[] => [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1].toLowerCase());

/**
 * Atributos de evento (onclick=, onerror=…) que el código propio no pone nunca.
 *
 * Se buscan en las etiquetas reales, DESPUÉS de quitar los valores entre
 * comillas. Dos motivos: el texto escapado que se le muestra a la persona
 * ("&lt;img onerror=…&gt;") y el contenido de un `value="…"` los incluyen como
 * texto inofensivo, y eso es lo correcto. Y si el escape fallara, la comilla
 * hostil cerraría el valor antes de tiempo y el `onerror=` quedaría AFUERA de
 * las comillas, que es justo lo que esto detecta.
 */
const eventos = (html: string): string[] =>
  [...html.matchAll(/<[a-zA-Z][^>]*>/g)].flatMap((t) =>
    [...t[0].replace(/"[^"]*"/g, '""').matchAll(/\son[a-z]+\s*=/gi)].map((m) => m[0].trim()),
  );

function hostil(): Organizacion {
  const o = orgCompleta();
  o.nombre = VENENO;
  o.sedes = COMILLAS;
  o.alcance = VENENO;
  o.respuestas = Object.fromEntries(Object.keys(o.respuestas).map((k) => [k, `${VENENO}\n${COMILLAS}`]));
  o.respuestas.disena = 'si';
  o.procesos = o.procesos.map((p) => ({ ...p, nombre: VENENO, responsable: COMILLAS, objetivo: VENENO, entradas: COMILLAS, salidas: VENENO, indicador: COMILLAS }));
  o.registros = [{ id: COMILLAS, titulo: VENENO, tipo: 'registro', cubre: ['7.2'], fecha: '2026-09-01', proceso: VENENO, responsable: COMILLAS }];
  o.id = 'id-hostil';
  const p = plantillas.find((x) => x.id === 'politica-integrada')!;
  o.documentos = [{ ...nuevoDocumento(p, `${VENENO} ${COMILLAS}\n\n# ${VENENO}`), aprobadoPor: COMILLAS }];
  return o;
}

describe('ninguna vista deja pasar HTML de los datos', () => {
  const org = hostil();
  const vistas: [string, () => string][] = [
    ['inicio', () => vistaInicio([org], [{ clave: COMILLAS, motivo: VENENO }], HOY)],
    ['panel', () => vistaPanel(org, HOY)],
    ['entrevista', () => vistaEntrevista(org)],
    ['documentos', () => vistaDocumentos(org)],
    ['documento', () => vistaDocumento(org, 'politica-integrada')],
    ['documento sin generar', () => vistaDocumento(org, 'manual-sgi')],
    ['documento inexistente', () => vistaDocumento(org, VENENO)],
    ['evidencia', () => vistaEvidencia(org, HOY, { norma: 'todas', estado: 'todos' })],
    ['datos', () => vistaDatos(org)],
  ];

  for (const [nombre, vista] of vistas) {
    test(`${nombre}: sin etiquetas ajenas ni manejadores de eventos`, () => {
      const html = vista();
      assert.deepEqual(etiquetas(html).filter((t) => !PROPIAS.has(t)), [], `se coló una etiqueta en ${nombre}`);
      assert.deepEqual(eventos(html), [], `hay un atributo de evento en ${nombre}`);
    });

    test(`${nombre}: el dato hostil aparece como texto visible`, () => {
      const html = vista();
      assert.ok(!html.includes(VENENO), `${nombre}: el HTML hostil salió sin escapar`);
      assert.ok(!html.includes('"><svg'), `${nombre}: las comillas hostiles salieron sin escapar`);
    });
  }

  test('el nombre hostil se ve, pero escapado', () => {
    assert.match(vistaPanel(org, HOY), /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  test('los ids hostiles no rompen un atributo href', () => {
    const html = vistaInicio([org], [], HOY);
    assert.doesNotMatch(html, /href="[^"]*"[^>]*svg/);
    assert.match(html, /href="#\/o\/id-hostil"/);
  });
});

describe('las pantallas muestran lo que corresponde', () => {
  test('el inicio vacío explica y ofrece crear o probar el ejemplo', () => {
    const html = vistaInicio([], [], HOY);
    assert.match(html, /Todavía no cargaste ninguna/);
    assert.match(html, /data-accion="cargar-ejemplo"/);
    assert.match(html, /Los datos quedan sólo en este navegador/);
    assert.match(html, /data-accion="exportar-todo" disabled/);
  });

  test('una entrada guardada que no se pudo leer se informa y dice que no se borró', () => {
    const html = vistaInicio([], [{ clave: 'trinorm:org:x', motivo: 'Falta el texto de "id".' }], HOY);
    assert.match(html, /no se pudo leer/);
    assert.match(html, /No se borró nada/);
  });

  test('el panel de una organización nueva pide lo primero: el alcance', () => {
    const o = orgCompleta();
    o.alcance = '';
    assert.match(vistaPanel(o, HOY), /Siguiente paso.*organización y su alcance/s);
  });

  test('el estado de la evidencia aclara que no es cumplimiento', () => {
    assert.match(vistaPanel(orgCompleta(), HOY), /no el cumplimiento de la norma/);
  });

  test('un documento aprobado muestra quién y cuándo, y avisa que editarlo quita la aprobación', () => {
    const o = conDocumentosAprobados(orgCompleta());
    const html = vistaDocumento(o, 'politica-integrada');
    assert.match(html, /Aprobado por <strong>Dirección<\/strong> el 2026-10-04/);
    assert.match(html, /pierde la aprobación/);
    assert.doesNotMatch(html, /data-form="aprobar"/);
  });

  test('un documento con marcas explica por qué no se aprueba y no ofrece aprobar', () => {
    const o = orgCompleta();
    const p = plantillas.find((x) => x.id === 'riesgos-oportunidades')!;
    o.documentos = [nuevoDocumento(p, redactar(p, o, plantillas, HOY))];
    const html = vistaDocumento(o, p.id);
    assert.match(html, /No se puede aprobar todavía/);
    assert.doesNotMatch(html, /data-form="aprobar"/);
    assert.match(html, /<mark class="falta">/);
  });

  test('un formulario no se aprueba como evidencia', () => {
    const o = orgCompleta();
    const p = plantillas.find((x) => x.id === 'for-acta')!;
    o.documentos = [nuevoDocumento(p, redactar(p, o, plantillas, HOY))];
    const html = vistaDocumento(o, p.id);
    assert.match(html, /no se aprueba como evidencia/);
    assert.doesNotMatch(html, /data-form="aprobar"/);
  });

  test('la lista de documentos muestra el diseño excluido con su motivo', () => {
    const o = orgCompleta(['9001'], { disena: 'no' });
    const html = vistaDocumentos(o);
    assert.match(html, /Excluidos/);
    assert.match(html, /no diseña/);
    assert.doesNotMatch(html, /Procedimiento de diseño y desarrollo<\/a>/);
  });

  test('la entrevista sólo trae las preguntas de las normas elegidas', () => {
    const html = vistaEntrevista(orgCompleta(['14001']));
    assert.match(html, /aspectos_ambientales/);
    assert.doesNotMatch(html, /data-clave="peligros"/);
    assert.doesNotMatch(html, /data-clave="disena"/);
  });

  test('la evidencia ofrece cargar registros y llevar a los documentos que faltan', () => {
    const html = vistaEvidencia(orgCompleta(), HOY, { norma: 'todas', estado: 'pendientes' });
    assert.match(html, /data-accion="abrir-registro"/);
    assert.match(html, /Ir a «/);
  });

  test('el filtro por norma deja sólo requisitos de esa norma', () => {
    const todas = vistaEvidencia(orgCompleta(), HOY, { norma: 'todas', estado: 'todos' });
    const una = vistaEvidencia(orgCompleta(), HOY, { norma: '14001', estado: 'todos' });
    assert.ok((una.match(/class="req"/g) ?? []).length < (todas.match(/class="req"/g) ?? []).length);
    assert.doesNotMatch(una, /Diseño y desarrollo/);
  });

  test('el diálogo de registro no admite fechas futuras', () => {
    const html = vistaEvidencia(orgCompleta(), HOY, { norma: 'todas', estado: 'todos' });
    assert.match(html, /name="fecha" type="date" required max="2026-10-04"/);
  });
});

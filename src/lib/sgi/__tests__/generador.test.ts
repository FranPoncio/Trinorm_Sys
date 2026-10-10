import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { aprobar, editar, enRevision, falta, fueEditado, nuevoDocumento, puedeAprobar, redactar, regenerar, restaurar } from '../generador.ts';
import { plantilla, plantillas } from '../plantillas.ts';
import { HOY, orgCompleta, orgVacia } from './fabrica.ts';

const LARGO = 'Un contenido lo bastante largo como para no parecer vacío. '.repeat(3);
const hoyMas = (dias: number) => new Date(HOY.getTime() + dias * 86400000);
const base = () => nuevoDocumento(plantilla('politica-integrada')!, LARGO);

describe('ciclo de vida del documento', () => {
  test('nace como borrador, versión 1, con su texto como lo generado', () => {
    const d = base();
    assert.equal(d.estado, 'borrador');
    assert.equal(d.version, 1);
    assert.equal(d.contenido, d.generado);
    assert.deepEqual(d.historial, []);
    assert.equal(fueEditado(d), false);
  });

  test('con marcas sin resolver no se puede aprobar, y el motivo dice cuántas', () => {
    const d = { ...base(), contenido: `${LARGO} ${falta('uno')} ${falta('dos')}` };
    assert.match(puedeAprobar(d)!, /2 marcas/);
    assert.throws(() => aprobar(d, 'Dirección', HOY), /2 marcas/);
    assert.match(puedeAprobar({ ...d, contenido: `${LARGO} ${falta('uno')}` })!, /1 marca /);
  });

  test('un documento casi vacío tampoco se aprueba', () => {
    assert.match(puedeAprobar({ ...base(), contenido: 'ok' })!, /vacío/);
  });

  test('aprobar exige decir quién', () => {
    assert.throws(() => aprobar(base(), '   ', HOY), /quién aprueba/);
  });

  test('aprobar fija fecha y responsable', () => {
    const d = aprobar(base(), '  Ana Pérez ', HOY);
    assert.equal(d.estado, 'aprobado');
    assert.equal(d.fechaAprobacion, '2026-10-04');
    assert.equal(d.aprobadoPor, 'Ana Pérez');
  });

  test('editar un documento aprobado le quita la aprobación: lo firmado era otro texto', () => {
    const aprobado = aprobar(base(), 'Ana', HOY);
    const nuevo = editar(aprobado, `${LARGO} cambio`, hoyMas(5));
    assert.equal(nuevo.estado, 'borrador');
    assert.equal(nuevo.fechaAprobacion, undefined);
    assert.equal(nuevo.aprobadoPor, undefined);
    assert.equal(nuevo.version, 2);
    assert.equal(nuevo.historial.length, 1);
    assert.equal(nuevo.historial[0].contenido, LARGO);
    assert.equal(nuevo.historial[0].version, 1);
    assert.equal(fueEditado(nuevo), true);
  });

  test('guardar sin cambios no crea una versión', () => {
    const d = base();
    assert.equal(editar(d, d.contenido, HOY), d);
  });

  test('editar no muta el original', () => {
    const d = base();
    editar(d, `${LARGO} x`, HOY);
    assert.equal(d.version, 1);
    assert.equal(d.historial.length, 0);
  });

  test('restaurar vuelve a un texto anterior como versión NUEVA: la historia no se reescribe', () => {
    const v2 = editar(base(), `${LARGO} segundo`, HOY);
    const v3 = restaurar(v2, 1, HOY)!;
    assert.equal(v3.contenido, LARGO);
    assert.equal(v3.version, 3);
    assert.equal(v3.historial.length, 2);
    assert.match(v3.historial[1].nota, /Restaurada la versión 1/);
  });

  test('restaurar una versión que no existe devuelve undefined', () => {
    assert.equal(restaurar(base(), 99, HOY), undefined);
  });

  test('regenerar conserva la edición anterior y actualiza lo generado', () => {
    const editado = editar(base(), `${LARGO} mi cambio manual`, HOY);
    const r = regenerar(editado, 'texto nuevo generado', HOY);
    assert.equal(r.contenido, 'texto nuevo generado');
    assert.equal(r.generado, 'texto nuevo generado');
    assert.equal(fueEditado(r), false);
    assert.ok(r.historial.some((h) => h.contenido.includes('mi cambio manual')), 'la edición manual se perdió');
    assert.match(r.historial.at(-1)!.nota, /Regenerado/);
  });

  test('pasar a revisión sólo afecta a los borradores', () => {
    assert.equal(enRevision(base()).estado, 'en_revision');
    const aprobado = aprobar(base(), 'Ana', HOY);
    assert.equal(enRevision(aprobado).estado, 'aprobado');
  });
});

describe('redactar', () => {
  test('es determinista: mismos datos, mismo documento', () => {
    const p = plantilla('manual-sgi')!;
    assert.equal(redactar(p, orgCompleta(), plantillas, HOY), redactar(p, orgCompleta(), plantillas, HOY));
  });

  test('no modifica la organización', () => {
    const org = orgCompleta();
    const antes = JSON.stringify(org);
    for (const p of plantillas) redactar(p, org, plantillas, HOY);
    assert.equal(JSON.stringify(org), antes);
  });

  test('toda plantilla produce un documento con título y al menos una sección', () => {
    for (const p of plantillas) {
      const md = redactar(p, orgVacia(), plantillas, HOY);
      assert.ok(md.startsWith(`# ${p.titulo}`), p.id);
      assert.match(md, /\n## 1\. /, p.id);
    }
  });

  test('un dato con caracteres de Markdown no rompe la estructura de las tablas', () => {
    const org = orgCompleta(['9001'], { objetivos: 'Bajar | costos — kpi | mensual — 10%' });
    const md = redactar(plantilla('objetivos')!, org, plantillas, HOY);
    for (const linea of md.split('\n').filter((l) => l.startsWith('|'))) {
      const celdas = linea.replace(/\\\|/g, '').split('|').length;
      assert.ok(celdas >= 3, linea);
    }
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar } from '../modelo.ts';
import type { Evidencia, Requisito } from '../modelo.ts';
import { requisitos } from '../normas.ts';
import { avanceEntrevista, contestada, preguntas, preguntasDe, pregunta, procesoCompleto } from '../entrevista.ts';
import { coberturaDe, esFechaISO, isoLocal, lineas, nuevaOrganizacion, requisitosAplicables, validarOrganizacion } from '../organizacion.ts';
import { cubreDe } from '../plantillas.ts';
import { HOY, conDocumentosAprobados, orgCompleta, orgVacia } from './fabrica.ts';

describe('utilidades', () => {
  test('esFechaISO sólo acepta días que existen', () => {
    for (const ok of ['2026-10-04', '2028-02-29', '2026-12-31', '2026-01-01']) assert.equal(esFechaISO(ok), true, ok);
    for (const mal of ['2026-02-30', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-10-00', '2026-1-4', '26-10-04', '', 'hoy', '2026-10-04T00:00']) {
      assert.equal(esFechaISO(mal), false, mal);
    }
  });

  test('lineas: un ítem por línea, sin vacíos ni viñetas escritas a mano', () => {
    assert.deepEqual(lineas('a\n\n  - b \n* c\n• d\n   '), ['a', 'b', 'c', 'd']);
    assert.deepEqual(lineas(undefined), []);
  });

  test('isoLocal usa la hora local: no salta de día de noche', () => {
    assert.equal(isoLocal(new Date(2026, 9, 4, 23, 30)), '2026-10-04');
    assert.equal(isoLocal(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  });

  test('nuevaOrganizacion limpia espacios y se queda con las normas válidas, sin repetir', () => {
    const o = nuevaOrganizacion(
      { nombre: '  Acme  ', rubro: 'servicios', empleados: 5, sedes: ' Rosario ', normas: ['45001', '9001', '9001', 'x' as never] },
      HOY,
      'id-1',
    );
    assert.equal(o.nombre, 'Acme');
    assert.equal(o.sedes, 'Rosario');
    assert.deepEqual(o.normas, ['9001', '45001']);
    assert.equal(o.esquema, 1);
  });
});

describe('validarOrganizacion: un archivo de afuera no se da por bueno', () => {
  const buena = () => JSON.parse(JSON.stringify(orgCompleta()));

  test('acepta lo que ella misma produce, sin cambiarlo', () => {
    const o = orgCompleta();
    assert.deepEqual(validarOrganizacion(JSON.parse(JSON.stringify(o))), o);
  });

  test('rechaza lo que no es un objeto, con mensaje', () => {
    for (const x of [null, 'texto', 5, [], undefined]) assert.throws(() => validarOrganizacion(x), /Se esperaba un objeto/);
  });

  test('rechaza un esquema desconocido', () => {
    assert.throws(() => validarOrganizacion({ ...buena(), esquema: 2 }), /Formato desconocido/);
    assert.throws(() => validarOrganizacion({ ...buena(), esquema: undefined }), /Formato desconocido/);
  });

  test('rechaza campos obligatorios ausentes o de tipo equivocado', () => {
    assert.throws(() => validarOrganizacion({ ...buena(), id: undefined }), /id/);
    assert.throws(() => validarOrganizacion({ ...buena(), nombre: 42 }), /nombre/);
    assert.throws(() => validarOrganizacion({ ...buena(), normas: 'todas' }), /lista/);
  });

  test('rechaza fechas inventadas', () => {
    assert.throws(() => validarOrganizacion({ ...buena(), creada: '04/10/2026' }), /fecha/);
    assert.throws(() => validarOrganizacion({ ...buena(), creada: '2026-13-45' }), /fecha/);
    // El motor de JS acepta estas y las corre a otro mes en silencio: acá no.
    assert.throws(() => validarOrganizacion({ ...buena(), creada: '2026-02-30' }), /fecha/);
    assert.throws(() => validarOrganizacion({ ...buena(), creada: '2025-02-29' }), /fecha/);
    assert.throws(() => validarOrganizacion({ ...buena(), creada: '2026-04-31' }), /fecha/);
    assert.doesNotThrow(() => validarOrganizacion({ ...buena(), creada: '2028-02-29' }));
    assert.throws(() => validarOrganizacion({ ...buena(), hitos: { etapa1: 'ayer' } }), /etapa1/);
  });

  test('rechaza textos desmesurados en vez de guardarlos', () => {
    assert.throws(() => validarOrganizacion({ ...buena(), nombre: 'x'.repeat(201) }), /demasiado largo/);
  });

  test('descarta lo desconocido y las normas que no existen', () => {
    const o = validarOrganizacion({ ...buena(), normas: ['9001', '27001', 7], inyectado: '<script>', rubro: 'inventado' });
    assert.deepEqual(o.normas, ['9001']);
    assert.equal(o.rubro, 'otro');
    assert.ok(!('inyectado' in o));
  });

  test('un documento aprobado sin fecha de aprobación no se acepta como aprobado', () => {
    const org = buena();
    org.documentos = [{ id: 'politica-integrada', titulo: 'P', version: 1, estado: 'aprobado', contenido: 'x', generado: 'x', historial: [] }];
    assert.equal(validarOrganizacion(org).documentos[0].estado, 'en_revision');
  });

  test('un registro cargado siempre queda como registro, aunque el archivo diga otra cosa', () => {
    const org = buena();
    org.registros = [{ id: 'r', titulo: 'T', tipo: 'documento', cubre: ['7.2'], fecha: '2026-01-01', proceso: 'P', responsable: 'R' }];
    assert.equal(validarOrganizacion(org).registros[0].tipo, 'registro');
  });

  test('un registro con claves las conserva; sin claves, no las inventa', () => {
    const org = buena();
    const base = { id: 'r', titulo: 'T', tipo: 'registro', cubre: ['7.2'], fecha: '2026-01-01', proceso: 'P', responsable: 'R' };
    org.registros = [{ ...base, claves: ['x'] }, base];
    const [a, b] = validarOrganizacion(org).registros;
    assert.deepEqual(a.claves, ['x']);
    assert.ok(!('claves' in b));
  });
});

describe('la entrevista', () => {
  test('las claves son únicas y los tipos coherentes', () => {
    assert.equal(new Set(preguntas.map((p) => p.clave)).size, preguntas.length);
    for (const p of preguntas) {
      if (p.tipo === 'opcion') assert.ok(p.opciones && p.opciones.length >= 2, p.clave);
      else assert.equal(p.opciones, undefined, p.clave);
      assert.ok(p.etiqueta.trim().length > 0, `${p.clave} sin etiqueta: la marca saldría vacía`);
      assert.ok(p.texto.trim().length > 20, `${p.clave} sin pregunta`);
    }
  });

  test('una organización vacía parte en 0 y la completa llega a 100', () => {
    assert.equal(avanceEntrevista(orgVacia()).porcentaje, 0);
    const lleno = avanceEntrevista(orgCompleta());
    assert.equal(lleno.porcentaje, 100);
    assert.equal(lleno.pendientes.length, 0);
  });

  test('sólo se pregunta lo que corresponde a las normas elegidas', () => {
    const sin9001 = preguntasDe(orgVacia(['14001'])).map((p) => p.clave);
    assert.ok(!sin9001.includes('disena'));
    assert.ok(!sin9001.includes('proveedores_criticos'));
    assert.ok(sin9001.includes('aspectos_ambientales'));
    assert.ok(!sin9001.includes('peligros'));
    assert.ok(preguntasDe(orgVacia(['45001'])).some((p) => p.clave === 'peligros'));
  });

  test('las preguntas del tronco aplican a las tres', () => {
    for (const n of ['9001', '14001', '45001'] as const) {
      const claves = preguntasDe(orgVacia([n])).map((p) => p.clave);
      for (const k of ['actividad', 'etapas', 'cuando_sale_mal', 'objetivos']) assert.ok(claves.includes(k), `${k} en ${n}`);
    }
  });

  test('"no" es una respuesta; espacios y viñetas vacías no', () => {
    const org = orgVacia();
    org.respuestas = { tercerizados: 'no', riesgos: '  \n - \n', actividad: '   ' };
    assert.equal(contestada(org, pregunta('tercerizados')!), true);
    assert.equal(contestada(org, pregunta('riesgos')!), false);
    assert.equal(contestada(org, pregunta('actividad')!), false);
  });

  test('las preguntas opcionales no frenan el avance', () => {
    const org = orgCompleta();
    for (const p of preguntas.filter((x) => !x.requerida)) delete org.respuestas[p.clave];
    assert.equal(avanceEntrevista(org).porcentaje, 100);
  });

  test('un proceso está completo con nombre, responsable y objetivo', () => {
    const p = orgCompleta().procesos[0];
    assert.equal(procesoCompleto(p), true);
    assert.equal(procesoCompleto({ ...p, responsable: ' ' }), false);
    assert.equal(procesoCompleto({ ...p, objetivo: '' }), false);
  });
});

describe('requisitos aplicables y cobertura de la organización', () => {
  test('el tronco aplica con cualquier norma; lo propio, sólo con la suya', () => {
    const r14 = requisitosAplicables(orgVacia(['14001']));
    assert.ok(r14.some((r) => r.id === '4.1'));
    assert.ok(r14.some((r) => r.id === '14001:6.1.2'));
    assert.ok(!r14.some((r) => r.id.startsWith('9001:') || r.id.startsWith('45001:')));
  });

  test('sin ninguna norma elegida no hay nada que cumplir', () => {
    assert.equal(requisitosAplicables(orgVacia([])).length, 0);
  });

  test('un borrador NO cuenta como evidencia: sólo lo aprobado', () => {
    const org = orgCompleta(['9001']);
    org.documentos = [{ id: 'politica-integrada', titulo: 'P', version: 1, estado: 'borrador', contenido: 'x'.repeat(100), generado: '', historial: [] }];
    const c = coberturaDe(org, HOY, cubreDe).find((x) => x.requisito.id === '5.2')!;
    assert.notEqual(c.estado, 'cubierto');
    org.documentos[0] = { ...org.documentos[0], estado: 'en_revision' };
    assert.notEqual(coberturaDe(org, HOY, cubreDe).find((x) => x.requisito.id === '5.2')!.estado, 'cubierto');
  });

  test('aprobar un documento cubre su parte documental, pero el requisito sigue pidiendo sus registros', () => {
    const org = conDocumentosAprobados(orgCompleta(['9001']));
    const c = coberturaDe(org, HOY, cubreDe).find((x) => x.requisito.id === '5.2')!;
    // La política pide el documento Y el registro de su difusión: el papel solo no alcanza.
    assert.deepEqual(c.requisito.evidencias.map((e) => e.clave), ['politica', 'difusion-politica']);
    assert.equal(c.estado, 'parcial');
    assert.equal(c.aportan['politica']?.length, 1);
    assert.deepEqual(c.faltan, ['difusion-politica']);
  });

  test('un documento aprobado cuenta sólo para las claves que su plantilla cubre', () => {
    const org = conDocumentosAprobados(orgCompleta(['9001']));
    const cob = coberturaDe(org, HOY, cubreDe);
    for (const c of cob) {
      for (const [clave, evs] of Object.entries(c.aportan)) {
        const pedida = c.requisito.evidencias.find((e) => e.clave === clave)!;
        if (pedida.tipo === 'documento') assert.ok(evs.every((e) => e.claves?.includes(clave)), `${c.requisito.id}/${clave}`);
      }
    }
  });

  test('cargar un registro de una clave no cubre otra del mismo requisito', () => {
    const base = requisitos.find((r) => r.evidencias.filter((e) => e.tipo === 'registro').length >= 2)!;
    const [r1, r2] = base.evidencias.filter((e) => e.tipo === 'registro');
    const org = orgCompleta();
    org.registros = [{ id: 'x', titulo: 'x', tipo: 'registro', cubre: [base.id], claves: [r1.clave], fecha: isoLocal(HOY), proceso: '', responsable: '' }];
    const c = coberturaDe(org, HOY, cubreDe).find((x) => x.requisito.id === base.id)!;
    assert.ok(!c.faltan.includes(r1.clave));
    assert.ok(c.faltan.includes(r2.clave), `${r2.clave} no debería quedar cubierta por el registro de ${r1.clave}`);
  });
});

describe('motor: las claves son opcionales y no rompen la demostración', () => {
  const req: Requisito = {
    id: 't', clausula: '1', titulo: 'T', normas: ['9001'], tronco: false, procesos: [], preguntas: [],
    evidencias: [
      { clave: 'acta', tipo: 'registro', descripcion: '', vigenciaMeses: 12 },
      { clave: 'planilla', tipo: 'registro', descripcion: '', vigenciaMeses: 12 },
    ],
  };
  const ev = (extra: Partial<Evidencia> = {}): Evidencia => ({
    id: 'e', titulo: 'E', tipo: 'registro', cubre: ['t'], fecha: '2026-09-01', proceso: '', responsable: '', ...extra,
  });

  test('sin claves, cuenta para cualquier registro del requisito (comportamiento anterior)', () => {
    assert.equal(evaluar(req, [ev()], HOY).estado, 'cubierto');
  });

  test('con claves, sólo cuenta para esas', () => {
    const c = evaluar(req, [ev({ claves: ['acta'] })], HOY);
    assert.equal(c.estado, 'parcial');
    assert.deepEqual(c.faltan, ['planilla']);
  });

  test('dos evidencias con claves distintas cubren las dos', () => {
    const c = evaluar(req, [ev({ claves: ['acta'] }), ev({ id: 'f', claves: ['planilla'] })], HOY);
    assert.equal(c.estado, 'cubierto');
  });

  test('una lista de claves vacía no cubre nada', () => {
    assert.equal(evaluar(req, [ev({ claves: [] })], HOY).estado, 'sin_cubrir');
  });
});

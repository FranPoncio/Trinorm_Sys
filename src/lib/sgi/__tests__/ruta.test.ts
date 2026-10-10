import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { requisitosAplicables, isoLocal } from '../organizacion.ts';
import type { Evidencia } from '../modelo.ts';
import type { Organizacion } from '../organizacion.ts';
import { quitarHito, registrarHito, ruta, siguientePaso } from '../ruta.ts';
import { plantillasDe } from '../plantillas.ts';
import { HOY, conDocumentosAprobados, orgCompleta, orgVacia } from './fabrica.ts';

const etapa = (org: Organizacion, id: string) => ruta(org, HOY).find((e) => e.id === id)!;
const dia = (offset: number) => isoLocal(new Date(HOY.getTime() + offset * 86400000));

/** Un registro vigente para cada registro que el corpus le pide a la organización. */
function registrosDeTodo(org: Organizacion): Evidencia[] {
  return requisitosAplicables(org).flatMap((r) =>
    r.evidencias
      .filter((e) => e.tipo === 'registro')
      .map((e): Evidencia => ({
        id: `${r.id}:${e.clave}`, titulo: e.clave, tipo: 'registro', cubre: [r.id], claves: [e.clave], fecha: dia(-10), proceso: '', responsable: '',
      })),
  );
}

/** La organización llevada hasta el punto indicado. */
function hasta(punto: 'implementada' | 'auditada' | 'revisada' | 'etapa1' | 'etapa2' | 'nc' | 'certificada'): Organizacion {
  let org = conDocumentosAprobados(orgCompleta());
  org = { ...org, registros: registrosDeTodo(org) };
  const pasos: [typeof punto, Parameters<typeof registrarHito>[1], number][] = [
    ['auditada', 'auditoria_interna', -9],
    ['revisada', 'revision_direccion', -8],
    ['etapa1', 'etapa1', -7],
    ['etapa2', 'etapa2', -6],
    ['nc', 'nc_cerradas', -5],
    ['certificada', 'certificado', -4],
  ];
  if (punto === 'implementada') return org;
  for (const [nombre, hito, off] of pasos) {
    org = registrarHito(org, hito, dia(off), HOY);
    if (nombre === punto) break;
  }
  return org;
}

describe('la ruta desde cero', () => {
  test('una organización vacía tiene diez etapas, sólo la primera accesible', () => {
    const e = ruta(orgVacia(), HOY);
    assert.equal(e.length, 10);
    assert.deepEqual(e.map((x) => x.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(e[0].estado, 'en_curso'); // el nombre y las normas ya están cargados
    assert.ok(e.slice(1).every((x) => x.estado === 'bloqueada'));
  });

  test('la etapa bloqueada dice qué la bloquea', () => {
    const e = etapa(orgVacia(), 'entrevista');
    assert.equal(e.estado, 'bloqueada');
    assert.match(e.bloqueadaPor!, /organización y su alcance/);
  });

  test('el siguiente paso es concreto: dice qué hacer, no "avanzar"', () => {
    const paso = siguientePaso(ruta(orgVacia(), HOY))!;
    assert.equal(paso.id, 'organizacion');
    assert.match(paso.accion, /alcance/);
  });

  test('sin alcance ni procesos, la primera etapa no se completa', () => {
    const org = orgVacia();
    assert.equal(etapa(org, 'organizacion').progreso!.hecho, 2); // nombre y normas
    assert.equal(etapa(org, 'organizacion').estado, 'en_curso');
  });

  test('con la organización definida, pasa la primera y la entrevista queda disponible', () => {
    const org = { ...orgCompleta(), respuestas: {} };
    assert.equal(etapa(org, 'organizacion').estado, 'completa');
    assert.equal(etapa(org, 'entrevista').estado, 'pendiente');
    assert.match(etapa(org, 'entrevista').accion, /^Contestá: /);
  });
});

describe('documentos e implementación', () => {
  test('con la entrevista completa se pide generar el primer documento por nombre', () => {
    const e = etapa(orgCompleta(), 'documentos');
    assert.equal(e.estado, 'pendiente');
    assert.match(e.accion, /^Generá «Manual del sistema de gestión»/);
    assert.equal(e.progreso!.hecho, 0);
  });

  test('los formularios no cuentan para la etapa de documentos', () => {
    const org = orgCompleta();
    const docs = plantillasDe(org).filter((p) => p.cubre.length > 0).length;
    assert.equal(etapa(org, 'documentos').progreso!.total, docs);
    assert.ok(docs < plantillasDe(org).length);
  });

  test('un documento con marcas pide completarlas; sin marcas, pide aprobar', () => {
    const org = orgCompleta();
    org.documentos = [{ id: 'manual-sgi', titulo: 'M', version: 1, estado: 'borrador', contenido: 'x ⟦COMPLETAR: a⟧ ⟦COMPLETAR: b⟧', generado: '', historial: [] }];
    assert.match(etapa(org, 'documentos').accion, /Completá las 2 marcas pendientes de «Manual/);
    org.documentos[0].contenido = 'Texto completo sin marcas pendientes.';
    assert.match(etapa(org, 'documentos').accion, /Revisá y aprobá «Manual/);
  });

  test('aprobados todos los documentos, la etapa se completa pero la implementación recién empieza', () => {
    const org = conDocumentosAprobados(orgCompleta());
    assert.equal(etapa(org, 'documentos').estado, 'completa');
    const impl = etapa(org, 'implementacion');
    assert.notEqual(impl.estado, 'completa', 'los papeles solos no implementan nada');
    assert.match(impl.accion, /\d/);
  });

  test('con todos los registros vigentes, la implementación se completa', () => {
    const org = hasta('implementada');
    const impl = etapa(org, 'implementacion');
    assert.equal(impl.estado, 'completa');
    assert.equal(impl.progreso!.hecho, impl.progreso!.total);
  });

  test('un registro vencido saca a la implementación de completa', () => {
    const org = hasta('implementada');
    org.registros = org.registros.map((r, i) => (i === 0 ? { ...r, fecha: '2020-01-01' } : r));
    assert.notEqual(etapa(org, 'implementacion').estado, 'completa');
  });

  test('si lo que falta está vencido, es lo primero que se pide', () => {
    const org = hasta('implementada');
    const r0 = org.registros[0];
    org.registros = [{ ...r0, fecha: '2019-01-01' }, ...org.registros.slice(1)];
    org.registros = org.registros.filter((r) => r.id !== org.registros[5].id); // y uno sin cubrir
    const accion = etapa(org, 'implementacion').accion;
    const req = requisitosAplicables(org).find((r) => r.id === r0.cubre[0])!;
    assert.ok(accion.includes(req.titulo), accion);
  });
});

describe('los hitos que ocurren afuera', () => {
  test('no se registran si falta una etapa anterior', () => {
    assert.throws(() => registrarHito(orgVacia(), 'auditoria_interna', dia(-1), HOY), /Primero hay que completar/);
    assert.throws(() => registrarHito(conDocumentosAprobados(orgCompleta()), 'etapa1', dia(-1), HOY), /Primero hay que completar: Revisión por la dirección/);
  });

  test('la etapa 2 exige además la implementación completa', () => {
    let org = conDocumentosAprobados(orgCompleta());
    org = registrarHito(org, 'auditoria_interna', dia(-9), HOY);
    org = registrarHito(org, 'revision_direccion', dia(-8), HOY);
    org = registrarHito(org, 'etapa1', dia(-7), HOY);
    assert.throws(() => registrarHito(org, 'etapa2', dia(-6), HOY), /Implementar/);
    org = { ...org, registros: registrosDeTodo(org) };
    assert.doesNotThrow(() => registrarHito(org, 'etapa2', dia(-6), HOY));
  });

  test('una fecha futura no es un hito cumplido', () => {
    const org = hasta('implementada');
    assert.throws(() => registrarHito(org, 'auditoria_interna', dia(1), HOY), /futura/);
    assert.doesNotThrow(() => registrarHito(org, 'auditoria_interna', dia(0), HOY));
  });

  test('una fecha inválida se rechaza', () => {
    const org = hasta('implementada');
    for (const f of ['', 'hoy', '2026-02-30', '04/10/2026']) assert.throws(() => registrarHito(org, 'auditoria_interna', f, HOY), /fecha/i, f);
  });

  test('no puede ser anterior al hito que lo precede', () => {
    const org = hasta('auditada');
    assert.throws(() => registrarHito(org, 'revision_direccion', dia(-30), HOY), /anterior a/);
    assert.doesNotThrow(() => registrarHito(org, 'revision_direccion', dia(-9), HOY));
  });

  test('registrar no muta la organización original', () => {
    const org = hasta('implementada');
    registrarHito(org, 'auditoria_interna', dia(-1), HOY);
    assert.deepEqual(org.hitos, {});
  });

  test('quitar un hito del que otros dependen se rechaza, y desde el último sí se puede', () => {
    const org = hasta('etapa1');
    assert.throws(() => quitarHito(org, 'auditoria_interna'), /Primero quitá/);
    const sin = quitarHito(org, 'etapa1');
    assert.equal(sin.hitos.etapa1, undefined);
    assert.equal(etapa(sin, 'etapa1').estado, 'pendiente');
  });

  test('toda la ruta recorrida deja las diez etapas completas y nada pendiente', () => {
    const org = hasta('certificada');
    const e = ruta(org, HOY);
    assert.ok(e.every((x) => x.estado === 'completa'), e.filter((x) => x.estado !== 'completa').map((x) => x.id).join());
    assert.equal(siguientePaso(e), undefined);
    assert.ok(e.every((x) => x.accion === ''));
  });

  test('con el certificado emitido se informa la próxima vigilancia, y la renovación al final del ciclo', () => {
    const org = hasta('certificada');
    assert.match(etapa(org, 'certificado').detalle, /Próxima auditoría de vigilancia, aproximadamente el 2027-/);
    const viejo = { ...org, hitos: { ...org.hitos, certificado: '2023-01-10' } };
    assert.match(etapa(viejo, 'certificado').detalle, /toca la renovación/);
  });

  test('las etapas externas no inventan plazos ni organismos', () => {
    const textos = ruta(hasta('implementada'), HOY).filter((e) => ['etapa1', 'etapa2', 'certificado'].includes(e.id)).map((e) => e.detalle + e.accion).join(' ');
    assert.doesNotMatch(textos, /\d+\s*(días|semanas)/i);
    assert.doesNotMatch(textos, /\bBureau|\bSGS\b|\bTÜV|\bIRAM\b|\bDNV\b/i);
    assert.match(textos, /organismo/);
  });
});

describe('la ruta no promete un porcentaje de cumplimiento', () => {
  test('el progreso son conteos, nunca porcentajes', () => {
    for (const e of ruta(hasta('implementada'), HOY)) {
      if (e.progreso) assert.ok(Number.isInteger(e.progreso.hecho) && Number.isInteger(e.progreso.total), e.id);
      assert.doesNotMatch(e.detalle + e.accion, /\d+\s?%/);
    }
  });
});

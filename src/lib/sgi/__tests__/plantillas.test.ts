/**
 * Las garantías del catálogo de plantillas.
 *
 * Las que importan: que no quede sin dueño ningún documento que el corpus
 * pide; que lo generado salga de lo que la organización contó y no de un
 * molde; y que lo que falta se vea, no se rellene.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { requisitos } from '../normas.ts';
import { contarFaltantes, codigoDe, contexto, falta, partir, redactar, tabla } from '../generador.ts';
import { plantillas, plantilla, plantillasDe, plantillasExcluidas, APORTA_LA_ORGANIZACION, cubreDe } from '../plantillas.ts';
import { exclusionesDe, requisitosAplicables } from '../organizacion.ts';
import { HOY, orgCompleta, orgVacia } from './fabrica.ts';
import type { Norma, RequisitoEvidencia } from '../modelo.ts';

const generar = (id: string, org = orgCompleta()) => redactar(plantilla(id)!, org, plantillas, HOY);

describe('el catálogo cubre el corpus', () => {
  const documentosDelCorpus = requisitos.flatMap((r) =>
    r.evidencias.filter((e) => e.tipo === 'documento').map((e) => ({ requisito: r.id, clave: e.clave })),
  );

  test('cada documento que pide el corpus lo genera exactamente una plantilla', () => {
    for (const { requisito, clave } of documentosDelCorpus) {
      const duenos = plantillas.filter((p) => p.cubre.some((c) => c.requisito === requisito && c.claves.includes(clave)));
      const declarado = `${requisito}:${clave}` in APORTA_LA_ORGANIZACION;
      assert.ok(
        duenos.length + (declarado ? 1 : 0) === 1,
        `${requisito}/${clave}: ${duenos.length} plantillas${declarado ? ' y además declarado' : ''}; tiene que haber exactamente una`,
      );
    }
  });

  test('toda referencia de una plantilla apunta a un documento que existe en el corpus', () => {
    for (const p of plantillas) {
      for (const c of p.cubre) {
        const r = requisitos.find((x) => x.id === c.requisito);
        assert.ok(r, `${p.id} cubre el requisito inexistente ${c.requisito}`);
        for (const clave of c.claves) {
          const pedida: RequisitoEvidencia | undefined = r.evidencias.find((x) => x.clave === clave);
          assert.ok(pedida, `${p.id}: ${c.requisito} no pide "${clave}"`);
          assert.equal(pedida.tipo, 'documento', `${p.id}: "${clave}" es un registro, y un formulario en blanco no lo prueba`);
        }
      }
    }
  });

  /*
   * El motor empareja por tipo, y eso crea un riesgo concreto: si un requisito
   * pide dos documentos y los generan dos plantillas distintas, aprobar UNA
   * sola daría el requisito por cubierto. Por eso un requisito nunca se reparte.
   */
  test('los documentos de un mismo requisito los genera una sola plantilla', () => {
    for (const r of requisitos) {
      const claves = r.evidencias.filter((e) => e.tipo === 'documento').map((e) => e.clave);
      if (claves.length < 2) continue;
      const duenos = new Set(plantillas.filter((p) => p.cubre.some((c) => c.requisito === r.id)).map((p) => p.id));
      assert.equal(duenos.size, 1, `${r.id} reparte sus documentos entre ${[...duenos].join(', ')}`);
    }
  });

  test('una plantilla que cubre un requisito cubre TODOS sus documentos', () => {
    for (const p of plantillas) {
      for (const c of p.cubre) {
        const pedidos = requisitos.find((r) => r.id === c.requisito)!.evidencias.filter((e) => e.tipo === 'documento').map((e) => e.clave);
        assert.deepEqual([...c.claves].sort(), [...pedidos].sort(), `${p.id} cubre incompleto ${c.requisito}`);
      }
    }
  });

  test('los formularios no cubren nada: el papel en blanco no es un registro', () => {
    const formularios = plantillas.filter((p) => p.tipo === 'formulario');
    assert.ok(formularios.length >= 6);
    for (const f of formularios) assert.deepEqual(f.cubre, [], f.id);
  });

  test('los ids son únicos y los códigos también', () => {
    assert.equal(new Set(plantillas.map((p) => p.id)).size, plantillas.length);
    const codigos = plantillas.map((p) => codigoDe(p, plantillas));
    assert.equal(new Set(codigos).size, codigos.length);
    for (const c of codigos) assert.match(c, /^(POL|MAN|PRO|MAT|PLA|FOR)-\d{2}$/);
  });
});

describe('lo generado sale de lo que la organización contó', () => {
  test('una organización sin respuestas obtiene marcas, no relleno', () => {
    const md = generar('manual-sgi', orgVacia());
    assert.match(md, /⟦COMPLETAR: a qué se dedica la organización⟧/);
    assert.match(md, /⟦COMPLETAR: cuestiones externas⟧/);
    assert.ok(contarFaltantes(md) >= 5);
  });

  test('cada plantilla pide sólo claves que existen en la entrevista', () => {
    // `dato` y `lista` lanzan si la clave no existe: generar con todo vacío las ejercita casi todas.
    for (const p of plantillas) assert.doesNotThrow(() => redactar(p, orgVacia(), plantillas, HOY), p.id);
    for (const p of plantillas) assert.doesNotThrow(() => redactar(p, orgCompleta(), plantillas, HOY), p.id);
  });

  test('el dato de la organización llega al documento (y cambia si cambia el dato)', () => {
    const a = generar('control-operacional', orgCompleta(['9001'], { actividad: 'Fabricamos tornillos de acero' }));
    const b = generar('control-operacional', orgCompleta(['9001'], { actividad: 'Prestamos servicios de limpieza' }));
    assert.match(a, /Fabricamos tornillos de acero/);
    assert.match(b, /Prestamos servicios de limpieza/);
    assert.doesNotMatch(b, /tornillos/);
  });

  test('las etapas del proceso se vuelven pasos numerados, en el orden contado', () => {
    const md = generar('produccion-servicio', orgCompleta(['9001'], { etapas: 'Recibir el pedido\nCortar\nSoldar\nEntregar' }));
    assert.match(md, /1\. Recibir el pedido\n2\. Cortar\n3\. Soldar\n4\. Entregar/);
  });

  test('los procesos descritos arman el mapa de procesos', () => {
    const md = generar('manual-sgi');
    assert.match(md, /Producción/);
    assert.match(md, /Responsable de Compras/);
  });

  test('con la entrevista completa, procedimientos, política y manual no dejan marcas', () => {
    // Las matrices y planes sí dejan marcas a propósito: sus columnas las puntúa una persona.
    const sinMarcas = [
      'manual-sgi', 'politica-integrada', 'control-documental', 'control-operacional', 'no-conformidades',
      'atencion-cliente', 'proveedores', 'produccion-servicio', 'salidas-no-conformes', 'satisfaccion-cliente',
      'participacion-trabajadores', 'contratistas-sst', 'incidentes', 'diseno',
    ];
    for (const id of sinMarcas) {
      const md = generar(id);
      assert.equal(contarFaltantes(md), 0, `${id}: ${md.match(/⟦COMPLETAR[^⟧]*⟧/g)?.join(' | ')}`);
    }
  });

  test('las matrices SIEMPRE traen marcas: no se aprueban sin puntuar', () => {
    for (const id of ['riesgos-oportunidades', 'aspectos-ambientales', 'iper', 'legal-ambiental', 'legal-sst']) {
      assert.ok(contarFaltantes(generar(id)) > 0, id);
    }
  });

  test('las matrices legales no inventan leyes: dejan la jurisdicción a la organización', () => {
    for (const id of ['legal-ambiental', 'legal-sst']) {
      const md = generar(id);
      assert.match(md, /no los completa por la organización|no las completa por la organización/);
      assert.doesNotMatch(md, /Ley\s+\d|Decreto\s+\d|Resolución\s+\d/i, `${id} cita una norma concreta`);
    }
  });

  test('los formularios no traen marcas: son un papel en blanco', () => {
    for (const p of plantillas.filter((x) => x.tipo === 'formulario')) {
      assert.equal(contarFaltantes(redactar(p, orgCompleta(), plantillas, HOY)), 0, p.id);
    }
  });

  test('el documento lleva su código, la organización y la trazabilidad a los requisitos', () => {
    const md = generar('politica-integrada');
    assert.match(md, /\| POL-01 \| Org de prueba \| 2026-10-04 \|/);
    assert.match(md, /## Trazabilidad/);
    assert.match(md, /\| 5\.2 \| Política \|/);
  });
});

describe('qué plantillas le tocan a cada organización', () => {
  const combinaciones: Norma[][] = [['9001'], ['14001'], ['45001'], ['9001', '14001'], ['14001', '45001'], ['9001', '14001', '45001']];

  test('sólo las de sus normas', () => {
    for (const normas of combinaciones) {
      for (const p of plantillasDe(orgCompleta(normas))) {
        assert.ok(p.normas.some((n) => normas.includes(n)), `${p.id} no corresponde a ${normas.join('+')}`);
      }
    }
  });

  test('la de una sola norma no aparece en las otras', () => {
    assert.ok(!plantillasDe(orgCompleta(['14001'])).some((p) => p.id === 'iper'));
    assert.ok(!plantillasDe(orgCompleta(['9001'])).some((p) => p.id === 'aspectos-ambientales'));
    assert.ok(plantillasDe(orgCompleta(['45001'])).some((p) => p.id === 'iper'));
  });

  test('el tronco aparece una sola vez aunque haya tres normas', () => {
    const ids = plantillasDe(orgCompleta()).map((p) => p.id);
    assert.equal(ids.filter((i) => i === 'politica-integrada').length, 1);
    assert.equal(new Set(ids).size, ids.length);
  });

  /*
   * La consistencia que más importa: lo que el sistema le pide a la
   * organización y lo que el motor le exige tienen que coincidir. Si una
   * plantilla se excluyera sin excluirse su requisito, el motor pediría
   * para siempre un documento que nadie puede generar.
   */
  test('las plantillas que le tocan cubren exactamente los documentos que el motor le exige', () => {
    for (const normas of combinaciones) {
      for (const disena of ['si', 'no']) {
        const org = orgCompleta(normas, { disena });
        const exigidos = new Set(
          requisitosAplicables(org).flatMap((r) => r.evidencias.filter((e) => e.tipo === 'documento').map((e) => `${r.id}/${e.clave}`)),
        );
        const cubiertos = new Set(plantillasDe(org).flatMap((p) => p.cubre.flatMap((c) => c.claves.map((k) => `${c.requisito}/${k}`))));
        assert.deepEqual([...cubiertos].sort(), [...exigidos].sort(), `normas ${normas.join('+')} disena=${disena}`);
      }
    }
  });
});

describe('exclusiones', () => {
  test('quien no diseña excluye el diseño y desarrollo, con su justificación', () => {
    const org = orgCompleta(['9001'], { disena: 'no' });
    assert.deepEqual(exclusionesDe(org).map((e) => e.requisito), ['9001:8.3']);
    assert.match(exclusionesDe(org)[0].motivo, /no diseña/);
    assert.ok(!requisitosAplicables(org).some((r) => r.id === '9001:8.3'));
    assert.ok(!plantillasDe(org).some((p) => p.id === 'diseno'));
    assert.equal(plantillasExcluidas(org).length, 1);
    assert.match(plantillasExcluidas(org)[0].motivo, /no diseña/);
  });

  test('la exclusión queda escrita en el manual, con su justificación: es lo que pide el auditor', () => {
    const md = generar('manual-sgi', orgCompleta(['9001'], { disena: 'no' }));
    assert.match(md, /\*\*Exclusiones y su justificación:\*\*/);
    assert.match(md, /8\.3 Diseño y desarrollo.*no diseña/);
    assert.doesNotMatch(generar('manual-sgi', orgCompleta(['9001'], { disena: 'si' })), /Exclusiones/);
    assert.doesNotMatch(generar('manual-sgi', orgCompleta(['14001'], { disena: 'no' })), /Exclusiones/);
  });

  test('quien diseña no excluye nada', () => {
    const org = orgCompleta(['9001'], { disena: 'si' });
    assert.deepEqual(exclusionesDe(org), []);
    assert.ok(requisitosAplicables(org).some((r) => r.id === '9001:8.3'));
  });

  test('sin contestar no se excluye: excluir exige haberlo declarado', () => {
    const org = orgCompleta(['9001'], { disena: '' });
    assert.deepEqual(exclusionesDe(org), []);
  });

  test('sin 9001 la pregunta no aplica y no hay exclusión', () => {
    assert.deepEqual(exclusionesDe(orgCompleta(['14001'], { disena: 'no' })), []);
  });
});

describe('la lista de verificación de auditoría', () => {
  test('sale de las preguntas del corpus que le tocan a la organización', () => {
    const md = generar('for-auditoria', orgCompleta(['9001']));
    const unaDe9001 = requisitos.find((r) => r.id === '9001:8.4')!.preguntas[0];
    assert.ok(md.includes(unaDe9001.replace(/\|/g, '/')));
  });

  test('con una sola norma no trae preguntas de las otras', () => {
    const md = generar('for-auditoria', orgCompleta(['14001']));
    const soloDe45001 = requisitos.find((r) => r.id === '45001:6.1.2')!.preguntas[0];
    assert.ok(!md.includes(soloDe45001));
  });
});

describe('ayudas de redacción', () => {
  test('tabla escapa barras y saltos de línea para no romper la tabla', () => {
    const t = tabla(['A', 'B'], [['x | y', 'línea 1\nlínea 2']]);
    assert.match(t, /\| x \/ y \| línea 1 línea 2 \|/);
  });

  test('partir divide por guión largo, medio o simple con espacios, y completa', () => {
    assert.deepEqual(partir('Reducir reclamos — reclamos por mes — menos de 5', 3), ['Reducir reclamos', 'reclamos por mes', 'menos de 5']);
    assert.deepEqual(partir('Solo esto', 3), ['Solo esto', '', '']);
    assert.deepEqual(partir('a - b', 2), ['a', 'b']);
    // Un guión sin espacios es parte de la palabra.
    assert.deepEqual(partir('Post-venta — rápido', 2), ['Post-venta', 'rápido']);
  });

  test('una clave inexistente es un error de programación, no un hueco silencioso', () => {
    assert.throws(() => contexto(orgVacia()).dato('no-existe'), /no existe en la entrevista/);
  });

  test('falta() marca y contarFaltantes las cuenta', () => {
    assert.equal(contarFaltantes(`${falta('a')} y ${falta('b')}`), 2);
  });

  test('cubreDe devuelve lo que cubre un documento guardado, y nada si el id no existe', () => {
    assert.ok(cubreDe('politica-integrada').length > 0);
    assert.deepEqual(cubreDe('inexistente'), []);
  });
});

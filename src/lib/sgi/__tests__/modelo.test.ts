/**
 * Tests del motor de cobertura.
 *
 * Corren con el runner de Node, sin dependencias:
 *   node --experimental-strip-types --test src/lib/sgi/__tests__/modelo.test.ts
 *
 * Existen por una razón concreta: el argumento de venta de este sistema es
 * "el cálculo es determinístico y te lo puedo mostrar". Si el cálculo no
 * está testeado, ese argumento es una frase linda y nada más.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, resumir, ordenarHallazgos, vigente, antiguedadMeses, clasificar, AVISO_MESES } from '../modelo.ts';
import type { Requisito, Evidencia } from '../modelo.ts';
import { requisitos, procesos, porProceso, comoUrl } from '../normas.ts';
import { evidenciasDemo } from '../demo.ts';

const HOY = new Date('2026-08-26T00:00:00Z');

const req = (over: Partial<Requisito> = {}): Requisito => ({
  id: 'X',
  clausula: '9.9',
  titulo: 'De prueba',
  normas: ['9001'],
  tronco: false,
  evidencias: [
    { clave: 'doc', tipo: 'documento', descripcion: 'Un procedimiento.' },
    { clave: 'reg', tipo: 'registro', descripcion: 'Un acta.', vigenciaMeses: 12 },
  ],
  preguntas: [],
  ...over,
});

const ev = (over: Partial<Evidencia> = {}): Evidencia => ({
  id: 'e1',
  titulo: 'Evidencia',
  tipo: 'documento',
  cubre: ['X'],
  fecha: '2026-06-01',
  proceso: 'Producción',
  responsable: 'Alguien',
  ...over,
});

describe('antiguedadMeses', () => {
  test('cuenta hacia atrás', () => {
    assert.ok(Math.abs(antiguedadMeses('2025-08-26', HOY) - 12) < 0.2);
  });

  test('una fecha futura da negativo', () => {
    assert.ok(antiguedadMeses('2026-12-01', HOY) < 0);
  });
});

describe('vigente', () => {
  const pedidaSinVencimiento = { clave: 'doc', tipo: 'documento' as const, descripcion: '' };
  const pedidaAnual = { clave: 'reg', tipo: 'registro' as const, descripcion: '', vigenciaMeses: 12 };

  test('un documento sin vigencia declarada no caduca nunca', () => {
    assert.equal(vigente(ev({ fecha: '2011-01-01' }), pedidaSinVencimiento, HOY), true);
  });

  test('un registro dentro de su vigencia sirve', () => {
    assert.equal(vigente(ev({ fecha: '2026-01-15' }), pedidaAnual, HOY), true);
  });

  test('un registro pasado de vigencia ya no prueba nada', () => {
    assert.equal(vigente(ev({ fecha: '2024-01-15' }), pedidaAnual, HOY), false);
  });

  test('una evidencia con fecha futura vale: es algo ya programado', () => {
    assert.equal(vigente(ev({ fecha: '2026-11-01' }), pedidaAnual, HOY), true);
  });
});

describe('evaluar', () => {
  test('sin evidencia, sin cubrir', () => {
    const c = evaluar(req(), [], HOY);
    assert.equal(c.estado, 'sin_cubrir');
    assert.deepEqual(c.faltan, ['doc', 'reg']);
  });

  test('con toda la evidencia vigente, cubierto', () => {
    const c = evaluar(req(), [ev({ id: 'a', tipo: 'documento' }), ev({ id: 'b', tipo: 'registro' })], HOY);
    assert.equal(c.estado, 'cubierto');
    assert.deepEqual(c.faltan, []);
    assert.equal(c.aportan.doc.length, 1);
    assert.equal(c.aportan.reg.length, 1);
  });

  test('con una sola de las dos, parcial', () => {
    const c = evaluar(req(), [ev({ tipo: 'documento' })], HOY);
    assert.equal(c.estado, 'parcial');
    assert.deepEqual(c.faltan, ['reg']);
  });

  /**
   * El caso que motiva todo el sistema: la empresa TIENE el papel, pero es
   * de hace tres años. No es lo mismo que no tenerlo —el sistema existió y
   * se dejó caer— y el auditor lo mira peor.
   */
  test('con evidencia sólo caduca, vencido y no "sin cubrir"', () => {
    const viejo = ev({ tipo: 'registro', fecha: '2020-01-01' });
    const c = evaluar(req({ evidencias: [{ clave: 'reg', tipo: 'registro', descripcion: '', vigenciaMeses: 12 }] }), [viejo], HOY);
    assert.equal(c.estado, 'vencido');
    assert.equal(c.caducas.length, 1);
    assert.match(c.motivo, /ninguna vigente/);
  });

  test('un documento no reemplaza a un registro aunque cubra el mismo requisito', () => {
    // Tener el procedimiento escrito no prueba que se haya ejecutado.
    const c = evaluar(req(), [ev({ tipo: 'documento' }), ev({ id: 'b', tipo: 'documento' })], HOY);
    assert.equal(c.estado, 'parcial');
    assert.deepEqual(c.faltan, ['reg']);
  });

  test('la evidencia de otro requisito no cuenta', () => {
    const c = evaluar(req(), [ev({ cubre: ['OTRO'] })], HOY);
    assert.equal(c.estado, 'sin_cubrir');
  });

  test('una evidencia puede cubrir varios requisitos a la vez', () => {
    const compartida = ev({ cubre: ['X', 'Y'] });
    assert.equal(evaluar(req({ id: 'X' }), [compartida], HOY).aportan.doc.length, 1);
    assert.equal(evaluar(req({ id: 'Y' }), [compartida], HOY).aportan.doc.length, 1);
  });

  test('el motivo siempre explica la cuenta', () => {
    for (const evs of [[], [ev({ tipo: 'documento' })], [ev({ tipo: 'documento' }), ev({ id: 'b', tipo: 'registro' })]]) {
      assert.ok(evaluar(req(), evs, HOY).motivo.length > 0);
    }
  });
});

describe('resumir', () => {
  const rs = [
    req({ id: 'a', normas: ['9001'] }),
    req({ id: 'b', normas: ['9001'] }),
    req({ id: 'c', normas: ['14001'] }),
  ];

  test('sólo cuenta los requisitos de esa norma', () => {
    const cobs = rs.map((r) => evaluar(r, [], HOY));
    assert.equal(resumir(cobs, '9001').total, 2);
    assert.equal(resumir(cobs, '14001').total, 1);
    assert.equal(resumir(cobs, '45001').total, 0);
  });

  test('sin nada cargado el avance es 0', () => {
    assert.equal(resumir(rs.map((r) => evaluar(r, [], HOY)), '9001').avance, 0);
  });

  test('el parcial vale medio punto', () => {
    // 'a' parcial (sólo documento), 'b' sin cubrir → 0.5 de 2 → 25%
    const evs = [ev({ id: 'x', cubre: ['a'], tipo: 'documento' })];
    const cobs = rs.map((r) => evaluar(r, evs, HOY));
    assert.equal(resumir(cobs, '9001').avance, 25);
    assert.equal(resumir(cobs, '9001').parcial, 1);
    assert.equal(resumir(cobs, '9001').sin_cubrir, 1);
  });

  test('no explota con una norma sin requisitos', () => {
    assert.equal(resumir([], '45001').avance, 0);
  });
});

describe('ordenarHallazgos', () => {
  test('saca lo cubierto y pone lo vencido primero', () => {
    const cobs = [
      { ...evaluar(req({ id: '1', clausula: '4.1' }), [], HOY), estado: 'parcial' as const },
      { ...evaluar(req({ id: '2', clausula: '5.1' }), [], HOY), estado: 'cubierto' as const },
      { ...evaluar(req({ id: '3', clausula: '9.2' }), [], HOY), estado: 'vencido' as const },
      { ...evaluar(req({ id: '4', clausula: '7.5' }), [], HOY), estado: 'sin_cubrir' as const },
    ];
    assert.deepEqual(
      ordenarHallazgos(cobs).map((c) => c.requisito.id),
      ['3', '4', '1'],
    );
  });

  test('ordena por número de cláusula, no alfabéticamente', () => {
    // '10.2' va DESPUÉS de '9.2'. Con orden alfabético quedaría antes.
    const cobs = [
      { ...evaluar(req({ id: 'diez', clausula: '10.2' }), [], HOY), estado: 'sin_cubrir' as const },
      { ...evaluar(req({ id: 'nueve', clausula: '9.2' }), [], HOY), estado: 'sin_cubrir' as const },
    ];
    assert.deepEqual(ordenarHallazgos(cobs).map((c) => c.requisito.id), ['nueve', 'diez']);
  });
});

/** Chequeos de integridad del corpus: lo que rompería la app en runtime. */
describe('corpus', () => {
  test('los ids son únicos', () => {
    const ids = requisitos.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('cada requisito pide al menos una evidencia', () => {
    for (const r of requisitos) assert.ok(r.evidencias.length > 0, `${r.id} sin evidencias`);
  });

  test('las claves de evidencia no se repiten dentro de un requisito', () => {
    for (const r of requisitos) {
      const claves = r.evidencias.map((e) => e.clave);
      assert.equal(new Set(claves).size, claves.length, `${r.id} repite una clave`);
    }
  });

  test('todo requisito de tronco aplica a las tres normas', () => {
    for (const r of requisitos.filter((r) => r.tronco)) assert.equal(r.normas.length, 3, r.id);
  });

  test('todo requisito propio aplica a una sola norma', () => {
    for (const r of requisitos.filter((r) => !r.tronco)) assert.equal(r.normas.length, 1, r.id);
  });

  test('los requisitos propios llevan la norma en el id', () => {
    for (const r of requisitos.filter((r) => !r.tronco)) {
      assert.ok(r.id.startsWith(`${r.normas[0]}:`), `${r.id} no declara su norma`);
    }
  });

  test('todo registro declara su vigencia', () => {
    // Un registro sin vigencia sería tratado como eterno, y un acta de 2019
    // pasaría por prueba del presente. Es el error que este sistema existe
    // para evitar, así que se bloquea acá.
    for (const r of requisitos) {
      for (const e of r.evidencias.filter((e) => e.tipo === 'registro')) {
        assert.ok(e.vigenciaMeses !== undefined, `${r.id}/${e.clave}: registro sin vigencia`);
      }
    }
  });

  test('cada requisito trae al menos una pregunta de auditoría', () => {
    for (const r of requisitos) assert.ok(r.preguntas.length > 0, `${r.id} sin preguntas`);
  });

  test('las tres normas quedan cubiertas', () => {
    for (const n of ['9001', '14001', '45001'] as const) {
      assert.ok(requisitos.filter((r) => r.normas.includes(n)).length >= 25);
    }
  });
});

describe('vencimiento próximo y clasificación', () => {
  const conRegistro = (vigenciaMeses: number): Requisito =>
    req({ evidencias: [{ clave: 'reg', tipo: 'registro', descripcion: '', vigenciaMeses }] });

  test('mide los meses que faltan para que se caiga la primera evidencia', () => {
    // Registro de hace 9 meses con vigencia 12 → quedan ~3.
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2025-11-26' })], HOY);
    assert.ok(Math.abs(c.mesesAlVencimiento! - 3) < 0.3, String(c.mesesAlVencimiento));
  });

  test('manda la evidencia que se cae PRIMERO, no la última', () => {
    // El requisito se desarma en cuanto falta una sola de las que pide.
    const dos = req({
      evidencias: [
        { clave: 'a', tipo: 'registro', descripcion: '', vigenciaMeses: 12 },
        { clave: 'b', tipo: 'documento', descripcion: '' },
      ],
    });
    const c = evaluar(dos, [ev({ id: '1', tipo: 'registro', fecha: '2026-06-26' }), ev({ id: '2', tipo: 'documento' })], HOY);
    // Sólo el registro caduca; el documento no aporta vencimiento.
    assert.ok(Math.abs(c.mesesAlVencimiento! - 10) < 0.3, String(c.mesesAlVencimiento));
  });

  test('dentro de una misma clave aguanta la evidencia más nueva', () => {
    const c = evaluar(conRegistro(12), [
      ev({ id: 'vieja', tipo: 'registro', fecha: '2025-10-26' }),
      ev({ id: 'nueva', tipo: 'registro', fecha: '2026-07-26' }),
    ], HOY);
    assert.ok(c.mesesAlVencimiento! > 10, String(c.mesesAlVencimiento));
  });

  test('un requisito sin nada que caduque no reporta vencimiento', () => {
    const c = evaluar(req({ evidencias: [{ clave: 'doc', tipo: 'documento', descripcion: '' }] }), [ev()], HOY);
    assert.equal(c.mesesAlVencimiento, undefined);
    assert.equal(c.porVencer, false);
  });

  test('porVencer se enciende dentro del horizonte de aviso', () => {
    // 9,5 meses de antigüedad sobre una vigencia de 12: quedan ~2,5.
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2025-11-10' })], HOY);
    assert.equal(c.estado, 'cubierto');
    assert.equal(c.porVencer, true);
  });

  test('porVencer NO se enciende si todavía falta bastante', () => {
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2026-07-26' })], HOY);
    assert.equal(c.porVencer, false);
  });

  test('lo ya vencido no cuenta como "por vencer": ya se cayó', () => {
    // Son avisos distintos y mezclarlos taparía el hallazgo con la alerta.
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2024-01-01' })], HOY);
    assert.equal(c.estado, 'vencido');
    assert.equal(c.porVencer, false);
  });

  test('la clasificación propuesta sigue la regla declarada', () => {
    assert.equal(clasificar('sin_cubrir'), 'mayor');
    assert.equal(clasificar('vencido'), 'menor');
    assert.equal(clasificar('parcial'), 'menor');
    assert.equal(clasificar('cubierto'), undefined);
  });

  test('el resumen cuenta los que están por vencer', () => {
    const r = req({ id: 'a', normas: ['9001'], evidencias: [{ clave: 'reg', tipo: 'registro', descripcion: '', vigenciaMeses: 12 }] });
    const cobs = [evaluar(r, [ev({ cubre: ['a'], tipo: 'registro', fecha: '2025-11-10' })], HOY)];
    assert.equal(resumir(cobs, '9001').por_vencer, 1);
    assert.equal(resumir(cobs, '9001').cubierto, 1);
  });
});

describe('el tiempo solo desarma el sistema', () => {
  test('adelantar meses no puede mejorar el avance', () => {
    // Es la propiedad que sostiene la máquina del tiempo: sin cargar
    // evidencia nueva, el sistema sólo puede empeorar.
    const evs = evidenciasDemo(HOY);
    let previo = 101;
    for (const meses of [0, 3, 6, 12, 18, 24]) {
      const cuando = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth() + meses, 26));
      const cobs = requisitos.map((r) => evaluar(r, evs, cuando));
      const avance = resumir(cobs, '9001').avance;
      assert.ok(avance <= previo, `a los ${meses} meses subió a ${avance} desde ${previo}`);
      previo = avance;
    }
  });

  test('a los 12 meses la caída es visible, que es el punto de la demo', () => {
    const evs = evidenciasDemo(HOY);
    const luego = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth() + 12, 26));
    const ahora = resumir(requisitos.map((r) => evaluar(r, evs, HOY)), '9001').avance;
    const despues = resumir(requisitos.map((r) => evaluar(r, evs, luego)), '9001').avance;
    assert.ok(ahora - despues >= 25, `sólo cayó ${ahora - despues} puntos`);
  });
});

describe('el borde del horizonte de aviso', () => {
  const conRegistro = (vigenciaMeses: number): Requisito =>
    req({ evidencias: [{ clave: 'reg', tipo: 'registro', descripcion: '', vigenciaMeses }] });

  /*
   * El umbral es una comparación simple `<= AVISO_MESES`, así que hay un
   * punto exacto donde se enciende. Se fija acá para que quede claro que es
   * una decisión y no una casualidad de redondeo: justo por dentro avisa,
   * justo por fuera no.
   */
  test('justo por dentro avisa', () => {
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2025-11-01' })], HOY);
    assert.ok(c.mesesAlVencimiento! < AVISO_MESES);
    assert.equal(c.porVencer, true);
  });

  test('justo por fuera todavía no', () => {
    const c = evaluar(conRegistro(12), [ev({ tipo: 'registro', fecha: '2025-12-15' })], HOY);
    assert.ok(c.mesesAlVencimiento! > AVISO_MESES);
    assert.equal(c.porVencer, false);
  });
});

describe('áreas responsables', () => {
  /*
   * La vista de auditoría por proceso se arma con este dato. Un requisito sin
   * área no aparece en ninguna jornada: existe en la matriz, nadie lo audita
   * nunca, y no hay nada en pantalla que delate el agujero. Por eso se testea.
   */
  test('todo requisito tiene al menos un área responsable', () => {
    for (const r of requisitos) {
      assert.ok(r.procesos.length > 0, `${r.id} (${r.titulo}) no tiene área`);
    }
  });

  test('no hay áreas escritas de dos formas distintas', () => {
    // Un "Ambiente y seguridad" con minúscula crearía un proceso fantasma con
    // su propia página y partiría la agenda en dos.
    const usadas = new Set(requisitos.flatMap((r) => r.procesos));
    for (const u of usadas) assert.ok(procesos.includes(u), `"${u}" no está en la lista de procesos`);
  });

  test('la suma de las agendas cubre el corpus entero', () => {
    const vistos = new Set(procesos.flatMap((p) => porProceso(p).map((r) => r.id)));
    assert.equal(vistos.size, requisitos.length);
  });

  test('cada proceso tiene algo que auditar', () => {
    for (const p of procesos) assert.ok(porProceso(p).length > 0, `${p} quedó sin requisitos`);
  });

  test('las URLs de proceso son únicas y limpias', () => {
    const urls = procesos.map(comoUrl);
    assert.equal(new Set(urls).size, urls.length);
    for (const u of urls) assert.match(u, /^[a-z0-9-]+$/, u);
  });
});

/**
 * Tests de la empresa de demostración.
 *
 * No testean el motor —eso es modelo.test.ts— sino que la demo siga
 * contando la historia que tiene que contar. Es fácil tocar una fecha
 * mientras se edita el corpus y dejar la demo en verde, y una demo con
 * todo cubierto no muestra nada de lo que el sistema sabe hacer.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evidenciasDemo, EMPRESA } from '../demo.ts';
import { requisitos } from '../normas.ts';
import { evaluar, resumir } from '../modelo.ts';

/** Varias fechas de build, para que la demo no dependa de cuándo se compile. */
const FECHAS = ['2026-01-15', '2026-08-26', '2027-03-01', '2028-11-30'].map((f) => new Date(`${f}T00:00:00Z`));

describe('demo', () => {
  test('ninguna evidencia apunta a un requisito inexistente', () => {
    const ids = new Set(requisitos.map((r) => r.id));
    for (const e of evidenciasDemo(FECHAS[1])) {
      for (const c of e.cubre) assert.ok(ids.has(c), `${e.titulo} apunta a ${c}, que no existe`);
    }
  });

  test('los ids de evidencia son únicos', () => {
    const ids = evidenciasDemo(FECHAS[1]).map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  for (const hoy of FECHAS) {
    const etiqueta = hoy.toISOString().slice(0, 10);

    test(`al ${etiqueta}: ninguna evidencia queda con fecha futura`, () => {
      for (const e of evidenciasDemo(hoy)) assert.ok(e.fecha <= hoy.toISOString().slice(0, 10), e.titulo);
    });

    test(`al ${etiqueta}: la demo muestra los cuatro estados`, () => {
      // Esto es lo que la vuelve una demo y no una captura de pantalla.
      const evs = evidenciasDemo(hoy);
      const estados = new Set(requisitos.map((r) => evaluar(r, evs, hoy).estado));
      for (const e of ['cubierto', 'parcial', 'vencido', 'sin_cubrir']) {
        assert.ok(estados.has(e as never), `falta el estado ${e}`);
      }
    });

    test(`al ${etiqueta}: el avance es creíble en las tres normas`, () => {
      // Ni recién arrancando ni listo para certificar: en el medio, que es
      // donde una empresa contrata a alguien que sepa de esto.
      const evs = evidenciasDemo(hoy);
      const cobs = requisitos.map((r) => evaluar(r, evs, hoy));
      for (const n of ['9001', '14001', '45001'] as const) {
        const { avance } = resumir(cobs, n);
        assert.ok(avance >= 55 && avance <= 90, `${n} da ${avance}%`);
      }
    });

    test(`al ${etiqueta}: calidad va adelante de seguridad`, () => {
      // El perfil está armado a propósito: la empresa venía con 9001 y llega
      // tarde a las otras dos. Si esto se invierte, la demo dejó de contar
      // la historia que dice contar.
      const cobs = requisitos.map((r) => evaluar(r, evidenciasDemo(hoy), hoy));
      assert.ok(resumir(cobs, '9001').avance > resumir(cobs, '45001').avance);
    });
  }

  test('la participación de los trabajadores queda sin cubrir', () => {
    // Es el hallazgo que ancla el caso: la cláusula que no se resuelve con
    // un documento. Si algún día se cubre por accidente, la demo pierde su
    // ejemplo más fuerte.
    const req = requisitos.find((r) => r.id === '45001:5.4')!;
    assert.equal(evaluar(req, evidenciasDemo(FECHAS[1]), FECHAS[1]).estado, 'sin_cubrir');
  });

  test('la revisión por la dirección queda vencida, no sin cubrir', () => {
    const req = requisitos.find((r) => r.id === '9.3')!;
    assert.equal(evaluar(req, evidenciasDemo(FECHAS[1]), FECHAS[1]).estado, 'vencido');
  });

  test('la empresa está declarada como ficticia en algún lado visible', () => {
    assert.ok(EMPRESA.nombre.length > 0 && EMPRESA.sitio.includes('Córdoba'));
  });
});

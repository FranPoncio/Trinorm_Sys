import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { avanceEntrevista } from '../entrevista.ts';
import { contarFaltantes, redactar } from '../generador.ts';
import { exclusionesDe, validarOrganizacion } from '../organizacion.ts';
import { plantillas, plantillasDe } from '../plantillas.ts';
import { organizacionEjemplo, NOMBRE_EJEMPLO } from '../ejemplo.ts';
import { ruta } from '../ruta.ts';
import { HOY } from './fabrica.ts';

const ejemplo = () => organizacionEjemplo(HOY, 'ej');

describe('la organización de ejemplo', () => {
  test('es válida para el propio validador', () => {
    assert.doesNotThrow(() => validarOrganizacion(JSON.parse(JSON.stringify(ejemplo()))));
  });

  test('se dice ficticia en el nombre', () => {
    assert.match(NOMBRE_EJEMPLO, /ficticia/);
  });

  test('trae la entrevista completa: se ve el recorrido sin cargar nada', () => {
    const a = avanceEntrevista(ejemplo());
    assert.equal(a.porcentaje, 100);
    assert.deepEqual(a.pendientes.map((p) => p.clave), []);
  });

  test('responde TODAS las preguntas, también las opcionales', () => {
    const o = ejemplo();
    const sinResponder = (avanceEntrevista(o).aplicables) - avanceEntrevista(o).contestadas;
    assert.equal(sinResponder, 0);
  });

  test('con la ruta lista hasta documentos: la primera y la segunda etapa están completas', () => {
    const e = ruta(ejemplo(), HOY);
    assert.equal(e[0].estado, 'completa');
    assert.equal(e[1].estado, 'completa');
    assert.equal(e[2].estado, 'pendiente');
  });

  test('demuestra una exclusión: no diseña', () => {
    assert.deepEqual(exclusionesDe(ejemplo()).map((x) => x.requisito), ['9001:8.3']);
  });

  test('genera todos sus documentos; los procedimientos salen sin marcas', () => {
    const o = ejemplo();
    for (const p of plantillasDe(o)) assert.doesNotThrow(() => redactar(p, o, plantillas, HOY), p.id);
    for (const id of ['manual-sgi', 'politica-integrada', 'no-conformidades', 'produccion-servicio', 'incidentes']) {
      const p = plantillas.find((x) => x.id === id)!;
      assert.equal(contarFaltantes(redactar(p, o, plantillas, HOY)), 0, id);
    }
  });

  test('no trae datos que parezcan reales: ni DNI, ni CUIT, ni mails, ni teléfonos', () => {
    const texto = JSON.stringify(ejemplo());
    assert.doesNotMatch(texto, /\b\d{2}\.?\d{3}\.?\d{3}\b/, 'parece un DNI');
    assert.doesNotMatch(texto, /\b\d{2}-\d{8}-\d\b/, 'parece un CUIT');
    assert.doesNotMatch(texto, /[\w.]+@[\w.]+\.\w+/, 'parece un mail');
    assert.doesNotMatch(texto, /\b\d{4}[-\s]?\d{4}\b/, 'parece un teléfono');
  });

  test('cada llamada devuelve una organización nueva e independiente', () => {
    const a = ejemplo();
    const b = ejemplo();
    a.respuestas.actividad = 'cambiada';
    assert.notEqual(b.respuestas.actividad, 'cambiada');
  });
});

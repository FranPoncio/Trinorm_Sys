import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { choques, crearAlmacen, exportar, importar } from '../almacen.ts';
import type { StorageLike } from '../almacen.ts';
import { HOY, conDocumentosAprobados, orgCompleta } from './fabrica.ts';

/** Un localStorage en memoria, con la opción de que falle al escribir. */
function memoria(falla?: Error): StorageLike & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => { if (falla) throw falla; datos.set(k, v); },
    removeItem: (k) => { datos.delete(k); },
  };
}

const org = (id: string, nombre = id, actualizada = '2026-10-01') => ({ ...orgCompleta(), id, nombre, actualizada });

describe('el almacén', () => {
  test('guarda, lista, obtiene y borra', () => {
    const a = crearAlmacen(memoria());
    a.guardar(org('a'));
    a.guardar(org('b'));
    assert.equal(a.listar().organizaciones.length, 2);
    assert.equal(a.obtener('a')?.id, 'a');
    a.borrar('a');
    assert.equal(a.obtener('a'), undefined);
    assert.equal(a.listar().organizaciones.length, 1);
  });

  test('guardar dos veces el mismo id lo reemplaza, no lo duplica', () => {
    const a = crearAlmacen(memoria());
    a.guardar(org('a', 'Primero'));
    a.guardar(org('a', 'Segundo'));
    const { organizaciones } = a.listar();
    assert.equal(organizaciones.length, 1);
    assert.equal(organizaciones[0].nombre, 'Segundo');
  });

  test('lo guardado vuelve idéntico, incluidos los documentos aprobados', () => {
    const a = crearAlmacen(memoria());
    const o = conDocumentosAprobados(org('a'));
    a.guardar(o);
    assert.deepEqual(a.obtener('a'), o);
  });

  test('lista primero lo modificado más recientemente', () => {
    const a = crearAlmacen(memoria());
    a.guardar(org('vieja', 'Vieja', '2026-01-01'));
    a.guardar(org('nueva', 'Nueva', '2026-09-01'));
    assert.deepEqual(a.listar().organizaciones.map((o) => o.id), ['nueva', 'vieja']);
  });

  test('no toca claves que no son suyas', () => {
    const m = memoria();
    m.setItem('otra-app', 'valor');
    const a = crearAlmacen(m);
    a.guardar(org('a'));
    assert.equal(a.listar().organizaciones.length, 1);
    assert.equal(m.getItem('otra-app'), 'valor');
  });

  /*
   * Una entrada corrupta no puede dejar a la persona sin acceso a todas las
   * demás, ni borrarse sola: se informa para que decida.
   */
  test('una entrada rota no rompe la lista y se informa en vez de borrarse', () => {
    const m = memoria();
    const a = crearAlmacen(m);
    a.guardar(org('buena'));
    m.setItem('trinorm:org:rota', '{no es json');
    m.setItem('trinorm:org:vacia', JSON.stringify({ esquema: 1 }));
    const { organizaciones, descartadas } = a.listar();
    assert.deepEqual(organizaciones.map((o) => o.id), ['buena']);
    assert.equal(descartadas.length, 2);
    assert.ok(descartadas.every((d) => d.motivo.length > 0));
    assert.ok(m.getItem('trinorm:org:rota'), 'se borró una entrada sin avisar');
  });

  test('obtener una entrada rota devuelve undefined en vez de lanzar', () => {
    const m = memoria();
    m.setItem('trinorm:org:rota', 'basura');
    assert.equal(crearAlmacen(m).obtener('rota'), undefined);
  });

  test('si no hay espacio, el mensaje lo dice y sugiere exportar', () => {
    const cuota = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    assert.throws(() => crearAlmacen(memoria(cuota)).guardar(org('a')), /No hay espacio.*Exportá un respaldo/);
  });

  test('si el navegador bloquea el almacenamiento, avisa que se va a perder', () => {
    const bloqueo = Object.assign(new Error('denied'), { name: 'SecurityError' });
    assert.throws(() => crearAlmacen(memoria(bloqueo)).guardar(org('a')), /se va a perder/);
  });
});

describe('el respaldo', () => {
  test('exportar e importar devuelven lo mismo', () => {
    const originales = [conDocumentosAprobados(org('a')), org('b')];
    assert.deepEqual(importar(exportar(originales, HOY)), originales);
  });

  test('el archivo dice qué es y de qué versión', () => {
    const j = JSON.parse(exportar([org('a')], HOY));
    assert.equal(j.formato, 'trinorm-respaldo');
    assert.equal(j.version, 1);
    assert.ok(j.exportado);
  });

  test('rechaza lo que no es un respaldo, diciendo por qué', () => {
    assert.throws(() => importar('no es json'), /JSON válido/);
    assert.throws(() => importar('null'), /formato/);
    assert.throws(() => importar('[]'), /no es un respaldo|formato/);
    assert.throws(() => importar(JSON.stringify({ formato: 'otro', version: 1, organizaciones: [] })), /no es un respaldo/);
    assert.throws(() => importar(JSON.stringify({ formato: 'trinorm-respaldo', version: 9, organizaciones: [] })), /Versión de respaldo desconocida \(9\)/);
    assert.throws(() => importar(JSON.stringify({ formato: 'trinorm-respaldo', version: 1 })), /no trae organizaciones/);
  });

  test('todo o nada: una organización inválida frena la importación entera y dice cuál', () => {
    const mala = { ...JSON.parse(JSON.stringify(org('b'))), creada: 'nunca' };
    const texto = JSON.stringify({ formato: 'trinorm-respaldo', version: 1, organizaciones: [JSON.parse(JSON.stringify(org('a'))), mala] });
    assert.throws(() => importar(texto), /Organización 2 del respaldo: .*fecha/);
  });

  test('un archivo gigante se rechaza antes de parsearlo', () => {
    assert.throws(() => importar('x'.repeat(26 * 1024 * 1024)), /demasiado grande/);
  });

  test('un respaldo hostil no cuela campos ni tipos', () => {
    const o = JSON.parse(JSON.stringify(org('a')));
    o.__proto__ = { admin: true };
    o.registros = [{ id: 'r', titulo: 'T', tipo: 'documento', cubre: ['7.2'], fecha: '2026-01-01', proceso: '', responsable: '', extra: '<img src=x onerror=alert(1)>' }];
    const [limpia] = importar(JSON.stringify({ formato: 'trinorm-respaldo', version: 1, organizaciones: [o] }));
    assert.equal(limpia.registros[0].tipo, 'registro');
    assert.ok(!('extra' in limpia.registros[0]));
    assert.ok(!('admin' in limpia));
  });

  test('choques avisa qué ids ya existen, para no pisar sin preguntar', () => {
    const existentes = [org('a'), org('b')];
    assert.deepEqual(choques(existentes, [org('b'), org('c')]).map((o) => o.id), ['b']);
    assert.deepEqual(choques(existentes, [org('z')]), []);
  });
});

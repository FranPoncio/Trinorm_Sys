/**
 * El generador de documentos.
 *
 * Una regla ordena todo: NUNCA SE INVENTA UN DATO DE LA ORGANIZACIÓN.
 *
 * Si la entrevista no contestó algo que el documento necesita, el documento
 * lo dice con una marca visible —`⟦COMPLETAR: …⟧`— en lugar de rellenar con
 * algo verosímil. Un procedimiento con una frase inventada es peor que uno
 * con un hueco: el hueco se ve y se completa; la frase inventada pasa la
 * revisión y aparece en la auditoría como algo que la gente no hace.
 *
 * Y un documento con marcas sin resolver no se puede aprobar (`puedeAprobar`).
 * Eso empuja a completar en vez de firmar a ciegas.
 *
 * Este archivo no usa IA. Redacta con plantillas y las respuestas de la
 * persona; en una versión futura la IA puede mejorar la prosa, pero el dato
 * seguirá saliendo de la entrevista.
 */

import { requisitos } from './normas.ts';
import { pregunta } from './entrevista.ts';
import { lineas, vacio, isoLocal } from './organizacion.ts';
import type { Documento, Organizacion, ProcesoOrg } from './organizacion.ts';
import type { Norma } from './modelo.ts';

/** Lo que el documento necesita y la organización todavía no dijo. */
export const falta = (que: string): string => `⟦COMPLETAR: ${que}⟧`;

/** Cuántas marcas sin resolver quedan en un texto. */
export const contarFaltantes = (texto: string): number => (texto.match(/⟦COMPLETAR/g) ?? []).length;

export type TipoDoc = 'politica' | 'manual' | 'procedimiento' | 'matriz' | 'plan' | 'formulario';

export const PREFIJOS: Record<TipoDoc, string> = {
  politica: 'POL',
  manual: 'MAN',
  procedimiento: 'PRO',
  matriz: 'MAT',
  plan: 'PLA',
  formulario: 'FOR',
};

export const TIPOS_DOC: Record<TipoDoc, string> = {
  politica: 'Política',
  manual: 'Manual',
  procedimiento: 'Procedimiento',
  matriz: 'Matriz',
  plan: 'Plan',
  formulario: 'Formulario',
};

export interface Seccion {
  titulo: string;
  cuerpo: string;
}

/** Lo que una plantilla cubre: qué requisito y qué evidencias pedidas de él. */
export interface Cubre {
  requisito: string;
  claves: string[];
}

export interface Plantilla {
  /** Estable: es la clave con la que se guarda el documento. No renombrar. */
  id: string;
  titulo: string;
  tipo: TipoDoc;
  normas: Norma[];
  /** Los formularios no cubren nada: son el papel en blanco, no la prueba. */
  cubre: Cubre[];
  /** Si devuelve un texto, la plantilla no corresponde y el texto es el motivo. */
  noAplica?: (org: Organizacion) => string | undefined;
  /** Para qué sirve, en una línea. Se muestra en la lista. */
  sirvePara: string;
  secciones: (c: Ctx) => Seccion[];
}

/**
 * Lo que una plantilla puede pedirle a la organización. Todo lo que falta
 * vuelve como marca, nunca como cadena vacía ni como texto de relleno.
 */
export interface Ctx {
  org: Organizacion;
  /** Texto de una respuesta, o la marca si falta. */
  dato(clave: string): string;
  /** Los ítems de una respuesta de lista. Vacío si no contestó. */
  lista(clave: string): string[];
  /** La lista como viñetas, o la marca si falta. */
  vinetas(clave: string): string;
  /** Sí / No / sin contestar. */
  si(clave: string): boolean | undefined;
  tiene(norma: Norma): boolean;
  /** Un dato del perfil (nombre, alcance…) o la marca si está vacío. */
  perfil(que: 'nombre' | 'alcance' | 'sedes', etiqueta: string): string;
  procesos(): ProcesoOrg[];
  tabla(cabeceras: string[], filas: string[][]): string;
}

const celda = (t: string): string => t.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();

export function tabla(cabeceras: string[], filas: string[][]): string {
  const linea = (cs: string[]) => `| ${cs.map(celda).join(' | ')} |`;
  return [linea(cabeceras), linea(cabeceras.map(() => '---')), ...filas.map(linea)].join('\n');
}

/** Parte "Algo — otra cosa" en hasta `n` pedazos; completa con vacíos. */
export function partir(linea: string, n: number): string[] {
  const partes = linea.split(/\s[—–-]\s/).map((p) => p.trim());
  const salida = partes.slice(0, n - 1);
  salida.push(partes.slice(n - 1).join(' — '));
  while (salida.length < n) salida.push('');
  return salida.slice(0, n);
}

export function contexto(org: Organizacion): Ctx {
  const etiqueta = (clave: string): string => {
    const p = pregunta(clave);
    if (!p) throw new Error(`La plantilla pide la clave "${clave}", que no existe en la entrevista.`);
    return p.etiqueta;
  };
  return {
    org,
    dato(clave) {
      const r = org.respuestas[clave];
      const q = pregunta(clave);
      if (!q) throw new Error(`La plantilla pide la clave "${clave}", que no existe en la entrevista.`);
      if (vacio(r)) return falta(q.etiqueta);
      if (q.tipo === 'si_no') return r === 'si' ? 'Sí' : 'No';
      return r.trim();
    },
    lista(clave) {
      etiqueta(clave);
      return lineas(org.respuestas[clave]);
    },
    vinetas(clave) {
      const items = lineas(org.respuestas[clave]);
      return items.length ? items.map((i) => `- ${i}`).join('\n') : falta(etiqueta(clave));
    },
    si(clave) {
      etiqueta(clave);
      const r = org.respuestas[clave];
      return r === 'si' ? true : r === 'no' ? false : undefined;
    },
    tiene: (norma) => org.normas.includes(norma),
    perfil(que, et) {
      return vacio(org[que]) ? falta(et) : org[que].trim();
    },
    procesos: () => org.procesos.filter((p) => !vacio(p.nombre)),
    tabla,
  };
}

/** Para referirse a la lista de normas de la organización en una frase. */
export const nombreNormas = (normas: Norma[]): string =>
  normas.length === 0 ? '' : `ISO ${normas.join(', ISO ')}`;

/**
 * El código del documento sale de su posición en el catálogo, no de un
 * contador que se guarde: así dos organizaciones con la misma norma tienen
 * los mismos códigos, y un auditor que vio una puede leer la otra.
 */
export function codigoDe(plantilla: Plantilla, catalogo: Plantilla[]): string {
  const mismos = catalogo.filter((p) => p.tipo === plantilla.tipo);
  const n = mismos.findIndex((p) => p.id === plantilla.id) + 1;
  return `${PREFIJOS[plantilla.tipo]}-${String(n).padStart(2, '0')}`;
}

/** Arma el documento completo en Markdown: encabezado, secciones y trazabilidad. */
export function redactar(plantilla: Plantilla, org: Organizacion, catalogo: Plantilla[], hoy: Date): string {
  const c = contexto(org);
  const secciones = plantilla.secciones(c);

  const cuerpo = secciones.map((s, i) => `## ${i + 1}. ${s.titulo}\n\n${s.cuerpo.trim()}`).join('\n\n');

  const encabezado = tabla(
    ['Código', 'Organización', 'Emitido'],
    [[codigoDe(plantilla, catalogo), org.nombre, isoLocal(hoy)]],
  );

  const cubiertos = plantilla.cubre.map((cu) => requisitos.find((r) => r.id === cu.requisito)).filter((r) => !!r);
  const trazabilidad = cubiertos.length
    ? [
        '## Trazabilidad',
        '',
        'Este documento sostiene los siguientes requisitos. Se muestran cláusula y título como referencia; el texto de la norma se consulta en la edición oficial.',
        '',
        tabla(
          ['Cláusula', 'Requisito', 'Normas'],
          cubiertos.map((r) => [r!.clausula, r!.titulo, r!.normas.map((n) => `ISO ${n}`).join(' · ')]),
        ),
      ].join('\n')
    : '';

  return [`# ${plantilla.titulo}`, encabezado, cuerpo, trazabilidad].filter(Boolean).join('\n\n') + '\n';
}

// ─── ciclo de vida del documento ─────────────────────────────────────────

export function nuevoDocumento(plantilla: Plantilla, contenido: string): Documento {
  return {
    id: plantilla.id,
    titulo: plantilla.titulo,
    version: 1,
    estado: 'borrador',
    contenido,
    generado: contenido,
    historial: [],
  };
}

/** ¿Se puede aprobar? Si no, devuelve el motivo. Un documento con huecos no se firma. */
export function puedeAprobar(doc: Documento): string | undefined {
  const n = contarFaltantes(doc.contenido);
  if (n > 0) return `Quedan ${n} marca${n === 1 ? '' : 's'} ⟦COMPLETAR⟧ sin resolver.`;
  if (doc.contenido.trim().length < 80) return 'El documento está vacío o casi vacío.';
  return undefined;
}

/**
 * Guardar una edición. Si el documento estaba aprobado, el cambio le quita la
 * aprobación: lo que firmó la dirección era otro texto. Lo anterior queda en
 * el historial para poder volver.
 */
export function editar(doc: Documento, contenido: string, hoy: Date, nota = 'Edición manual'): Documento {
  if (contenido === doc.contenido) return doc;
  const { fechaAprobacion: _f, aprobadoPor: _a, ...resto } = doc;
  return {
    ...resto,
    version: doc.version + 1,
    estado: 'borrador',
    contenido,
    historial: [...doc.historial, { version: doc.version, fecha: isoLocal(hoy), contenido: doc.contenido, nota }],
  };
}

/** Volver a una versión anterior. Crea una versión nueva: la historia no se reescribe. */
export function restaurar(doc: Documento, version: number, hoy: Date): Documento | undefined {
  const v = doc.historial.find((h) => h.version === version);
  return v ? editar(doc, v.contenido, hoy, `Restaurada la versión ${version}`) : undefined;
}

/** Regenerar desde la entrevista. Conserva la edición anterior en el historial. */
export function regenerar(doc: Documento, nuevo: string, hoy: Date): Documento {
  const editado = editar(doc, nuevo, hoy, 'Regenerado desde la entrevista');
  return { ...editado, generado: nuevo };
}

/** ¿Alguien tocó el texto a mano desde que lo generó el sistema? */
export const fueEditado = (doc: Documento): boolean => doc.contenido !== doc.generado;

export function enRevision(doc: Documento): Documento {
  return doc.estado === 'borrador' ? { ...doc, estado: 'en_revision' } : doc;
}

/** Aprobar. Falla con el motivo si no se puede; no hay aprobación parcial. */
export function aprobar(doc: Documento, quien: string, hoy: Date): Documento {
  const motivo = puedeAprobar(doc);
  if (motivo) throw new Error(motivo);
  if (vacio(quien)) throw new Error('Falta quién aprueba.');
  return { ...doc, estado: 'aprobado', fechaAprobacion: isoLocal(hoy), aprobadoPor: quien.trim() };
}

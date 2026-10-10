/**
 * Organizaciones de prueba. No es un test: el nombre no termina en `.test.ts`
 * y el runner no lo ejecuta.
 *
 * Las respuestas se arman recorriendo el banco de preguntas, no a mano: si
 * mañana se agrega una pregunta, la organización "completa" la tiene
 * contestada sin tocar los tests. Cada respuesta lleva su clave adentro para
 * poder comprobar que un dato llegó al documento que debía.
 */

import { preguntas } from '../entrevista.ts';
import { aprobar, contarFaltantes, nuevoDocumento, redactar } from '../generador.ts';
import { nuevaOrganizacion, nuevoProceso } from '../organizacion.ts';
import type { Organizacion } from '../organizacion.ts';
import { plantillas, plantillasDe } from '../plantillas.ts';
import type { Norma } from '../modelo.ts';

export const HOY = new Date('2026-10-04T12:00:00');

export function respuestaDe(p: (typeof preguntas)[number]): string {
  switch (p.tipo) {
    case 'lista':
      return `${p.clave} uno — detalle uno — meta uno\n${p.clave} dos — detalle dos — meta dos`;
    case 'si_no':
      return 'si';
    case 'opcion':
      return p.opciones![0];
    default:
      return `Respuesta de ${p.clave}`;
  }
}

export function orgVacia(normas: Norma[] = ['9001', '14001', '45001']): Organizacion {
  return nuevaOrganizacion(
    { nombre: 'Org de prueba', rubro: 'manufactura', empleados: 40, sedes: 'Córdoba', normas },
    HOY,
    'org-prueba',
  );
}

/** Organización con la entrevista, el alcance y los procesos completos. */
export function orgCompleta(normas: Norma[] = ['9001', '14001', '45001'], sobre: Record<string, string> = {}): Organizacion {
  const org = orgVacia(normas);
  org.alcance = 'Todas las actividades de la planta de Córdoba';
  org.respuestas = Object.fromEntries(preguntas.map((p) => [p.clave, respuestaDe(p)]));
  Object.assign(org.respuestas, sobre);
  org.procesos = ['Producción', 'Compras'].map((n, i) => ({
    ...nuevoProceso(n),
    id: `p${i}`,
    responsable: `Responsable de ${n}`,
    objetivo: `Objetivo de ${n}`,
    entradas: 'entradas',
    salidas: 'salidas',
    indicador: `Indicador de ${n}`,
  }));
  return org;
}

/** Simula a la persona que completa todas las marcas. */
export const llenar = (texto: string): string => texto.replace(/⟦COMPLETAR[^⟧]*⟧/g, 'dato completado');

/** Genera, completa y aprueba todos los documentos que le tocan a la organización. */
export function conDocumentosAprobados(org: Organizacion): Organizacion {
  const documentos = plantillasDe(org)
    .filter((p) => p.cubre.length > 0)
    .map((p) => {
      const d = nuevoDocumento(p, llenar(redactar(p, org, plantillas, HOY)));
      if (contarFaltantes(d.contenido) !== 0) throw new Error('la fábrica dejó marcas');
      return aprobar(d, 'Dirección', HOY);
    });
  return { ...org, documentos };
}

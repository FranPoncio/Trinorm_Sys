/**
 * La ruta de certificación: en qué etapa está la organización y qué sigue.
 *
 * Es una función de su estado, no un estado que se guarde: lo que se guarda
 * son las respuestas, los documentos, los registros y las fechas de los
 * hitos; la ruta se calcula cada vez. Así nunca queda desincronizada con lo
 * que de verdad hay cargado.
 *
 * DOS COSAS QUE NO HACE, A PROPÓSITO:
 *
 *  - No promete un porcentaje de "cumplimiento". Muestra cuántas etapas están
 *    completas y cuánta evidencia vigente hay. Para la norma tener nueve de
 *    diez papeles es no cumplir, y un número que se ve alto invita a creer lo
 *    contrario.
 *
 *  - No inventa plazos ni exigencias del certificador. Cuánto dura cada
 *    etapa, qué pide cada organismo y qué costo tiene depende de quién
 *    certifique. Cada etapa externa lo dice.
 */

import { avanceEntrevista, procesoCompleto } from './entrevista.ts';
import { contarFaltantes } from './generador.ts';
import { HITOS, coberturaDe, esFechaISO, isoLocal, vacio } from './organizacion.ts';
import type { Hito, Organizacion } from './organizacion.ts';
import { cubreDe, plantillasDe } from './plantillas.ts';

export type EtapaId =
  | 'organizacion'
  | 'entrevista'
  | 'documentos'
  | 'implementacion'
  | Hito;

export type EstadoEtapa = 'completa' | 'en_curso' | 'pendiente' | 'bloqueada';

export interface Etapa {
  id: EtapaId;
  numero: number;
  titulo: string;
  estado: EstadoEtapa;
  progreso?: { hecho: number; total: number };
  /** Qué es esta etapa y en qué punto está. */
  detalle: string;
  /** Si falta algo anterior, qué etapa es. Se informa aunque haya avance propio. */
  bloqueadaPor?: string;
  /** El siguiente paso concreto. Vacío si la etapa está completa. */
  accion: string;
  /** Sólo en las etapas que se registran a mano. */
  hito?: Hito;
  fecha?: string;
}

/** De qué etapas depende cada una. El orden de esta tabla es el orden de la ruta. */
const DEPENDE: Record<EtapaId, EtapaId[]> = {
  organizacion: [],
  entrevista: ['organizacion'],
  documentos: ['entrevista'],
  implementacion: ['documentos'],
  auditoria_interna: ['documentos'],
  revision_direccion: ['auditoria_interna'],
  etapa1: ['revision_direccion'],
  etapa2: ['etapa1', 'implementacion'],
  nc_cerradas: ['etapa2'],
  certificado: ['nc_cerradas'],
};

const TITULOS: Record<EtapaId, string> = {
  organizacion: 'Definir la organización y su alcance',
  entrevista: 'Contar cómo trabaja la organización',
  documentos: 'Documentos generados, completados y aprobados',
  implementacion: 'Implementar: registros que prueban lo que se hace',
  auditoria_interna: 'Auditoría interna',
  revision_direccion: 'Revisión por la dirección',
  etapa1: 'Auditoría de certificación, etapa 1 (documentos)',
  etapa2: 'Auditoría de certificación, etapa 2 (implementación)',
  nc_cerradas: 'Cerrar las no conformidades de la auditoría',
  certificado: 'Certificado',
};

/** Qué tan seguido se repite cada cosa. Estándar del esquema de certificación, no de un organismo. */
const MESES_VIGILANCIA = 12;
const MESES_CICLO = 36;

export function ruta(org: Organizacion, hoy: Date): Etapa[] {
  const doc = new Map(org.documentos.map((d) => [d.id, d]));
  const entrevista = avanceEntrevista(org);
  const plantillas = plantillasDe(org).filter((p) => p.cubre.length > 0);
  const aprobados = plantillas.filter((p) => doc.get(p.id)?.estado === 'aprobado');
  const cobertura = coberturaDe(org, hoy, cubreDe);
  const cubiertos = cobertura.filter((c) => c.estado === 'cubierto');

  // ── 1. organización
  const completos = org.procesos.filter(procesoCompleto).length;
  const chequeo1: [boolean, string][] = [
    [!vacio(org.nombre), 'Falta el nombre de la organización.'],
    [!vacio(org.alcance), 'Escribí el alcance: qué procesos, sitios y actividades entran en el sistema.'],
    [org.normas.length > 0, 'Elegí al menos una norma.'],
    [completos > 0, 'Describí al menos un proceso con nombre, responsable y objetivo.'],
  ];

  // ── 3. documentos: lo próximo que haya que hacer
  const proximoDoc = plantillas.find((p) => doc.get(p.id)?.estado !== 'aprobado');
  let accionDocs = '';
  if (proximoDoc) {
    const d = doc.get(proximoDoc.id);
    if (!d) accionDocs = `Generá «${proximoDoc.titulo}».`;
    else if (contarFaltantes(d.contenido) > 0)
      accionDocs = `Completá las ${contarFaltantes(d.contenido)} marcas pendientes de «${proximoDoc.titulo}».`;
    else accionDocs = `Revisá y aprobá «${proximoDoc.titulo}».`;
  }

  // ── 4. implementación: la primera evidencia que falta, la más grave primero
  const orden: Record<string, number> = { vencido: 0, sin_cubrir: 1, parcial: 2 };
  const brecha = cobertura
    .filter((c) => c.estado !== 'cubierto')
    .sort((a, b) => orden[a.estado] - orden[b.estado])[0];
  let accionImpl = '';
  if (brecha) {
    const clave = brecha.faltan[0];
    const pedida = brecha.requisito.evidencias.find((e) => e.clave === clave);
    accionImpl = `${brecha.requisito.clausula} ${brecha.requisito.titulo}: ${pedida?.descripcion ?? brecha.motivo}`;
  }

  const base: Record<EtapaId, { hecho: number; total: number; completa: boolean; detalle: string; accion: string }> = {
    organizacion: {
      hecho: chequeo1.filter(([ok]) => ok).length,
      total: chequeo1.length,
      completa: chequeo1.every(([ok]) => ok),
      detalle: 'Nombre, normas, alcance y procesos. Es lo que da forma a todo lo demás.',
      accion: chequeo1.find(([ok]) => !ok)?.[1] ?? '',
    },
    entrevista: {
      hecho: entrevista.requeridasContestadas,
      total: entrevista.requeridas,
      completa: entrevista.pendientes.length === 0,
      detalle: 'Las respuestas son la materia prima de los documentos. Lo que falta aparece marcado en ellos.',
      accion: entrevista.pendientes[0] ? `Contestá: ${entrevista.pendientes[0].texto}` : '',
    },
    documentos: {
      hecho: aprobados.length,
      total: plantillas.length,
      completa: plantillas.length > 0 && aprobados.length === plantillas.length,
      detalle: 'Un documento cuenta cuando está aprobado y sin marcas pendientes. Un borrador no prueba nada.',
      accion: accionDocs,
    },
    implementacion: {
      hecho: cubiertos.length,
      total: cobertura.length,
      completa: cobertura.length > 0 && cubiertos.length === cobertura.length,
      detalle:
        'Un documento dice cómo se hace; un registro prueba que se hizo, tiene fecha y caduca. Se cuentan los requisitos con toda su evidencia vigente.',
      accion: accionImpl,
    },
    auditoria_interna: manual(
      org,
      'auditoria_interna',
      'Se audita cada proceso con una persona que no sea responsable de él. Usá el formulario de auditoría y los hallazgos del motor para empezar por lo más débil.',
      'Realizá la auditoría interna de todos los procesos y registrá la fecha en que terminó.',
    ),
    revision_direccion: manual(
      org,
      'revision_direccion',
      'La dirección revisa los resultados de las auditorías, los objetivos, los reclamos y los recursos. Queda un acta.',
      'Reuní a la dirección con el formulario «Acta de revisión por la dirección» y registrá la fecha.',
    ),
    etapa1: manual(
      org,
      'etapa1',
      'El organismo de certificación revisa la documentación y decide si la organización está lista para la etapa 2. Plazos, costos y exigencias dependen del organismo que se elija: tiene que estar acreditado.',
      'Contratá un organismo de certificación acreditado y registrá la fecha en que terminó la etapa 1.',
    ),
    etapa2: manual(
      org,
      'etapa2',
      'El organismo audita en el lugar si el sistema funciona como dicen los documentos. Es la que se aprueba o no. Requiere que los registros estén cargados.',
      'Registrá la fecha en que terminó la etapa 2.',
    ),
    nc_cerradas: manual(
      org,
      'nc_cerradas',
      'Las no conformidades que deje la auditoría se tratan con causa raíz, acción y verificación, en los plazos que fije el organismo.',
      'Cerrá cada no conformidad y registrá la fecha del último cierre.',
    ),
    certificado: manual(
      org,
      'certificado',
      `El organismo emite el certificado. El esquema habitual es de ${MESES_CICLO / 12} años, con auditorías de vigilancia cada ${MESES_VIGILANCIA} meses y renovación al final; el detalle lo fija el organismo.`,
      'Registrá la fecha de emisión del certificado.',
    ),
  };

  const completa = (id: EtapaId): boolean => base[id].completa;
  const ids = Object.keys(DEPENDE) as EtapaId[];

  return ids.map((id, i): Etapa => {
    const b = base[id];
    const pendienteDe = DEPENDE[id].find((d) => !completa(d));
    const esHito = (HITOS as readonly string[]).includes(id);
    const hito = esHito ? (id as Hito) : undefined;

    let estado: EstadoEtapa;
    if (b.completa) estado = 'completa';
    else if (b.hecho > 0) estado = 'en_curso';
    else estado = pendienteDe ? 'bloqueada' : 'pendiente';

    let detalle = b.detalle;
    if (id === 'certificado' && b.completa && hito && org.hitos[hito]) {
      detalle += ` ${vigilancia(org.hitos[hito]!, hoy)}`;
    }

    return {
      id,
      numero: i + 1,
      titulo: TITULOS[id],
      estado,
      progreso: esHito ? undefined : { hecho: b.hecho, total: b.total },
      detalle,
      bloqueadaPor: pendienteDe ? TITULOS[pendienteDe] : undefined,
      accion: b.completa ? '' : b.accion,
      hito,
      fecha: hito ? org.hitos[hito] : undefined,
    };
  });
}

function manual(org: Organizacion, hito: Hito, detalle: string, accion: string) {
  const hecho = org.hitos[hito] ? 1 : 0;
  return { hecho, total: 1, completa: hecho === 1, detalle, accion };
}

/** Cuándo toca la próxima vigilancia, a partir de la fecha del certificado. */
function vigilancia(fecha: string, hoy: Date): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  let proxima = new Date(d);
  const limite = new Date(d);
  limite.setUTCMonth(limite.getUTCMonth() + MESES_CICLO);
  do {
    proxima = new Date(proxima);
    proxima.setUTCMonth(proxima.getUTCMonth() + MESES_VIGILANCIA);
  } while (proxima < hoy && proxima < limite);
  if (proxima >= limite) {
    return `El ciclo de ${MESES_CICLO / 12} años termina el ${proxima.toISOString().slice(0, 10)}: toca la renovación.`;
  }
  return `Próxima auditoría de vigilancia, aproximadamente el ${proxima.toISOString().slice(0, 10)}.`;
}

/** Lo que hay que hacer ahora: la primera etapa que no está completa ni bloqueada. */
export function siguientePaso(etapas: Etapa[]): Etapa | undefined {
  return etapas.find((e) => e.estado === 'en_curso' || e.estado === 'pendiente');
}

// ─── hitos ───────────────────────────────────────────────────────────────

/**
 * Registrar un hito que ocurrió afuera. Tres reglas, todas con mensaje:
 *   - no puede estar en el futuro (un hito "cumplido" mañana no ocurrió);
 *   - no puede registrarse si falta una etapa anterior;
 *   - no puede ser anterior al hito que lo precede.
 */
export function registrarHito(org: Organizacion, hito: Hito, fecha: string, hoy: Date): Organizacion {
  if (!esFechaISO(fecha)) throw new Error('La fecha no es válida.');
  if (fecha > isoLocal(hoy)) throw new Error('Un hito cumplido no puede tener fecha futura.');

  const etapas = ruta(org, hoy);
  const etapa = etapas.find((e) => e.id === hito)!;
  const previa = DEPENDE[hito].find((d) => !etapas.find((e) => e.id === d)!.estado.startsWith('completa'));
  if (previa) throw new Error(`Primero hay que completar: ${TITULOS[previa]}.`);

  for (const d of DEPENDE[hito]) {
    const fechaPrevia = (HITOS as readonly string[]).includes(d) ? org.hitos[d as Hito] : undefined;
    if (fechaPrevia && fecha < fechaPrevia) {
      throw new Error(`No puede ser anterior a «${TITULOS[d]}» (${fechaPrevia}).`);
    }
  }
  if (etapa.estado === 'bloqueada') throw new Error(`Todavía no corresponde: ${etapa.bloqueadaPor}.`);

  return { ...org, hitos: { ...org.hitos, [hito]: fecha } };
}

/** Quitar un hito, sólo si ningún hito posterior depende de él. */
export function quitarHito(org: Organizacion, hito: Hito): Organizacion {
  const dependiente = HITOS.find((h) => org.hitos[h] && DEPENDE[h].includes(hito));
  if (dependiente) throw new Error(`Primero quitá «${TITULOS[dependiente]}», que depende de éste.`);
  const { [hito]: _quitado, ...resto } = org.hitos;
  return { ...org, hitos: resto };
}

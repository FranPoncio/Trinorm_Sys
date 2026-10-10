/**
 * La organización que se está llevando a certificar.
 *
 * Hasta acá la app tenía UNA empresa, la ficticia de la demostración, con la
 * evidencia armada a mano. Esto es lo que la vuelve una herramienta: cualquier
 * organización, con lo que ella misma cuenta de sí, y el sistema deduciendo de
 * ahí qué documentos hacen falta y cuánto falta para certificar.
 *
 * Todo lo de este archivo es puro y no toca el navegador: se testea en Node y
 * viaja tal cual al cliente. Dónde se guarda es asunto de `almacen.ts`.
 *
 * Los datos de una organización real son del cliente o del empleador. Por eso
 * viven sólo en el navegador de quien los carga, y nunca en este repo.
 */

import { requisitos } from './normas.ts';
import { evaluar } from './modelo.ts';
import type { Cobertura, Evidencia, Norma, Requisito } from './modelo.ts';

export const NORMAS_VALIDAS: Norma[] = ['9001', '14001', '45001'];

export const RUBROS = {
  manufactura: 'Manufactura / industria',
  servicios: 'Servicios',
  construccion: 'Construcción',
  comercio: 'Comercio',
  salud: 'Salud',
  educacion: 'Educación',
  agro: 'Agro y alimentos',
  energia: 'Energía y minería',
  otro: 'Otro',
} as const;
export type Rubro = keyof typeof RUBROS;

/** Un proceso tal como la organización lo describe. Es la materia prima de los procedimientos. */
export interface ProcesoOrg {
  id: string;
  nombre: string;
  responsable: string;
  /** Para qué existe: qué resultado entrega al resto. */
  objetivo: string;
  entradas: string;
  salidas: string;
  indicador: string;
}

export type EstadoDoc = 'borrador' | 'en_revision' | 'aprobado';

export interface VersionDoc {
  version: number;
  fecha: string;
  contenido: string;
  nota: string;
}

export interface Documento {
  /** Es el id de la plantilla: hay un documento por plantilla y por organización. */
  id: string;
  titulo: string;
  version: number;
  estado: EstadoDoc;
  contenido: string;
  /** Contenido tal como lo generó el sistema la última vez, para saber si se editó a mano. */
  generado: string;
  fechaAprobacion?: string;
  aprobadoPor?: string;
  historial: VersionDoc[];
}

/**
 * Hitos que el sistema no puede deducir: ocurren afuera (la auditoría la hace
 * una persona, la certificación la da un organismo). Se registran con fecha.
 */
export const HITOS = [
  'auditoria_interna',
  'revision_direccion',
  'etapa1',
  'etapa2',
  'nc_cerradas',
  'certificado',
] as const;
export type Hito = (typeof HITOS)[number];

export interface Organizacion {
  /** Versión del formato guardado. Sube si cambia la forma de este objeto. */
  esquema: 1;
  id: string;
  nombre: string;
  rubro: Rubro;
  empleados: number;
  sedes: string;
  alcance: string;
  normas: Norma[];
  procesos: ProcesoOrg[];
  /** Respuestas de la entrevista por clave. Listas: un ítem por línea. Sí/no: 'si' | 'no'. */
  respuestas: Record<string, string>;
  documentos: Documento[];
  /** Registros que la organización cargó a mano (los documentos salen de `documentos`). */
  registros: Evidencia[];
  /** Fecha `YYYY-MM-DD` de cada hito cumplido. */
  hitos: Partial<Record<Hito, string>>;
  creada: string;
  actualizada: string;
}

// ─── utilidades ─────────────────────────────────────────────────────────

/** `YYYY-MM-DD` en hora LOCAL. Con UTC, de noche en Argentina daría el día siguiente. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * ¿Es una fecha `AAAA-MM-DD` que existe en el calendario?
 *
 * No alcanza con `Date.parse`: el motor de JavaScript acepta "2026-02-30" y
 * la corre en silencio a marzo. Una fecha de hito o de aprobación inventada
 * que se guarda como válida es justamente lo que un auditor encuentra, así
 * que se comprueba que la fecha sobreviva a ir y volver.
 */
export function esFechaISO(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

export function nuevoId(): string {
  return globalThis.crypto.randomUUID();
}

/** Un ítem por línea, sin vacíos ni viñetas que el usuario haya escrito a mano. */
export function lineas(texto: string | undefined): string[] {
  return (texto ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}

export const vacio = (v: string | undefined): boolean => !v || v.trim() === '';

export function nuevaOrganizacion(
  datos: Pick<Organizacion, 'nombre' | 'rubro' | 'empleados' | 'sedes' | 'normas'> & { alcance?: string },
  hoy: Date,
  id: string = nuevoId(),
): Organizacion {
  const fecha = isoLocal(hoy);
  return {
    esquema: 1,
    id,
    nombre: datos.nombre.trim(),
    rubro: datos.rubro,
    empleados: datos.empleados,
    sedes: datos.sedes.trim(),
    alcance: (datos.alcance ?? '').trim(),
    normas: NORMAS_VALIDAS.filter((n) => datos.normas.includes(n)),
    procesos: [],
    respuestas: {},
    documentos: [],
    registros: [],
    hitos: {},
    creada: fecha,
    actualizada: fecha,
  };
}

export function nuevoProceso(nombre = ''): ProcesoOrg {
  return { id: nuevoId(), nombre, responsable: '', objetivo: '', entradas: '', salidas: '', indicador: '' };
}

// ─── validación ─────────────────────────────────────────────────────────

/**
 * Un respaldo es un archivo que viene de afuera: puede estar truncado, ser de
 * otra versión o estar armado a propósito. Nada se da por hecho. Lo que no
 * tiene la forma esperada se rechaza con un mensaje que dice QUÉ falló, y lo
 * desconocido se descarta en lugar de pasarlo al resto de la app.
 */
export function validarOrganizacion(x: unknown): Organizacion {
  const o = obj(x, 'la organización');
  if (o.esquema !== 1) throw new Error(`Formato desconocido (esquema ${String(o.esquema)}).`);

  const normas = arr(o.normas, 'normas').filter((n): n is Norma => NORMAS_VALIDAS.includes(n as Norma));
  const rubro = typeof o.rubro === 'string' && o.rubro in RUBROS ? (o.rubro as Rubro) : 'otro';

  return {
    esquema: 1,
    id: texto(o.id, 'id', 80),
    nombre: texto(o.nombre, 'nombre', 200),
    rubro,
    empleados: numero(o.empleados),
    sedes: texto(o.sedes ?? '', 'sedes', 2000),
    alcance: texto(o.alcance ?? '', 'alcance', 5000),
    normas: [...new Set(normas)],
    procesos: arr(o.procesos ?? [], 'procesos').map(validarProceso),
    respuestas: validarRespuestas(o.respuestas ?? {}),
    documentos: arr(o.documentos ?? [], 'documentos').map(validarDocumento),
    registros: arr(o.registros ?? [], 'registros').map(validarRegistro),
    hitos: validarHitos(o.hitos ?? {}),
    creada: fechaISO(o.creada, 'creada'),
    actualizada: fechaISO(o.actualizada, 'actualizada'),
  };
}

function obj(x: unknown, que: string): Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error(`Se esperaba un objeto en ${que}.`);
  return x as Record<string, unknown>;
}
function arr(x: unknown, que: string): unknown[] {
  if (!Array.isArray(x)) throw new Error(`Se esperaba una lista en ${que}.`);
  return x;
}
function texto(x: unknown, que: string, max: number): string {
  if (typeof x !== 'string') throw new Error(`Falta el texto de "${que}".`);
  if (x.length > max) throw new Error(`"${que}" es demasiado largo (${x.length} > ${max}).`);
  return x;
}
function numero(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}
function fechaISO(x: unknown, que: string): string {
  if (typeof x !== 'string' || !esFechaISO(x)) {
    throw new Error(`La fecha de "${que}" no es válida (se espera AAAA-MM-DD).`);
  }
  return x;
}
function validarProceso(x: unknown): ProcesoOrg {
  const p = obj(x, 'un proceso');
  return {
    id: texto(p.id, 'id del proceso', 80),
    nombre: texto(p.nombre ?? '', 'nombre del proceso', 200),
    responsable: texto(p.responsable ?? '', 'responsable', 200),
    objetivo: texto(p.objetivo ?? '', 'objetivo', 2000),
    entradas: texto(p.entradas ?? '', 'entradas', 2000),
    salidas: texto(p.salidas ?? '', 'salidas', 2000),
    indicador: texto(p.indicador ?? '', 'indicador', 1000),
  };
}
function validarRespuestas(x: unknown): Record<string, string> {
  const r = obj(x, 'las respuestas');
  const salida: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'string') salida[k] = v.slice(0, 10000);
  }
  return salida;
}
function validarDocumento(x: unknown): Documento {
  const d = obj(x, 'un documento');
  const estado = d.estado === 'aprobado' || d.estado === 'en_revision' ? d.estado : 'borrador';
  const doc: Documento = {
    id: texto(d.id, 'id del documento', 80),
    titulo: texto(d.titulo, 'título', 300),
    version: Math.max(1, numero(d.version)),
    estado,
    contenido: texto(d.contenido ?? '', 'contenido', 200000),
    generado: texto(d.generado ?? '', 'generado', 200000),
    historial: arr(d.historial ?? [], 'historial').map((h) => {
      const v = obj(h, 'una versión');
      return {
        version: Math.max(1, numero(v.version)),
        fecha: fechaISO(v.fecha, 'fecha de versión'),
        contenido: texto(v.contenido ?? '', 'contenido de versión', 200000),
        nota: texto(v.nota ?? '', 'nota de versión', 500),
      };
    }),
  };
  // Aprobado sin fecha no prueba nada: se baja a revisión antes que aceptarlo.
  if (estado === 'aprobado') {
    if (typeof d.fechaAprobacion === 'string') {
      doc.fechaAprobacion = fechaISO(d.fechaAprobacion, 'fecha de aprobación');
      doc.aprobadoPor = texto(d.aprobadoPor ?? '', 'aprobado por', 200);
    } else {
      doc.estado = 'en_revision';
    }
  }
  return doc;
}
function validarRegistro(x: unknown): Evidencia {
  const e = obj(x, 'un registro');
  const cubre = arr(e.cubre, 'cubre').filter((c): c is string => typeof c === 'string');
  const claves = e.claves === undefined ? undefined : arr(e.claves, 'claves').filter((c): c is string => typeof c === 'string');
  return {
    id: texto(e.id, 'id del registro', 120),
    titulo: texto(e.titulo, 'título del registro', 300),
    tipo: 'registro',
    cubre,
    ...(claves ? { claves } : {}),
    fecha: fechaISO(e.fecha, 'fecha del registro'),
    proceso: texto(e.proceso ?? '', 'proceso', 200),
    responsable: texto(e.responsable ?? '', 'responsable', 200),
  };
}
function validarHitos(x: unknown): Partial<Record<Hito, string>> {
  const h = obj(x, 'los hitos');
  const salida: Partial<Record<Hito, string>> = {};
  for (const hito of HITOS) if (h[hito] !== undefined) salida[hito] = fechaISO(h[hito], hito);
  return salida;
}

// ─── conexión con el motor ───────────────────────────────────────────────

/**
 * Lo que la organización NO puede cumplir porque no le corresponde, con su
 * motivo. La norma permite excluir un requisito sólo si no afecta la
 * capacidad de entregar productos conformes, y exige justificarlo: por eso
 * esto devuelve el motivo y no un simple "quitado".
 *
 * Hoy se deduce una sola: quien no diseña no tiene que cumplir el diseño y
 * desarrollo de calidad. Es la única exclusión que sale limpia de una
 * pregunta; las demás dependen de un criterio que no se infiere.
 */
export function exclusionesDe(org: Organizacion): { requisito: string; motivo: string }[] {
  const salida: { requisito: string; motivo: string }[] = [];
  if (org.normas.includes('9001') && org.respuestas.disena === 'no') {
    salida.push({
      requisito: '9001:8.3',
      motivo:
        'La organización declara que no diseña ni desarrolla productos o servicios propios: realiza lo que el cliente o el mercado ya definió.',
    });
  }
  return salida;
}

/** Los requisitos que le tocan a esta organización: sus normas, menos lo excluido. */
export function requisitosAplicables(org: Organizacion): Requisito[] {
  const fuera = new Set(exclusionesDe(org).map((e) => e.requisito));
  return requisitos.filter((r) => r.normas.some((n) => org.normas.includes(n)) && !fuera.has(r.id));
}

/**
 * Cobertura de la organización, con el mismo motor de la demostración.
 * Un documento cuenta como evidencia sólo si está APROBADO y con fecha: un
 * borrador es un intento, no un documento del sistema.
 */
export function coberturaDe(
  org: Organizacion,
  hoy: Date,
  cubreDe: (docId: string) => { requisito: string; claves: string[] }[],
): Cobertura[] {
  const evidencias: Evidencia[] = [...org.registros];
  for (const d of org.documentos) {
    if (d.estado !== 'aprobado' || !d.fechaAprobacion) continue;
    for (const c of cubreDe(d.id)) {
      evidencias.push({
        id: `${d.id}:${c.requisito}`,
        titulo: d.titulo,
        tipo: 'documento',
        cubre: [c.requisito],
        claves: c.claves,
        fecha: d.fechaAprobacion,
        proceso: 'Sistema de gestión',
        responsable: d.aprobadoPor ?? '',
      });
    }
  }
  return requisitosAplicables(org).map((r) => evaluar(r, evidencias, hoy));
}

import type { Evidencia } from './modelo';

/**
 * LA EMPRESA DE DEMOSTRACIÓN.
 *
 * Metalúrgica del Suquía S.A. no existe. Es una PyME cordobesa inventada,
 * del tamaño donde estos sistemas se juegan de verdad: 48 personas, una
 * planta, contratistas entrando y saliendo, y una dirección que quiere
 * certificar porque un cliente grande se lo pidió.
 *
 * Está inventada a propósito y por dos razones:
 *
 *   1. Los datos de un SGI real son del cliente o del empleador, no míos.
 *      Una matriz de riesgos o un registro de incidentes es información
 *      sensible de un tercero y no va a un repo público.
 *
 *   2. Una demo con todo en verde no demuestra nada. Acá el estado está
 *      armado para que se vea lo que el motor sabe distinguir: lo que nunca
 *      estuvo, lo que está a medias, y —el caso interesante— lo que existió
 *      y se dejó vencer.
 *
 * El perfil de avance tampoco es aleatorio: calidad va adelante porque la
 * empresa ya venía con 9001, ambiente va atrás, y seguridad es la más
 * floja. Es el orden en que pasa en la vida real, y produce justo los
 * hallazgos que un auditor encuentra en una PyME que integra tarde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ LAS FECHAS SON RELATIVAS
 *
 * Si dejara fechas fijas, dentro de un año la demo mostraría todo vencido y
 * el portfolio se vería roto sin que nadie tocara nada. Las evidencias se
 * generan con un desfasaje en meses respecto de la fecha de compilación:
 * determinístico para un mismo build, y siempre coherente.
 */

export const EMPRESA = {
  nombre: 'Metalúrgica del Suquía S.A.',
  rubro: 'Mecanizado y armado de piezas metálicas',
  dotacion: 48,
  sitio: 'Córdoba, Argentina',
  alcance: 'Mecanizado, soldadura y armado de piezas metálicas para la industria agrícola.',
  motivo: 'Un cliente grande les exige trinorma para seguir siendo proveedor.',
};

export const PROCESOS = [
  'Dirección',
  'Comercial',
  'Ingeniería',
  'Compras',
  'Producción',
  'Mantenimiento',
  'Calidad',
  'Ambiente y Seguridad',
  'Recursos Humanos',
] as const;

/**
 * Fecha ISO desplazada `meses` hacia atrás desde `hoy`.
 *
 * El día se toma del propio `hoy` y se topea en 28: así `meses: 0` da la
 * fecha de hoy —y no una futura, que es lo que pasaba fijando el día 15— y
 * además ningún desplazamiento se desborda al mes siguiente por caer un 31.
 */
function haceMeses(hoy: Date, meses: number): string {
  const dia = Math.min(hoy.getUTCDate(), 28);
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - meses, dia));
  return d.toISOString().slice(0, 10);
}

interface Semilla {
  titulo: string;
  tipo: Evidencia['tipo'];
  cubre: string[];
  /** Meses hacia atrás desde el build. */
  meses: number;
  proceso: string;
  responsable: string;
}

/**
 * Los nombres son de personas inventadas. Se usan iniciales y apellidos
 * comunes a propósito: en una demo pública no van nombres reales de nadie,
 * ni siquiera de conocidos.
 */
const semillas: Semilla[] = [
  // ── Contexto y liderazgo: lo hicieron al arrancar y quedó razonable ──
  { titulo: 'Análisis de contexto — FODA e informe de partes interesadas', tipo: 'documento', cubre: ['4.1', '4.2'], meses: 10, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Acta de revisión anual del contexto', tipo: 'registro', cubre: ['4.1'], meses: 10, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Matriz de partes interesadas rev. 3', tipo: 'documento', cubre: ['4.2'], meses: 10, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Declaración de alcance del SGI', tipo: 'documento', cubre: ['4.3'], meses: 11, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Mapa de procesos rev. 2', tipo: 'documento', cubre: ['4.4'], meses: 9, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Tablero de indicadores de proceso — trimestre', tipo: 'registro', cubre: ['4.4', '9.1'], meses: 2, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Actas de comité de dirección del SGI', tipo: 'registro', cubre: ['5.1'], meses: 4, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Presupuesto SGI aprobado y asignación de horas', tipo: 'registro', cubre: ['5.1'], meses: 7, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Política integrada de calidad, ambiente y SST', tipo: 'documento', cubre: ['5.2'], meses: 11, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Constancias de difusión de la política', tipo: 'registro', cubre: ['5.2'], meses: 10, proceso: 'Recursos Humanos', responsable: 'S. Ocampo' },
  { titulo: 'Organigrama y matriz de responsabilidades del SGI', tipo: 'documento', cubre: ['5.3'], meses: 9, proceso: 'Recursos Humanos', responsable: 'S. Ocampo' },

  // ── Planificación: el tronco está, lo propio de cada norma no tanto ──
  { titulo: 'Matriz de riesgos y oportunidades del SGI', tipo: 'documento', cubre: ['6.1'], meses: 8, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Plan de acción sobre riesgos significativos', tipo: 'registro', cubre: ['6.1'], meses: 6, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Objetivos del SGI por norma — período en curso', tipo: 'documento', cubre: ['6.2'], meses: 7, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Planes de acción por objetivo', tipo: 'documento', cubre: ['6.2'], meses: 7, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Seguimiento semestral de objetivos', tipo: 'registro', cubre: ['6.2'], meses: 3, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Matriz de aspectos e impactos ambientales', tipo: 'documento', cubre: ['14001:6.1.2'], meses: 8, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Matriz legal ambiental — nacional, provincial y municipal', tipo: 'documento', cubre: ['14001:6.1.3'], meses: 14, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Matriz IPER por puesto y tarea', tipo: 'documento', cubre: ['45001:6.1.2'], meses: 9, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Matriz legal de higiene y seguridad', tipo: 'documento', cubre: ['45001:6.1.3'], meses: 12, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Programa anual de seguridad y salud', tipo: 'registro', cubre: ['45001:6.1.4'], meses: 5, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },

  // ── Apoyo ──
  { titulo: 'Determinación de recursos del SGI', tipo: 'documento', cubre: ['7.1'], meses: 9, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Plan de mantenimiento preventivo y partes de cumplimiento', tipo: 'registro', cubre: ['7.1'], meses: 1, proceso: 'Mantenimiento', responsable: 'J. Roldán' },
  { titulo: 'Perfiles de competencia por puesto', tipo: 'documento', cubre: ['7.2'], meses: 9, proceso: 'Recursos Humanos', responsable: 'S. Ocampo' },
  { titulo: 'Legajos con títulos y evaluaciones de desempeño', tipo: 'registro', cubre: ['7.2'], meses: 14, proceso: 'Recursos Humanos', responsable: 'S. Ocampo' },
  // Esta se dejó vencer: es el hallazgo clásico de capacitación.
  { titulo: 'Plan de capacitación y planillas de asistencia', tipo: 'registro', cubre: ['7.2', '7.3'], meses: 19, proceso: 'Recursos Humanos', responsable: 'S. Ocampo' },
  { titulo: 'Plan de comunicación interna y externa', tipo: 'documento', cubre: ['7.4'], meses: 8, proceso: 'Dirección', responsable: 'M. Ferreyra' },
  { titulo: 'Procedimiento de control de información documentada', tipo: 'documento', cubre: ['7.5'], meses: 11, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Listado maestro de documentos vigente', tipo: 'registro', cubre: ['7.5'], meses: 4, proceso: 'Calidad', responsable: 'L. Britos' },

  // ── Operación: calidad bien, ambiente y seguridad con agujeros ──
  { titulo: 'Instructivos de proceso y criterios de aceptación', tipo: 'documento', cubre: ['8.1', '9001:8.5'], meses: 8, proceso: 'Producción', responsable: 'R. Sosa' },
  { titulo: 'Partes diarios de producción', tipo: 'registro', cubre: ['8.1'], meses: 0, proceso: 'Producción', responsable: 'R. Sosa' },
  { titulo: 'Procedimiento de control de procesos tercerizados', tipo: 'documento', cubre: ['8.1'], meses: 7, proceso: 'Compras', responsable: 'P. Gaitán' },
  { titulo: 'Registro de revisión de pedidos antes de aceptar', tipo: 'registro', cubre: ['9001:8.2'], meses: 1, proceso: 'Comercial', responsable: 'V. Quinteros' },
  { titulo: 'Procedimiento de comunicación con el cliente', tipo: 'documento', cubre: ['9001:8.2'], meses: 8, proceso: 'Comercial', responsable: 'V. Quinteros' },
  { titulo: 'Criterios de selección y evaluación de proveedores', tipo: 'documento', cubre: ['9001:8.4'], meses: 10, proceso: 'Compras', responsable: 'P. Gaitán' },
  { titulo: 'Evaluación anual de proveedores', tipo: 'registro', cubre: ['9001:8.4'], meses: 5, proceso: 'Compras', responsable: 'P. Gaitán' },
  { titulo: 'Remitos con verificación de recepción', tipo: 'registro', cubre: ['9001:8.4'], meses: 0, proceso: 'Compras', responsable: 'P. Gaitán' },
  { titulo: 'Registros de trazabilidad por lote', tipo: 'registro', cubre: ['9001:8.5'], meses: 1, proceso: 'Producción', responsable: 'R. Sosa' },
  { titulo: 'Instructivo de preservación y almacenamiento', tipo: 'documento', cubre: ['9001:8.5'], meses: 8, proceso: 'Producción', responsable: 'R. Sosa' },
  { titulo: 'Protocolos de liberación firmados', tipo: 'registro', cubre: ['9001:8.6'], meses: 1, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Procedimiento de producto no conforme', tipo: 'documento', cubre: ['9001:8.7'], meses: 9, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Registros de producto no conforme y concesiones', tipo: 'registro', cubre: ['9001:8.7'], meses: 2, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Inventario de instrumentos de medición', tipo: 'documento', cubre: ['9001:7.1.5'], meses: 7, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Certificados de calibración trazables', tipo: 'registro', cubre: ['9001:7.1.5'], meses: 6, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Plan de emergencia y evacuación', tipo: 'documento', cubre: ['45001:8.2', '14001:8.2'], meses: 13, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Registro de entrega de EPP con firma', tipo: 'registro', cubre: ['45001:8.1.2'], meses: 4, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Requisitos de SST para contratistas', tipo: 'documento', cubre: ['45001:8.1.4'], meses: 6, proceso: 'Compras', responsable: 'P. Gaitán' },

  // ── Evaluación del desempeño ──
  { titulo: 'Plan de medición y seguimiento', tipo: 'documento', cubre: ['9.1'], meses: 8, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Programa anual de auditorías internas', tipo: 'documento', cubre: ['9.2'], meses: 6, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Certificados de formación de auditores internos', tipo: 'registro', cubre: ['9.2'], meses: 20, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Método de medición de satisfacción del cliente', tipo: 'documento', cubre: ['9001:9.1.2'], meses: 8, proceso: 'Comercial', responsable: 'V. Quinteros' },
  { titulo: 'Encuestas de satisfacción del período', tipo: 'registro', cubre: ['9001:9.1.2'], meses: 5, proceso: 'Comercial', responsable: 'V. Quinteros' },
  // El acta existe pero es de hace más de un año: el sistema se dejó caer.
  { titulo: 'Acta de revisión por la dirección', tipo: 'registro', cubre: ['9.3'], meses: 16, proceso: 'Dirección', responsable: 'M. Ferreyra' },

  // ── Mejora ──
  { titulo: 'Procedimiento de no conformidades y acciones correctivas', tipo: 'documento', cubre: ['10.2'], meses: 10, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Registro de no conformidades con análisis de causa', tipo: 'registro', cubre: ['10.2', '10.1'], meses: 3, proceso: 'Calidad', responsable: 'L. Britos' },
  { titulo: 'Procedimiento de reporte e investigación de incidentes', tipo: 'documento', cubre: ['45001:10.2'], meses: 7, proceso: 'Ambiente y Seguridad', responsable: 'D. Ávila' },
  { titulo: 'Serie histórica de indicadores del SGI', tipo: 'registro', cubre: ['10.3'], meses: 3, proceso: 'Calidad', responsable: 'L. Britos' },
];

/**
 * Lo que la empresa NO tiene, y es la mitad de la gracia de la demo.
 * Anotado acá para que se lea de un vistazo por qué el resultado da lo que
 * da. Cada uno es un hallazgo que se ve en cualquier PyME que integra tarde:
 *
 *   45001:5.4   consulta y participación de los trabajadores — nada. Es la
 *               cláusula más simulada de la 45001 y la que más cuesta armar
 *               de verdad, porque no se resuelve con un documento.
 *   45001:8.1.3 gestión del cambio — compraron un centro de mecanizado y
 *               nadie revaluó riesgos.
 *   45001:9.1.2 y 14001:9.1.2 — tienen las matrices legales pero nunca
 *               evaluaron el cumplimiento ítem por ítem. Confundir una cosa
 *               con la otra es el error más frecuente de los dos.
 *   14001:6.1.4 acciones ambientales — la matriz de aspectos no derivó en
 *               ninguna acción.
 *   9001:6.3    planificación de cambios — sin registro.
 *   9001:8.3    diseño y desarrollo — fabrican contra plano del cliente, así
 *               que iría como no aplicable con justificación; acá queda sin
 *               cubrir para que se vea que el sistema lo reclama.
 */

export function evidenciasDemo(hoy: Date): Evidencia[] {
  return semillas.map((s, i) => ({
    id: `ev-${String(i + 1).padStart(3, '0')}`,
    titulo: s.titulo,
    tipo: s.tipo,
    cubre: s.cubre,
    fecha: haceMeses(hoy, s.meses),
    proceso: s.proceso,
    responsable: s.responsable,
  }));
}

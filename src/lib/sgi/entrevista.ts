/**
 * La entrevista: lo que la organización cuenta de sí misma.
 *
 * Es la parte que hace que un documento generado valga algo. Un auditor no
 * revisa si tu procedimiento está bien escrito: revisa si describe lo que de
 * verdad hacés. Por eso los documentos salen de estas respuestas y no de un
 * molde universal, y por eso lo que no se contesta queda marcado en el
 * documento como pendiente en vez de rellenarse con algo plausible.
 *
 * Las preguntas son propias. No siguen el orden ni la redacción de la norma:
 * están hechas para que las pueda contestar quien conoce el negocio, no
 * quien conoce la norma.
 */

import { lineas, vacio } from './organizacion.ts';
import type { Norma } from './modelo.ts';
import type { Organizacion } from './organizacion.ts';

export type TipoPregunta = 'texto' | 'corto' | 'lista' | 'si_no' | 'opcion';

export interface Pregunta {
  /** Clave de la respuesta. Las plantillas la usan para pedirla. */
  clave: string;
  seccion: string;
  /** Lo que se le pregunta a la persona. */
  texto: string;
  /** Cómo se nombra en un documento cuando falta: "⟦COMPLETAR: <etiqueta>⟧". */
  etiqueta: string;
  tipo: TipoPregunta;
  /** Qué hacer con la pregunta si no se entiende. */
  ayuda?: string;
  opciones?: string[];
  /** Normas en las que aplica. Sin esto, aplica a las tres. */
  normas?: Norma[];
  /** Cuenta para el avance de la entrevista. Lo demás es mejora, no bloqueo. */
  requerida: boolean;
}

export const SECCIONES = [
  'El negocio',
  'Dirección y política',
  'Planificación',
  'Apoyo',
  'Operación',
  'Ambiente',
  'Seguridad y salud',
  'Medición y mejora',
] as const;

const P = (p: Pregunta): Pregunta => p;

export const preguntas: Pregunta[] = [
  // ── El negocio ──────────────────────────────────────────────────────────
  P({
    clave: 'actividad',
    seccion: 'El negocio',
    texto: '¿A qué se dedica la organización? Contá qué hace, para quién y cómo llega el producto o servicio al cliente.',
    etiqueta: 'a qué se dedica la organización',
    tipo: 'texto',
    requerida: true,
  }),
  P({
    clave: 'cuestiones_externas',
    seccion: 'El negocio',
    texto: '¿Qué factores de afuera te ayudan o te complican? Mercado, regulación, clima, economía, competencia, tecnología.',
    etiqueta: 'cuestiones externas',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'cuestiones_internas',
    seccion: 'El negocio',
    texto: '¿Y los de adentro? Personal, equipos, cultura, recursos, conocimiento que depende de pocas personas.',
    etiqueta: 'cuestiones internas',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'partes_interesadas',
    seccion: 'El negocio',
    texto: '¿Quiénes tienen interés en lo que hacés y qué esperan de vos? Clientes, dueños, empleados, proveedores, autoridades, vecinos.',
    etiqueta: 'partes interesadas',
    tipo: 'lista',
    ayuda: 'Una por línea, con el formato: Parte — qué espera. Ej.: Clientes — entrega a tiempo y sin defectos.',
    requerida: true,
  }),
  P({
    clave: 'disena',
    seccion: 'El negocio',
    texto: '¿La organización diseña o desarrolla productos o servicios propios, o hace lo que el cliente o el mercado ya definió?',
    etiqueta: 'si la organización diseña',
    tipo: 'si_no',
    ayuda: 'Si la respuesta es no, el diseño y desarrollo de la norma de calidad queda excluido con esa justificación.',
    normas: ['9001'],
    requerida: true,
  }),
  P({
    clave: 'jurisdiccion',
    seccion: 'El negocio',
    texto: '¿En qué provincia y municipio opera? Si tiene más de una sede, anotalas todas.',
    etiqueta: 'jurisdicción de operación',
    tipo: 'corto',
    ayuda: 'De esto depende qué leyes y ordenanzas le tocan en ambiente y en seguridad.',
    normas: ['14001', '45001'],
    requerida: true,
  }),

  // ── Dirección y política ────────────────────────────────────────────────
  P({
    clave: 'compromiso_direccion',
    seccion: 'Dirección y política',
    texto: '¿Qué le promete la dirección a sus clientes y a su gente? Dos o tres frases con tus palabras, sin fórmulas.',
    etiqueta: 'compromiso de la dirección',
    tipo: 'texto',
    ayuda: 'Es la base de la política. Mejor algo que se pueda cumplir que algo que suene bien.',
    requerida: true,
  }),
  P({
    clave: 'responsable_sgi',
    seccion: 'Dirección y política',
    texto: '¿Quién representa a la dirección para el sistema de gestión? Nombre y cargo.',
    etiqueta: 'responsable del sistema de gestión',
    tipo: 'corto',
    requerida: true,
  }),
  P({
    clave: 'direccion',
    seccion: 'Dirección y política',
    texto: '¿Quién está al frente de la organización? Nombre y cargo de quien firma la política.',
    etiqueta: 'máxima autoridad',
    tipo: 'corto',
    requerida: true,
  }),

  // ── Planificación ───────────────────────────────────────────────────────
  P({
    clave: 'riesgos',
    seccion: 'Planificación',
    texto: '¿Cuáles son los 3 a 5 riesgos que más te preocupan para entregar lo que prometés?',
    etiqueta: 'riesgos principales',
    tipo: 'lista',
    ayuda: 'Una por línea. Ej.: dependencia de un solo proveedor, rotación del personal clave.',
    requerida: true,
  }),
  P({
    clave: 'oportunidades',
    seccion: 'Planificación',
    texto: '¿Qué oportunidades ves para mejorar o crecer que hoy no estás aprovechando?',
    etiqueta: 'oportunidades',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: false,
  }),
  P({
    clave: 'objetivos',
    seccion: 'Planificación',
    texto: '¿Qué querés lograr en el próximo año? Con el formato: objetivo — cómo lo medís — meta.',
    etiqueta: 'objetivos del año',
    tipo: 'lista',
    ayuda: 'Una por línea. Ej.: Reducir reclamos — reclamos por mes — menos de 5.',
    requerida: true,
  }),

  // ── Apoyo ───────────────────────────────────────────────────────────────
  P({
    clave: 'infraestructura',
    seccion: 'Apoyo',
    texto: '¿Con qué trabajan? Edificios, máquinas, vehículos, sistemas informáticos, herramientas.',
    etiqueta: 'infraestructura y equipos',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'capacitacion',
    seccion: 'Apoyo',
    texto: '¿Cómo se capacita hoy a la gente cuando entra y cuando cambia algo? Contá lo que hacen de verdad, aunque sea informal.',
    etiqueta: 'cómo se capacita la gente',
    tipo: 'texto',
    requerida: true,
  }),
  P({
    clave: 'canales_comunicacion',
    seccion: 'Apoyo',
    texto: '¿Por qué medios se comunican adentro y con afuera? Reuniones, mail, cartelera, WhatsApp, portal.',
    etiqueta: 'canales de comunicación',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'soporte_documental',
    seccion: 'Apoyo',
    texto: '¿Dónde viven hoy los documentos y cómo se enteran todos de la última versión?',
    etiqueta: 'cómo se guardan los documentos',
    tipo: 'opcion',
    opciones: ['En papel', 'En digital (carpeta compartida o sistema)', 'Mixto, papel y digital'],
    requerida: true,
  }),

  // ── Operación ───────────────────────────────────────────────────────────
  P({
    clave: 'etapas',
    seccion: 'Operación',
    texto: 'Contá, en orden, cómo se hace el producto o servicio desde que entra el pedido hasta que se entrega.',
    etiqueta: 'etapas de la operación',
    tipo: 'lista',
    ayuda: 'Una etapa por línea, en el orden real. Es la pregunta más importante: de acá sale cómo se redactan los procedimientos.',
    requerida: true,
  }),
  P({
    clave: 'puntos_control',
    seccion: 'Operación',
    texto: '¿En qué momentos se verifica o inspecciona algo antes de seguir? Recepción, durante el proceso, antes de entregar.',
    etiqueta: 'puntos de control',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'tercerizados',
    seccion: 'Operación',
    texto: '¿Hay actividades o servicios que haga un tercero por cuenta de la organización y sigan siendo su responsabilidad?',
    etiqueta: 'si hay actividades tercerizadas',
    tipo: 'si_no',
    requerida: true,
  }),
  P({
    clave: 'tercerizados_detalle',
    seccion: 'Operación',
    texto: 'Si hay: ¿cuáles son y quién las hace?',
    etiqueta: 'actividades tercerizadas',
    tipo: 'lista',
    ayuda: 'Una por línea. Dejá vacío si la respuesta anterior fue no.',
    requerida: false,
  }),
  P({
    clave: 'proveedores_criticos',
    seccion: 'Operación',
    texto: '¿Qué proveedores, si fallan, te frenan o te hacen entregar mal? Y cómo decidís hoy con quién comprar.',
    etiqueta: 'proveedores críticos',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    normas: ['9001'],
    requerida: true,
  }),
  P({
    clave: 'canales_cliente',
    seccion: 'Operación',
    texto: '¿Cómo llegan los pedidos, las consultas y los reclamos de los clientes, y dónde queda registrado?',
    etiqueta: 'canales con el cliente',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    normas: ['9001'],
    requerida: true,
  }),
  P({
    clave: 'instrumentos',
    seccion: 'Operación',
    texto: '¿Qué instrumentos miden algo que importa para la calidad? Balanzas, calibres, termómetros, manómetros.',
    etiqueta: 'instrumentos de medición',
    tipo: 'lista',
    ayuda: 'Una por línea. Dejá vacío si no usan ninguno.',
    normas: ['9001'],
    requerida: false,
  }),
  P({
    clave: 'cuando_sale_mal',
    seccion: 'Operación',
    texto: 'Cuando algo sale mal —un reclamo, un producto defectuoso, un error de entrega— ¿qué pasa hoy, paso a paso?',
    etiqueta: 'qué pasa cuando algo sale mal',
    tipo: 'texto',
    ayuda: 'Contá lo que hacen de verdad, no lo que debería pasar.',
    requerida: true,
  }),
  P({
    clave: 'satisfaccion',
    seccion: 'Operación',
    texto: '¿Cómo te enterás de si el cliente quedó conforme? Encuestas, llamados, reclamos, recompras.',
    etiqueta: 'cómo se mide la satisfacción',
    tipo: 'texto',
    normas: ['9001'],
    requerida: true,
  }),

  // ── Ambiente ────────────────────────────────────────────────────────────
  P({
    clave: 'aspectos_ambientales',
    seccion: 'Ambiente',
    texto: '¿Qué sale de tu actividad que afecte al ambiente? Residuos, efluentes, emisiones, consumo de energía o agua, ruido.',
    etiqueta: 'aspectos ambientales',
    tipo: 'lista',
    ayuda: 'Una por línea, con su origen. Ej.: Residuos de aceite — taller de mantenimiento.',
    normas: ['14001'],
    requerida: true,
  }),
  P({
    clave: 'emergencias_ambientales',
    seccion: 'Ambiente',
    texto: '¿Qué situaciones podrían dañar al ambiente de golpe? Derrames, incendio, fuga, desborde.',
    etiqueta: 'emergencias ambientales',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    normas: ['14001'],
    requerida: true,
  }),
  P({
    clave: 'permisos_ambientales',
    seccion: 'Ambiente',
    texto: '¿Qué habilitaciones o permisos ambientales tiene la organización?',
    etiqueta: 'permisos ambientales',
    tipo: 'lista',
    ayuda: 'Una por línea. Dejá vacío si no tiene ninguno.',
    normas: ['14001'],
    requerida: false,
  }),

  // ── Seguridad y salud ───────────────────────────────────────────────────
  P({
    clave: 'peligros',
    seccion: 'Seguridad y salud',
    texto: '¿Qué peligros hay en las tareas? Trabajo en altura, máquinas, químicos, ruido, cargas, tránsito, calor.',
    etiqueta: 'peligros de las tareas',
    tipo: 'lista',
    ayuda: 'Una por línea, con la tarea. Ej.: Corte de chapa — atrapamiento en guillotina.',
    normas: ['45001'],
    requerida: true,
  }),
  P({
    clave: 'emergencias_sst',
    seccion: 'Seguridad y salud',
    texto: '¿Qué emergencias podrían afectar a las personas? Incendio, accidente grave, evacuación, derrame de químicos.',
    etiqueta: 'emergencias para las personas',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    normas: ['45001'],
    requerida: true,
  }),
  P({
    clave: 'participacion',
    seccion: 'Seguridad y salud',
    texto: '¿Cómo participan hoy los trabajadores en temas de seguridad? Comité mixto, delegados, charlas, buzón.',
    etiqueta: 'cómo participan los trabajadores',
    tipo: 'texto',
    normas: ['45001'],
    requerida: true,
  }),
  P({
    clave: 'contratistas',
    seccion: 'Seguridad y salud',
    texto: '¿Entran contratistas o terceros a trabajar en las instalaciones? ¿Quiénes y haciendo qué?',
    etiqueta: 'contratistas en las instalaciones',
    tipo: 'lista',
    ayuda: 'Una por línea. Dejá vacío si no entra ninguno.',
    normas: ['45001'],
    requerida: false,
  }),

  // ── Medición y mejora ───────────────────────────────────────────────────
  P({
    clave: 'indicadores',
    seccion: 'Medición y mejora',
    texto: '¿Qué indicadores medís hoy, aunque sea en una planilla? Con qué frecuencia y quién los mira.',
    etiqueta: 'indicadores actuales',
    tipo: 'lista',
    ayuda: 'Una por línea.',
    requerida: true,
  }),
  P({
    clave: 'auditores',
    seccion: 'Medición y mejora',
    texto: '¿Quiénes podrían auditar internamente sin auditar su propio trabajo? Aunque todavía no estén formados.',
    etiqueta: 'posibles auditores internos',
    tipo: 'lista',
    ayuda: 'Una por línea. El auditor no puede revisar lo que él mismo hace.',
    requerida: true,
  }),
];

const porClave = new Map(preguntas.map((p) => [p.clave, p]));
export const pregunta = (clave: string): Pregunta | undefined => porClave.get(clave);

/** ¿Esta pregunta le toca a una organización con estas normas? */
export function aplica(p: Pregunta, normas: Norma[]): boolean {
  return !p.normas || p.normas.some((n) => normas.includes(n));
}

export function preguntasDe(org: Organizacion): Pregunta[] {
  return preguntas.filter((p) => aplica(p, org.normas));
}

/**
 * La respuesta de una pregunta cuenta como contestada si tiene contenido.
 * "No" es una respuesta válida: significa que lo pensaron.
 */
export function contestada(org: Organizacion, p: Pregunta): boolean {
  const r = org.respuestas[p.clave];
  if (vacio(r)) return false;
  return p.tipo === 'lista' ? lineas(r).length > 0 : true;
}

export interface AvanceEntrevista {
  aplicables: number;
  contestadas: number;
  requeridas: number;
  requeridasContestadas: number;
  /** 0 a 100, sobre las requeridas. */
  porcentaje: number;
  /** Las requeridas sin contestar, en el orden en que se preguntan. */
  pendientes: Pregunta[];
}

export function avanceEntrevista(org: Organizacion): AvanceEntrevista {
  const aplicables = preguntasDe(org);
  const requeridas = aplicables.filter((p) => p.requerida);
  const pendientes = requeridas.filter((p) => !contestada(org, p));
  return {
    aplicables: aplicables.length,
    contestadas: aplicables.filter((p) => contestada(org, p)).length,
    requeridas: requeridas.length,
    requeridasContestadas: requeridas.length - pendientes.length,
    porcentaje: requeridas.length === 0 ? 100 : Math.round(((requeridas.length - pendientes.length) / requeridas.length) * 100),
    pendientes,
  };
}

/** Un proceso está descrito cuando se sabe cómo se llama, quién responde y para qué existe. */
export const procesoCompleto = (p: Organizacion['procesos'][number]): boolean =>
  !vacio(p.nombre) && !vacio(p.responsable) && !vacio(p.objetivo);

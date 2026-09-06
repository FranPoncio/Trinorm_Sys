import type { Requisito, RequisitoBase, Norma } from './modelo';

/**
 * EL CORPUS — qué te va a pedir el auditor, cláusula por cláusula.
 *
 * Acá no hay texto de ISO. Numeración y título de cláusula son referencia
 * factual; todo lo demás —qué evidencia sirve, qué se pregunta— está escrito
 * desde el oficio, no copiado del documento normativo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO PERMITE HACER "LAS TRES DE UNA"
 *
 * Las tres normas comparten la estructura de alto nivel: capítulos 4 a 10
 * con los mismos títulos y la misma lógica. Eso es deliberado — ISO las
 * armó así justamente para que se puedan integrar.
 *
 * Consecuencia práctica: 21 de los requisitos de acá abajo son TRONCO y se
 * escriben una sola vez para las tres. Si los duplicara por norma tendría
 * 63 entradas casi idénticas, y a la tercera corrección de redacción una de
 * las tres se quedaría atrás. Modelando el tronco, la trinorma completa
 * cuesta ~46 requisitos en lugar de ~88.
 *
 * Lo que NO es tronco es lo que hace propia a cada norma: el diseño y los
 * proveedores en calidad, los aspectos ambientales y la matriz legal en
 * ambiente, los peligros y la participación de los trabajadores en SST.
 */

const TODAS: Norma[] = ['9001', '14001', '45001'];

/**
 * Vigencias por defecto. No son caprichos: salen de la cadencia con la que
 * el propio sistema obliga a rehacer cada cosa.
 */
const ANUAL = 12;
const BIANUAL = 24;
const TRIENAL = 36;

// ═══════════════════════════════════════════════════════════════════════
// TRONCO — estructura de alto nivel, común a las tres normas
// ═══════════════════════════════════════════════════════════════════════

const tronco: RequisitoBase[] = [
  {
    id: '4.1',
    clausula: '4.1',
    titulo: 'Comprensión de la organización y su contexto',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'analisis-contexto',
        tipo: 'documento',
        descripcion: 'Análisis de cuestiones internas y externas que afectan al sistema (FODA, PESTEL o el formato que uses).',
      },
      {
        clave: 'revision-contexto',
        tipo: 'registro',
        descripcion: 'Acta donde consta que el contexto se revisó y sigue vigente.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Qué cambió en el contexto de la organización en el último año y dónde quedó registrado?',
      'El análisis de contexto, ¿lo hizo la dirección o lo redactó una consultora y nadie lo volvió a mirar?',
      '¿Cómo se traduce una cuestión del contexto en un riesgo del punto 6.1?',
    ],
  },
  {
    id: '4.2',
    clausula: '4.2',
    titulo: 'Necesidades y expectativas de las partes interesadas',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'matriz-partes',
        tipo: 'documento',
        descripcion: 'Matriz de partes interesadas con qué espera cada una y cuáles de esas expectativas la organización adopta como requisito propio.',
      },
      {
        clave: 'revision-partes',
        tipo: 'registro',
        descripcion: 'Evidencia de que la matriz se actualizó (alta de un cliente grande, cambio de sindicato, nuevo vecino lindero).',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Quiénes son sus partes interesadas y cuál de sus expectativas se volvió requisito obligatorio?',
      'Los trabajadores y los contratistas, ¿figuran como parte interesada?',
    ],
  },
  {
    id: '4.3',
    clausula: '4.3',
    titulo: 'Determinación del alcance del sistema de gestión',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'alcance',
        tipo: 'documento',
        descripcion: 'Declaración de alcance: qué procesos, qué sitios y qué actividades entran, y la justificación de lo que queda afuera.',
      },
    ],
    preguntas: [
      '¿Qué queda fuera del alcance y con qué argumento?',
      'Si tiene varias plantas o depósitos, ¿están todos adentro? ¿Y los contratistas que operan en sitio?',
    ],
  },
  {
    id: '4.4',
    clausula: '4.4',
    titulo: 'Sistema de gestión y sus procesos',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'mapa-procesos',
        tipo: 'documento',
        descripcion: 'Mapa de procesos con entradas, salidas, dueño de cada proceso y cómo se enganchan entre sí.',
      },
      {
        clave: 'indicadores-proceso',
        tipo: 'registro',
        descripcion: 'Medición de los indicadores de cada proceso en el período.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      '¿Quién es el dueño de este proceso y qué decide sin consultar?',
      '¿Con qué indicador sabe que el proceso anda bien, y cuál fue el último valor?',
    ],
  },
  {
    id: '5.1',
    clausula: '5.1',
    titulo: 'Liderazgo y compromiso',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'participacion-direccion',
        tipo: 'registro',
        descripcion: 'Actas donde se ve a la dirección decidiendo sobre el sistema: asignando recursos, cerrando acciones, fijando objetivos.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'recursos-asignados',
        tipo: 'registro',
        descripcion: 'Presupuesto, horas o personas efectivamente asignadas al sistema.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Sin mirar el papel: ¿qué decisión tomó la dirección este año por causa del sistema de gestión?',
      '¿La dirección delegó el sistema en el responsable de calidad y se desentendió? ¿Cómo se demuestra que no?',
    ],
  },
  {
    id: '5.2',
    clausula: '5.2',
    titulo: 'Política',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'politica',
        tipo: 'documento',
        descripcion: 'Política del sistema, firmada por la dirección, con los compromisos que la norma exige para cada disciplina.',
      },
      {
        clave: 'difusion-politica',
        tipo: 'registro',
        descripcion: 'Prueba de que la política se comunicó y está disponible (cartelera, inducción, intranet).',
        vigenciaMeses: BIANUAL,
      },
    ],
    preguntas: [
      'Pregúntele a un operario qué dice la política. Si no la puede parafrasear, no está comunicada.',
      '¿La política menciona los compromisos propios de ambiente y de seguridad, o es sólo de calidad con dos frases pegadas?',
    ],
  },
  {
    id: '5.3',
    clausula: '5.3',
    titulo: 'Roles, responsabilidades y autoridades',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'roles',
        tipo: 'documento',
        descripcion: 'Organigrama y definición de responsabilidades y autoridades para el sistema.',
      },
      {
        clave: 'comunicacion-roles',
        tipo: 'registro',
        descripcion: 'Constancia de que cada uno conoce su rol (notificación firmada, descripción de puesto entregada).',
        vigenciaMeses: BIANUAL,
      },
    ],
    preguntas: [
      '¿Quién tiene autoridad para frenar una entrega no conforme? ¿Y para parar una tarea insegura?',
      'Si esa persona está de licencia, ¿quién la reemplaza y dónde dice eso?',
    ],
  },
  {
    id: '6.1',
    clausula: '6.1',
    titulo: 'Acciones para abordar riesgos y oportunidades',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'matriz-riesgos',
        tipo: 'documento',
        descripcion: 'Matriz de riesgos y oportunidades del sistema, con criterio de valoración explícito.',
      },
      {
        clave: 'acciones-riesgo',
        tipo: 'registro',
        descripcion: 'Acciones definidas para los riesgos significativos, con responsable, plazo y estado.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'eficacia-acciones',
        tipo: 'registro',
        descripcion: 'Verificación de que las acciones sirvieron —no que se hicieron, que sirvieron.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Elija un riesgo alto de la matriz: ¿qué acción salió de ahí y qué pasó con ella?',
      '¿Cómo verificaron que la acción bajó el riesgo? ¿Se revaluó?',
      'La matriz, ¿la armaron con los que hacen el trabajo o en una oficina?',
    ],
  },
  {
    id: '6.2',
    clausula: '6.2',
    titulo: 'Objetivos y planificación para lograrlos',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'objetivos',
        tipo: 'documento',
        descripcion: 'Objetivos medibles por norma, coherentes con la política, con meta y plazo.',
      },
      {
        clave: 'plan-objetivos',
        tipo: 'documento',
        descripcion: 'Para cada objetivo: qué se va a hacer, con qué recursos, quién y cuándo.',
      },
      {
        clave: 'seguimiento-objetivos',
        tipo: 'registro',
        descripcion: 'Medición del avance de cada objetivo en el período.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      '"Mejorar la calidad" no es un objetivo. ¿Cuál es la meta numérica y contra qué línea de base?',
      '¿Qué objetivo no se cumplió y qué se hizo al respecto?',
    ],
  },
  {
    id: '7.1',
    clausula: '7.1',
    titulo: 'Recursos',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'recursos',
        tipo: 'documento',
        descripcion: 'Determinación de los recursos que el sistema necesita: personas, infraestructura, ambiente de trabajo.',
      },
      {
        clave: 'mantenimiento',
        tipo: 'registro',
        descripcion: 'Plan de mantenimiento de la infraestructura crítica y sus cumplimientos.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      '¿Qué equipo, si se rompe, para el proceso? ¿Está en el plan de mantenimiento?',
      '¿Cuándo fue el último mantenimiento preventivo y quién lo firmó?',
    ],
  },
  {
    id: '7.2',
    clausula: '7.2',
    titulo: 'Competencia',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'perfiles',
        tipo: 'documento',
        descripcion: 'Perfil de competencia por puesto: formación, experiencia y habilidades requeridas.',
      },
      {
        clave: 'legajos',
        tipo: 'registro',
        descripcion: 'Respaldo de la competencia de cada persona: títulos, certificados, evaluaciones de desempeño.',
        vigenciaMeses: TRIENAL,
      },
      {
        clave: 'capacitacion',
        tipo: 'registro',
        descripcion: 'Capacitaciones dictadas con asistencia firmada y evaluación de eficacia.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Este puesto pide una competencia. ¿Quién lo ocupa y con qué papel se demuestra que la tiene?',
      'La capacitación se dictó, ¿pero cómo saben que sirvió? Firmar la planilla no es evaluar eficacia.',
      '¿Y los contratistas que hacen tareas críticas? ¿Alguien verificó su competencia?',
    ],
  },
  {
    id: '7.3',
    clausula: '7.3',
    titulo: 'Toma de conciencia',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'concientizacion',
        tipo: 'registro',
        descripcion: 'Charlas, inducciones o campañas donde se explicó por qué importa el sistema y qué pasa si no se cumple.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'A un operario: ¿qué consecuencia tiene para el cliente que usted se saltee este control?',
      'Competencia y toma de conciencia no son lo mismo. ¿Cómo lo trabajan por separado?',
    ],
  },
  {
    id: '7.4',
    clausula: '7.4',
    titulo: 'Comunicación',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'plan-comunicacion',
        tipo: 'documento',
        descripcion: 'Qué se comunica, a quién, cuándo, por qué medio y quién es responsable. Interna y externa.',
      },
      {
        clave: 'comunicaciones',
        tipo: 'registro',
        descripcion: 'Comunicaciones efectivamente emitidas y recibidas, incluidas las de partes externas.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Si un vecino llama por un olor, ¿quién atiende, dónde se registra y quién responde?',
      '¿Hay comunicación externa obligatoria por requisito legal? ¿Se está cumpliendo?',
    ],
  },
  {
    id: '7.5',
    clausula: '7.5',
    titulo: 'Información documentada',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'control-documental',
        tipo: 'documento',
        descripcion: 'Cómo se aprueba, versiona, distribuye y da de baja un documento. Y cómo se protegen y cuánto se conservan los registros.',
      },
      {
        clave: 'listado-maestro',
        tipo: 'registro',
        descripcion: 'Listado maestro vigente: qué documentos existen, en qué versión y dónde están.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Traiga el procedimiento que usa el operario. ¿Es la última versión? ¿Cómo se enteró de que cambió?',
      '¿Hay copias impresas dando vueltas sin control? Es el hallazgo más fácil de encontrar.',
      '¿Cuánto tiempo conservan los registros y quién decidió ese plazo?',
    ],
  },
  {
    id: '8.1',
    clausula: '8.1',
    titulo: 'Planificación y control operacional',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'controles-operacionales',
        tipo: 'documento',
        descripcion: 'Criterios de los procesos y controles para cumplirlos: instructivos, parámetros, puntos de inspección.',
      },
      {
        clave: 'registros-operacion',
        tipo: 'registro',
        descripcion: 'Los registros que el propio proceso genera y que prueban que se operó dentro de criterio.',
        vigenciaMeses: 3,
      },
      {
        clave: 'control-tercerizados',
        tipo: 'documento',
        descripcion: 'Cómo se controlan los procesos que hace un tercero pero siguen siendo responsabilidad de la organización.',
      },
    ],
    preguntas: [
      'Muéstreme el registro de operación de ayer de este proceso.',
      'Si un parámetro se sale de rango, ¿qué hace el operario y dónde está escrito?',
      'Lo que terceriza, ¿lo controla o confía?',
    ],
  },
  {
    id: '9.1',
    clausula: '9.1',
    titulo: 'Seguimiento, medición, análisis y evaluación',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'plan-medicion',
        tipo: 'documento',
        descripcion: 'Qué se mide, con qué método, cada cuánto y cuándo se analiza el resultado.',
      },
      {
        clave: 'mediciones',
        tipo: 'registro',
        descripcion: 'Los datos medidos en el período y su análisis, no sólo la planilla cruda.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      'Mide, pero ¿analiza? ¿Qué conclusión sacó de estos datos y qué decisión salió de ahí?',
      '¿Los métodos de medición son comparables entre períodos o cambiaron a mitad de camino?',
    ],
  },
  {
    id: '9.2',
    clausula: '9.2',
    titulo: 'Auditoría interna',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'programa-auditoria',
        tipo: 'documento',
        descripcion: 'Programa de auditorías con frecuencia, alcance y criterio, definido según la importancia y los resultados previos.',
      },
      {
        clave: 'informes-auditoria',
        tipo: 'registro',
        descripcion: 'Informes de las auditorías realizadas, con hallazgos y evidencia objetiva.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'competencia-auditores',
        tipo: 'registro',
        descripcion: 'Formación de los auditores internos y constancia de que no auditan su propio trabajo.',
        vigenciaMeses: TRIENAL,
      },
    ],
    preguntas: [
      '¿El auditor interno auditó su propio proceso? Es la falla de imparcialidad más común.',
      'El programa, ¿es un calendario fijo o se ajusta según dónde hubo problemas el año pasado?',
      '¿Los hallazgos de la auditoría anterior se cerraron antes de esta?',
    ],
  },
  {
    id: '9.3',
    clausula: '9.3',
    titulo: 'Revisión por la dirección',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'acta-revision',
        tipo: 'registro',
        descripcion: 'Acta de revisión que cubra todas las entradas que pide la norma y, sobre todo, con las decisiones tomadas.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'seguimiento-revision',
        tipo: 'registro',
        descripcion: 'Seguimiento de las decisiones de la revisión anterior: qué se hizo con cada una.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'El acta lista temas, ¿pero qué DECIDIÓ la dirección? Sin decisiones no es una revisión.',
      '¿Se revisaron las tres normas o la revisión es de calidad y ambiente y seguridad se mencionan al pasar?',
      'De la revisión anterior salieron acciones. ¿Cuáles se cumplieron?',
    ],
  },
  {
    id: '10.1',
    clausula: '10.1',
    titulo: 'Mejora — generalidades',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'oportunidades-mejora',
        tipo: 'registro',
        descripcion: 'Oportunidades de mejora identificadas y qué se hizo con ellas.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿De dónde salen las ideas de mejora? ¿Sólo de la dirección o también del que opera?',
    ],
  },
  {
    id: '10.2',
    clausula: '10.2',
    titulo: 'No conformidad y acción correctiva',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'procedimiento-nc',
        tipo: 'documento',
        descripcion: 'Cómo se detecta, registra, analiza y cierra una no conformidad.',
      },
      {
        clave: 'registros-nc',
        tipo: 'registro',
        descripcion: 'No conformidades del período con análisis de causa raíz, acción, responsable y verificación de eficacia.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Tomemos esta NC: la causa raíz que anotaron, ¿es una causa o es el síntoma escrito al revés?',
      '"Se capacitó al operario" casi nunca es una acción correctiva. ¿Qué cambió en el proceso?',
      '¿Cómo verificaron que no volvió a pasar?',
      'Cero no conformidades en el año no es una buena noticia: significa que el sistema no detecta.',
    ],
  },
  {
    id: '10.3',
    clausula: '10.3',
    titulo: 'Mejora continua',
    normas: TODAS,
    tronco: true,
    evidencias: [
      {
        clave: 'evidencia-mejora',
        tipo: 'registro',
        descripcion: 'Evidencia de que el desempeño del sistema mejoró: la serie del indicador, no una declaración.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Muéstreme un indicador que haya mejorado y por qué atribuye la mejora al sistema.',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// PROPIOS DE ISO 9001 — CALIDAD
// ═══════════════════════════════════════════════════════════════════════

const propios9001: RequisitoBase[] = [
  {
    id: '9001:6.3',
    clausula: '6.3',
    titulo: 'Planificación de los cambios',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'registro-cambios',
        tipo: 'registro',
        descripcion: 'Cambios planificados del sistema con su propósito, consecuencias, recursos y responsabilidades.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Cambiaron un proveedor o una línea. ¿Dónde está el análisis previo de consecuencias?',
      'Los cambios de urgencia, ¿se documentan después o no se documentan?',
    ],
  },
  {
    id: '9001:7.1.5',
    clausula: '7.1.5',
    titulo: 'Recursos de seguimiento y medición',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'inventario-instrumentos',
        tipo: 'documento',
        descripcion: 'Inventario de instrumentos de medición que afectan la conformidad del producto.',
      },
      {
        clave: 'calibraciones',
        tipo: 'registro',
        descripcion: 'Certificados de calibración trazables a patrones, vigentes.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Este calibre mide una característica crítica. ¿Cuándo se calibró y contra qué patrón?',
      'Si un instrumento aparece descalibrado, ¿qué hacen con el producto que ya midieron con él?',
    ],
  },
  {
    id: '9001:8.2',
    clausula: '8.2',
    titulo: 'Requisitos para los productos y servicios',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'revision-pedidos',
        tipo: 'registro',
        descripcion: 'Revisión de cada pedido antes de comprometerse: que se pueda cumplir lo que se promete.',
        vigenciaMeses: 3,
      },
      {
        clave: 'comunicacion-cliente',
        tipo: 'documento',
        descripcion: 'Canales definidos para consultas, contratos, quejas y propiedad del cliente.',
      },
    ],
    preguntas: [
      '¿Quién revisa que un pedido sea cumplible antes de aceptarlo, y dónde firma?',
      'Un pedido llegó por teléfono sin especificaciones escritas. ¿Cómo lo confirman?',
    ],
  },
  {
    id: '9001:8.3',
    clausula: '8.3',
    titulo: 'Diseño y desarrollo',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'proceso-diseno',
        tipo: 'documento',
        descripcion: 'Etapas de diseño, revisiones, verificación y validación, con responsabilidades.',
      },
      {
        clave: 'registros-diseno',
        tipo: 'registro',
        descripcion: 'Entradas, revisiones, resultados y cambios de diseño del período.',
        vigenciaMeses: BIANUAL,
      },
    ],
    preguntas: [
      'Si no diseña, ¿está declarado como no aplicable y con qué justificación?',
      'Verificación y validación no son sinónimos. ¿Cómo hace cada una?',
    ],
  },
  {
    id: '9001:8.4',
    clausula: '8.4',
    titulo: 'Control de proveedores externos',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'criterios-proveedores',
        tipo: 'documento',
        descripcion: 'Criterios de selección, evaluación y reevaluación de proveedores.',
      },
      {
        clave: 'evaluacion-proveedores',
        tipo: 'registro',
        descripcion: 'Evaluaciones hechas y qué se hizo con los proveedores que no dieron.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'verificacion-compras',
        tipo: 'registro',
        descripcion: 'Verificación de lo recibido contra lo pedido.',
        vigenciaMeses: 3,
      },
    ],
    preguntas: [
      'Este proveedor viene mal hace tres entregas. ¿Qué dice el sistema que hay que hacer y se hizo?',
      '¿Evalúa proveedores o solamente los da de alta una vez y nunca más?',
    ],
  },
  {
    id: '9001:8.5',
    clausula: '8.5',
    titulo: 'Producción y provisión del servicio',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'condiciones-controladas',
        tipo: 'documento',
        descripcion: 'Instructivos, especificaciones y criterios de aceptación disponibles en el puesto.',
      },
      {
        clave: 'trazabilidad',
        tipo: 'registro',
        descripcion: 'Identificación y trazabilidad de producto: poder decir de qué lote salió lo que entregó.',
        vigenciaMeses: 6,
      },
      {
        clave: 'preservacion',
        tipo: 'documento',
        descripcion: 'Cómo se preserva el producto: almacenamiento, manipulación, protección.',
      },
    ],
    preguntas: [
      'Un cliente reclama por este número de lote. ¿Puede decirme qué materia prima llevó y quién lo produjo?',
      '¿Cuánto tarda en rastrear eso? Si son días, la trazabilidad existe en el papel nada más.',
    ],
  },
  {
    id: '9001:8.6',
    clausula: '8.6',
    titulo: 'Liberación de los productos y servicios',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'registros-liberacion',
        tipo: 'registro',
        descripcion: 'Evidencia de conformidad con los criterios de aceptación y quién autorizó la liberación.',
        vigenciaMeses: 3,
      },
    ],
    preguntas: [
      '¿Quién libera y con qué autoridad? ¿Puede liberar el mismo que produjo?',
      '¿Se liberó algo sin completar los controles porque el cliente apuraba? ¿Está registrado?',
    ],
  },
  {
    id: '9001:8.7',
    clausula: '8.7',
    titulo: 'Control de las salidas no conformes',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'procedimiento-snc',
        tipo: 'documento',
        descripcion: 'Qué se hace con lo no conforme: separar, corregir, concesión, reclasificar, descartar.',
      },
      {
        clave: 'registros-snc',
        tipo: 'registro',
        descripcion: 'Salidas no conformes del período, con la decisión tomada y quién la autorizó.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      '¿Dónde está físicamente el producto no conforme? Si está mezclado con el bueno, hay hallazgo.',
      'Las concesiones, ¿quién las autoriza y el cliente se entera?',
    ],
  },
  {
    id: '9001:9.1.2',
    clausula: '9.1.2',
    titulo: 'Satisfacción del cliente',
    normas: ['9001'],
    tronco: false,
    evidencias: [
      {
        clave: 'metodo-satisfaccion',
        tipo: 'documento',
        descripcion: 'Cómo se releva la percepción del cliente: encuesta, reclamos, devoluciones, entrevistas.',
      },
      {
        clave: 'datos-satisfaccion',
        tipo: 'registro',
        descripcion: 'Datos del período y su análisis.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Si la encuesta la contesta el 5% de los clientes, ¿eso mide percepción o mide a los que contestan encuestas?',
      'Los reclamos, ¿los cuenta como dato de satisfacción o los trata sólo como no conformidad?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// PROPIOS DE ISO 14001 — AMBIENTE
// ═══════════════════════════════════════════════════════════════════════

const propios14001: RequisitoBase[] = [
  {
    id: '14001:6.1.2',
    clausula: '6.1.2',
    titulo: 'Aspectos ambientales',
    normas: ['14001'],
    tronco: false,
    evidencias: [
      {
        clave: 'matriz-aspectos',
        tipo: 'documento',
        descripcion: 'Matriz de aspectos e impactos ambientales por actividad, con criterio de significancia explícito, considerando ciclo de vida y situaciones de emergencia.',
      },
      {
        clave: 'revision-aspectos',
        tipo: 'registro',
        descripcion: 'Actualización de la matriz ante cambios de proceso, producto o instalación.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Cuál es su aspecto significativo número uno y qué control operacional le corresponde?',
      'El criterio de significancia, ¿está escrito o se decidió a ojo en una reunión?',
      '¿Consideraron los aspectos en situación anormal y de emergencia, o sólo en operación normal?',
    ],
  },
  {
    id: '14001:6.1.3',
    clausula: '6.1.3',
    titulo: 'Requisitos legales y otros requisitos',
    normas: ['14001'],
    tronco: false,
    evidencias: [
      {
        clave: 'matriz-legal-amb',
        tipo: 'documento',
        descripcion: 'Matriz legal ambiental: norma nacional, provincial y municipal aplicable, con el artículo concreto que obliga.',
      },
      {
        clave: 'habilitaciones',
        tipo: 'registro',
        descripcion: 'Permisos, habilitaciones y licencias ambientales vigentes.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Quién actualiza la matriz legal y cada cuánto? Una matriz legal de hace tres años es papel muerto.',
      'Muéstreme el permiso de vuelco / la habilitación de residuos. ¿Está vigente?',
      '¿Cómo se enteran de un cambio normativo provincial?',
    ],
  },
  {
    id: '14001:6.1.4',
    clausula: '6.1.4',
    titulo: 'Planificación de acciones ambientales',
    normas: ['14001'],
    tronco: false,
    evidencias: [
      {
        clave: 'acciones-ambientales',
        tipo: 'registro',
        descripcion: 'Acciones para los aspectos significativos y los requisitos legales, integradas a los procesos.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Las acciones ambientales, ¿viven en los procesos o en una carpeta aparte que maneja una sola persona?',
    ],
  },
  {
    id: '14001:8.2',
    clausula: '8.2',
    titulo: 'Preparación y respuesta ante emergencias ambientales',
    normas: ['14001'],
    tronco: false,
    evidencias: [
      {
        clave: 'plan-emergencia-amb',
        tipo: 'documento',
        descripcion: 'Plan de respuesta ante derrame, fuga o emisión: quién hace qué, con qué medios.',
      },
      {
        clave: 'simulacros-amb',
        tipo: 'registro',
        descripcion: 'Simulacros realizados con su evaluación y las mejoras que salieron.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Cuándo fue el último simulacro de derrame y qué salió mal? Si salió todo perfecto, no fue un simulacro.',
      'El kit antiderrame, ¿está donde dice el plan y completo?',
    ],
  },
  {
    id: '14001:9.1.2',
    clausula: '9.1.2',
    titulo: 'Evaluación del cumplimiento legal ambiental',
    normas: ['14001'],
    tronco: false,
    evidencias: [
      {
        clave: 'evaluacion-legal-amb',
        tipo: 'registro',
        descripcion: 'Evaluación periódica requisito por requisito, con la conclusión de si se cumple y la evidencia.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Tener la matriz legal no es evaluar el cumplimiento. ¿Dónde está la evaluación, ítem por ítem?',
      '¿Encontraron algún incumplimiento? Si nunca encontraron ninguno, la evaluación no está siendo real.',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// PROPIOS DE ISO 45001 — SEGURIDAD Y SALUD EN EL TRABAJO
// ═══════════════════════════════════════════════════════════════════════

const propios45001: RequisitoBase[] = [
  {
    id: '45001:5.4',
    clausula: '5.4',
    titulo: 'Consulta y participación de los trabajadores',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'mecanismo-participacion',
        tipo: 'documento',
        descripcion: 'Cómo se consulta y se hace participar a los trabajadores no directivos, y qué obstáculos se removieron para que puedan hacerlo.',
      },
      {
        clave: 'actas-comite',
        tipo: 'registro',
        descripcion: 'Actas del comité mixto o del mecanismo equivalente, con temas planteados por los trabajadores y su resolución.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      'Esta es la cláusula que más se simula. ¿Qué propuso un trabajador este año y qué pasó con eso?',
      '¿Los trabajadores participaron de la identificación de peligros o se la trajeron hecha?',
      '¿Hay represalia posible por reportar? ¿Cómo se garantiza que no?',
    ],
  },
  {
    id: '45001:6.1.2',
    clausula: '6.1.2',
    titulo: 'Identificación de peligros y evaluación de riesgos para la SST',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'matriz-iper',
        tipo: 'documento',
        descripcion: 'Identificación de peligros y evaluación de riesgos por puesto y tarea, con criterio de valoración y jerarquía de controles aplicada.',
      },
      {
        clave: 'revision-iper',
        tipo: 'registro',
        descripcion: 'Revisión de la matriz ante cambios, incidentes o tareas nuevas.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'participacion-iper',
        tipo: 'registro',
        descripcion: 'Constancia de que los trabajadores del puesto participaron de la identificación.',
        vigenciaMeses: BIANUAL,
      },
    ],
    preguntas: [
      '¿Aplicaron la jerarquía de controles o saltaron directo al elemento de protección personal? El EPP es el último recurso, no el primero.',
      'Este puesto tiene un riesgo alto. ¿El que lo ocupa lo sabe y sabe por qué?',
      'Los peligros psicosociales y de organización del trabajo, ¿están en la matriz?',
    ],
  },
  {
    id: '45001:6.1.3',
    clausula: '6.1.3',
    titulo: 'Requisitos legales y otros requisitos de SST',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'matriz-legal-sst',
        tipo: 'documento',
        descripcion: 'Matriz legal de higiene y seguridad aplicable, con el artículo concreto y cómo se cumple.',
      },
      {
        clave: 'estudios-obligatorios',
        tipo: 'registro',
        descripcion: 'Estudios y exámenes que exige la ley: medio ambiente de trabajo, exámenes periódicos, puesta a tierra.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Los exámenes médicos periódicos están al día? ¿Y los de los que entraron este año?',
      '¿Quién es el responsable de higiene y seguridad y con qué matrícula?',
    ],
  },
  {
    id: '45001:6.1.4',
    clausula: '6.1.4',
    titulo: 'Planificación de acciones de SST',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'programa-sst',
        tipo: 'registro',
        descripcion: 'Programa anual de seguridad con acciones, responsables, plazos y su grado de cumplimiento.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Qué porcentaje del programa anual se cumplió y qué quedó afuera por falta de presupuesto?',
    ],
  },
  {
    id: '45001:8.1.2',
    clausula: '8.1.2',
    titulo: 'Eliminar peligros y reducir riesgos para la SST',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'jerarquia-controles',
        tipo: 'registro',
        descripcion: 'Evidencia de controles implementados siguiendo el orden: eliminar, sustituir, ingeniería, administrativo, EPP.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'entrega-epp',
        tipo: 'registro',
        descripcion: 'Entrega de EPP con firma, y capacitación en su uso y mantenimiento.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Qué peligro eliminaron este año? No reducido: eliminado.',
      'El EPP se entregó, ¿pero se usa? Caminemos la planta.',
    ],
  },
  {
    id: '45001:8.1.3',
    clausula: '8.1.3',
    titulo: 'Gestión del cambio',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'analisis-cambio-sst',
        tipo: 'registro',
        descripcion: 'Análisis de riesgos previo a cambios de proceso, equipo, instalación o dotación.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      'Máquina nueva, turno nuevo o gente nueva: ¿se revaluaron los riesgos ANTES o después del primer susto?',
    ],
  },
  {
    id: '45001:8.1.4',
    clausula: '8.1.4',
    titulo: 'Compras y contratistas',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'requisitos-contratistas',
        tipo: 'documento',
        descripcion: 'Requisitos de SST exigidos a contratistas y cómo se verifican antes de que entren a trabajar.',
      },
      {
        clave: 'control-contratistas',
        tipo: 'registro',
        descripcion: 'Documentación de contratistas verificada, inducciones dictadas y controles en campo.',
        vigenciaMeses: 6,
      },
    ],
    preguntas: [
      'Un contratista se accidenta en su planta. ¿Qué papel tiene usted que demuestre que lo controlaba?',
      '¿Verifican ART y capacitación antes del ingreso o después del primer día?',
    ],
  },
  {
    id: '45001:8.2',
    clausula: '8.2',
    titulo: 'Preparación y respuesta ante emergencias',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'plan-emergencia-sst',
        tipo: 'documento',
        descripcion: 'Plan de emergencia y evacuación, con roles asignados y medios disponibles.',
      },
      {
        clave: 'simulacros-sst',
        tipo: 'registro',
        descripcion: 'Simulacros con evaluación, tiempos medidos y acciones de mejora.',
        vigenciaMeses: ANUAL,
      },
      {
        clave: 'brigada',
        tipo: 'registro',
        descripcion: 'Brigadistas formados y vigentes, y control de matafuegos y medios de escape.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Cuánto tardaron en evacuar en el último simulacro y cuál era la meta?',
      '¿Los contratistas y las visitas están contemplados en el plan?',
    ],
  },
  {
    id: '45001:9.1.2',
    clausula: '9.1.2',
    titulo: 'Evaluación del cumplimiento legal de SST',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'evaluacion-legal-sst',
        tipo: 'registro',
        descripcion: 'Evaluación periódica del cumplimiento de cada requisito legal de SST, con evidencia.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Dónde está la evaluación de cumplimiento, requisito por requisito, y quién la firmó?',
    ],
  },
  {
    id: '45001:10.2',
    clausula: '10.2',
    titulo: 'Incidentes, no conformidades y acciones correctivas',
    normas: ['45001'],
    tronco: false,
    evidencias: [
      {
        clave: 'procedimiento-incidentes',
        tipo: 'documento',
        descripcion: 'Cómo se reporta, investiga y cierra un incidente, incluidos los cuasi accidentes.',
      },
      {
        clave: 'investigaciones',
        tipo: 'registro',
        descripcion: 'Investigaciones de incidentes del período con causa raíz y participación de los trabajadores.',
        vigenciaMeses: ANUAL,
      },
    ],
    preguntas: [
      '¿Cuántos cuasi accidentes reportaron este año? Cero significa que nadie reporta, no que no pasan.',
      'En la investigación, ¿participó gente del puesto o la hizo el de seguridad solo en la oficina?',
      '¿La causa raíz terminó siendo "distracción del operario"? Eso no es causa raíz, es cerrar los ojos.',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// QUIÉN RESPONDE POR CADA REQUISITO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Las áreas van en una tabla aparte y no dentro de cada requisito, por dos
 * razones. La primera es que el corpus normativo es el mismo para cualquier
 * organización y el organigrama no: el día que esto se use en una empresa de
 * verdad, se cambia este mapa y nada más. La segunda es práctica — con 45
 * requisitos, una tabla de dos columnas se revisa de un vistazo y se ve si
 * alguna quedó sin dueño; repartida en 45 lugares, no.
 *
 * Un requisito puede tener más de un área. 8.1 lo comparten Producción y
 * Compras porque el control de lo tercerizado sigue siendo responsabilidad
 * de la organización, y en una auditoría eso se pregunta en los dos lados.
 */
const areas: Record<string, string[]> = {
  // Tronco
  '4.1': ['Dirección'],
  '4.2': ['Dirección'],
  '4.3': ['Dirección'],
  '4.4': ['Dirección', 'Calidad'],
  '5.1': ['Dirección'],
  '5.2': ['Dirección'],
  '5.3': ['Dirección', 'Recursos Humanos'],
  '6.1': ['Dirección', 'Calidad'],
  '6.2': ['Dirección'],
  '7.1': ['Dirección', 'Mantenimiento'],
  '7.2': ['Recursos Humanos'],
  '7.3': ['Recursos Humanos'],
  '7.4': ['Dirección'],
  '7.5': ['Calidad'],
  '8.1': ['Producción', 'Compras'],
  '9.1': ['Calidad'],
  '9.2': ['Calidad'],
  '9.3': ['Dirección'],
  '10.1': ['Calidad'],
  '10.2': ['Calidad'],
  '10.3': ['Calidad'],
  // Calidad
  '9001:6.3': ['Dirección', 'Calidad'],
  '9001:7.1.5': ['Calidad'],
  '9001:8.2': ['Comercial'],
  '9001:8.3': ['Ingeniería'],
  '9001:8.4': ['Compras'],
  '9001:8.5': ['Producción'],
  '9001:8.6': ['Calidad'],
  '9001:8.7': ['Calidad', 'Producción'],
  '9001:9.1.2': ['Comercial'],
  // Ambiente
  '14001:6.1.2': ['Ambiente y Seguridad'],
  '14001:6.1.3': ['Ambiente y Seguridad'],
  '14001:6.1.4': ['Ambiente y Seguridad'],
  '14001:8.2': ['Ambiente y Seguridad'],
  '14001:9.1.2': ['Ambiente y Seguridad'],
  // Seguridad y salud
  '45001:5.4': ['Ambiente y Seguridad', 'Recursos Humanos'],
  '45001:6.1.2': ['Ambiente y Seguridad', 'Producción'],
  '45001:6.1.3': ['Ambiente y Seguridad'],
  '45001:6.1.4': ['Ambiente y Seguridad'],
  '45001:8.1.2': ['Ambiente y Seguridad', 'Producción'],
  '45001:8.1.3': ['Ambiente y Seguridad', 'Mantenimiento'],
  '45001:8.1.4': ['Compras'],
  '45001:8.2': ['Ambiente y Seguridad'],
  '45001:9.1.2': ['Ambiente y Seguridad'],
  '45001:10.2': ['Ambiente y Seguridad'],
};

/**
 * El corpus completo, ordenado como lo recorre el auditor: por número de
 * cláusula, y dentro de una misma cláusula primero el tronco.
 */
export const requisitos: Requisito[] = [
  ...tronco,
  ...propios9001,
  ...propios14001,
  ...propios45001,
]
  .map((r) => ({ ...r, procesos: areas[r.id] ?? [] }))
  .sort(
    (a, b) =>
      a.clausula.localeCompare(b.clausula, 'es', { numeric: true }) ||
      Number(b.tronco) - Number(a.tronco) ||
      a.id.localeCompare(b.id),
  );

export const porNorma = (norma: Norma) => requisitos.filter((r) => r.normas.includes(norma));

/** Las áreas que aparecen en el corpus, ordenadas como se recorre la planta. */
export const procesos: string[] = [
  'Dirección',
  'Comercial',
  'Ingeniería',
  'Compras',
  'Producción',
  'Mantenimiento',
  'Calidad',
  'Ambiente y Seguridad',
  'Recursos Humanos',
].filter((p) => requisitos.some((r) => r.procesos.includes(p)));

/** Para las URLs: "Ambiente y Seguridad" → "ambiente-y-seguridad". */
export const comoUrl = (proceso: string): string =>
  proceso
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const porProceso = (proceso: string) =>
  requisitos.filter((r) => r.procesos.includes(proceso));

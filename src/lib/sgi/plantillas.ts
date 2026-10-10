/**
 * El catálogo de plantillas: qué documentos genera el sistema y cómo.
 *
 * Hay una plantilla por cada documento que el corpus pide como evidencia
 * (`tipo: 'documento'`), más un juego de formularios en blanco. Un test
 * verifica que no quede ninguno sin dueño: cada documento del corpus lo
 * genera una plantilla, o está declarado en `APORTA_LA_ORGANIZACION` con el
 * motivo.
 *
 * LO QUE NO HAY ACÁ: texto de las normas. Los procedimientos describen cómo
 * se suele hacer cada cosa en una organización, escrito desde el oficio.
 * Se cita cláusula y título como referencia, nada más.
 *
 * LO QUE HAY QUE SABER DE UN FORMULARIO: es el papel en blanco, no la
 * prueba. Un formulario sin completar no es un registro, y por eso los
 * formularios no cubren ningún requisito (`cubre: []`). El registro nace
 * cuando alguien lo completa, lo firma y lo carga como evidencia.
 */

import { falta, partir, tabla } from './generador.ts';
import type { Ctx, Plantilla, Seccion } from './generador.ts';
import { exclusionesDe, requisitosAplicables } from './organizacion.ts';
import type { Organizacion } from './organizacion.ts';
import { procesos as areasCorpus, requisitos } from './normas.ts';
import type { Norma } from './modelo.ts';

const TODAS: Norma[] = ['9001', '14001', '45001'];
const SOLO9001: Norma[] = ['9001'];
const SOLO14001: Norma[] = ['14001'];
const SOLO45001: Norma[] = ['45001'];

// ─── ayudas de redacción ─────────────────────────────────────────────────

const pasos = (items: string[]): string => items.map((t, i) => `${i + 1}. ${t}`).join('\n');
const vinetas = (items: string[]): string => items.map((t) => `- ${t}`).join('\n');

/** Una tabla por proceso, o la marca si todavía no se describieron los procesos. */
function porProceso(c: Ctx, cabeceras: string[], fila: (p: ReturnType<Ctx['procesos']>[number]) => string[]): string {
  const ps = c.procesos();
  return ps.length ? c.tabla(cabeceras, ps.map(fila)) : falta('procesos de la organización (se cargan en la entrevista)');
}

/** El "cuadro de mando" de un procedimiento: quién hace qué. */
const quien = (c: Ctx, filas: [string, string][]): string => c.tabla(['Quién', 'Responsabilidad'], filas);

/**
 * La estructura que comparten casi todos los procedimientos. Se arma acá para
 * que el orden sea el mismo en todos: quien aprende a leer uno, lee los demás.
 */
function procedimiento(o: {
  objetivo: string;
  alcance: string;
  responsables: string;
  desarrollo: string;
  registros?: string[];
  indicadores?: string[];
  extra?: Seccion[];
}): Seccion[] {
  const salida: Seccion[] = [
    { titulo: 'Objetivo', cuerpo: o.objetivo },
    { titulo: 'Alcance', cuerpo: o.alcance },
    { titulo: 'Responsabilidades', cuerpo: o.responsables },
    { titulo: 'Desarrollo', cuerpo: o.desarrollo },
  ];
  if (o.extra) salida.push(...o.extra);
  if (o.registros?.length) {
    salida.push({
      titulo: 'Registros',
      cuerpo: `Lo que prueba que esto se hizo, y que se conserva:\n\n${vinetas(o.registros)}`,
    });
  }
  if (o.indicadores?.length) salida.push({ titulo: 'Indicadores', cuerpo: vinetas(o.indicadores) });
  return salida;
}

// ─── lo que el sistema NO puede escribir por la organización ─────────────

/**
 * Documentos que el corpus pide y que ninguna plantilla genera, con el motivo.
 * Hoy está vacío: todo lo que el corpus pide como documento tiene plantilla.
 * Existe para que, si algún día se agrega un requisito imposible de
 * automatizar, haya un lugar donde declararlo en vez de olvidarlo.
 */
export const APORTA_LA_ORGANIZACION: Record<string, string> = {};

// ─── tronco: común a las tres normas ─────────────────────────────────────

/**
 * Lo que la organización deja afuera del sistema, con su justificación. Una
 * exclusión sin justificar escrita es una no conformidad: el auditor la va a
 * pedir, y tiene que estar en el documento de alcance, no sólo en la pantalla.
 */
function exclusiones(c: Ctx): string {
  const lista = exclusionesDe(c.org).map((x) => {
    const r = requisitos.find((q) => q.id === x.requisito);
    return `- ${r ? `${r.clausula} ${r.titulo}` : x.requisito}: ${x.motivo}`;
  });
  return lista.length ? `\n\n**Exclusiones y su justificación:**\n\n${lista.join('\n')}` : '';
}

const manual: Plantilla = {
  id: 'manual-sgi',
  titulo: 'Manual del sistema de gestión',
  tipo: 'manual',
  normas: TODAS,
  sirvePara: 'Quién es la organización, su contexto, su alcance, sus procesos y sus roles.',
  cubre: [
    { requisito: '4.1', claves: ['analisis-contexto'] },
    { requisito: '4.2', claves: ['matriz-partes'] },
    { requisito: '4.3', claves: ['alcance'] },
    { requisito: '4.4', claves: ['mapa-procesos'] },
    { requisito: '5.3', claves: ['roles'] },
  ],
  secciones: (c) => {
    const partes = c.lista('partes_interesadas');
    return [
      {
        titulo: 'La organización',
        cuerpo: `${c.org.nombre} — ${c.dato('actividad')}\n\n- Sedes: ${c.perfil('sedes', 'sedes')}\n- Personal: ${c.org.empleados > 0 ? `${c.org.empleados} personas` : falta('cantidad de empleados')}`,
      },
      {
        titulo: 'Contexto',
        cuerpo: `**Cuestiones externas** que pueden ayudar o complicar al sistema:\n\n${c.vinetas('cuestiones_externas')}\n\n**Cuestiones internas**:\n\n${c.vinetas('cuestiones_internas')}\n\nEste análisis se revisa al menos una vez al año, en la revisión por la dirección.`,
      },
      {
        titulo: 'Partes interesadas',
        cuerpo: partes.length
          ? c.tabla(['Parte interesada', 'Qué espera'], partes.map((l) => partir(l, 2)))
          : falta('partes interesadas'),
      },
      {
        titulo: 'Alcance del sistema',
        cuerpo: `El sistema de gestión (${c.org.normas.map((n) => `ISO ${n}`).join(', ') || falta('normas')}) alcanza a: ${c.perfil('alcance', 'alcance del sistema')}${exclusiones(c)}`,
      },
      {
        titulo: 'Mapa de procesos',
        cuerpo: porProceso(c, ['Proceso', 'Responsable', 'Para qué existe', 'Entradas', 'Salidas'], (p) => [
          p.nombre,
          p.responsable,
          p.objetivo,
          p.entradas,
          p.salidas,
        ]),
      },
      {
        titulo: 'Roles y responsabilidades',
        cuerpo: c.tabla(
          ['Rol', 'Quién', 'Responsabilidad'],
          [
            ['Máxima autoridad', c.dato('direccion'), 'Firma la política, asigna recursos y revisa el sistema.'],
            [
              'Responsable del sistema de gestión',
              c.dato('responsable_sgi'),
              'Informa a la dirección cómo funciona el sistema y promueve la mejora.',
            ],
            ...c.procesos().map((p) => [`Responsable de ${p.nombre}`, p.responsable, 'Cumple y hace cumplir lo documentado en su proceso.']),
          ],
        ),
      },
    ];
  },
};

const politica: Plantilla = {
  id: 'politica-integrada',
  titulo: 'Política del sistema de gestión',
  tipo: 'politica',
  normas: TODAS,
  sirvePara: 'El compromiso de la dirección, firmado y comunicado.',
  cubre: [{ requisito: '5.2', claves: ['politica'] }],
  secciones: (c) => [
    { titulo: 'Declaración de la dirección', cuerpo: c.dato('compromiso_direccion') },
    {
      titulo: 'Compromisos',
      cuerpo: [
        c.tiene('9001') &&
          vinetas([
            'Entregar productos y servicios que cumplan lo que el cliente espera y lo que exigen las leyes aplicables.',
            'Escuchar al cliente y usar lo que se aprende para mejorar.',
          ]),
        c.tiene('14001') &&
          vinetas([
            'Proteger el ambiente y prevenir la contaminación que genera la actividad.',
            'Cumplir la legislación ambiental aplicable y los demás compromisos que la organización asume.',
          ]),
        c.tiene('45001') &&
          vinetas([
            'Brindar condiciones de trabajo seguras y saludables para prevenir lesiones y daños a la salud.',
            'Eliminar los peligros y reducir los riesgos para las personas.',
            'Consultar a los trabajadores y promover su participación.',
          ]),
        vinetas(['Mejorar de forma continua el sistema de gestión.']),
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    {
      titulo: 'Alcance y comunicación',
      cuerpo: `Esta política se aplica a ${c.perfil('alcance', 'alcance del sistema')}\n\nEstá a disposición de todo el personal y de quien la solicite, y se revisa una vez al año.`,
    },
    { titulo: 'Firma', cuerpo: `${c.dato('direccion')}\n\nFecha: ____ / ____ / ________` },
  ],
};

const riesgos: Plantilla = {
  id: 'riesgos-oportunidades',
  titulo: 'Matriz de riesgos y oportunidades',
  tipo: 'matriz',
  normas: TODAS,
  sirvePara: 'Qué puede salir mal o aprovecharse, qué tan grave es y qué se hace al respecto.',
  cubre: [{ requisito: '6.1', claves: ['matriz-riesgos'] }],
  secciones: (c) => {
    const r = c.lista('riesgos');
    const o = c.lista('oportunidades');
    return [
      {
        titulo: 'Método',
        cuerpo: `Cada riesgo se puntúa con **probabilidad** (1 baja, 2 media, 3 alta) por **impacto** (1 leve, 2 moderado, 3 grave). El **nivel** es el producto: 1 a 2 es bajo, 3 a 4 es medio y 6 a 9 es alto. Los niveles medio y alto requieren una acción con responsable y plazo.`,
      },
      {
        titulo: 'Riesgos',
        cuerpo: r.length
          ? `${c.tabla(['Riesgo', 'Proceso', 'Probabilidad', 'Impacto', 'Nivel', 'Acción', 'Responsable', 'Plazo'], r.map((x) => [x, '', '', '', '', '', '', '']))}\n\n${falta('puntuar cada riesgo y definir su acción')}`
          : falta('riesgos principales'),
      },
      {
        titulo: 'Oportunidades',
        cuerpo: o.length
          ? `${c.tabla(['Oportunidad', 'Beneficio esperado', 'Acción', 'Responsable', 'Plazo'], o.map((x) => [x, '', '', '', '']))}\n\n${falta('definir la acción de cada oportunidad')}`
          : 'Todavía no se identificaron oportunidades. Se revisan en la revisión por la dirección.',
      },
    ];
  },
};

const objetivos: Plantilla = {
  id: 'objetivos',
  titulo: 'Objetivos y plan para lograrlos',
  tipo: 'plan',
  normas: TODAS,
  sirvePara: 'Qué se quiere lograr este año, cómo se mide y quién se hace cargo.',
  cubre: [{ requisito: '6.2', claves: ['objetivos', 'plan-objetivos'] }],
  secciones: (c) => {
    const lista = c.lista('objetivos');
    return [
      {
        titulo: 'Objetivos del período',
        cuerpo: lista.length
          ? c.tabla(['Objetivo', 'Indicador', 'Meta'], lista.map((l) => partir(l, 3)))
          : falta('objetivos del año'),
      },
      {
        titulo: 'Plan para lograrlos',
        cuerpo: lista.length
          ? `${c.tabla(['Objetivo', 'Qué se hará', 'Recursos', 'Responsable', 'Plazo', 'Cómo se evalúa'], lista.map((l) => [partir(l, 3)[0], '', '', '', '', '']))}\n\n${falta('completar el plan de cada objetivo')}`
          : falta('objetivos del año'),
      },
      {
        titulo: 'Seguimiento',
        cuerpo: 'El avance se revisa en la revisión por la dirección. Un objetivo que no se mide o no tiene responsable se considera no definido.',
      },
    ];
  },
};

const recursos: Plantilla = {
  id: 'recursos',
  titulo: 'Plan de recursos e infraestructura',
  tipo: 'plan',
  normas: TODAS,
  sirvePara: 'Con qué trabaja la organización y quién lo mantiene.',
  cubre: [{ requisito: '7.1', claves: ['recursos'] }],
  secciones: (c) => {
    const infra = c.lista('infraestructura');
    return [
      {
        titulo: 'Infraestructura y equipos',
        cuerpo: infra.length
          ? `${c.tabla(['Recurso', 'Para qué se usa', 'Mantenimiento', 'Responsable'], infra.map((x) => [x, '', '', '']))}\n\n${falta('completar uso, mantenimiento y responsable')}`
          : falta('infraestructura y equipos'),
      },
      {
        titulo: 'Ambiente de trabajo',
        cuerpo: `Las condiciones en las que se trabaja —iluminación, temperatura, orden, ruido, ergonomía— se revisan en las recorridas y se corrigen según su impacto sobre ${c.tiene('9001') ? 'la conformidad del producto y ' : ''}las personas.`,
      },
      {
        titulo: 'Cómo se piden recursos',
        cuerpo: `Quien detecta una necesidad de recursos la comunica a ${c.dato('responsable_sgi')}, que la lleva a la revisión por la dirección o directamente a ${c.dato('direccion')} si es urgente.`,
      },
    ];
  },
};

const competencia: Plantilla = {
  id: 'competencia',
  titulo: 'Procedimiento de competencia y formación',
  tipo: 'procedimiento',
  normas: TODAS,
  sirvePara: 'Qué debe saber cada puesto y cómo se asegura que lo sepa.',
  cubre: [{ requisito: '7.2', claves: ['perfiles'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que las personas que hacen tareas que afectan al sistema de gestión tienen la competencia necesaria, y dejar prueba de ello.',
      alcance: `Todo el personal de ${c.org.nombre}, propio y temporal.`,
      responsables: quien(c, [
        [c.dato('responsable_sgi'), 'Mantiene los perfiles y el plan de formación.'],
        ['Responsables de proceso', 'Detectan necesidades de formación y evalúan si la capacitación sirvió.'],
        [c.dato('direccion'), 'Provee los recursos para formar.'],
      ]),
      desarrollo: `**Situación actual.** ${c.dato('capacitacion')}\n\n${pasos([
        'Se define el perfil de cada puesto: qué debe saber, qué formación o experiencia necesita.',
        'Al ingresar o cambiar de puesto, el responsable compara a la persona contra el perfil.',
        'Las diferencias se vuelven un plan de formación con fecha.',
        'Se capacita (curso, práctica guiada, instrucción en el puesto) y se deja registro de asistencia.',
        'Después de un tiempo prudencial, el responsable evalúa si la capacitación fue eficaz. Asistir no es lo mismo que aprender.',
        'Se archiva el legajo de formación de cada persona.',
      ])}`,
      extra: [
        {
          titulo: 'Perfiles por proceso',
          cuerpo: `${porProceso(c, ['Proceso', 'Responsable', 'Competencia necesaria', 'Formación requerida', 'Cómo se verifica'], (p) => [p.nombre, p.responsable, '', '', ''])}\n\n${falta('completar el perfil de cada puesto')}`,
        },
      ],
      registros: ['Legajo de formación por persona', 'Planilla de asistencia a capacitaciones', 'Evaluación de eficacia de la capacitación'],
    }),
};

const comunicacion: Plantilla = {
  id: 'comunicacion',
  titulo: 'Plan de comunicación',
  tipo: 'plan',
  normas: TODAS,
  sirvePara: 'Qué se comunica, a quién, cuándo y por qué medio.',
  cubre: [{ requisito: '7.4', claves: ['plan-comunicacion'] }],
  secciones: (c) => {
    const canales = c.lista('canales_comunicacion');
    return [
      { titulo: 'Medios disponibles', cuerpo: c.vinetas('canales_comunicacion') },
      {
        titulo: 'Qué se comunica',
        cuerpo: `${c.tabla(
          ['Qué', 'A quién', 'Cuándo', 'Medio', 'Quién lo comunica'],
          [
            ['Política del sistema de gestión', 'Todo el personal y quien la pida', 'Al emitirla y al cambiarla', canales[0] ?? '', c.dato('direccion')],
            ['Objetivos y resultados', 'Responsables de proceso', 'Cada revisión', canales[0] ?? '', c.dato('responsable_sgi')],
            ['Cambios en procedimientos', 'Quienes los aplican', 'Antes de que rijan', canales[0] ?? '', c.dato('responsable_sgi')],
            ...(c.tiene('45001') ? [['Peligros y emergencias', 'Personal y visitantes', 'Al ingresar y ante cambios', canales[0] ?? '', c.dato('responsable_sgi')]] : []),
            ...(c.tiene('9001') ? [['Reclamos y requisitos del cliente', 'Áreas involucradas', 'Al recibirlos', canales[0] ?? '', c.dato('responsable_sgi')]] : []),
          ],
        )}\n\n${falta('ajustar medios y plazos a la realidad')}`,
      },
    ];
  },
};

const controlDocumental: Plantilla = {
  id: 'control-documental',
  titulo: 'Procedimiento de control de la información documentada',
  tipo: 'procedimiento',
  normas: TODAS,
  sirvePara: 'Cómo se crea, aprueba, distribuye y actualiza un documento sin que circulen versiones viejas.',
  cubre: [{ requisito: '7.5', claves: ['control-documental'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que cada persona usa la versión vigente de cada documento y que los registros se conservan.',
      alcance: 'Todos los documentos (dicen cómo se hace) y registros (prueban que se hizo) del sistema de gestión.',
      responsables: quien(c, [
        [c.dato('responsable_sgi'), 'Mantiene el listado maestro y custodia los originales.'],
        ['Autor del documento', 'Lo redacta y lo mantiene actualizado.'],
        [c.dato('direccion'), 'Aprueba la política y los documentos de alto nivel.'],
      ]),
      desarrollo: `**Dónde viven hoy.** ${c.dato('soporte_documental')}\n\n${pasos([
        'Todo documento lleva código, versión, fecha de emisión y responsable.',
        'Antes de emitirse, un documento lo revisa quien lo aplica y lo aprueba quien tiene autoridad sobre el proceso.',
        'El responsable del sistema registra el documento en el listado maestro con su versión vigente.',
        'Al emitir una versión nueva, se retira o se marca como obsoleta la anterior en todos los puntos de uso. La anterior se conserva identificada sólo si hay motivo para guardarla.',
        'Los documentos de origen externo —normas, manuales de equipos, legislación— se identifican y se controlan igual.',
        'Los registros se conservan el tiempo que se defina en el listado maestro y se protegen contra pérdida y modificación.',
      ])}`,
      extra: [
        {
          titulo: 'Codificación',
          cuerpo: 'POL política · MAN manual · PRO procedimiento · MAT matriz · PLA plan · FOR formulario. Un número correlativo por tipo (PRO-01, PRO-02…).',
        },
      ],
      registros: ['Listado maestro de documentos', 'Listado de registros con su tiempo de conservación'],
    }),
};

const controlOperacional: Plantilla = {
  id: 'control-operacional',
  titulo: 'Procedimiento de planificación y control operacional',
  tipo: 'procedimiento',
  normas: TODAS,
  sirvePara: 'Cómo se hace el trabajo, dónde se controla y qué pasa con lo tercerizado.',
  cubre: [{ requisito: '8.1', claves: ['controles-operacionales', 'control-tercerizados'] }],
  secciones: (c) => {
    const terc = c.si('tercerizados');
    return procedimiento({
      objetivo: 'Asegurar que las actividades se hacen en condiciones controladas, con criterios definidos y puntos de verificación.',
      alcance: `Las actividades de ${c.org.nombre}: ${c.dato('actividad')}`,
      responsables: quien(c, [
        ['Responsables de proceso', 'Aplican los criterios y verifican en los puntos de control.'],
        [c.dato('responsable_sgi'), 'Verifica que los controles se cumplen y actualiza este procedimiento.'],
      ]),
      desarrollo: `**Etapas de la operación**, en el orden en que se hacen:\n\n${c.lista('etapas').length ? pasos(c.lista('etapas')) : falta('etapas de la operación')}\n\n**Puntos de control**, donde se verifica antes de seguir:\n\n${c.vinetas('puntos_control')}\n\nCuando una verificación falla, se detiene la actividad y se aplica el procedimiento de no conformidades.`,
      extra: [
        {
          titulo: 'Actividades tercerizadas',
          cuerpo:
            terc === false
              ? 'La organización no terceriza actividades que afecten al sistema de gestión.'
              : terc === undefined
                ? falta('si hay actividades tercerizadas')
                : `${c.vinetas('tercerizados_detalle')}\n\nLo tercerizado sigue siendo responsabilidad de la organización: se define qué se le exige al tercero, se verifica lo que entrega y se evalúa su desempeño al menos una vez al año.`,
        },
      ],
      registros: ['Registros de inspección en cada punto de control', 'Evaluación del desempeño de terceros'],
    });
  },
};

const medicion: Plantilla = {
  id: 'plan-medicion',
  titulo: 'Plan de seguimiento y medición',
  tipo: 'plan',
  normas: TODAS,
  sirvePara: 'Qué se mide, cada cuánto y quién mira el resultado.',
  cubre: [{ requisito: '9.1', claves: ['plan-medicion'] }],
  secciones: (c) => {
    const ind = c.lista('indicadores');
    return [
      {
        titulo: 'Indicadores actuales',
        cuerpo: ind.length
          ? `${c.tabla(['Indicador', 'Frecuencia', 'Meta', 'Responsable', 'Fuente del dato'], ind.map((x) => [x, '', '', '', '']))}\n\n${falta('completar frecuencia, meta, responsable y fuente')}`
          : falta('indicadores actuales'),
      },
      {
        titulo: 'Indicadores por proceso',
        cuerpo: porProceso(c, ['Proceso', 'Responsable', 'Indicador'], (p) => [p.nombre, p.responsable, p.indicador || falta(`indicador de ${p.nombre}`)]),
      },
      {
        titulo: 'Análisis',
        cuerpo: 'Los resultados se analizan en la revisión por la dirección. Un indicador que nunca cambia una decisión se revisa: o está mal elegido o no se está mirando.',
      },
    ];
  },
};

const auditoriaInterna: Plantilla = {
  id: 'auditoria-interna',
  titulo: 'Procedimiento y programa de auditoría interna',
  tipo: 'procedimiento',
  normas: TODAS,
  sirvePara: 'Quién audita qué, cuándo y cómo se informa, sin que nadie audite lo suyo.',
  cubre: [{ requisito: '9.2', claves: ['programa-auditoria'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Verificar, con auditores imparciales, si el sistema funciona como está documentado y si cumple lo que la organización se propuso y lo que exigen las normas.',
      alcance: `Todos los procesos y sedes comprendidos en el alcance del sistema (${c.org.normas.map((n) => `ISO ${n}`).join(', ')}).`,
      responsables: quien(c, [
        [c.dato('responsable_sgi'), 'Arma el programa anual y recibe los informes.'],
        ['Auditor interno', 'Prepara, ejecuta e informa. No audita el proceso en el que trabaja.'],
        ['Responsable del proceso auditado', 'Recibe al auditor y propone la acción para cada hallazgo.'],
        [c.dato('direccion'), 'Recibe los resultados en la revisión por la dirección.'],
      ]),
      desarrollo: pasos([
        'Se arma un programa anual que cubre todos los procesos al menos una vez, con más frecuencia donde hubo problemas o hay más riesgo.',
        'Cada auditoría tiene criterios (los documentos del sistema y las normas) y un alcance claro.',
        'El auditor prepara una lista de verificación, entrevista, mira registros y observa el trabajo.',
        'Los hallazgos se clasifican como no conformidad mayor, menor u observación.',
        'El informe se entrega al responsable del proceso, que propone la acción correctiva con plazo.',
        'Se verifica que la acción se hizo y que funcionó. Recién ahí se cierra el hallazgo.',
      ]),
      extra: [
        {
          titulo: 'Posibles auditores',
          cuerpo: `${c.vinetas('auditores')}\n\nLa persona que audita no puede ser quien responde por el proceso auditado.`,
        },
        {
          titulo: 'Programa del año',
          cuerpo: `${porProceso(c, ['Proceso', 'Auditor', 'Fecha prevista'], (p) => [p.nombre, '', ''])}\n\n${falta('asignar auditor y fecha a cada proceso, evitando que audite el suyo')}`,
        },
      ],
      registros: ['Programa de auditorías', 'Lista de verificación de cada auditoría', 'Informe de auditoría con sus hallazgos', 'Evidencia de la competencia del auditor'],
    }),
};

const noConformidades: Plantilla = {
  id: 'no-conformidades',
  titulo: 'Procedimiento de no conformidades y acciones correctivas',
  tipo: 'procedimiento',
  normas: TODAS,
  sirvePara: 'Qué se hace cuando algo falla: contener, entender la causa, corregir y comprobar.',
  cubre: [{ requisito: '10.2', claves: ['procedimiento-nc'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Tratar cada falla para corregirla, entender por qué ocurrió y evitar que se repita.',
      alcance: 'Todo incumplimiento detectado en auditorías, controles, reclamos de clientes o por el personal.',
      responsables: quien(c, [
        ['Quien detecta', 'Lo comunica al responsable del proceso sin demora.'],
        ['Responsable del proceso', 'Contiene el problema, analiza la causa y define la acción.'],
        [c.dato('responsable_sgi'), 'Lleva el registro y verifica el cierre.'],
      ]),
      desarrollo: `**Cómo se trata hoy lo que sale mal.** ${c.dato('cuando_sale_mal')}\n\n**Cómo se va a tratar de ahora en más:**\n\n${pasos([
        'Se detiene o se aísla lo afectado para que no avance ni llegue al cliente.',
        'Se registra qué pasó, dónde, cuándo y quién lo detectó.',
        'Se corrige lo inmediato: reparar, reprocesar, reemplazar o avisar.',
        'Se analiza la causa raíz (por ejemplo, preguntando "¿por qué?" hasta llegar a algo que se pueda cambiar). Corregir sin entender la causa asegura que vuelva.',
        'Se define una acción correctiva con responsable y fecha.',
        'Pasado el tiempo definido, se verifica si la acción fue eficaz: ¿volvió a pasar?',
        'Se cierra el registro. Si el problema se repite, se reabre y se revisa la causa.',
      ])}`,
      registros: ['Informe de no conformidad con su causa, acción y verificación de eficacia', 'Listado de no conformidades abiertas y cerradas'],
      indicadores: ['No conformidades abiertas', 'Tiempo promedio de cierre', 'Reincidencia: no conformidades que se repiten'],
    }),
};

// ─── ISO 9001 ────────────────────────────────────────────────────────────

const instrumentos: Plantilla = {
  id: 'instrumentos',
  titulo: 'Inventario y control de instrumentos de medición',
  tipo: 'plan',
  normas: SOLO9001,
  sirvePara: 'Qué instrumentos se usan para medir y cuándo se verifican o calibran.',
  cubre: [{ requisito: '9001:7.1.5', claves: ['inventario-instrumentos'] }],
  secciones: (c) => {
    const inst = c.lista('instrumentos');
    return [
      {
        titulo: 'Inventario',
        cuerpo: inst.length
          ? `${c.tabla(['Instrumento', 'Código', 'Rango o resolución', 'Frecuencia de calibración', 'Patrón o laboratorio', 'Responsable'], inst.map((x) => [x, '', '', '', '', '']))}\n\n${falta('completar código, rango, frecuencia y laboratorio')}`
          : falta('instrumentos de medición (si la organización no usa ninguno, declararlo acá y justificarlo)'),
      },
      {
        titulo: 'Control',
        cuerpo: pasos([
          'Cada instrumento se identifica con un código y se anota su estado de calibración.',
          'Se calibra o verifica con la frecuencia definida, contra un patrón que pueda rastrearse.',
          'Un instrumento vencido o dudoso se retira de uso o se identifica como no apto.',
          'Si se detecta que un instrumento medía mal, se revisa qué se midió con él desde la última verificación buena.',
        ]),
      },
    ];
  },
};

const atencionCliente: Plantilla = {
  id: 'atencion-cliente',
  titulo: 'Procedimiento de atención y requisitos del cliente',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Cómo se recibe un pedido, se confirma que se puede cumplir y se atienden consultas y reclamos.',
  cubre: [{ requisito: '9001:8.2', claves: ['comunicacion-cliente'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que se entiende lo que el cliente pide antes de comprometerse, y que se lo atiende en consultas, cambios y reclamos.',
      alcance: `Todos los pedidos, consultas y reclamos de clientes de ${c.org.nombre}.`,
      responsables: quien(c, [
        ['Área comercial o de atención', 'Recibe, registra y confirma el pedido.'],
        ['Responsable de proceso', 'Confirma que puede cumplir lo comprometido.'],
        [c.dato('responsable_sgi'), 'Sigue los reclamos hasta su cierre.'],
      ]),
      desarrollo: `**Cómo llega el cliente:**\n\n${c.vinetas('canales_cliente')}\n\n${pasos([
        'Se registra el pedido con lo que el cliente pidió, con sus palabras.',
        'Se revisan los requisitos: los que dijo el cliente, los que no dijo pero son necesarios para el uso, y los legales.',
        'Antes de confirmar, se verifica que la organización puede cumplir plazos, cantidades y condiciones.',
        'Se confirma al cliente por el mismo medio por el que llegó. Si algo cambia, se vuelve a confirmar.',
        'Los reclamos se registran, se responden y se tratan con el procedimiento de no conformidades.',
      ])}`,
      registros: ['Pedido o contrato con la revisión de requisitos', 'Registro de consultas y reclamos con su respuesta'],
    }),
};

const diseno: Plantilla = {
  id: 'diseno',
  titulo: 'Procedimiento de diseño y desarrollo',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Cómo se planifica, revisa, verifica y valida un producto o servicio propio.',
  noAplica: (org) =>
    org.respuestas.disena === 'no'
      ? 'La organización declaró que no diseña ni desarrolla productos o servicios propios: este requisito se excluye con esa justificación.'
      : undefined,
  cubre: [{ requisito: '9001:8.3', claves: ['proceso-diseno'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que lo que se diseña responde a una necesidad definida y se prueba antes de entregarlo.',
      alcance: `Diseño y desarrollo de productos o servicios propios de ${c.org.nombre}.`,
      responsables: quien(c, [
        ['Responsable del diseño', 'Planifica el proyecto, coordina y mantiene los registros.'],
        ['Áreas involucradas', 'Participan en las revisiones.'],
        [c.dato('direccion'), 'Aprueba el inicio y la liberación.'],
      ]),
      desarrollo: pasos([
        'Se define para qué es el diseño: requisitos funcionales, legales y del cliente.',
        'Se planifican etapas, responsables, recursos y plazos.',
        'En cada etapa se hace una revisión con las áreas involucradas.',
        'Se verifica que el resultado cumple lo que se pidió (cálculos, pruebas, inspección).',
        'Se valida que sirve para el uso previsto, con pruebas en condiciones reales o lo más parecidas posible.',
        'Los cambios se identifican, se revisan y se aprueban antes de aplicarse.',
        'Se libera con las especificaciones finales y se guarda el legajo.',
      ]),
      registros: ['Plan del proyecto', 'Actas de revisión de diseño', 'Informes de verificación y validación', 'Control de cambios'],
    }),
};

const proveedores: Plantilla = {
  id: 'proveedores',
  titulo: 'Procedimiento de compras y evaluación de proveedores',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Cómo se elige, se compra, se verifica y se evalúa a quien provee algo que afecta la calidad.',
  cubre: [{ requisito: '9001:8.4', claves: ['criterios-proveedores'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que lo que se compra o se contrata cumple lo pedido, y que se trabaja con proveedores que pueden cumplirlo.',
      alcance: 'Materiales, productos y servicios externos que afectan a lo que se entrega al cliente.',
      responsables: quien(c, [
        ['Compras', 'Selecciona, emite la orden y mantiene el listado de proveedores.'],
        ['Quien recibe', 'Verifica lo recibido contra lo pedido.'],
        [c.dato('responsable_sgi'), 'Revisa la evaluación anual.'],
      ]),
      desarrollo: `**Proveedores críticos** —los que, si fallan, frenan o afectan lo que se entrega—:\n\n${c.vinetas('proveedores_criticos')}\n\n${pasos([
        'Se define qué se le exige al proveedor según cuánto afecta lo que compra: más para los críticos, menos para los de uso general.',
        'Se lo habilita con los criterios definidos: antecedentes, muestras, certificaciones, visita o primer pedido de prueba.',
        'La orden de compra describe con precisión lo que se pide.',
        'Al recibir, se verifica contra la orden y se registra. Lo que no cumple se trata como no conforme.',
        'Una vez al año se evalúa a cada proveedor crítico con cumplimiento de plazo, calidad y respuesta ante problemas.',
        'El proveedor que no alcanza el nivel exigido se corrige, se limita o se reemplaza.',
      ])}`,
      registros: ['Listado de proveedores habilitados', 'Evaluación de proveedores', 'Registro de recepción'],
    }),
};

const produccion: Plantilla = {
  id: 'produccion-servicio',
  titulo: 'Procedimiento de producción o prestación del servicio',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Cómo se hace lo que se vende, en condiciones controladas y preservando lo que se entrega.',
  cubre: [{ requisito: '9001:8.5', claves: ['condiciones-controladas', 'preservacion'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que el producto o servicio se hace de la misma manera cada vez, con lo necesario para hacerlo bien, y llega al cliente en buen estado.',
      alcance: `La operación de ${c.org.nombre}: ${c.dato('actividad')}`,
      responsables: quien(c, [
        ['Responsables de proceso', 'Preparan, controlan y liberan.'],
        ['Operadores', 'Siguen las instrucciones y avisan los desvíos.'],
        [c.dato('responsable_sgi'), 'Mantiene actualizadas las instrucciones.'],
      ]),
      desarrollo: `**Etapas:**\n\n${c.lista('etapas').length ? pasos(c.lista('etapas')) : falta('etapas de la operación')}\n\n**Condiciones controladas:** antes de empezar, se verifica que están disponibles las instrucciones, los materiales correctos, los equipos en condiciones, los instrumentos calibrados y personas competentes.\n\n**Verificación:**\n\n${c.vinetas('puntos_control')}`,
      extra: [
        {
          titulo: 'Identificación, trazabilidad y preservación',
          cuerpo: pasos([
            'Se identifica lo que se produce y su estado (pendiente, en proceso, liberado, rechazado) para no mezclarlo.',
            'Donde se necesita seguir el origen —lote, fecha, quién lo hizo— se registra.',
            'Se cuida durante el manipuleo, el almacenamiento y el transporte para que llegue en las condiciones pactadas.',
            'Las pertenencias del cliente se identifican, se cuidan y se informa si se dañan.',
          ]),
        },
      ],
      registros: ['Registros de producción o de prestación', 'Registros de inspección y liberación', 'Registros de trazabilidad'],
    }),
};

const salidasNoConformes: Plantilla = {
  id: 'salidas-no-conformes',
  titulo: 'Procedimiento de control de salidas no conformes',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Qué se hace con un producto o servicio que no cumple, antes y después de entregarlo.',
  cubre: [{ requisito: '9001:8.7', claves: ['procedimiento-snc'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Impedir que un producto o servicio que no cumple llegue al cliente sin que se sepa, y decidir qué hacer con él.',
      alcance: 'Todo producto, servicio o entrega que no cumple lo especificado, detectado antes o después de la entrega.',
      responsables: quien(c, [
        ['Quien detecta', 'Identifica y separa lo no conforme.'],
        ['Responsable de proceso', 'Decide el tratamiento con la autoridad definida.'],
        [c.dato('responsable_sgi'), 'Registra y analiza las tendencias.'],
      ]),
      desarrollo: pasos([
        'Lo no conforme se identifica y se separa para evitar su uso o entrega.',
        'Se decide el tratamiento: corregir (reprocesar), aceptar con concesión del cliente, reclasificar para otro uso o descartar.',
        'Si hay una concesión, se obtiene la autorización del cliente por escrito.',
        'Después de corregir, se vuelve a verificar que cumple.',
        'Si ya se entregó, se avisa al cliente y se evalúa el efecto para decidir qué acción tomar.',
        'Las causas se tratan con el procedimiento de no conformidades.',
      ]),
      registros: ['Registro de salidas no conformes con su tratamiento', 'Autorizaciones de concesión'],
    }),
};

const satisfaccion: Plantilla = {
  id: 'satisfaccion-cliente',
  titulo: 'Procedimiento de medición de la satisfacción del cliente',
  tipo: 'procedimiento',
  normas: SOLO9001,
  sirvePara: 'Cómo se sabe si el cliente quedó conforme y qué se hace con lo que se descubre.',
  cubre: [{ requisito: '9001:9.1.2', claves: ['metodo-satisfaccion'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Conocer la percepción del cliente sobre si se cumplió lo que esperaba y usarla para mejorar.',
      alcance: `Clientes de ${c.org.nombre}.`,
      responsables: quien(c, [
        [c.dato('responsable_sgi'), 'Define el método, consolida y presenta los resultados.'],
        ['Área comercial', 'Aplica el método y atiende lo que surge.'],
      ]),
      desarrollo: `**Cómo se mide hoy.** ${c.dato('satisfaccion')}\n\n${pasos([
        'Se define qué se mide (conformidad con lo recibido, plazos, trato, resolución de problemas) y cada cuánto.',
        'Se aplica el método a una muestra que represente a los clientes, no sólo a los más amables.',
        'Los resultados se consolidan y se comparan con la meta y con el período anterior.',
        'Lo que baja de la meta se trata como oportunidad de mejora o como no conformidad.',
        'Los resultados se presentan en la revisión por la dirección.',
      ])}`,
      registros: ['Resultados de la medición', 'Análisis y acciones derivadas'],
      indicadores: ['Índice de satisfacción', 'Reclamos por período'],
    }),
};

// ─── ISO 14001 ───────────────────────────────────────────────────────────

const aspectosAmbientales: Plantilla = {
  id: 'aspectos-ambientales',
  titulo: 'Matriz de aspectos e impactos ambientales',
  tipo: 'matriz',
  normas: SOLO14001,
  sirvePara: 'Qué de la actividad afecta al ambiente, cuánto, y a cuál se le presta atención primero.',
  cubre: [{ requisito: '14001:6.1.2', claves: ['matriz-aspectos'] }],
  secciones: (c) => {
    const asp = c.lista('aspectos_ambientales');
    return [
      {
        titulo: 'Método',
        cuerpo: 'Cada aspecto se puntúa por **severidad** del impacto (1 a 3), **frecuencia** con que ocurre (1 a 3) y **control** que existe hoy (1 bueno a 3 inexistente). La **significancia** es el producto; los aspectos con el valor más alto, o los que alcanza una exigencia legal, son significativos y reciben un control operacional.',
      },
      {
        titulo: 'Aspectos e impactos',
        cuerpo: asp.length
          ? `${c.tabla(['Aspecto', 'Proceso', 'Impacto', 'Condición (normal / anormal / emergencia)', 'Severidad', 'Frecuencia', 'Control', 'Significancia'], asp.map((l) => [partir(l, 2)[0], partir(l, 2)[1], '', '', '', '', '', '']))}\n\n${falta('puntuar cada aspecto e indicar su impacto')}`
          : falta('aspectos ambientales'),
      },
      {
        titulo: 'Qué se hace con los significativos',
        cuerpo: 'Cada aspecto significativo se asocia a un control operacional, a un objetivo o a ambos. La matriz se revisa cuando cambia un proceso, un producto o una instalación, y al menos una vez al año.',
      },
    ];
  },
};

const legalAmbiental: Plantilla = {
  id: 'legal-ambiental',
  titulo: 'Matriz de requisitos legales ambientales',
  tipo: 'matriz',
  normas: SOLO14001,
  sirvePara: 'Qué leyes, ordenanzas y permisos ambientales le tocan, y cómo se demuestra que se cumplen.',
  cubre: [{ requisito: '14001:6.1.3', claves: ['matriz-legal-amb'] }],
  secciones: (c) => [
    {
      titulo: 'Jurisdicción',
      cuerpo: `${c.dato('jurisdiccion')}\n\nQué normas aplican depende de la provincia y del municipio. El sistema no las completa por la organización: las lista quien conoce la jurisdicción, con ayuda de un profesional en la materia si hace falta.`,
    },
    {
      titulo: 'Permisos y habilitaciones',
      cuerpo: c.lista('permisos_ambientales').length ? c.vinetas('permisos_ambientales') : 'Sin permisos ambientales declarados.',
    },
    {
      titulo: 'Matriz',
      cuerpo: `${tabla(['Norma (nivel y número)', 'Qué exige', 'A qué proceso aplica', 'Cómo se cumple', 'Evidencia', 'Última revisión'], [['', '', '', '', '', '']])}\n\n${falta('listar las normas ambientales nacionales, provinciales y municipales que aplican')}`,
    },
    {
      titulo: 'Actualización',
      cuerpo: 'La matriz se revisa cada año y cuando cambia una norma, una instalación o un proceso. Quien la mantiene deja constancia de la fecha de revisión.',
    },
  ],
};

const emergenciasAmbientales: Plantilla = {
  id: 'emergencias-ambientales',
  titulo: 'Plan de preparación y respuesta ante emergencias ambientales',
  tipo: 'plan',
  normas: SOLO14001,
  sirvePara: 'Qué hacer, quién y con qué recursos ante un derrame, incendio u otra emergencia que dañe el ambiente.',
  cubre: [{ requisito: '14001:8.2', claves: ['plan-emergencia-amb'] }],
  secciones: (c) => {
    const em = c.lista('emergencias_ambientales');
    return [
      { titulo: 'Emergencias previstas', cuerpo: c.vinetas('emergencias_ambientales') },
      {
        titulo: 'Respuesta por emergencia',
        cuerpo: em.length
          ? `${c.tabla(['Emergencia', 'Qué se hace primero', 'Recursos disponibles', 'Responsable', 'A quién se avisa'], em.map((x) => [x, '', '', '', '']))}\n\n${falta('completar la respuesta de cada emergencia')}`
          : falta('emergencias ambientales'),
      },
      {
        titulo: 'Simulacros',
        cuerpo: 'Cada respuesta se ensaya al menos una vez al año. Después de cada simulacro o emergencia real se registra qué funcionó, qué no, y se corrige el plan.',
      },
    ];
  },
};

// ─── ISO 45001 ───────────────────────────────────────────────────────────

const participacion: Plantilla = {
  id: 'participacion-trabajadores',
  titulo: 'Procedimiento de consulta y participación de los trabajadores',
  tipo: 'procedimiento',
  normas: SOLO45001,
  sirvePara: 'Cómo participan los trabajadores y cómo se los consulta en decisiones de seguridad.',
  cubre: [{ requisito: '45001:5.4', claves: ['mecanismo-participacion'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que quienes hacen el trabajo participan en las decisiones sobre su seguridad y su salud, y que se los consulta antes de cambiar algo que los afecta.',
      alcance: 'Todos los trabajadores, incluidos los de contratistas cuando trabajan en las instalaciones.',
      responsables: quien(c, [
        [c.dato('direccion'), 'Facilita el tiempo y los recursos para participar.'],
        [c.dato('responsable_sgi'), 'Convoca, registra y devuelve respuesta.'],
        ['Trabajadores o sus representantes', 'Aportan, preguntan y proponen.'],
      ]),
      desarrollo: `**Cómo participan hoy.** ${c.dato('participacion')}\n\n${pasos([
        'Se mantiene un espacio periódico para tratar seguridad y salud, con asistencia registrada.',
        'Se consulta a los trabajadores al identificar peligros, evaluar riesgos, definir controles, investigar incidentes y cambiar procesos o equipos.',
        'Cualquier persona puede reportar un peligro o un incidente sin temor a represalias.',
        'Cada aporte se responde: se aplica, se posterga con motivo o se rechaza con motivo.',
        'Los temas abordados y las decisiones se informan al personal.',
      ])}`,
      registros: ['Actas de reuniones de seguridad con asistencia', 'Registro de consultas y de las respuestas dadas'],
    }),
};

const iper: Plantilla = {
  id: 'iper',
  titulo: 'Matriz de identificación de peligros y evaluación de riesgos',
  tipo: 'matriz',
  normas: SOLO45001,
  sirvePara: 'Qué peligros hay en cada tarea, qué tan graves son los riesgos y qué controles se aplican.',
  cubre: [{ requisito: '45001:6.1.2', claves: ['matriz-iper'] }],
  secciones: (c) => {
    const pel = c.lista('peligros');
    return [
      {
        titulo: 'Método',
        cuerpo: 'Para cada peligro se estima la **probabilidad** de que cause daño (1 a 3) y la **gravedad** del daño posible (1 a 3). El **riesgo** es el producto. Los controles se eligen en este orden: eliminar el peligro, sustituirlo, controlarlo con ingeniería, controlarlo con medidas administrativas y, al final, proteger con elementos personales.',
      },
      {
        titulo: 'Peligros y riesgos',
        cuerpo: pel.length
          ? `${c.tabla(['Tarea', 'Peligro', 'Consecuencia', 'Probabilidad', 'Gravedad', 'Riesgo', 'Controles existentes', 'Controles nuevos'], pel.map((l) => [partir(l, 2)[0], partir(l, 2)[1], '', '', '', '', '', '']))}\n\n${falta('evaluar cada peligro y definir sus controles')}`
          : falta('peligros de las tareas'),
      },
      {
        titulo: 'Quién participa y cuándo se revisa',
        cuerpo: `La matriz se arma con quienes hacen la tarea. Se revisa cuando cambia una tarea, un equipo o un producto, después de un incidente y al menos una vez al año. ${c.dato('participacion')}`,
      },
    ];
  },
};

const legalSst: Plantilla = {
  id: 'legal-sst',
  titulo: 'Matriz de requisitos legales de seguridad y salud',
  tipo: 'matriz',
  normas: SOLO45001,
  sirvePara: 'Qué leyes y reglamentos de seguridad e higiene le tocan y cómo se cumplen.',
  cubre: [{ requisito: '45001:6.1.3', claves: ['matriz-legal-sst'] }],
  secciones: (c) => [
    {
      titulo: 'Jurisdicción',
      cuerpo: `${c.dato('jurisdiccion')}\n\nLos requisitos legales dependen de la actividad, la provincia y el municipio. El sistema no los completa por la organización: los lista quien conoce la jurisdicción, con un profesional de higiene y seguridad.`,
    },
    {
      titulo: 'Matriz',
      cuerpo: `${tabla(['Norma (nivel y número)', 'Qué exige', 'A qué tarea o área aplica', 'Cómo se cumple', 'Evidencia', 'Última revisión'], [['', '', '', '', '', '']])}\n\n${falta('listar las normas de seguridad y salud nacionales, provinciales y municipales que aplican')}`,
    },
    {
      titulo: 'Actualización',
      cuerpo: 'Se revisa cada año y cada vez que cambia una norma, una tarea o una instalación.',
    },
  ],
};

const contratistas: Plantilla = {
  id: 'contratistas-sst',
  titulo: 'Procedimiento de control de contratistas en seguridad',
  tipo: 'procedimiento',
  normas: SOLO45001,
  sirvePara: 'Qué se les pide a los contratistas que trabajan en las instalaciones y cómo se verifica.',
  cubre: [{ requisito: '45001:8.1.4', claves: ['requisitos-contratistas'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Asegurar que las personas de contratistas trabajan en las instalaciones con las mismas condiciones de seguridad que el personal propio.',
      alcance: `Todo contratista que ingresa a trabajar en instalaciones de ${c.org.nombre}.`,
      responsables: quien(c, [
        ['Quien contrata', 'Exige los requisitos antes de que ingresen y verifica durante el trabajo.'],
        [c.dato('responsable_sgi'), 'Controla la documentación y comunica los peligros del sitio.'],
        ['Contratista', 'Cumple las reglas y comunica a su personal.'],
      ]),
      desarrollo: `**Contratistas habituales:**\n\n${c.lista('contratistas').length ? c.vinetas('contratistas') : 'Sin contratistas declarados. Si ingresa alguno, se aplica este procedimiento.'}\n\n${pasos([
        'Antes del ingreso, el contratista presenta la documentación definida: cobertura de riesgos del trabajo, nómina del personal y capacitación en las tareas.',
        'Se le informan los peligros del lugar, las reglas y las salidas de emergencia.',
        'Se coordina con otras actividades que se hacen al mismo tiempo para evitar riesgos cruzados.',
        'Durante el trabajo, se supervisa que cumple. Si no cumple, se detiene la tarea.',
        'Al finalizar, se evalúa su desempeño y se registran los incidentes.',
      ])}`,
      registros: ['Documentación de ingreso del contratista', 'Registro de la información de peligros entregada', 'Evaluación del contratista'],
    }),
};

const emergenciasSst: Plantilla = {
  id: 'emergencias-sst',
  titulo: 'Plan de preparación y respuesta ante emergencias',
  tipo: 'plan',
  normas: SOLO45001,
  sirvePara: 'Qué hacer y quién, ante un incendio, un accidente grave o una evacuación.',
  cubre: [{ requisito: '45001:8.2', claves: ['plan-emergencia-sst'] }],
  secciones: (c) => {
    const em = c.lista('emergencias_sst');
    return [
      { titulo: 'Emergencias previstas', cuerpo: c.vinetas('emergencias_sst') },
      {
        titulo: 'Respuesta por emergencia',
        cuerpo: em.length
          ? `${c.tabla(['Emergencia', 'Qué se hace primero', 'Recursos', 'Responsable', 'A quién se avisa'], em.map((x) => [x, '', '', '', '']))}\n\n${falta('completar la respuesta de cada emergencia')}`
          : falta('emergencias para las personas'),
      },
      {
        titulo: 'Primeros auxilios y evacuación',
        cuerpo: pasos([
          'Hay personal formado en primeros auxilios y un botiquín completo y a la vista.',
          'Las vías de evacuación y los puntos de reunión están señalizados y despejados.',
          'Los teléfonos de emergencia y de los responsables están publicados.',
          'Se hace al menos un simulacro de evacuación por año y se registra qué se aprendió.',
        ]),
      },
    ];
  },
};

const incidentes: Plantilla = {
  id: 'incidentes',
  titulo: 'Procedimiento de investigación de incidentes',
  tipo: 'procedimiento',
  normas: SOLO45001,
  sirvePara: 'Qué se hace cuando alguien se lastima o casi se lastima: atender, investigar y evitar que se repita.',
  cubre: [{ requisito: '45001:10.2', claves: ['procedimiento-incidentes'] }],
  secciones: (c) =>
    procedimiento({
      objetivo: 'Atender a las personas, entender por qué pasó un incidente y evitar que se repita.',
      alcance: 'Accidentes, enfermedades vinculadas al trabajo e incidentes sin lesión (casi accidentes).',
      responsables: quien(c, [
        ['Quien lo presencia', 'Avisa de inmediato y asiste si puede hacerlo sin riesgo.'],
        ['Responsable del área', 'Asegura el lugar y participa de la investigación.'],
        [c.dato('responsable_sgi'), 'Conduce la investigación y sigue las acciones.'],
      ]),
      desarrollo: pasos([
        'Se atiende a la persona y se asegura el lugar para que no haya más daños.',
        'Se avisa a quien corresponde, incluidas las autoridades y la cobertura de riesgos del trabajo cuando la ley lo exige.',
        'Se investiga con la persona afectada y los testigos, mirando hechos y no culpas.',
        'Se busca la causa raíz: por qué estaba el peligro, por qué fallaron los controles.',
        'Se definen acciones para eliminar o reducir el riesgo, con responsable y fecha.',
        'Se verifica que las acciones se hicieron y que el riesgo bajó. Se actualiza la matriz de peligros.',
        'Se informa el resultado a los trabajadores.',
      ]),
      registros: ['Informe de investigación de cada incidente', 'Registro de incidentes y casi incidentes', 'Seguimiento de las acciones'],
      indicadores: ['Incidentes y casi incidentes por período', 'Acciones correctivas cerradas en plazo'],
    }),
};

// ─── formularios en blanco ───────────────────────────────────────────────

const campos = (...filas: [string, string][]): string => tabla(['Campo', 'Completar'], filas.map(([a, b]) => [a, b]));

const formulario = (
  id: string,
  titulo: string,
  normas: Norma[],
  sirvePara: string,
  secciones: (c: Ctx) => Seccion[],
): Plantilla => ({ id, titulo, tipo: 'formulario', normas, cubre: [], sirvePara, secciones });

const formularios: Plantilla[] = [
  formulario('for-acta', 'Acta de reunión', TODAS, 'Para dejar constancia de lo hablado y lo decidido.', () => [
    { titulo: 'Datos', cuerpo: campos(['Fecha', ''], ['Lugar', ''], ['Tema', ''], ['Participantes', '']) },
    { titulo: 'Temas tratados', cuerpo: tabla(['Tema', 'Lo dicho'], [['', ''], ['', ''], ['', '']]) },
    { titulo: 'Decisiones y acciones', cuerpo: tabla(['Acción', 'Responsable', 'Plazo'], [['', '', ''], ['', '', '']]) },
    { titulo: 'Firmas', cuerpo: 'Firma de los participantes: ____________________' },
  ]),
  formulario('for-capacitacion', 'Registro de capacitación', TODAS, 'Quién fue capacitado, en qué y si sirvió.', () => [
    { titulo: 'Datos', cuerpo: campos(['Tema', ''], ['Fecha', ''], ['Duración (horas)', ''], ['Instructor', ''], ['Modalidad', '']) },
    { titulo: 'Asistentes', cuerpo: tabla(['Nombre', 'Puesto', 'Firma'], [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']]) },
    { titulo: 'Evaluación de eficacia', cuerpo: campos(['Cómo se evaluó', ''], ['Fecha de la evaluación', ''], ['Resultado', ''], ['Evaluó', '']) },
  ]),
  formulario('for-nc', 'Informe de no conformidad y acción correctiva', TODAS, 'El ciclo completo: qué falló, por qué, qué se hizo y si funcionó.', () => [
    { titulo: 'Detección', cuerpo: campos(['Fecha', ''], ['Proceso', ''], ['Quién lo detectó', ''], ['Origen (auditoría, reclamo, control)', ''], ['Descripción', '']) },
    { titulo: 'Corrección inmediata', cuerpo: campos(['Qué se hizo para contenerlo', ''], ['Responsable', ''], ['Fecha', '']) },
    { titulo: 'Causa raíz', cuerpo: campos(['Análisis (por qué ocurrió)', ''], ['Causa raíz', '']) },
    { titulo: 'Acción correctiva', cuerpo: campos(['Acción', ''], ['Responsable', ''], ['Fecha prevista', '']) },
    { titulo: 'Verificación de eficacia', cuerpo: campos(['Fecha de verificación', ''], ['¿Se repitió?', ''], ['Resultado', ''], ['Cierra', '']) },
  ]),
  formulario('for-auditoria', 'Informe de auditoría interna con lista de verificación', TODAS, 'Lista de preguntas por proceso, sacada de los requisitos que le tocan a la organización.', (c) => {
    const aplicables = requisitosAplicables(c.org);
    const bloques = areasCorpus
      .map((area) => {
        const preguntas = aplicables.filter((r) => r.procesos.includes(area)).flatMap((r) => r.preguntas.map((p) => [`${r.clausula}`, p, '', '']));
        return preguntas.length ? { titulo: `Lista de verificación: ${area}`, cuerpo: tabla(['Cláusula', 'Pregunta', 'Evidencia vista', 'Resultado'], preguntas) } : undefined;
      })
      .filter((b): b is Seccion => !!b);
    return [
      { titulo: 'Datos de la auditoría', cuerpo: campos(['Proceso auditado', ''], ['Fecha', ''], ['Auditor', ''], ['Auditado', ''], ['Criterios', c.org.normas.map((n) => `ISO ${n}`).join(', ')]) },
      ...bloques,
      { titulo: 'Hallazgos', cuerpo: tabla(['Cláusula', 'Hallazgo', 'Clasificación (mayor / menor / observación)', 'Evidencia'], [['', '', '', ''], ['', '', '', '']]) },
      { titulo: 'Conclusión', cuerpo: campos(['Conclusión del auditor', ''], ['Firma del auditor', ''], ['Firma del auditado', '']) },
    ];
  }),
  formulario('for-proveedor', 'Evaluación de proveedor', SOLO9001, 'Para evaluar cada año a los proveedores críticos.', () => [
    { titulo: 'Datos', cuerpo: campos(['Proveedor', ''], ['Qué provee', ''], ['Período evaluado', ''], ['Evaluó', '']) },
    { titulo: 'Criterios', cuerpo: tabla(['Criterio', 'Puntaje (1 a 5)', 'Observación'], [['Cumplimiento de plazos', '', ''], ['Calidad de lo entregado', '', ''], ['Respuesta ante problemas', '', ''], ['Precio y condiciones', '', '']]) },
    { titulo: 'Decisión', cuerpo: campos(['Resultado (aprobado / condicionado / rechazado)', ''], ['Acción', ''], ['Fecha de la próxima evaluación', '']) },
  ]),
  formulario('for-incidente', 'Registro de incidente', SOLO45001, 'Primer reporte de un accidente o casi accidente.', () => [
    { titulo: 'Datos', cuerpo: campos(['Fecha y hora', ''], ['Lugar', ''], ['Persona afectada', ''], ['Tipo (accidente / casi accidente / enfermedad)', ''], ['Testigos', '']) },
    { titulo: 'Qué pasó', cuerpo: campos(['Descripción', ''], ['Lesión o daño', ''], ['Atención brindada', '']) },
    { titulo: 'Investigación', cuerpo: campos(['Causa raíz', ''], ['Acciones', ''], ['Responsable y plazo', ''], ['Verificación', '']) },
  ]),
  formulario('for-calibracion', 'Registro de calibración y verificación', SOLO9001, 'Para anotar cada calibración o verificación de un instrumento.', () => [
    { titulo: 'Instrumento', cuerpo: campos(['Instrumento', ''], ['Código', ''], ['Ubicación', '']) },
    { titulo: 'Calibración', cuerpo: campos(['Fecha', ''], ['Realizó', ''], ['Patrón o laboratorio', ''], ['Resultado', ''], ['Próxima fecha', ''], ['Estado (apto / no apto)', '']) },
  ]),
  formulario('for-revision', 'Acta de revisión por la dirección', TODAS, 'La reunión anual donde la dirección revisa el sistema.', () => [
    { titulo: 'Datos', cuerpo: campos(['Fecha', ''], ['Participantes', '']) },
    {
      titulo: 'Qué se revisa',
      cuerpo: tabla(
        ['Tema', 'Resultado o comentario'],
        [
          ['Avance respecto de la revisión anterior', ''],
          ['Cambios en el contexto y en las partes interesadas', ''],
          ['Cumplimiento de objetivos', ''],
          ['Resultados de auditorías', ''],
          ['No conformidades y acciones correctivas', ''],
          ['Satisfacción del cliente y reclamos', ''],
          ['Desempeño de proveedores', ''],
          ['Incidentes y desempeño ambiental o de seguridad', ''],
          ['Suficiencia de recursos', ''],
          ['Riesgos y oportunidades', ''],
        ],
      ),
    },
    { titulo: 'Decisiones', cuerpo: tabla(['Decisión', 'Responsable', 'Plazo'], [['', '', ''], ['', '', '']]) },
    { titulo: 'Firma', cuerpo: 'Firma de la dirección: ____________________' },
  ]),
];

// ─── el catálogo ─────────────────────────────────────────────────────────

/** Orden de recorrido: tronco primero, después cada norma, después los formularios. */
export const plantillas: Plantilla[] = [
  manual,
  politica,
  riesgos,
  objetivos,
  recursos,
  competencia,
  comunicacion,
  controlDocumental,
  controlOperacional,
  medicion,
  auditoriaInterna,
  noConformidades,
  instrumentos,
  atencionCliente,
  diseno,
  proveedores,
  produccion,
  salidasNoConformes,
  satisfaccion,
  aspectosAmbientales,
  legalAmbiental,
  emergenciasAmbientales,
  participacion,
  iper,
  legalSst,
  contratistas,
  emergenciasSst,
  incidentes,
  ...formularios,
];

export const plantilla = (id: string): Plantilla | undefined => plantillas.find((p) => p.id === id);

/** Lo que cubre un documento ya guardado. Es el enlace entre el documento y el motor. */
export const cubreDe = (id: string): { requisito: string; claves: string[] }[] => plantilla(id)?.cubre ?? [];

/** Las plantillas que le tocan a una organización: sus normas y sin las excluidas. */
export function plantillasDe(org: Organizacion): Plantilla[] {
  return plantillas.filter((p) => p.normas.some((n) => org.normas.includes(n)) && !p.noAplica?.(org));
}

/** Las que no le tocan por exclusión, con el motivo. Hay que mostrarlas: una exclusión se justifica. */
export function plantillasExcluidas(org: Organizacion): { plantilla: Plantilla; motivo: string }[] {
  return plantillas
    .filter((p) => p.normas.some((n) => org.normas.includes(n)))
    .map((p) => ({ plantilla: p, motivo: p.noAplica?.(org) }))
    .filter((x): x is { plantilla: Plantilla; motivo: string } => !!x.motivo);
}

/**
 * SGI TRINORMA — modelo de dominio y motor de cobertura.
 *
 * La regla que ordena todo este archivo: EL MOTOR NO USA IA.
 *
 * Decidir si un requisito de la norma está cubierto es una cuenta, no una
 * opinión. Un auditor te va a preguntar "¿por qué dice 62%?" y la respuesta
 * tiene que ser una lista de evidencias con fecha, no "lo dijo el modelo".
 * Por eso `evaluar()` es una función pura, sincrónica y testeable, y todo lo
 * que devuelve incluye el POR QUÉ (`motivo`, `evidencias`).
 *
 * La IA entra después y sólo para redactar: el informe de auditoría interna y
 * el plan. Redacta sobre este resultado; no lo calcula.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SOBRE EL TEXTO DE LAS NORMAS
 *
 * Acá no hay una sola línea del texto de ISO 9001, 14001 ni 45001. El texto
 * es propiedad de ISO y se compra. Lo que sí se usa —numeración y título de
 * cláusula— es referencia factual y está publicada en todos lados.
 *
 * Las preguntas de auditoría y las descripciones de evidencia son propias.
 * Y está bien que así sea: el valor de esto no es el texto de la norma, que
 * cualquiera compra por cien dólares, sino saber qué preguntar y qué papel
 * pedir. Eso no viene en la norma.
 */

export type Norma = '9001' | '14001' | '45001';

export const NORMAS: Record<Norma, { sigla: string; nombre: string; tono: string }> = {
  '9001': { sigla: 'ISO 9001', nombre: 'Calidad', tono: 'datos' },
  '14001': { sigla: 'ISO 14001', nombre: 'Ambiente', tono: 'herramienta' },
  '45001': { sigla: 'ISO 45001', nombre: 'Seguridad y salud', tono: 'acento' },
};

/**
 * Los dos tipos de evidencia NO son lo mismo y confundirlos es el error más
 * común del que arranca un SGI:
 *
 *   documento — dice cómo se hace algo (política, procedimiento, matriz).
 *               Se revisa cada tanto, pero no "vence" por uso.
 *   registro  — prueba que algo SE HIZO (acta, planilla firmada, informe).
 *               Tiene fecha y caduca: un registro de capacitación de 2019 no
 *               prueba que la gente de hoy esté formada.
 *
 * Un SGI lleno de documentos y sin registros es exactamente lo que el
 * auditor levanta como no conformidad mayor.
 */
export type TipoEvidencia = 'documento' | 'registro';

export interface RequisitoEvidencia {
  clave: string;
  tipo: TipoEvidencia;
  /** Qué es, en criollo. Lo que le pedís al dueño del proceso. */
  descripcion: string;
  /**
   * Meses que un registro sigue sirviendo como prueba. `undefined` = no
   * caduca (típico de documentos). Un registro sin vigencia declarada es
   * un descuido: significa que nadie definió cada cuánto se rehace.
   */
  vigenciaMeses?: number;
}

export interface Requisito {
  /** Único. Tronco: '7.5'. Propio de una norma: '9001:8.3'. */
  id: string;
  /** Número de cláusula tal como lo cita el auditor. */
  clausula: string;
  titulo: string;
  /** En qué normas aplica. Tronco = las tres. */
  normas: Norma[];
  /**
   * true = viene de la estructura de alto nivel que comparten las tres
   * normas (el llamado Anexo SL). Se modela UNA vez y cubre las tres.
   * Es la razón por la que "las tres normas de una" es sostenible: más de
   * la mitad del sistema es tronco compartido.
   */
  tronco: boolean;
  evidencias: RequisitoEvidencia[];
  /** Preguntas de auditoría. Propias, no copiadas de la norma. */
  preguntas: string[];
  /**
   * Las áreas que responden por este requisito.
   *
   * Existe porque un auditor NO audita por cláusula: audita por proceso. Se
   * sienta con Compras una mañana y con Producción a la tarde, y necesita
   * saber qué le toca preguntar a cada uno. Sin este dato el sistema arma un
   * listado por número de cláusula que obliga a saltar de área en área, que
   * es exactamente lo que nadie hace en una auditoría real.
   *
   * No sale de la evidencia cargada: un requisito sin nada cargado igual
   * tiene dueño, y de hecho es el que más importa visitar.
   */
  procesos: string[];
}

/** El requisito tal como se escribe en el corpus, sin las áreas. */
export type RequisitoBase = Omit<Requisito, 'procesos'>;

/** Una evidencia que la organización efectivamente tiene cargada. */
export interface Evidencia {
  id: string;
  titulo: string;
  tipo: TipoEvidencia;
  /** Requisitos que esta evidencia ayuda a cubrir (`Requisito.id`). */
  cubre: string[];
  /** ISO 8601 `YYYY-MM-DD`. Fecha del registro o de última revisión. */
  fecha: string;
  proceso: string;
  responsable: string;
}

export type Estado = 'cubierto' | 'parcial' | 'vencido' | 'sin_cubrir';

/**
 * Cómo se nombra el hallazgo en el informe.
 *
 * ES UNA PROPUESTA, NO UN VEREDICTO. La norma no trae una tabla que diga
 * "esto es mayor y esto es menor": lo decide el auditor mirando el impacto y
 * si la falla es aislada o sistémica. Lo que hace el sistema es proponer una
 * clasificación coherente para que el auditor arranque de algo y la corrija,
 * en vez de arrancar de una hoja en blanco. En la pantalla se muestra
 * diciendo eso mismo.
 */
export type Clase = 'mayor' | 'menor' | 'observacion';

export interface Cobertura {
  requisito: Requisito;
  estado: Estado;
  /** Evidencias vigentes que aportan, por clave de RequisitoEvidencia. */
  aportan: Record<string, Evidencia[]>;
  /** Las que existen pero ya no prueban nada por antigüedad. */
  caducas: Evidencia[];
  /** Claves de evidencia requerida que nadie cubre. */
  faltan: string[];
  /** Explicación en una línea. Es lo que se le muestra al auditor. */
  motivo: string;
  /**
   * Meses que faltan para que se caiga la primera evidencia que hoy sostiene
   * este requisito. `undefined` si no hay nada que caduque (o si ya se cayó).
   *
   * Este número es la razón de ser del sistema. Un requisito cubierto hoy y
   * vencido en seis semanas está, para efectos prácticos, ya perdido: nadie
   * arma una capacitación en seis semanas mientras corre una auditoría. Verlo
   * antes es la diferencia entre planificar y apagar un incendio.
   */
  mesesAlVencimiento?: number;
  /** Cubierto, pero con algo cayéndose dentro del horizonte de aviso. */
  porVencer: boolean;
  /** Clasificación propuesta. `undefined` si el requisito está cubierto. */
  clase?: Clase;
}

const MES = 30.436875 * 24 * 60 * 60 * 1000;

/** Meses transcurridos entre `fecha` y `hoy`. Negativo si la fecha es futura. */
export function antiguedadMeses(fecha: string, hoy: Date): number {
  return (hoy.getTime() - new Date(`${fecha}T00:00:00Z`).getTime()) / MES;
}

/**
 * ¿Esta evidencia todavía prueba algo?
 *
 * Un documento no caduca solo. Un registro sí: pasada su vigencia dejó de
 * ser prueba del presente. Ojo con el caso borde —una evidencia con fecha
 * futura— que se trata como válida a propósito: es una auditoría o una
 * capacitación ya programada, y el sistema no tiene por qué castigarla.
 */
export function vigente(ev: Evidencia, req: RequisitoEvidencia, hoy: Date): boolean {
  if (req.vigenciaMeses === undefined) return true;
  return antiguedadMeses(ev.fecha, hoy) <= req.vigenciaMeses;
}

/**
 * Cuántos meses antes se avisa que algo se va a caer.
 *
 * Tres no es un número redondo elegido al azar: es lo que tarda en armarse
 * de verdad una capacitación con evaluación de eficacia, una calibración
 * externa o una revisión por la dirección con las áreas sentadas. Avisar con
 * menos es avisar cuando ya no se puede hacer nada.
 */
export const AVISO_MESES = 3;

/**
 * Clasificación PROPUESTA del hallazgo. La decide el auditor; esto sugiere.
 *
 *   sin_cubrir → mayor       el requisito no está implementado, punto.
 *   vencido    → menor       existió y se dejó caer: falla de sostenimiento.
 *   parcial    → menor       está implementado a medias.
 *
 * La observación queda para lo que todavía no falló: lo cubierto que está por
 * vencer. Es la única de las tres que un sistema puede detectar sola y que
 * una auditoría tradicional, hecha una vez al año, se pierde siempre.
 */
export function clasificar(estado: Estado): Clase | undefined {
  if (estado === 'sin_cubrir') return 'mayor';
  if (estado === 'vencido' || estado === 'parcial') return 'menor';
  return undefined;
}

/**
 * El motor. Función pura: mismos argumentos, mismo resultado, siempre.
 *
 * Un requisito está `cubierto` sólo si TODA la evidencia que pide tiene al
 * menos un aporte vigente. No se promedia: para la norma, tener nueve de
 * diez papeles no es cumplir en un 90%, es no cumplir. Los porcentajes que
 * el sistema muestra son de avance del proyecto, no de cumplimiento.
 */
export function evaluar(req: Requisito, evidencias: Evidencia[], hoy: Date): Cobertura {
  const propias = evidencias.filter((e) => e.cubre.includes(req.id));

  const aportan: Record<string, Evidencia[]> = {};
  const caducas: Evidencia[] = [];
  const faltan: string[] = [];

  for (const pedida of req.evidencias) {
    // El tipo tiene que coincidir: un procedimiento no reemplaza a un acta.
    const candidatas = propias.filter((e) => e.tipo === pedida.tipo);
    const vigentes = candidatas.filter((e) => vigente(e, pedida, hoy));

    if (vigentes.length > 0) {
      aportan[pedida.clave] = vigentes;
    } else {
      faltan.push(pedida.clave);
      for (const c of candidatas) if (!caducas.includes(c)) caducas.push(c);
    }
  }

  const total = req.evidencias.length;
  const cubiertas = total - faltan.length;

  let estado: Estado;
  let motivo: string;

  if (faltan.length === 0) {
    estado = 'cubierto';
    motivo = `${total} de ${total} evidencias vigentes.`;
  } else if (cubiertas === 0 && caducas.length > 0) {
    // Distinguir "vencido" de "sin cubrir" no es cosmético: son dos
    // hallazgos distintos. Vencido significa que el sistema existió y se
    // dejó caer, y eso el auditor lo mira peor que no haberlo tenido nunca.
    estado = 'vencido';
    motivo = `Hay evidencia cargada pero ninguna vigente (${caducas.length} caduca${caducas.length === 1 ? '' : 's'}).`;
  } else if (cubiertas === 0) {
    estado = 'sin_cubrir';
    motivo = 'Sin evidencia cargada.';
  } else {
    estado = 'parcial';
    motivo = `${cubiertas} de ${total} evidencias vigentes. Falta: ${faltan.join(', ')}.`;
  }

  /*
   * De todo lo que hoy sostiene este requisito, ¿qué se cae primero?
   * Interesa el MÍNIMO: el requisito se desarma en cuanto falta una sola de
   * las evidencias que pide, así que la más próxima a caducar manda.
   */
  let mesesAlVencimiento: number | undefined;
  for (const pedida of req.evidencias) {
    if (pedida.vigenciaMeses === undefined) continue;
    const aportando = aportan[pedida.clave];
    if (!aportando?.length) continue;
    // Dentro de una misma clave alcanza con la más nueva: es la que aguanta.
    const restante = Math.max(
      ...aportando.map((e) => pedida.vigenciaMeses! - antiguedadMeses(e.fecha, hoy)),
    );
    if (mesesAlVencimiento === undefined || restante < mesesAlVencimiento) {
      mesesAlVencimiento = restante;
    }
  }

  const porVencer = estado === 'cubierto' && mesesAlVencimiento !== undefined && mesesAlVencimiento <= AVISO_MESES;

  return {
    requisito: req,
    estado,
    aportan,
    caducas,
    faltan,
    motivo,
    mesesAlVencimiento,
    porVencer,
    clase: clasificar(estado),
  };
}

export interface Resumen {
  norma: Norma;
  total: number;
  cubierto: number;
  parcial: number;
  vencido: number;
  sin_cubrir: number;
  /** Cubiertos hoy, pero con algo cayéndose dentro del horizonte de aviso. */
  por_vencer: number;
  /** Avance del proyecto de implementación, NO cumplimiento de la norma. */
  avance: number;
}

/**
 * El parcial pondera medio punto: un requisito a medias es trabajo hecho y
 * esconderlo desmotiva, pero contarlo entero mentiría sobre el estado real.
 */
export function resumir(coberturas: Cobertura[], norma: Norma): Resumen {
  const propias = coberturas.filter((c) => c.requisito.normas.includes(norma));
  const contar = (e: Estado) => propias.filter((c) => c.estado === e).length;

  const cubierto = contar('cubierto');
  const parcial = contar('parcial');
  const total = propias.length;

  return {
    norma,
    total,
    cubierto,
    parcial,
    vencido: contar('vencido'),
    sin_cubrir: contar('sin_cubrir'),
    por_vencer: propias.filter((c) => c.porVencer).length,
    avance: total === 0 ? 0 : Math.round(((cubierto + parcial * 0.5) / total) * 100),
  };
}

/**
 * El orden en que un auditor recorre los hallazgos: primero lo que se cayó,
 * después lo que nunca estuvo, al final lo que está a medias. Dentro de cada
 * grupo, por número de cláusula.
 */
const PESO: Record<Estado, number> = { vencido: 0, sin_cubrir: 1, parcial: 2, cubierto: 3 };

export function ordenarHallazgos(coberturas: Cobertura[]): Cobertura[] {
  return [...coberturas]
    .filter((c) => c.estado !== 'cubierto')
    .sort(
      (a, b) =>
        PESO[a.estado] - PESO[b.estado] ||
        a.requisito.clausula.localeCompare(b.requisito.clausula, 'es', { numeric: true }),
    );
}

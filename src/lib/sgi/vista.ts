import type { Cobertura, Resumen, Clase, Estado } from './modelo.ts';
import { NORMAS } from './modelo.ts';

/**
 * LAS PLANTILLAS, COMPARTIDAS ENTRE EL BUILD Y EL NAVEGADOR.
 *
 * Estas funciones devuelven HTML como texto y se usan en los dos lados: Astro
 * las llama en tiempo de compilación para dejar la página armada sin
 * JavaScript, y el script del cliente las vuelve a llamar cada vez que movés
 * la máquina del tiempo o apagás una evidencia.
 *
 * Una sola definición del marcado. Si estuviera escrito dos veces —una en el
 * .astro y otra en el script— la versión sin JS y la versión interactiva se
 * irían separando de a poco y nadie se daría cuenta, porque casi nunca se
 * miran las dos juntas.
 */

/**
 * Escape de HTML. Hoy todo el contenido es nuestro y constante, así que en
 * rigor no hace falta. Está igual porque el día que estas plantillas reciban
 * el nombre de una evidencia cargada por un usuario, nadie se va a acordar de
 * agregarlo, y ese es exactamente el día en que hace falta.
 */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const ETIQUETA: Record<Estado, string> = {
  cubierto: 'Cubierto',
  parcial: 'Parcial',
  vencido: 'Vencido',
  sin_cubrir: 'Sin cubrir',
};

export const ETIQUETA_CLASE: Record<Clase, string> = {
  mayor: 'NC mayor',
  menor: 'NC menor',
  observacion: 'Observación',
};

/** "en 2 meses", "el mes que viene", "ya vencida". En criollo, no en días. */
export function cuandoVence(meses: number): string {
  if (meses <= 0) return 'ya vencida';
  if (meses < 1) return 'este mes';
  if (meses < 2) return 'el mes que viene';
  return `en ${Math.floor(meses)} meses`;
}

/** La tarjeta de una norma en el tablero. */
export function tarjetaNorma(r: Resumen): string {
  const n = NORMAS[r.norma];
  return `
    <article class="norma" data-tono="${n.tono}" data-norma="${r.norma}">
      <header>
        <h3>${esc(n.sigla)}</h3>
        <p>${esc(n.nombre)}</p>
      </header>
      <p class="avance"><span>${r.avance}</span>%</p>
      <div class="barra" role="img" aria-label="Avance ${r.avance} por ciento">
        <div class="relleno" style="width:${r.avance}%"></div>
      </div>
      <ul class="desglose">
        <li><b>${r.cubierto}</b> cubiertos</li>
        <li><b>${r.parcial}</b> parciales</li>
        <li class="malo"><b>${r.vencido}</b> vencidos</li>
        <li class="malo"><b>${r.sin_cubrir}</b> sin cubrir</li>
      </ul>
      ${
        r.por_vencer > 0
          ? `<p class="alerta"><b>${r.por_vencer}</b> por vencer en los próximos meses</p>`
          : ''
      }
      <p class="pie">sobre ${r.total} requisitos auditables</p>
    </article>`;
}

/**
 * La tarjeta de un hallazgo.
 *
 * Se emiten las 45, incluidas las cubiertas: el filtro y la máquina del
 * tiempo cambian cuáles se muestran, no cuáles existen. Así el HTML que sale
 * del servidor ya trae todo y nadie ve un salto de contenido al cargar.
 */
export function tarjetaHallazgo(c: Cobertura): string {
  const req = c.requisito;

  const etiquetas = req.tronco
    ? '<span class="tronco-tag">Tronco común · aplica a las tres normas</span>'
    : req.normas
        .map((n) => `<span class="norma-tag" data-tono="${NORMAS[n].tono}">${esc(NORMAS[n].sigla)}</span>`)
        .join('');

  const faltan = req.evidencias.filter((e) => c.faltan.includes(e.clave));
  const bloqueFalta = faltan.length
    ? `<div class="falta">
         <h4>Qué hay que conseguir</h4>
         <ul>${faltan
           .map(
             (e) =>
               `<li><span class="tipo ${e.tipo}">${e.tipo}</span>${esc(e.descripcion)}${
                 e.vigenciaMeses ? `<em> · se renueva cada ${e.vigenciaMeses} meses</em>` : ''
               }</li>`,
           )
           .join('')}</ul>
       </div>`
    : '';

  const bloqueCaduca = c.caducas.length
    ? `<div class="caduca">
         <h4>Evidencia cargada que ya no prueba</h4>
         <ul>${c.caducas
           .map(
             (e) =>
               `<li>${esc(e.titulo)} <span class="fecha">${esc(e.fecha)}</span><span class="dueno">${esc(
                 e.proceso,
               )} · ${esc(e.responsable)}</span></li>`,
           )
           .join('')}</ul>
       </div>`
    : '';

  const bloqueAviso =
    c.porVencer && c.mesesAlVencimiento !== undefined
      ? `<p class="por-vencer">Cubierto hoy, pero la primera evidencia se cae ${esc(
          cuandoVence(c.mesesAlVencimiento),
        )}. A esta altura ya no se llega a rehacerla antes de una auditoría.</p>`
      : '';

  const sello = c.clase
    ? `<span class="clase ${c.clase}">${esc(ETIQUETA_CLASE[c.clase])}</span>`
    : c.porVencer
      ? `<span class="clase observacion">${esc(ETIQUETA_CLASE.observacion)}</span>`
      : '';

  return `
    <li class="hallazgo" data-id="${esc(req.id)}" data-estado="${c.estado}" data-vencer="${
      c.porVencer ? '1' : '0'
    }" data-normas="${req.normas.join(' ')}">
      <header>
        <span class="clausula">${esc(req.clausula)}</span>
        <h3>${esc(req.titulo)}</h3>
        ${sello}
        <span class="chip ${c.estado}">${esc(ETIQUETA[c.estado])}</span>
      </header>
      <p class="motivo">${esc(c.motivo)}</p>
      ${bloqueAviso}
      <p class="aplica">${etiquetas}</p>
      ${bloqueFalta}
      ${bloqueCaduca}
      <details>
        <summary>Preguntas para la auditoría (${req.preguntas.length})</summary>
        <ul class="preguntas">${req.preguntas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </details>
    </li>`;
}

/** Una fila de la matriz completa. */
export function filaMatriz(c: Cobertura): string {
  const req = c.requisito;
  return `
    <tr data-id="${esc(req.id)}" data-estado="${c.estado}">
      <td class="mono">${esc(req.clausula)}</td>
      <td>${esc(req.titulo)}</td>
      <td class="mono chico">${
        req.tronco ? 'las tres' : req.normas.map((n) => esc(NORMAS[n].sigla)).join(', ')
      }</td>
      <td><span class="chip ${c.estado}">${esc(ETIQUETA[c.estado])}</span></td>
      <td class="chico">${esc(c.motivo)}</td>
    </tr>`;
}

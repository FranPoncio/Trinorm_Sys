/**
 * Las pantallas de la herramienta, como funciones puras: reciben datos y
 * devuelven HTML en texto.
 *
 * Que sean puras tiene un motivo concreto. Todo lo que una persona escribe
 * (el nombre de su organización, una respuesta, el texto de un documento)
 * termina dibujado acá, y un solo `${dato}` sin escapar es un hueco por el
 * que entra código ajeno. Siendo funciones de texto, se las prueba en Node
 * contra datos hostiles sin levantar un navegador.
 *
 * REGLA: nada dinámico se interpola sin pasar por `esc()`. Los números que
 * se calculan acá adentro (porcentajes, conteos) no vienen del usuario y se
 * pueden poner directo.
 */

import { avanceEntrevista, aplica, preguntas, SECCIONES } from '../lib/sgi/entrevista.ts';
import type { Pregunta } from '../lib/sgi/entrevista.ts';
import { contarFaltantes, codigoDe, puedeAprobar, fueEditado, TIPOS_DOC } from '../lib/sgi/generador.ts';
import { renderizar, esc } from '../lib/sgi/markdown.ts';
import { ordenarHallazgos, resumir } from '../lib/sgi/modelo.ts';
import type { Cobertura, Estado, Norma } from '../lib/sgi/modelo.ts';
import { NORMAS } from '../lib/sgi/modelo.ts';
import { requisitos, procesos as areasCorpus } from '../lib/sgi/normas.ts';
import { RUBROS, coberturaDe, exclusionesDe, isoLocal } from '../lib/sgi/organizacion.ts';
import type { Descartada } from '../lib/sgi/almacen.ts';
import type { Documento, Organizacion } from '../lib/sgi/organizacion.ts';
import { cubreDe, plantilla, plantillas, plantillasDe, plantillasExcluidas } from '../lib/sgi/plantillas.ts';
import type { Plantilla } from '../lib/sgi/generador.ts';
import { ruta, siguientePaso } from '../lib/sgi/ruta.ts';
import type { Etapa } from '../lib/sgi/ruta.ts';

// ─── piezas chicas ───────────────────────────────────────────────────────

const ROTULO_ETAPA: Record<Etapa['estado'], string> = {
  completa: 'Completa',
  en_curso: 'En curso',
  pendiente: 'Para hacer',
  bloqueada: 'Todavía no',
};
const ROTULO_DOC = { sin_generar: 'Sin generar', borrador: 'Borrador', en_revision: 'En revisión', aprobado: 'Aprobado' } as const;
const ROTULO_ESTADO: Record<Estado, string> = { cubierto: 'Cubierto', parcial: 'Parcial', vencido: 'Vencido', sin_cubrir: 'Sin cubrir' };

/** Barra de progreso accesible. `hecho` y `total` son conteos calculados, no texto del usuario. */
export function progreso(hecho: number, total: number, etiqueta: string): string {
  const pct = total === 0 ? 0 : Math.round((hecho / total) * 100);
  return `<div class="prog" role="progressbar" aria-label="${esc(etiqueta)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${hecho}"><span style="width:${pct}%"></span></div>`;
}

const chipNorma = (n: Norma): string => `<span class="norma-chip n${n}">ISO ${n}</span>`;
const chipsNormas = (normas: Norma[]): string => normas.map(chipNorma).join(' ');

export function estadoDoc(d: Documento | undefined): keyof typeof ROTULO_DOC {
  return d ? d.estado : 'sin_generar';
}

const href = (org: Organizacion, resto = ''): string => `#/o/${encodeURIComponent(org.id)}${resto}`;

// ─── el armazón de una organización ──────────────────────────────────────

export type Seccion = 'panel' | 'entrevista' | 'documentos' | 'evidencia' | 'datos';

const SECCIONES_NAV: [Seccion, string][] = [
  ['panel', 'Ruta'],
  ['entrevista', 'Entrevista'],
  ['documentos', 'Documentos'],
  ['evidencia', 'Evidencia'],
  ['datos', 'Datos'],
];

export function marco(org: Organizacion, activa: Seccion, contenido: string): string {
  const nav = SECCIONES_NAV.map(
    ([id, texto]) =>
      `<a class="pestana${id === activa ? ' activa' : ''}" href="${href(org, id === 'panel' ? '' : `/${id}`)}"${id === activa ? ' aria-current="page"' : ''}>${texto}</a>`,
  ).join('');
  return `<div class="encabezado-org">
    <a class="volver" href="#/">← Organizaciones</a>
    <p class="org-nombre">${esc(org.nombre)}</p>
    <nav class="pestanas no-imprimir" aria-label="Secciones de la organización">${nav}</nav>
  </div>
  ${contenido}`;
}

// ─── inicio ──────────────────────────────────────────────────────────────

export function vistaInicio(orgs: Organizacion[], descartadas: Descartada[], hoy: Date): string {
  const tarjetas = orgs
    .map((o) => {
      const etapas = ruta(o, hoy);
      const completas = etapas.filter((e) => e.estado === 'completa').length;
      const sig = siguientePaso(etapas);
      return `<li class="tarjeta">
        <div class="tarjeta-cab"><h3><a href="${href(o)}">${esc(o.nombre)}</a></h3><span>${chipsNormas(o.normas)}</span></div>
        <p class="tenue">${esc(RUBROS[o.rubro])} · actualizada ${esc(o.actualizada)}</p>
        ${progreso(completas, etapas.length, 'Etapas completas')}
        <p class="mono tenue">${completas} de ${etapas.length} etapas completas</p>
        ${sig ? `<p class="siguiente"><span class="rotulo">Sigue</span> ${esc(sig.accion || sig.titulo)}</p>` : '<p class="siguiente">Ruta completa.</p>'}
      </li>`;
    })
    .join('');

  const rotas = descartadas.length
    ? `<div class="aviso-rojo" role="alert"><strong>${descartadas.length} entrada${descartadas.length === 1 ? '' : 's'} guardada${descartadas.length === 1 ? '' : 's'} no se pudo${descartadas.length === 1 ? '' : 'ieron'} leer</strong> y no se muestra${descartadas.length === 1 ? '' : 'n'}. No se borró nada.
        <ul>${descartadas.map((d) => `<li><code>${esc(d.clave)}</code>: ${esc(d.motivo)}</li>`).join('')}</ul></div>`
    : '';

  const normas = (Object.keys(NORMAS) as Norma[])
    .map((n) => `<label class="opcion"><input type="checkbox" name="normas" value="${n}" checked> ${esc(NORMAS[n].sigla)} <span class="tenue">${esc(NORMAS[n].nombre)}</span></label>`)
    .join('');
  const rubros = Object.entries(RUBROS)
    .map(([k, v]) => `<option value="${k}">${esc(v)}</option>`)
    .join('');

  return `<section class="intro">
      <p class="rotulo">Preparación para certificar</p>
      <h1>Llevá una organización a la certificación</h1>
      <p>Contá cómo trabaja la organización. Con lo que cuente, la herramienta arma los documentos que cada norma pide, te marca lo que falta completar y te dice qué sigue hasta la auditoría de certificación.</p>
      <p class="aviso"><strong>Los datos quedan sólo en este navegador.</strong> No se envían a ningún servidor. Si borrás los datos del sitio, se pierden: por eso podés exportar un respaldo.</p>
    </section>

    ${rotas}

    <section>
      <h2>Mis organizaciones</h2>
      ${orgs.length ? `<ul class="tarjetas">${tarjetas}</ul>` : '<p class="vacio">Todavía no cargaste ninguna. Creá una abajo, o probá con el ejemplo para ver el recorrido completo.</p>'}
    </section>

    <section>
      <h2>Nueva organización</h2>
      <form class="formulario" data-form="nueva">
        <label>Nombre<input name="nombre" required maxlength="200" autocomplete="off"></label>
        <label>Rubro<select name="rubro">${rubros}</select></label>
        <label>Cantidad de personas<input name="empleados" type="number" min="0" max="1000000" value="10"></label>
        <label>Sedes<input name="sedes" maxlength="2000" placeholder="Ej.: una planta en Córdoba"></label>
        <fieldset class="opciones"><legend>Normas a certificar</legend>${normas}</fieldset>
        <div class="acciones">
          <button type="submit" class="boton primario">Crear organización</button>
          <button type="button" class="boton" data-accion="cargar-ejemplo">Probar con una organización de ejemplo</button>
        </div>
      </form>
    </section>

    <section>
      <h2>Respaldo</h2>
      <p class="tenue">El respaldo es un archivo con todas tus organizaciones. Guardalo en un lugar seguro: es tu única copia si se borra el navegador.</p>
      <div class="acciones">
        <button type="button" class="boton" data-accion="exportar-todo"${orgs.length ? '' : ' disabled'}>Exportar todo</button>
        <label class="boton archivo">Importar respaldo<input type="file" accept="application/json,.json" data-accion="importar" hidden></label>
      </div>
    </section>`;
}

// ─── ruta ────────────────────────────────────────────────────────────────

const DONDE: Partial<Record<Etapa['id'], Seccion>> = {
  organizacion: 'datos',
  entrevista: 'entrevista',
  documentos: 'documentos',
  implementacion: 'evidencia',
};

function itemEtapa(org: Organizacion, e: Etapa, hoy: Date): string {
  const destino = DONDE[e.id];
  const prog = e.progreso && e.progreso.total > 0 ? `${progreso(e.progreso.hecho, e.progreso.total, e.titulo)}<p class="mono tenue">${e.progreso.hecho} de ${e.progreso.total}</p>` : '';

  let controles = '';
  if (e.hito) {
    if (e.fecha) {
      controles = `<form class="hito" data-form="hito-quitar" data-hito="${e.hito}"><span class="mono">Cumplida el ${esc(e.fecha)}</span> <button class="boton chico" type="submit">Quitar</button></form>`;
    } else if (e.estado !== 'bloqueada') {
      controles = `<form class="hito" data-form="hito-registrar" data-hito="${e.hito}">
        <label>Fecha en que se cumplió <input type="date" name="fecha" required max="${esc(isoLocal(hoy))}"></label>
        <button class="boton chico primario" type="submit">Registrar</button></form>`;
    }
  } else if (destino && e.estado !== 'completa') {
    controles = `<a class="boton chico" href="${href(org, `/${destino}`)}">Ir a ${esc(destino === 'datos' ? 'datos' : destino)}</a>`;
  }

  return `<li class="etapa ${e.estado}">
    <div class="etapa-num" aria-hidden="true">${e.numero}</div>
    <div class="etapa-cuerpo">
      <div class="etapa-cab"><h3>${esc(e.titulo)}</h3><span class="chip ${e.estado}">${ROTULO_ETAPA[e.estado]}</span></div>
      <p class="tenue">${esc(e.detalle)}</p>
      ${prog}
      ${e.bloqueadaPor && e.estado !== 'completa' ? `<p class="nota">Antes: ${esc(e.bloqueadaPor)}.</p>` : ''}
      ${e.accion ? `<p class="accion"><span class="rotulo">Qué hacer</span> ${esc(e.accion)}</p>` : ''}
      ${controles}
    </div>
  </li>`;
}

export function resumenNormas(org: Organizacion, hoy: Date): string {
  const cob = coberturaDe(org, hoy, cubreDe);
  if (cob.length === 0) return '<p class="vacio">Elegí al menos una norma en «Datos» para ver el estado de la evidencia.</p>';
  return `<div class="normas-resumen">${org.normas
    .map((n) => {
      const r = resumir(cob, n);
      return `<div class="norma-card n${n}">
        <div class="tarjeta-cab"><h3>${esc(NORMAS[n].sigla)}</h3><span class="tenue">${esc(NORMAS[n].nombre)}</span></div>
        <p class="mono"><strong>${r.cubierto}</strong> de ${r.total} requisitos con toda su evidencia vigente</p>
        ${progreso(r.cubierto, r.total, `${NORMAS[n].sigla}: requisitos cubiertos`)}
        <ul class="conteo">
          <li><span class="chip parcial">Parcial</span> ${r.parcial}</li>
          <li><span class="chip vencido">Vencido</span> ${r.vencido}</li>
          <li><span class="chip sin_cubrir">Sin cubrir</span> ${r.sin_cubrir}</li>
          ${r.por_vencer ? `<li><span class="chip por-vencer">Por vencer</span> ${r.por_vencer}</li>` : ''}
        </ul>
      </div>`;
    })
    .join('')}</div>
    <p class="tenue pequeno">Es el avance de la evidencia cargada, no el cumplimiento de la norma: para la norma, tener nueve de diez papeles es no cumplir.</p>`;
}

export function vistaPanel(org: Organizacion, hoy: Date): string {
  const etapas = ruta(org, hoy);
  const sig = siguientePaso(etapas);
  const excl = exclusionesDe(org);

  return marco(
    org,
    'panel',
    `<header class="titulo-vista">
      <h1>Ruta de certificación</h1>
      <p class="tenue">${chipsNormas(org.normas) || 'Sin normas elegidas'} · ${esc(RUBROS[org.rubro])} · ${org.empleados} personas</p>
    </header>

    ${
      sig
        ? `<aside class="siguiente-paso"><span class="rotulo">Siguiente paso</span><h2>${esc(sig.titulo)}</h2><p>${esc(sig.accion || sig.detalle)}</p></aside>`
        : '<aside class="siguiente-paso listo"><span class="rotulo">Ruta completa</span><h2>Todas las etapas están cumplidas</h2><p>Mantené el sistema: la vigilancia y la renovación dependen de que la evidencia siga vigente.</p></aside>'
    }

    ${
      excl.length
        ? `<aside class="aviso"><strong>Requisitos excluidos por la organización:</strong><ul>${excl.map((x) => `<li><code>${esc(x.requisito)}</code> — ${esc(x.motivo)}</li>`).join('')}</ul>Una exclusión se justifica ante el auditor: el motivo queda acá y en los documentos.</aside>`
        : ''
    }

    <section><h2>Etapas</h2><ol class="ruta">${etapas.map((e) => itemEtapa(org, e, hoy)).join('')}</ol></section>

    <section><h2>Estado de la evidencia</h2>${resumenNormas(org, hoy)}</section>`,
  );
}

// ─── entrevista ──────────────────────────────────────────────────────────

function campo(p: Pregunta, valor: string): string {
  const id = `q-${p.clave}`;
  const base = `id="${id}" data-clave="${esc(p.clave)}"`;
  switch (p.tipo) {
    case 'texto':
      return `<textarea ${base} rows="4">${esc(valor)}</textarea>`;
    case 'lista':
      return `<textarea ${base} rows="5" placeholder="Uno por línea">${esc(valor)}</textarea>`;
    case 'corto':
      return `<input ${base} type="text" value="${esc(valor)}" maxlength="500">`;
    case 'si_no':
      return `<div class="radios" role="radiogroup" aria-labelledby="${id}-t">${(['si', 'no'] as const)
        .map((v) => `<label class="opcion"><input type="radio" name="${id}" data-clave="${esc(p.clave)}" value="${v}"${valor === v ? ' checked' : ''}> ${v === 'si' ? 'Sí' : 'No'}</label>`)
        .join('')}</div>`;
    case 'opcion':
      return `<select ${base}><option value="">Elegí una</option>${(p.opciones ?? [])
        .map((o) => `<option value="${esc(o)}"${valor === o ? ' selected' : ''}>${esc(o)}</option>`)
        .join('')}</select>`;
  }
}

export function avanceHtml(org: Organizacion): string {
  const a = avanceEntrevista(org);
  return `${progreso(a.requeridasContestadas, a.requeridas, 'Avance de la entrevista')}<p class="mono tenue">${a.requeridasContestadas} de ${a.requeridas} preguntas obligatorias contestadas (${a.porcentaje} %)</p>`;
}

export function vistaEntrevista(org: Organizacion): string {
  const bloques = SECCIONES.map((s) => {
    const qs = preguntas.filter((p) => p.seccion === s && aplica(p, org.normas));
    if (qs.length === 0) return '';
    return `<fieldset class="seccion"><legend>${esc(s)}</legend>${qs
      .map(
        (p) => `<div class="pregunta">
          <label id="q-${esc(p.clave)}-t" for="q-${esc(p.clave)}">${esc(p.texto)}${p.requerida ? '' : ' <span class="opcional">opcional</span>'}</label>
          ${p.ayuda ? `<p class="ayuda">${esc(p.ayuda)}</p>` : ''}
          ${campo(p, org.respuestas[p.clave] ?? '')}
        </div>`,
      )
      .join('')}</fieldset>`;
  }).join('');

  const procesos = org.procesos
    .map(
      (p) => `<div class="proceso" data-proceso="${esc(p.id)}">
        <div class="proceso-cab"><h4>${esc(p.nombre) || 'Proceso sin nombre'}</h4><button type="button" class="boton chico peligro" data-accion="quitar-proceso" data-id="${esc(p.id)}">Quitar</button></div>
        ${(
          [
            ['nombre', 'Nombre', 'input'],
            ['responsable', 'Responsable (nombre o cargo)', 'input'],
            ['objetivo', 'Para qué existe: qué resultado entrega a los demás', 'textarea'],
            ['entradas', 'Qué necesita para empezar', 'textarea'],
            ['salidas', 'Qué entrega al terminar', 'textarea'],
            ['indicador', 'Cómo se mide si funciona', 'input'],
          ] as const
        )
          .map(
            ([k, et, t]) =>
              `<label>${et}${t === 'input' ? `<input type="text" data-proceso-campo="${k}" value="${esc(p[k])}" maxlength="500">` : `<textarea rows="2" data-proceso-campo="${k}">${esc(p[k])}</textarea>`}</label>`,
          )
          .join('')}
      </div>`,
    )
    .join('');

  return marco(
    org,
    'entrevista',
    `<header class="titulo-vista">
      <h1>Entrevista</h1>
      <p class="tenue">Contá lo que la organización hace de verdad, no lo que debería hacer. Un auditor no revisa si el procedimiento está bien escrito: revisa si describe lo que se hace. Lo que no contestes aparece marcado en los documentos; no se inventa.</p>
      <div id="avance-entrevista">${avanceHtml(org)}</div>
      <p class="tenue pequeno">Se guarda solo, a medida que escribís.</p>
    </header>

    <section>
      <h2>Los procesos</h2>
      <p class="tenue">Cada área o actividad con un responsable. Con esto se arma el mapa de procesos y las tablas por proceso.</p>
      <div id="procesos">${procesos || '<p class="vacio">Todavía no hay procesos. Agregá los que tenga la organización.</p>'}</div>
      <div class="acciones">
        <button type="button" class="boton" data-accion="agregar-proceso">Agregar un proceso</button>
        <button type="button" class="boton" data-accion="procesos-habituales">Agregar los procesos habituales</button>
      </div>
    </section>

    <form class="entrevista" data-form="entrevista">${bloques}</form>`,
  );
}

// ─── documentos ──────────────────────────────────────────────────────────

function filaPlantilla(org: Organizacion, p: Plantilla): string {
  const d = org.documentos.find((x) => x.id === p.id);
  const estado = estadoDoc(d);
  const marcas = d ? contarFaltantes(d.contenido) : 0;
  return `<tr>
    <td class="mono">${esc(codigoDe(p, plantillas))}</td>
    <td><a href="${href(org, `/documento/${encodeURIComponent(p.id)}`)}">${esc(p.titulo)}</a><p class="tenue pequeno">${esc(p.sirvePara)}</p></td>
    <td><span class="chip doc-${estado}">${ROTULO_DOC[estado]}</span>${d ? ` <span class="mono tenue pequeno">v${d.version}</span>` : ''}</td>
    <td class="mono">${d ? (marcas ? `<span class="marcas">${marcas} por completar</span>` : 'sin marcas') : '—'}</td>
    <td>${d ? `<a class="boton chico" href="${href(org, `/documento/${encodeURIComponent(p.id)}`)}">Abrir</a>` : `<button type="button" class="boton chico primario" data-accion="generar" data-id="${esc(p.id)}">Generar</button>`}</td>
  </tr>`;
}

const cabecera = '<thead><tr><th>Código</th><th>Documento</th><th>Estado</th><th>Marcas</th><th></th></tr></thead>';

export function vistaDocumentos(org: Organizacion): string {
  const todas = plantillasDe(org);
  const sistema = todas.filter((p) => p.cubre.length > 0);
  const forms = todas.filter((p) => p.cubre.length === 0);
  const aprobados = sistema.filter((p) => org.documentos.find((d) => d.id === p.id)?.estado === 'aprobado').length;
  const sinGenerar = todas.filter((p) => !org.documentos.some((d) => d.id === p.id)).length;
  const ent = avanceEntrevista(org);
  const excl = plantillasExcluidas(org);

  return marco(
    org,
    'documentos',
    `<header class="titulo-vista">
      <h1>Documentos</h1>
      <p class="tenue">Un documento dice cómo se hace algo. Cuenta como evidencia cuando está <strong>aprobado</strong> y sin marcas pendientes: un borrador es un intento, no un documento del sistema.</p>
      ${progreso(aprobados, sistema.length, 'Documentos aprobados')}
      <p class="mono tenue">${aprobados} de ${sistema.length} documentos del sistema aprobados</p>
      ${ent.porcentaje < 100 ? `<p class="aviso">La entrevista está al ${ent.porcentaje} %. Los documentos que generes ahora tendrán más marcas ⟦COMPLETAR⟧ — <a href="${href(org, '/entrevista')}">completar la entrevista</a> antes ahorra trabajo.</p>` : ''}
      <div class="acciones no-imprimir">
        <button type="button" class="boton primario" data-accion="generar-todos"${sinGenerar ? '' : ' disabled'}>Generar los ${sinGenerar} que faltan</button>
        <button type="button" class="boton" data-accion="descargar-todos"${org.documentos.length ? '' : ' disabled'}>Descargar todos (.md)</button>
      </div>
    </header>

    <section><h2>Documentos del sistema</h2><div class="tabla-doc"><table>${cabecera}<tbody>${sistema.map((p) => filaPlantilla(org, p)).join('')}</tbody></table></div></section>

    <section><h2>Formularios</h2>
      <p class="tenue">Son el papel en blanco. Un formulario sin completar no es un registro: el registro nace cuando alguien lo completa, lo firma y lo carga como evidencia.</p>
      <div class="tabla-doc"><table>${cabecera}<tbody>${forms.map((p) => filaPlantilla(org, p)).join('')}</tbody></table></div></section>

    ${
      excl.length
        ? `<section><h2>Excluidos</h2>${excl.map((x) => `<div class="aviso"><strong>${esc(x.plantilla.titulo)}</strong> — ${esc(x.motivo)}</div>`).join('')}</section>`
        : ''
    }`,
  );
}

export function vistaDocumento(org: Organizacion, plantillaId: string): string {
  const p = plantilla(plantillaId);
  if (!p) return marco(org, 'documentos', '<p class="aviso-rojo">Ese documento no existe.</p>');
  const d = org.documentos.find((x) => x.id === p.id);

  if (!d) {
    return marco(
      org,
      'documentos',
      `<header class="titulo-vista"><a class="volver" href="${href(org, '/documentos')}">← Documentos</a><h1>${esc(p.titulo)}</h1><p class="tenue">${esc(p.sirvePara)}</p></header>
       <p class="vacio">Todavía no se generó. Se arma con lo que contaste en la entrevista.</p>
       <button type="button" class="boton primario" data-accion="generar" data-id="${esc(p.id)}">Generar</button>`,
    );
  }

  const motivo = puedeAprobar(d);
  const marcas = contarFaltantes(d.contenido);
  const esFormulario = p.cubre.length === 0;
  const aprobacion = esFormulario
    ? '<p class="tenue">Un formulario no se aprueba como evidencia: es el papel en blanco.</p>'
    : d.estado === 'aprobado'
      ? `<p class="aprobado">Aprobado por <strong>${esc(d.aprobadoPor ?? '')}</strong> el ${esc(d.fechaAprobacion ?? '')}. Si lo editás, pierde la aprobación: lo que se firmó era otro texto.</p>`
      : motivo
        ? `<p class="nota">No se puede aprobar todavía: ${esc(motivo)}</p>`
        : `<form class="formulario en-linea" data-form="aprobar"><label>Aprueba <input name="quien" required maxlength="200" placeholder="Nombre y cargo"></label><button class="boton primario" type="submit">Aprobar</button></form>`;

  const versiones = d.historial.length
    ? `<form class="formulario en-linea" data-form="restaurar"><label>Volver a la versión <select name="version">${d.historial
        .slice()
        .reverse()
        .map((h) => `<option value="${h.version}">v${h.version} · ${esc(h.fecha)} · ${esc(h.nota)}</option>`)
        .join('')}</select></label><button class="boton" type="submit">Restaurar como versión nueva</button></form>`
    : '<p class="tenue">Todavía no hay versiones anteriores.</p>';

  const estado = d.estado;
  return marco(
    org,
    'documentos',
    `<header class="titulo-vista">
      <a class="volver no-imprimir" href="${href(org, '/documentos')}">← Documentos</a>
      <h1>${esc(p.titulo)} <span class="chip doc-${estado}">${ROTULO_DOC[estado]}</span> <span class="mono tenue">v${d.version}</span></h1>
      <p class="tenue">${esc(TIPOS_DOC[p.tipo])} ${esc(codigoDe(p, plantillas))} · ${esc(p.sirvePara)}</p>
    </header>

    <div class="barra-doc no-imprimir">
      <span id="estado-marcas" class="${marcas ? 'marcas' : 'tenue'}">${marcas ? `${marcas} marca${marcas === 1 ? '' : 's'} por completar` : 'Sin marcas pendientes'}</span>
      <span id="sin-guardar" class="sin-guardar" hidden>Cambios sin guardar</span>
      <span class="espacio"></span>
      <button type="button" class="boton" data-accion="guardar-doc" data-id="${esc(p.id)}">Guardar versión</button>
      ${!esFormulario && d.estado === 'borrador' ? `<button type="button" class="boton" data-accion="revision" data-id="${esc(p.id)}">Pasar a revisión</button>` : ''}
      <button type="button" class="boton" data-accion="regenerar" data-id="${esc(p.id)}"${fueEditado(d) ? ' data-editado="1"' : ''}>Regenerar desde la entrevista</button>
      <button type="button" class="boton" data-accion="descargar-doc" data-id="${esc(p.id)}">Descargar .md</button>
      <button type="button" class="boton" data-accion="imprimir">Imprimir o guardar PDF</button>
    </div>

    <div class="editor-doble">
      <div class="no-imprimir"><label class="rotulo" for="editor">Texto (Markdown)</label>
        <textarea id="editor" class="editor" spellcheck="true" data-id="${esc(p.id)}" aria-describedby="ayuda-editor">${esc(d.contenido)}</textarea>
        <p id="ayuda-editor" class="ayuda">Reemplazá cada ⟦COMPLETAR: …⟧ por el dato real. Las tablas se editan entre barras <code>| así |</code>.</p></div>
      <article id="vista" class="doc" aria-label="Vista previa">${renderizar(d.contenido)}</article>
    </div>

    <section class="no-imprimir"><h2>Aprobación</h2>${aprobacion}</section>
    <section class="no-imprimir"><h2>Versiones</h2>${versiones}</section>`,
  );
}

// ─── evidencia ───────────────────────────────────────────────────────────

export interface FiltroEvidencia {
  norma: Norma | 'todas';
  estado: Estado | 'todos' | 'pendientes';
}

const TIPO_ROTULO = { documento: 'Documento', registro: 'Registro' } as const;

function filaEvidencia(org: Organizacion, c: Cobertura, e: Cobertura['requisito']['evidencias'][number]): string {
  const faltante = c.faltan.includes(e.clave);
  const aporta = c.aportan[e.clave] ?? [];
  const caduca = c.caducas.filter((x) => x.tipo === e.tipo && (x.claves === undefined || x.claves.includes(e.clave)));
  let estado: string;
  let accion = '';
  if (!faltante) {
    estado = `<span class="ok">Vigente</span> <span class="tenue pequeno">${esc(aporta.map((a) => a.titulo).join(', '))}</span>`;
  } else if (caduca.length) {
    estado = `<span class="vence">Vencida</span> <span class="tenue pequeno">${esc(caduca.map((a) => `${a.titulo} (${a.fecha})`).join(', '))}</span>`;
  } else {
    estado = '<span class="falta-txt">Falta</span>';
  }
  if (faltante) {
    if (e.tipo === 'registro') {
      accion = `<button type="button" class="boton chico" data-accion="abrir-registro" data-requisito="${esc(c.requisito.id)}" data-clave="${esc(e.clave)}" data-titulo="${esc(e.descripcion)}">Cargar registro</button>`;
    } else {
      const p = plantillas.find((x) => cubreDe(x.id).some((cu) => cu.requisito === c.requisito.id && cu.claves.includes(e.clave)));
      accion = p ? `<a class="boton chico" href="${href(org, `/documento/${encodeURIComponent(p.id)}`)}">Ir a «${esc(p.titulo)}»</a>` : '';
    }
  }
  return `<li class="ev"><span class="tipo ${e.tipo}">${TIPO_ROTULO[e.tipo]}</span><div class="ev-cuerpo"><p>${esc(e.descripcion)}</p><p class="pequeno">${estado}${e.vigenciaMeses ? ` <span class="tenue">· vigencia ${e.vigenciaMeses} meses</span>` : ''}</p></div><div class="ev-accion no-imprimir">${accion}</div></li>`;
}

export function vistaEvidencia(org: Organizacion, hoy: Date, filtro: FiltroEvidencia): string {
  const todas = coberturaDe(org, hoy, cubreDe);
  const orden = [...ordenarHallazgos(todas), ...todas.filter((c) => c.estado === 'cubierto')];
  const visibles = orden.filter(
    (c) =>
      (filtro.norma === 'todas' || c.requisito.normas.includes(filtro.norma)) &&
      (filtro.estado === 'todos' || (filtro.estado === 'pendientes' ? c.estado !== 'cubierto' : c.estado === filtro.estado)),
  );

  const selNorma = `<label>Norma <select data-filtro="norma"><option value="todas">Todas</option>${org.normas.map((n) => `<option value="${n}"${filtro.norma === n ? ' selected' : ''}>ISO ${n}</option>`).join('')}</select></label>`;
  const estados: [FiltroEvidencia['estado'], string][] = [['pendientes', 'Lo que falta'], ['todos', 'Todos'], ['cubierto', 'Cubiertos'], ['parcial', 'Parciales'], ['vencido', 'Vencidos'], ['sin_cubrir', 'Sin cubrir']];
  const selEstado = `<label>Mostrar <select data-filtro="estado">${estados.map(([v, t]) => `<option value="${v}"${filtro.estado === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;

  const tarjetas = visibles
    .map(
      (c) => `<article class="req">
        <header><h3><span class="mono">${esc(c.requisito.clausula)}</span> ${esc(c.requisito.titulo)}</h3>
          <span class="chip ${c.estado}">${ROTULO_ESTADO[c.estado]}</span>${c.clase ? ` <span class="clase ${c.clase}" title="Propuesta del sistema: la decide el auditor">${c.clase}</span>` : ''}${c.porVencer ? ' <span class="chip por-vencer">Por vencer</span>' : ''}</header>
        <p class="tenue pequeno">${esc(c.motivo)}${c.requisito.normas.length < 3 ? '' : ' · Común a las tres normas'}</p>
        <ul class="evs">${c.requisito.evidencias.map((e) => filaEvidencia(org, c, e)).join('')}</ul>
      </article>`,
    )
    .join('');

  const registros = org.registros.length
    ? `<table><thead><tr><th>Fecha</th><th>Registro</th><th>Requisito</th><th>Responsable</th><th></th></tr></thead><tbody>${org.registros
        .slice()
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((r) => {
          const req = requisitos.find((x) => x.id === r.cubre[0]);
          return `<tr><td class="mono">${esc(r.fecha)}</td><td>${esc(r.titulo)}</td><td>${req ? `${esc(req.clausula)} ${esc(req.titulo)}` : '—'}</td><td>${esc(r.responsable)}</td><td><button type="button" class="boton chico peligro" data-accion="borrar-registro" data-id="${esc(r.id)}">Quitar</button></td></tr>`;
        })
        .join('')}</tbody></table>`
    : '<p class="vacio">Todavía no cargaste ningún registro.</p>';

  return marco(
    org,
    'evidencia',
    `<header class="titulo-vista">
      <h1>Evidencia</h1>
      <p class="tenue">Un requisito está cubierto sólo si <strong>toda</strong> la evidencia que pide tiene un aporte vigente. Los documentos se cubren aprobándolos. Los registros prueban que algo <strong>se hizo</strong>: tienen fecha y caducan.</p>
      <div class="filtros no-imprimir">${selNorma}${selEstado}</div>
      <p class="mono tenue">${visibles.length} requisitos</p>
    </header>
    <section>${tarjetas || '<p class="vacio">Nada para mostrar con este filtro.</p>'}</section>
    <section><h2>Registros cargados</h2>${registros}</section>
    <dialog id="dlg-registro" class="dialogo">
      <form method="dialog" class="formulario" data-form="registro">
        <h2>Cargar un registro</h2>
        <p class="tenue pequeno">Un registro prueba que algo se hizo. Cargalo cuando exista el papel firmado, no antes.</p>
        <input type="hidden" name="requisito"><input type="hidden" name="clave">
        <label>Qué registro es<input name="titulo" required maxlength="300"></label>
        <label>Fecha en que se hizo<input name="fecha" type="date" required max="${esc(isoLocal(hoy))}"></label>
        <label>Responsable<input name="responsable" maxlength="200"></label>
        <label>Proceso<input name="proceso" maxlength="200"></label>
        <div class="acciones"><button class="boton primario" type="submit">Cargar</button><button class="boton" type="button" data-accion="cerrar-dialogo">Cancelar</button></div>
      </form>
    </dialog>`,
  );
}

// ─── datos ───────────────────────────────────────────────────────────────

export function vistaDatos(org: Organizacion): string {
  const rubros = Object.entries(RUBROS)
    .map(([k, v]) => `<option value="${k}"${org.rubro === k ? ' selected' : ''}>${esc(v)}</option>`)
    .join('');
  const normas = (Object.keys(NORMAS) as Norma[])
    .map((n) => `<label class="opcion"><input type="checkbox" name="normas" value="${n}"${org.normas.includes(n) ? ' checked' : ''}> ${esc(NORMAS[n].sigla)} <span class="tenue">${esc(NORMAS[n].nombre)}</span></label>`)
    .join('');

  return marco(
    org,
    'datos',
    `<header class="titulo-vista"><h1>Datos de la organización</h1><p class="tenue">Se guardan al apretar el botón.</p></header>
    <form class="formulario" data-form="datos">
      <label>Nombre<input name="nombre" required maxlength="200" value="${esc(org.nombre)}"></label>
      <label>Rubro<select name="rubro">${rubros}</select></label>
      <label>Cantidad de personas<input name="empleados" type="number" min="0" max="1000000" value="${org.empleados}"></label>
      <label>Sedes<input name="sedes" maxlength="2000" value="${esc(org.sedes)}"></label>
      <label>Alcance del sistema de gestión
        <textarea name="alcance" rows="4" maxlength="5000">${esc(org.alcance)}</textarea>
        <span class="ayuda">Qué procesos, sitios y actividades entran, y qué queda afuera con su justificación. Es lo primero que lee un auditor.</span></label>
      <fieldset class="opciones"><legend>Normas a certificar</legend>${normas}
        <span class="ayuda">Quitar una norma no borra sus documentos: dejan de contar para la ruta.</span></fieldset>
      <div class="acciones"><button class="boton primario" type="submit">Guardar</button></div>
    </form>

    <section><h2>Respaldo de esta organización</h2>
      <div class="acciones"><button type="button" class="boton" data-accion="exportar-una">Exportar esta organización</button></div></section>

    <section><h2>Zona de riesgo</h2>
      <p class="tenue">Borrar la organización elimina sus respuestas, documentos y registros de este navegador. No se puede deshacer: exportá un respaldo antes.</p>
      <div class="acciones"><button type="button" class="boton peligro" data-accion="borrar-org">Borrar esta organización</button></div></section>`,
  );
}

/** Nombres de las áreas del corpus, para el atajo de "procesos habituales". */
export const procesosHabituales = (): string[] => [...areasCorpus];

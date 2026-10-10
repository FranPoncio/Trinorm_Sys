/**
 * El controlador de la herramienta: rutas, guardado y acciones.
 *
 * Toda la lógica de negocio está en `src/lib/sgi/` y las pantallas en
 * `vistas.ts`. Acá sólo se conecta: se lee el hash, se dibuja la vista que
 * corresponde y se atienden los clics.
 *
 * DOS COSAS QUE IMPORTAN:
 *
 *  - Lo que se escribe en la entrevista se guarda solo, con un pequeño
 *    retraso para no escribir en cada tecla. Ese retraso es un riesgo (si se
 *    cierra la pestaña antes, se pierde lo último), así que se fuerza el
 *    guardado antes de cambiar de pantalla y al ocultar la página.
 *
 *  - El editor de un documento NO guarda solo: cada guardado crea una
 *    versión, y una versión por tecla no sirve de historial. Por eso avisa
 *    cuando hay cambios sin guardar y frena si se intenta salir.
 */

import { choques, crearAlmacen, exportar, importar } from '../lib/sgi/almacen.ts';
import type { Almacen, StorageLike } from '../lib/sgi/almacen.ts';
import { organizacionEjemplo } from '../lib/sgi/ejemplo.ts';
import { aprobar, contarFaltantes, editar, enRevision, nuevoDocumento, redactar, regenerar, restaurar, codigoDe } from '../lib/sgi/generador.ts';
import { renderizar } from '../lib/sgi/markdown.ts';
import type { Norma } from '../lib/sgi/modelo.ts';
import { comoUrl } from '../lib/sgi/normas.ts';
import { NORMAS_VALIDAS, RUBROS, esFechaISO, isoLocal, nuevaOrganizacion, nuevoId, nuevoProceso } from '../lib/sgi/organizacion.ts';
import type { Hito, Organizacion, Rubro } from '../lib/sgi/organizacion.ts';
import { plantilla, plantillas, plantillasDe } from '../lib/sgi/plantillas.ts';
import { quitarHito, registrarHito } from '../lib/sgi/ruta.ts';
import { avanceHtml, procesosHabituales, vistaDatos, vistaDocumento, vistaDocumentos, vistaEntrevista, vistaEvidencia, vistaInicio, vistaPanel } from './vistas.ts';
import type { FiltroEvidencia } from './vistas.ts';

// ─── almacenamiento ──────────────────────────────────────────────────────

/** Si el navegador no deja usar localStorage, se sigue en memoria y se avisa. */
function memoriaTemporal(): StorageLike {
  const datos = new Map<string, string>();
  return {
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

let persistente = true;
function abrirAlmacen(): Almacen {
  try {
    const prueba = '__trinorm_prueba__';
    window.localStorage.setItem(prueba, '1');
    window.localStorage.removeItem(prueba);
    return crearAlmacen(window.localStorage);
  } catch {
    persistente = false;
    return crearAlmacen(memoriaTemporal());
  }
}

const almacen = abrirAlmacen();
const raiz = document.getElementById('raiz')!;
const zonaAviso = document.getElementById('aviso')!;

// ─── estado ──────────────────────────────────────────────────────────────

let org: Organizacion | undefined;
let filtro: FiltroEvidencia = { norma: 'todas', estado: 'pendientes' };
let sinGuardar = false;
let hashPrevio = location.hash || '#/';
let volviendo = false;
const hoy = () => new Date();

// ─── avisos ──────────────────────────────────────────────────────────────

let temporizadorAviso: number | undefined;
function aviso(texto: string, tipo: 'ok' | 'error' = 'ok'): void {
  zonaAviso.textContent = texto;
  zonaAviso.className = `aviso-flotante ${tipo}`;
  zonaAviso.hidden = false;
  window.clearTimeout(temporizadorAviso);
  temporizadorAviso = window.setTimeout(() => (zonaAviso.hidden = true), tipo === 'error' ? 10000 : 4500);
}

const mensaje = (e: unknown): string => (e instanceof Error ? e.message : 'Algo salió mal.');

// ─── guardado ────────────────────────────────────────────────────────────

/** Aplica un cambio, lo guarda y devuelve si salió bien. Si falla, avisa y no cambia nada. */
function mutar(cambio: (o: Organizacion) => Organizacion): boolean {
  if (!org) return false;
  try {
    const nueva = { ...cambio(org), actualizada: isoLocal(hoy()) };
    almacen.guardar(nueva);
    org = nueva;
    return true;
  } catch (e) {
    aviso(mensaje(e), 'error');
    return false;
  }
}

/** Guardado diferido de la entrevista. */
let pendiente: (() => void) | undefined;
let temporizadorGuardado: number | undefined;
function guardarLuego(cambio: (o: Organizacion) => Organizacion): void {
  const anterior = pendiente;
  pendiente = () => {
    anterior?.();
    mutar(cambio);
  };
  window.clearTimeout(temporizadorGuardado);
  temporizadorGuardado = window.setTimeout(vaciarPendiente, 350);
}
function vaciarPendiente(): void {
  window.clearTimeout(temporizadorGuardado);
  const f = pendiente;
  pendiente = undefined;
  f?.();
}

window.addEventListener('pagehide', vaciarPendiente);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && vaciarPendiente());
window.addEventListener('beforeunload', (e) => {
  vaciarPendiente();
  if (sinGuardar) {
    // `returnValue` está deprecado pero Safari todavía lo exige para mostrar el aviso.
    e.preventDefault();
    Object.assign(e, { returnValue: '' });
  }
});

// ─── rutas ───────────────────────────────────────────────────────────────

type Ruta =
  | { vista: 'inicio' }
  | { vista: 'org'; id: string; seccion: 'panel' | 'entrevista' | 'documentos' | 'evidencia' | 'datos' }
  | { vista: 'doc'; id: string; plantilla: string };

function leerRuta(): Ruta {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] !== 'o' || !partes[1]) return { vista: 'inicio' };
  const [, id, seccion, extra] = partes;
  if (seccion === 'documento' && extra) return { vista: 'doc', id, plantilla: extra };
  if (seccion === 'entrevista' || seccion === 'documentos' || seccion === 'evidencia' || seccion === 'datos') return { vista: 'org', id, seccion };
  return { vista: 'org', id, seccion: 'panel' };
}

function render(): void {
  const r = leerRuta();
  let html: string;
  let titulo = 'Mis organizaciones';

  if (r.vista === 'inicio') {
    org = undefined;
    const { organizaciones, descartadas } = almacen.listar();
    html = vistaInicio(organizaciones, descartadas, hoy());
  } else {
    if (!org || org.id !== r.id) org = almacen.obtener(r.id);
    if (!org) {
      html = '<div class="aviso-rojo" role="alert">Esa organización no existe en este navegador. <a href="#/">Volver a la lista</a>.</div>';
    } else {
      titulo = org.nombre;
      if (r.vista === 'doc') html = vistaDocumento(org, r.plantilla);
      else if (r.seccion === 'entrevista') html = vistaEntrevista(org);
      else if (r.seccion === 'documentos') html = vistaDocumentos(org);
      else if (r.seccion === 'evidencia') html = vistaEvidencia(org, hoy(), filtro);
      else if (r.seccion === 'datos') html = vistaDatos(org);
      else html = vistaPanel(org, hoy());
    }
  }

  const scroll = window.scrollY;
  raiz.innerHTML = html;
  document.title = `${titulo} · SGI Trinorma`;
  sinGuardar = false;
  const h1 = raiz.querySelector<HTMLElement>('h1');
  if (h1 && !mismaVista) {
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, scroll);
  }
  mismaVista = false;
}

/** Re-dibujar tras una acción: se queda en el mismo lugar en vez de saltar arriba. */
let mismaVista = false;
function redibujar(): void {
  mismaVista = true;
  render();
}

window.addEventListener('hashchange', () => {
  if (volviendo) {
    volviendo = false;
    return;
  }
  if (sinGuardar && !window.confirm('Tenés cambios sin guardar en el documento. ¿Salir y perderlos?')) {
    volviendo = true;
    location.hash = hashPrevio;
    return;
  }
  vaciarPendiente();
  hashPrevio = location.hash || '#/';
  render();
});

// ─── descargas ───────────────────────────────────────────────────────────

function descargar(nombre: string, contenido: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const nombreArchivo = (o: Organizacion, resto: string): string => `${comoUrl(o.nombre) || 'organizacion'}-${resto}`;

// ─── acciones ────────────────────────────────────────────────────────────

function generar(id: string): boolean {
  const p = plantilla(id);
  if (!org || !p) return false;
  if (!plantillasDe(org).some((x) => x.id === p.id)) {
    aviso('Ese documento no corresponde a esta organización.', 'error');
    return false;
  }
  const o = org;
  return mutar((x) => ({ ...x, documentos: [...x.documentos.filter((d) => d.id !== p.id), nuevoDocumento(p, redactar(p, o, plantillas, hoy()))] }));
}

function documentoActual(id: string) {
  return org?.documentos.find((d) => d.id === id);
}

const acciones: Record<string, (el: HTMLElement) => void> = {
  'cargar-ejemplo': () => {
    const ej = organizacionEjemplo(hoy(), nuevoId());
    try {
      almacen.guardar(ej);
    } catch (e) {
      return aviso(mensaje(e), 'error');
    }
    location.hash = `#/o/${ej.id}`;
  },

  'exportar-todo': () => {
    const { organizaciones } = almacen.listar();
    descargar(`trinorm-respaldo-${isoLocal(hoy())}.json`, exportar(organizaciones, hoy()), 'application/json');
    aviso(`Respaldo de ${organizaciones.length} organización${organizaciones.length === 1 ? '' : 'es'} descargado.`);
  },

  'exportar-una': () => {
    if (!org) return;
    descargar(nombreArchivo(org, `respaldo-${isoLocal(hoy())}.json`), exportar([org], hoy()), 'application/json');
  },

  'borrar-org': () => {
    if (!org) return;
    if (!window.confirm(`¿Borrar «${org.nombre}» de este navegador? No se puede deshacer.`)) return;
    almacen.borrar(org.id);
    org = undefined;
    location.hash = '#/';
  },

  'agregar-proceso': () => {
    vaciarPendiente();
    if (mutar((o) => ({ ...o, procesos: [...o.procesos, nuevoProceso()] }))) redibujar();
  },

  'procesos-habituales': () => {
    vaciarPendiente();
    const existentes = new Set(org?.procesos.map((p) => p.nombre.trim().toLowerCase()));
    const nuevos = procesosHabituales().filter((n) => !existentes.has(n.toLowerCase())).map((n) => nuevoProceso(n));
    if (nuevos.length === 0) return aviso('Ya están todos los procesos habituales.');
    if (mutar((o) => ({ ...o, procesos: [...o.procesos, ...nuevos] }))) redibujar();
  },

  'quitar-proceso': (el) => {
    vaciarPendiente();
    const id = el.dataset.id;
    if (window.confirm('¿Quitar este proceso?') && mutar((o) => ({ ...o, procesos: o.procesos.filter((p) => p.id !== id) }))) redibujar();
  },

  generar: (el) => {
    if (generar(el.dataset.id ?? '')) {
      aviso('Documento generado. Revisá las marcas ⟦COMPLETAR⟧.');
      redibujar();
    }
  },

  'generar-todos': () => {
    if (!org) return;
    let n = 0;
    for (const p of plantillasDe(org)) {
      if (!org.documentos.some((d) => d.id === p.id) && generar(p.id)) n++;
    }
    aviso(`${n} documento${n === 1 ? '' : 's'} generado${n === 1 ? '' : 's'}.`);
    redibujar();
  },

  'guardar-doc': (el) => {
    const id = el.dataset.id ?? '';
    const d = documentoActual(id);
    const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
    if (!d || !editor) return;
    const nuevo = editar(d, editor.value, hoy());
    if (nuevo === d) return aviso('No hay cambios para guardar.');
    if (d.estado === 'aprobado' && !window.confirm('Este documento está aprobado. Si lo guardás con cambios, pierde la aprobación. ¿Seguir?')) return;
    if (mutar((o) => ({ ...o, documentos: o.documentos.map((x) => (x.id === id ? nuevo : x)) }))) {
      aviso(`Versión ${nuevo.version} guardada.`);
      redibujar();
    }
  },

  revision: (el) => {
    const id = el.dataset.id ?? '';
    if (sinGuardar) return aviso('Guardá la versión antes de pasar a revisión.', 'error');
    if (mutar((o) => ({ ...o, documentos: o.documentos.map((d) => (d.id === id ? enRevision(d) : d)) }))) redibujar();
  },

  regenerar: (el) => {
    const id = el.dataset.id ?? '';
    const d = documentoActual(id);
    const p = plantilla(id);
    if (!org || !d || !p) return;
    const aviso0 = el.dataset.editado || sinGuardar ? ' Tus ediciones quedan guardadas en el historial, pero el texto actual se reemplaza.' : '';
    if (!window.confirm(`Se vuelve a escribir el documento con las respuestas actuales de la entrevista.${aviso0} ¿Seguir?`)) return;
    const nuevo = regenerar(d, redactar(p, org, plantillas, hoy()), hoy());
    if (mutar((o) => ({ ...o, documentos: o.documentos.map((x) => (x.id === id ? nuevo : x)) }))) {
      aviso('Documento regenerado.');
      redibujar();
    }
  },

  'descargar-doc': (el) => {
    const d = documentoActual(el.dataset.id ?? '');
    const p = plantilla(el.dataset.id ?? '');
    if (!d || !p || !org) return;
    // Si hay cambios sin guardar se descarga lo que se ve, no lo último guardado.
    const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
    descargar(`${codigoDe(p, plantillas)}-${comoUrl(p.titulo)}.md`, editor?.value ?? d.contenido, 'text/markdown');
  },

  'descargar-todos': () => {
    if (!org) return;
    const orden = plantillas.filter((p) => org!.documentos.some((d) => d.id === p.id));
    const todo = orden.map((p) => org!.documentos.find((d) => d.id === p.id)!.contenido.trim()).join('\n\n---\n\n');
    descargar(nombreArchivo(org, 'documentos.md'), `${todo}\n`, 'text/markdown');
  },

  imprimir: () => window.print(),

  'abrir-registro': (el) => {
    const dlg = document.getElementById('dlg-registro') as HTMLDialogElement | null;
    if (!dlg) return;
    const f = dlg.querySelector('form')!;
    (f.elements.namedItem('requisito') as HTMLInputElement).value = el.dataset.requisito ?? '';
    (f.elements.namedItem('clave') as HTMLInputElement).value = el.dataset.clave ?? '';
    (f.elements.namedItem('titulo') as HTMLInputElement).value = el.dataset.titulo ?? '';
    (f.elements.namedItem('fecha') as HTMLInputElement).value = isoLocal(hoy());
    dlg.showModal();
  },

  'cerrar-dialogo': () => (document.getElementById('dlg-registro') as HTMLDialogElement | null)?.close(),

  'borrar-registro': (el) => {
    if (window.confirm('¿Quitar este registro?') && mutar((o) => ({ ...o, registros: o.registros.filter((r) => r.id !== el.dataset.id) }))) redibujar();
  },
};

// ─── formularios ─────────────────────────────────────────────────────────

const texto = (f: FormData, k: string): string => String(f.get(k) ?? '').trim();
const normasDe = (f: FormData): Norma[] => f.getAll('normas').map(String).filter((n): n is Norma => NORMAS_VALIDAS.includes(n as Norma));
const rubroDe = (f: FormData): Rubro => (texto(f, 'rubro') in RUBROS ? (texto(f, 'rubro') as Rubro) : 'otro');
const enteroDe = (f: FormData, k: string): number => Math.max(0, Math.min(1_000_000, Math.floor(Number(texto(f, k))) || 0));

const formularios: Record<string, (f: FormData, el: HTMLFormElement) => void> = {
  nueva: (f) => {
    const nombre = texto(f, 'nombre');
    if (!nombre) return aviso('Falta el nombre.', 'error');
    const nueva = nuevaOrganizacion({ nombre, rubro: rubroDe(f), empleados: enteroDe(f, 'empleados'), sedes: texto(f, 'sedes'), normas: normasDe(f) }, hoy());
    try {
      almacen.guardar(nueva);
    } catch (e) {
      return aviso(mensaje(e), 'error');
    }
    location.hash = `#/o/${nueva.id}`;
  },

  datos: (f) => {
    const nombre = texto(f, 'nombre');
    if (!nombre) return aviso('Falta el nombre.', 'error');
    if (mutar((o) => ({ ...o, nombre, rubro: rubroDe(f), empleados: enteroDe(f, 'empleados'), sedes: texto(f, 'sedes'), alcance: texto(f, 'alcance'), normas: normasDe(f) }))) {
      aviso('Datos guardados.');
      redibujar();
    }
  },

  aprobar: (f) => {
    const id = leerRuta().vista === 'doc' ? (leerRuta() as { plantilla: string }).plantilla : '';
    const d = documentoActual(id);
    if (!d) return;
    if (sinGuardar) return aviso('Guardá la versión antes de aprobar: se aprueba lo que está guardado.', 'error');
    try {
      const aprobado = aprobar(d, texto(f, 'quien'), hoy());
      if (mutar((o) => ({ ...o, documentos: o.documentos.map((x) => (x.id === id ? aprobado : x)) }))) {
        aviso('Documento aprobado. Ya cuenta como evidencia.');
        redibujar();
      }
    } catch (e) {
      aviso(mensaje(e), 'error');
    }
  },

  restaurar: (f) => {
    const id = leerRuta().vista === 'doc' ? (leerRuta() as { plantilla: string }).plantilla : '';
    const d = documentoActual(id);
    const nuevo = d && restaurar(d, Number(texto(f, 'version')), hoy());
    if (!nuevo) return aviso('Esa versión no existe.', 'error');
    if (mutar((o) => ({ ...o, documentos: o.documentos.map((x) => (x.id === id ? nuevo : x)) }))) {
      aviso(`Restaurada como versión ${nuevo.version}.`);
      redibujar();
    }
  },

  registro: (f) => {
    const fecha = texto(f, 'fecha');
    const titulo = texto(f, 'titulo');
    if (!titulo) return aviso('Falta qué registro es.', 'error');
    if (!esFechaISO(fecha)) return aviso('La fecha no es válida.', 'error');
    if (fecha > isoLocal(hoy())) return aviso('Un registro no puede tener fecha futura: se carga cuando existe.', 'error');
    const ok = mutar((o) => ({
      ...o,
      registros: [...o.registros, { id: nuevoId(), titulo, tipo: 'registro', cubre: [texto(f, 'requisito')], claves: [texto(f, 'clave')], fecha, proceso: texto(f, 'proceso'), responsable: texto(f, 'responsable') }],
    }));
    if (ok) {
      (document.getElementById('dlg-registro') as HTMLDialogElement | null)?.close();
      aviso('Registro cargado.');
      redibujar();
    }
  },

  'hito-registrar': (f, el) => {
    const hito = el.dataset.hito as Hito;
    const fecha = texto(f, 'fecha');
    try {
      const nueva = registrarHito(org!, hito, fecha, hoy());
      if (mutar(() => nueva)) redibujar();
    } catch (e) {
      aviso(mensaje(e), 'error');
    }
  },

  'hito-quitar': (_f, el) => {
    try {
      const nueva = quitarHito(org!, el.dataset.hito as Hito);
      if (mutar(() => nueva)) redibujar();
    } catch (e) {
      aviso(mensaje(e), 'error');
    }
  },

  entrevista: () => {},
};

// ─── eventos ─────────────────────────────────────────────────────────────

raiz.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-accion]');
  if (!el || el instanceof HTMLInputElement) return;
  acciones[el.dataset.accion ?? '']?.(el);
});

raiz.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  const nombre = form.dataset.form;
  if (!nombre || !(nombre in formularios)) return;
  e.preventDefault();
  formularios[nombre](new FormData(form), form);
});

/** Entrevista, procesos y editor: se reflejan mientras se escribe. */
function alEscribir(e: Event): void {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  const filtroSel = el.closest<HTMLElement>('[data-filtro]');
  if (filtroSel && e.type === 'change') {
    const que = filtroSel.dataset.filtro;
    if (que === 'norma') filtro = { ...filtro, norma: el.value as FiltroEvidencia['norma'] };
    else filtro = { ...filtro, estado: el.value as FiltroEvidencia['estado'] };
    return redibujar();
  }

  if (el.id === 'editor') {
    const d = documentoActual(el.dataset.id ?? '');
    sinGuardar = !!d && el.value !== d.contenido;
    document.getElementById('vista')!.innerHTML = renderizar(el.value);
    const n = contarFaltantes(el.value);
    const estado = document.getElementById('estado-marcas');
    if (estado) {
      estado.textContent = n ? `${n} marca${n === 1 ? '' : 's'} por completar` : 'Sin marcas pendientes';
      estado.className = n ? 'marcas' : 'tenue';
    }
    const aviso0 = document.getElementById('sin-guardar');
    if (aviso0) aviso0.hidden = !sinGuardar;
    return;
  }

  const clave = el.dataset.clave;
  if (clave) {
    if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) return;
    const valor = el.value;
    guardarLuego((o) => ({ ...o, respuestas: { ...o.respuestas, [clave]: valor } }));
    // La barra de avance se actualiza al instante, aunque el guardado espere.
    if (org) {
      const provisoria = { ...org, respuestas: { ...org.respuestas, [clave]: valor } };
      const caja = document.getElementById('avance-entrevista');
      if (caja) caja.innerHTML = avanceHtml(provisoria);
    }
    return;
  }

  const campo = el.dataset.procesoCampo;
  const tarjeta = el.closest<HTMLElement>('[data-proceso]');
  if (campo && tarjeta) {
    const id = tarjeta.dataset.proceso;
    const valor = el.value;
    guardarLuego((o) => ({ ...o, procesos: o.procesos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) }));
    if (campo === 'nombre') tarjeta.querySelector('h4')!.textContent = valor || 'Proceso sin nombre';
  }
}
raiz.addEventListener('input', alEscribir);
raiz.addEventListener('change', (e) => {
  const el = e.target as HTMLElement;
  if (el instanceof HTMLInputElement && el.type === 'file' && el.dataset.accion === 'importar') return void alImportar(el);
  alEscribir(e);
});

function alImportar(el: HTMLInputElement): void {
  const archivo = el.files?.[0];
  el.value = '';
  if (!archivo) return;
  void archivo.text().then((t) => {
    try {
      const nuevas = importar(t);
      const { organizaciones } = almacen.listar();
      const pisadas = choques(organizaciones, nuevas);
      if (pisadas.length && !window.confirm(`${pisadas.length} organización${pisadas.length === 1 ? '' : 'es'} del respaldo ya existe${pisadas.length === 1 ? '' : 'n'} y se va a reemplazar con la del archivo: ${pisadas.map((o) => `«${o.nombre}»`).join(', ')}. ¿Seguir?`)) return;
      for (const o of nuevas) almacen.guardar(o);
      aviso(`${nuevas.length} organización${nuevas.length === 1 ? '' : 'es'} importada${nuevas.length === 1 ? '' : 's'}.`);
      redibujar();
    } catch (e) {
      aviso(`No se pudo importar: ${mensaje(e)}`, 'error');
    }
  });
}

// ─── arranque ────────────────────────────────────────────────────────────

if (!persistente) {
  const banda = document.getElementById('sin-almacen');
  if (banda) banda.hidden = false;
}
render();

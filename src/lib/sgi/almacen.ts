/**
 * Dónde viven los datos de las organizaciones: en el navegador de quien las
 * carga, y en ningún otro lado.
 *
 * Es una decisión, no una limitación. Los datos de un sistema de gestión son
 * del cliente o del empleador, y esta app es pública: guardarlos en un
 * servidor propio los pondría a cargo de alguien que no tiene derecho a
 * custodiarlos. Con el navegador no sale nada de la máquina de la persona.
 *
 * La contracara: si borra los datos del sitio, se pierden. Por eso el
 * respaldo (`exportar`) es parte del producto y no un adorno, y por eso la
 * interfaz lo ofrece de entrada.
 *
 * `Almacen` es una interfaz: si algún día los datos pasan a un servidor, la
 * app no cambia, cambia quién la implementa.
 */

import { validarOrganizacion } from './organizacion.ts';
import type { Organizacion } from './organizacion.ts';

/** Lo mínimo que se necesita de `localStorage`, para poder probarlo sin navegador. */
export interface StorageLike {
  readonly length: number;
  key(indice: number): string | null;
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

const PREFIJO = 'trinorm:org:';

/** Una entrada guardada que no se pudo leer. Se muestra: nunca se descarta en silencio. */
export interface Descartada {
  clave: string;
  motivo: string;
}

export interface Almacen {
  listar(): { organizaciones: Organizacion[]; descartadas: Descartada[] };
  obtener(id: string): Organizacion | undefined;
  /** Falla con un mensaje que se le puede mostrar a la persona. */
  guardar(org: Organizacion): void;
  borrar(id: string): void;
}

export function crearAlmacen(storage: StorageLike): Almacen {
  const claveDe = (id: string) => `${PREFIJO}${id}`;

  return {
    listar() {
      const organizaciones: Organizacion[] = [];
      const descartadas: Descartada[] = [];
      // Se juntan las claves antes de leer: tocar el storage mientras se
      // recorre por índice puede saltear entradas.
      const claves: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k?.startsWith(PREFIJO)) claves.push(k);
      }
      for (const clave of claves) {
        try {
          organizaciones.push(validarOrganizacion(JSON.parse(storage.getItem(clave) ?? 'null')));
        } catch (e) {
          // Una entrada rota no puede romper la lista de las demás.
          descartadas.push({ clave, motivo: e instanceof Error ? e.message : 'No se pudo leer.' });
        }
      }
      organizaciones.sort((a, b) => b.actualizada.localeCompare(a.actualizada) || a.nombre.localeCompare(b.nombre));
      return { organizaciones, descartadas };
    },

    obtener(id) {
      const crudo = storage.getItem(claveDe(id));
      if (crudo === null) return undefined;
      try {
        return validarOrganizacion(JSON.parse(crudo));
      } catch {
        return undefined;
      }
    },

    guardar(org) {
      try {
        storage.setItem(claveDe(org.id), JSON.stringify(org));
      } catch (e) {
        // Cuota llena, modo privado o almacenamiento bloqueado. En los tres
        // casos lo que importa es que la persona se entere ANTES de cerrar.
        const cuota = e instanceof Error && /quota/i.test(e.name + e.message);
        throw new Error(
          cuota
            ? 'No hay espacio en el navegador para guardar. Exportá un respaldo y borrá lo que no uses.'
            : 'El navegador no deja guardar datos (¿ventana privada o almacenamiento bloqueado?). Lo que cargues se va a perder al cerrar.',
        );
      }
    },

    borrar(id) {
      storage.removeItem(claveDe(id));
    },
  };
}

// ─── respaldo ────────────────────────────────────────────────────────────

export const FORMATO_RESPALDO = 'trinorm-respaldo';

/** Más que esto no es un respaldo: es otra cosa. Se rechaza antes de parsear. */
const MAX_RESPALDO = 25 * 1024 * 1024;

export function exportar(organizaciones: Organizacion[], hoy: Date): string {
  return JSON.stringify(
    { formato: FORMATO_RESPALDO, version: 1, exportado: hoy.toISOString(), organizaciones },
    null,
    2,
  );
}

/**
 * Lee un respaldo. Todo o nada: si una organización es inválida, no se
 * importa ninguna. Un respaldo a medias es peor que uno rechazado, porque
 * parece completo.
 */
export function importar(texto: string): Organizacion[] {
  if (texto.length > MAX_RESPALDO) throw new Error('El archivo es demasiado grande para ser un respaldo.');

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (typeof datos !== 'object' || datos === null) throw new Error('El archivo no tiene el formato de un respaldo.');

  const d = datos as Record<string, unknown>;
  if (d.formato !== FORMATO_RESPALDO) throw new Error('Este archivo no es un respaldo de esta aplicación.');
  if (d.version !== 1) throw new Error(`Versión de respaldo desconocida (${String(d.version)}).`);
  if (!Array.isArray(d.organizaciones)) throw new Error('El respaldo no trae organizaciones.');

  return d.organizaciones.map((o, i) => {
    try {
      return validarOrganizacion(o);
    } catch (e) {
      throw new Error(`Organización ${i + 1} del respaldo: ${e instanceof Error ? e.message : 'inválida'}`);
    }
  });
}

/** Ids del respaldo que ya existen. La interfaz avisa antes de pisarlos. */
export const choques = (existentes: Organizacion[], nuevas: Organizacion[]): Organizacion[] => {
  const ids = new Set(existentes.map((o) => o.id));
  return nuevas.filter((o) => ids.has(o.id));
};

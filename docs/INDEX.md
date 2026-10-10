# Índice de documentación de Trinorm_Sys

## Proyecto

- `README.md`: propósito, modelo de cobertura, estado y comandos.
- `CLAUDE.md`: contexto operativo y reglas existentes.

## Código

- `src/lib/sgi/modelo.ts`: tipos y motor puro de evaluación.
- `src/lib/sgi/normas.ts`: corpus propio de requisitos, preguntas y áreas.
- `src/lib/sgi/demo.ts`: datos de la empresa ficticia.
- `src/lib/sgi/vista.ts`: vistas compartidas entre build y navegador.
- `src/pages/`: páginas Astro y jornada de auditoría.
- `src/lib/sgi/organizacion.ts`, `entrevista.ts`, `generador.ts`, `plantillas.ts`,
  `ruta.ts`, `almacen.ts`, `markdown.ts`, `ejemplo.ts`: la herramienta (organización propia).
- `src/app/vistas.ts` y `src/app/main.ts`: sus pantallas y su controlador.
- `src/pages/app/index.astro`: la página de la herramienta.

## Qué consultar según la tarea

- Motor de cobertura: `src/lib/sgi/modelo.ts` y sus tests.
- Requisitos, evidencia o preguntas: `src/lib/sgi/normas.ts`.
- Datos de demo: `src/lib/sgi/demo.ts`.
- UI y rutas: `src/pages/` y `src/lib/sgi/vista.ts`.
- Preguntas de la entrevista: `src/lib/sgi/entrevista.ts`.
- Qué documentos se generan y cómo se redactan: `src/lib/sgi/plantillas.ts`.
- Qué sigue hasta certificar: `src/lib/sgi/ruta.ts`.
- Pantallas: `src/app/vistas.ts`. Qué pasa al hacer clic: `src/app/main.ts`.
- Pendientes: `CLAUDE.md`, sección "Estado".

## Reglas de negocio

- Documento y registro son conceptos diferentes.
- Evidencia vencida no equivale a evidencia inexistente.
- `evaluar()` debe seguir siendo determinista y explicable.
- No agregar texto protegido de las normas ISO; usar referencias y contenido propio.
- La demo usa una organización ficticia y no debe recibir datos reales sensibles.
- Nunca se inventa un dato de la organización: lo que falta queda como `⟦COMPLETAR⟧`.
- Un documento con marcas sin resolver no se aprueba; un borrador no es evidencia.
- Un formulario en blanco no es un registro.
- Los datos de la herramienta viven sólo en el navegador; no se mandan a ningún lado.

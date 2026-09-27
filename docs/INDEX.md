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

## Qué consultar según la tarea

- Motor de cobertura: `src/lib/sgi/modelo.ts` y sus tests.
- Requisitos, evidencia o preguntas: `src/lib/sgi/normas.ts`.
- Datos de demo: `src/lib/sgi/demo.ts`.
- UI y rutas: `src/pages/` y `src/lib/sgi/vista.ts`.
- Producto futuro: `README.md`, sección de pendientes.

## Reglas de negocio

- Documento y registro son conceptos diferentes.
- Evidencia vencida no equivale a evidencia inexistente.
- `evaluar()` debe seguir siendo determinista y explicable.
- No agregar texto protegido de las normas ISO; usar referencias y contenido propio.
- La demo usa una organización ficticia y no debe recibir datos reales sensibles.

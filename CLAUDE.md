# Trinorm — notas para Claude

Sistema de gestión integrado: calcula qué requisitos de **ISO 9001, 14001 y
45001** están cubiertos por la evidencia de una organización y arma el plan de
auditoría interna. En producción en https://franponcio.github.io/Trinorm_Sys/

**Este archivo existe para no redescubrir el repo en cada sesión.** Si algo
acá quedó viejo, corregilo en el momento: cuesta menos que volver a explorar.

## Adónde va

El objetivo de Francisco es más grande que lo que hay hoy: **un aplicativo que
lea el proceso productivo o el servicio de una organización y genere toda la
documentación necesaria para certificar** — procedimientos, instructivos,
formularios — más las preguntas para editar, agregar o sacar lo que no
corresponda. Y que sirva para cualquier norma, no sólo estas tres.

**Antes de construir eso, leé esto.** Generar documentación genérica es
justamente lo que hace que un auditor rechace un sistema: el certificador no
audita tus documentos, audita si describen lo que la organización realmente
hace y si hay registros que lo prueben. Un procedimiento perfecto para una
empresa que no lo cumple es una no conformidad mayor servida en bandeja, y
además se nota que se copió.

O sea: la generación tiene que salir de **lo que la organización contó de sí
misma**, y por eso las preguntas no son un accesorio — son la parte que hace
que el documento generado valga algo. Primero entrevistar, después redactar.
Ese orden es el producto.

Lo que ya está construido va en la otra dirección y es el cimiento correcto:
llevar la cuenta de la evidencia, que es el problema que nadie resuelve bien.

## Dónde está cada cosa

```
src/lib/sgi/modelo.ts   tipos y motor de cobertura. Funcion pura, testeada.
src/lib/sgi/normas.ts   el corpus: 45 requisitos + que area responde por cada uno
src/lib/sgi/demo.ts     la empresa ficticia de la demostracion
src/lib/sgi/vista.ts    plantillas HTML compartidas entre el build y el navegador
src/pages/index.astro   el tablero
src/pages/auditoria/[proceso].astro   la jornada de auditoria de un area
src/layouts/App.astro   barra fija y navegacion lateral
```

## Comandos

```bash
npm install
npm run dev      # http://localhost:4321/Trinorm_Sys/
npm test         # runner de Node, sin dependencias — 68 tests
npm run build
```

## Lo que hay que saber antes de tocar

- **El motor no usa IA y no debe usarla.** `evaluar()` es una función pura:
  mismos argumentos, mismo resultado, y devuelve el motivo junto al estado.
  Cuando un auditor pregunte "¿por qué dice 68 %?", la respuesta tiene que ser
  una lista de evidencias con fecha. La IA redacta sobre el resultado; no lo
  calcula. Por ser pura, el motor viaja al navegador (12 KB) sin servidor.
- **NO PUEDE HABER TEXTO DE LAS NORMAS ISO EN ESTE REPO.** El texto es
  propiedad de ISO y se compra; un repo público con la 9001 copiada se baja
  con un pedido de retiro. Numeración y título de cláusula sí: son referencia
  factual. Las preguntas de auditoría y las descripciones de evidencia son
  propias y así tienen que seguir.
- **Documento y registro son tipos distintos y uno no reemplaza al otro.** Un
  documento dice cómo se hace algo; un registro prueba que se hizo, tiene
  fecha y caduca. Hay un test que lo impide, y es el error que este sistema
  existe para evitar.
- **Vencido ≠ sin cubrir.** Son dos hallazgos distintos: nunca haberlo tenido
  no es lo mismo que haberlo dejado morir.
- **El tronco común (Anexo SL) se modela una sola vez**: 21 de los 45
  requisitos cubren las tres normas. Duplicarlos por norma es lo que hace
  inmantenible la trinorma.
- **Las áreas responsables viven en una tabla aparte** al final de
  `normas.ts`, no dentro de cada requisito: el corpus normativo es igual para
  cualquier organización, el organigrama no.
- **La empresa de la demo es inventada.** Los datos de un SGI real son del
  cliente o del empleador y no van a un repo público. Además, una demo con
  todo en verde no demuestra nada: el estado está armado para que se vea lo
  que el motor distingue.
- Las fechas de la evidencia son desfasajes desde la fecha de build, no fijas.
  Si fueran fijas, en un año la demo mostraría todo vencido sola.
- El workflow **no publica si un test falla**.

## Convenciones

- **Todo en castellano**: variables, clases CSS, comentarios, commits.
  Francisco escribe rioplatense; contestale igual.
- Los comentarios explican POR QUÉ, no qué.
- Sin JavaScript la página tiene que seguir siendo completa y usable; lo que
  desaparece son los controles, no el contenido.
- Las plantillas HTML viven en un solo archivo y las usan el build y el
  navegador. Escritas dos veces se irían separando sin que nadie lo note.

## Cómo trabajar acá sin quemar tokens

- **No releas archivos enteros.** `normas.ts` pasa las 1.200 líneas.
- **Editá con reemplazo puntual**, no reescribiendo el archivo completo.
- **Un solo build o test al final**, no uno por cada micro-edición.
- Capturá pantalla sólo si cambiaste algo visual, y recortado.
- Leé los archivos que necesites sin pedir permiso: cada ida y vuelta reenvía
  toda la conversación y sale más caro que abrir el archivo.

## Pendiente

- **El nombre.** `Trinorm_Sys` con guión bajo queda en la URL pública y se lee
  mal. Francisco quiere uno mejor, y además "trinorma" se queda corto si el
  objetivo es servir a cualquier norma. Sin definir.
- El caso escrito vive en el portfolio, en `proyectos/sgi-trinorma/` — esa
  carpeta no se renombró y no tiene por qué coincidir con el nombre del repo.

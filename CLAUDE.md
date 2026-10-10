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

**Primera entrega hecha (sin IA):** la entrevista, 28 plantillas de documentos
y 8 formularios, la edición con versiones, y la ruta de certificación. El
orden que se defendió se respetó: primero entrevistar, después redactar.

## Estado

Hay dos cosas en el mismo repo, y conviene no confundirlas:

- **La demostración** (`/`): una empresa ficticia con la evidencia armada a
  mano. Es el escaparate del motor.
- **La herramienta** (`/app/`): una organización propia, con su entrevista, los
  documentos generados, la evidencia y la ruta hasta la certificación. Los
  datos viven sólo en el navegador de quien los carga.

La herramienta funciona de punta a punta **sin IA**: los documentos se redactan
con plantillas y las respuestas de la entrevista. Al cierre de la última
sesión falta, en este orden:

- **Que la IA mejore la redacción.** Hoy los documentos son correctos pero
  planos. La IA entra después, sólo para redactar sobre las respuestas; el
  dato sigue saliendo de la entrevista y lo que falta sigue marcado. Pide
  decidir dónde vive la clave de la API (no puede ir en una página estática).
- **El informe de auditoría redactado y firmable.** El plan sale del motor; falta
  convertirlo en el documento que se entrega.
- **El ciclo de no conformidades completo**: causa raíz, acción, verificación
  de eficacia. Hay un formulario en blanco, pero no un registro seguido.
- **Requisitos legales por jurisdicción.** Las dos matrices legales salen como
  esqueleto y dicen que las completa quien conoce la provincia y el municipio.
  Cargar normas reales requiere una fuente confiable; no se inventan.
- **Datos fuera del navegador**, si algún día hace falta compartir entre
  personas. `Almacen` es una interfaz a propósito; ver "por qué en el
  navegador" más abajo.

**Al terminar una sesión, actualizá estas líneas.**

## Dónde está cada cosa

```
src/lib/sgi/modelo.ts   tipos y motor de cobertura. Funcion pura, testeada.
src/lib/sgi/normas.ts   el corpus: 45 requisitos + que area responde por cada uno
src/lib/sgi/demo.ts     la empresa ficticia de la demostracion
src/lib/sgi/vista.ts    plantillas HTML compartidas entre el build y el navegador

  — la herramienta (organización propia) —
src/lib/sgi/organizacion.ts  tipos, validación estricta de lo que viene de afuera,
                        y la conexión con el motor (coberturaDe, exclusiones)
src/lib/sgi/entrevista.ts    el banco de preguntas y el avance
src/lib/sgi/generador.ts     redactar, ciclo de vida del documento, el marcador ⟦COMPLETAR⟧
src/lib/sgi/plantillas.ts    el catálogo: 28 documentos + 8 formularios
src/lib/sgi/ruta.ts          las 10 etapas hasta certificar, y los hitos
src/lib/sgi/almacen.ts       localStorage + respaldo exportable
src/lib/sgi/markdown.ts      renderizador seguro: único lugar donde texto de usuario es HTML
src/lib/sgi/ejemplo.ts       la organización de ejemplo (ficticia)
src/app/vistas.ts            las pantallas, como funciones puras de texto
src/app/main.ts              rutas por hash, guardado y acciones
src/pages/app/index.astro    la página de la herramienta

src/pages/index.astro   el tablero
src/pages/auditoria/[proceso].astro   la jornada de auditoria de un area
src/layouts/App.astro   barra fija y navegacion lateral
```

## Comandos

```bash
npm install
npm run dev      # http://localhost:4321/Trinorm_Sys/
npm test         # runner de Node, sin dependencias — 241 tests
npm run check    # astro check (tipos)
npm run build
npm run preview
```

**`npm run check` no lo corre el deploy.** El workflow publica si `npm test`
pasa, y nada más: un error de tipos llega a producción sin que nadie lo frene.
Corrélo a mano antes de dar algo por terminado.

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

### La herramienta: lo que no se ve en el código

- **NUNCA se inventa un dato de la organización.** Lo que la entrevista no
  contestó sale en el documento como `⟦COMPLETAR: …⟧`, no como una frase
  verosímil. Un hueco se ve y se completa; una frase inventada pasa la revisión
  y aparece en la auditoría como algo que la gente no hace. Y un documento con
  marcas **no se puede aprobar** (`puedeAprobar`). Los tests lo fijan: con la
  entrevista completa, procedimientos y política salen sin marcas; las matrices
  siempre traen (las puntúa una persona).
- **Un borrador no es evidencia.** Sólo cuenta un documento *aprobado* y con
  fecha. Editar uno aprobado le quita la aprobación: lo firmado era otro texto.
- **Un formulario en blanco no es un registro** (`cubre: []`). El registro nace
  cuando alguien lo completa y lo carga. Mismo principio de documento ≠ registro.
- **Un requisito nunca reparte sus documentos entre dos plantillas.** El motor
  empareja por tipo, así que si dos plantillas cubrieran los dos documentos de
  un requisito, aprobar una sola lo daría por cubierto. Hay un test.
- **`Evidencia.claves` es opcional a propósito.** Sin él, una evidencia cuenta
  para cualquiera de su tipo (así funciona la demo y no se tocó). Con él, sólo
  para esas claves: un acta de revisión no prueba la capacitación. La herramienta
  siempre lo usa.
- **Por qué los datos viven en el navegador.** Es una decisión, no una limitación:
  los datos de un SGI son del cliente o del empleador y la app es pública;
  guardarlos en un servidor propio los pondría a cargo de quien no tiene derecho
  a custodiarlos. La contracara es que se pierden si se borra el sitio: por eso
  el respaldo exportable es parte del producto. `Almacen` es una interfaz para
  poder cambiarlo sin tocar la app.
- **La herramienta necesita JavaScript.** Es una excepción a la convención de
  "sin JS sigue usable": una app que guarda en el navegador no tiene sin JS qué
  mostrar. Dice por qué en un `<noscript>`. La demo sigue sin necesitarlo.
- **Todo dato de usuario pasa por `esc()` antes de ser HTML.** Las vistas son
  funciones puras de texto justamente para poder probarlo en Node con datos
  hostiles (`src/app/__tests__/vistas.test.ts`). Los tests se verificaron
  rompiendo un `esc()` a propósito: fallan.
- **Las fechas se validan con `esFechaISO`, no con `Date.parse`.** El motor de
  JS acepta "2026-02-30" y lo corre a marzo; una fecha de aprobación inventada
  que se guarda como válida es justo lo que un auditor encuentra.
- **Las plantillas no copian la norma.** Describen cómo se suele hacer cada cosa
  desde el oficio. Las matrices legales no citan una sola ley: dicen que las
  completa quien conoce la jurisdicción.
- **El recorrido en navegador no está en el repo.** Se probó con Playwright
  (43 comprobaciones: ejemplo, generar, aprobar, evidencia, recargar, respaldo,
  datos hostiles, móvil). Es un script de un solo uso que depende de Playwright
  global; si se vuelve rutina, hay que sumarlo como dependencia de desarrollo.

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

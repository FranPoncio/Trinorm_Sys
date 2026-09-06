# SGI Trinorma

Calcula qué requisitos de **ISO 9001, ISO 14001 e ISO 45001** están realmente
cubiertos por la evidencia de una organización, y arma el plan de auditoría
interna a partir de eso.

**Demo:** https://franponcio.github.io/Trinorm_Sys/ ·
**Por qué existe:** https://franponcio.github.io/proyectos/sgi-trinorma/

---

## El problema

Un sistema de gestión no se cae porque falten procedimientos. Se cae porque
los procedimientos existen y **nadie puede demostrar que se ejecutaron**.

Llega la auditoría, alguien abre la carpeta, y ahí está el procedimiento de
capacitación: prolijo, firmado, versionado. El auditor no lo mira más de tres
segundos. Pregunta otra cosa — *¿cuándo fue la última capacitación y quién la
evaluó?* — y aparece una planilla de hace diecinueve meses.

Esa distancia entre el documento que dice cómo se hace y el registro que
prueba que se hizo es un problema de datos: qué evidencia tenés, a qué
requisito sirve, y desde cuándo dejó de servir.

## Cómo está resuelto

**El motor no usa IA.** `evaluar()` es una función pura: recibe un requisito,
la evidencia cargada y una fecha, y devuelve el estado junto con el motivo y
las evidencias que lo sostienen. Cuando el auditor pregunte *¿por qué dice
68 %?*, la respuesta es una lista de evidencias con fecha — no "lo calculó un
modelo". Por eso mismo el motor puede viajar al navegador: 12 KB comprimidos,
sin servidor.

**Documento y registro son tipos distintos y uno no reemplaza al otro.** Un
documento dice cómo se hace algo y no caduca por uso. Un registro prueba que
algo *se hizo*, tiene fecha y vence. Tener el procedimiento de capacitación
escrito no prueba que se haya capacitado a nadie, y hay un test que lo impide.

**Vencido no es lo mismo que sin cubrir.** Que nunca hayas tenido un
procedimiento es una cosa; que lo hayas tenido y lo hayas dejado morir habla
del sistema entero, y el auditor lo lee así.

**El tronco se escribe una vez.** Las tres normas comparten la estructura de
alto nivel, así que 21 de los 45 requisitos cubren las tres a la vez. Es lo
que hace sostenible arrancar con la trinorma completa: 45 requisitos en lugar
de los 87 que costaría escribirlas por separado.

## Qué se puede hacer

- **La máquina del tiempo.** Adelantás hasta 24 meses y los registros se
  vencen solos: 78/69/68 % pasa a 40/40/37 % en un año sin que nadie haga nada
  mal. Un test fija esa propiedad — sin cargar evidencia nueva, correr el
  reloj nunca puede mejorar el avance.
- **Apagar evidencia** y ver qué requisitos se caen al instante.
- **La jornada de auditoría por proceso.** Elegís un área y sale el plan del
  día: qué cláusulas le tocan, en orden de riesgo, con las preguntas para
  hacer, la evidencia para pedir y quién la tiene. Imprime en papel, que es
  como se sigue haciendo la mitad de las auditorías internas.

## Lo que este repositorio no tiene

**No hay texto de las normas ISO.** El texto es propiedad de ISO y se compra.
Se usan numeración y título de cláusula, que son referencia factual; las 98
preguntas de auditoría y las 88 descripciones de evidencia son propias.

**La empresa de la demo no existe.** Metalúrgica del Suquía S.A. es una PyME
inventada: los datos de un sistema de gestión real son del cliente o del
empleador y no van a un repositorio público. Además, una demo con todo en
verde no demuestra nada — el estado está armado para que se vea lo que el
motor distingue.

## Correrlo

```bash
npm install
npm run dev      # http://localhost:4321/Trinorm_Sys/
npm test         # runner de Node, sin dependencias
npm run build
```

## Estructura

```
src/lib/sgi/
  modelo.ts    tipos y motor de cobertura. Función pura, testeada.
  normas.ts    el corpus: 45 requisitos, y qué área responde por cada uno.
  demo.ts      la empresa ficticia. Fechas relativas al build, no fijas.
  vista.ts     plantillas HTML compartidas entre el build y el navegador.
src/pages/
  index.astro              el tablero
  auditoria/[proceso].astro  la jornada de auditoría de un área
```

## Estado

Funciona y se puede usar, pero es una demostración: la evidencia es la de la
empresa ficticia. Falta para que sea un producto:

- Cargar evidencia propia (necesita backend y autenticación).
- El informe de auditoría redactado y firmable.
- El ciclo completo de no conformidades: causa raíz, acción, verificación de
  eficacia.
- Requisitos legales por jurisdicción — las matrices de ambiente y seguridad
  dependen de la provincia y del municipio.

---

Francisco Poncio — [portfolio](https://franponcio.github.io/)

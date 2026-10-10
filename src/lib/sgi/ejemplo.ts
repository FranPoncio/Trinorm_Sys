/**
 * Una organización de ejemplo, INVENTADA, para probar la herramienta sin
 * cargar nada propio.
 *
 * Existe por dos razones. Quien abre la app por primera vez ve el recorrido
 * completo —entrevista, documentos, ruta— en un minuto, sin tener que
 * inventar una empresa. Y sirve de referencia de cuánto detalle espera cada
 * pregunta: una respuesta de ejemplo enseña más que una explicación.
 *
 * Es ficticia a propósito y se dice en el nombre: los datos de un sistema de
 * gestión real son del cliente o del empleador, y no van a un repositorio
 * público. Ninguna cifra, persona ni permiso de acá existe.
 */

import { nuevaOrganizacion } from './organizacion.ts';
import type { Organizacion } from './organizacion.ts';

export const NOMBRE_EJEMPLO = 'Metalúrgica Ejemplo S.R.L. (ficticia)';

export function organizacionEjemplo(hoy: Date, id?: string): Organizacion {
  const org = nuevaOrganizacion(
    {
      nombre: NOMBRE_EJEMPLO,
      rubro: 'manufactura',
      empleados: 35,
      sedes: 'Una planta en el parque industrial de una ciudad cualquiera',
      normas: ['9001', '14001', '45001'],
      alcance:
        'Fabricación de estructuras y piezas metálicas a pedido: corte, plegado, soldadura, pintura y entrega, en la planta única.',
    },
    hoy,
    id,
  );

  org.respuestas = {
    actividad:
      'Fabricamos estructuras y piezas metálicas a medida para empresas de la zona (galpones, tanques, soportes de maquinaria). Recibimos el plano o la necesidad del cliente, cotizamos, fabricamos en la planta y entregamos con transporte propio o del cliente.',
    cuestiones_externas:
      'Suba del precio del acero y de la energía\nClientes que piden financiación a largo plazo\nNuevas exigencias municipales sobre residuos industriales\nCompetidores de otras provincias con precios más bajos',
    cuestiones_internas:
      'Soldadores con mucha experiencia pero cerca de jubilarse\nMáquina de corte con más de veinte años\nEl conocimiento de las cotizaciones está en una sola persona\nBuen clima de trabajo y poca rotación',
    partes_interesadas:
      'Clientes — plazos de entrega que se cumplen y piezas sin defectos\nPersonal — trabajar con seguridad y cobrar en fecha\nDueños — rentabilidad y continuidad del negocio\nProveedores de acero — pagos puntuales\nMunicipio — cumplimiento de la normativa ambiental\nVecinos — que no haya ruidos ni humos fuera de horario',
    disena: 'no',
    jurisdiccion: 'Provincia y municipio de la planta (a completar con los reales)',
    compromiso_direccion:
      'Nos comprometemos a entregar a nuestros clientes lo que prometimos, en la fecha prometida, y a que nadie de nuestro equipo se lastime para lograrlo. Cuidamos el entorno de la planta y mejoramos lo que no funciona en lugar de taparlo.',
    responsable_sgi: 'Responsable de Calidad (a designar)',
    direccion: 'Gerente General (a designar)',
    riesgos:
      'Falla de la máquina de corte que frene la producción\nRetraso del proveedor de acero\nAccidente de trabajo en soldadura o izaje\nPérdida del conocimiento de las cotizaciones',
    oportunidades: 'Ofrecer mantenimiento de las estructuras que fabricamos\nIncorporar corte láser para reducir desperdicio',
    objetivos:
      'Entregar a tiempo — pedidos entregados en fecha sobre total — 92 %\nReducir el retrabajo — piezas rehechas sobre total — menos de 4 %\nCero accidentes con baja — accidentes con días perdidos — 0\nReducir el residuo metálico enviado a disposición — kg por mes — 15 % menos',
    infraestructura:
      'Nave de producción de 1.200 m²\nMáquina de corte por plasma\nPlegadoras\nEquipos de soldadura\nCabina de pintura\nAuto-elevador y puente grúa\nSistema de gestión de pedidos en planilla compartida',
    capacitacion:
      'Al ingresar, el encargado le muestra el puesto durante la primera semana. Las capacitaciones de seguridad se dan cuando hay un cambio importante, sin un calendario fijo, y se anota la asistencia en un cuaderno.',
    canales_comunicacion:
      'Reunión semanal de producción\nGrupo de mensajería del personal\nCartelera en el comedor\nCorreo electrónico con clientes y proveedores',
    soporte_documental: 'Mixto, papel y digital',
    etapas:
      'Recibir el pedido y los planos del cliente\nCotizar y confirmar plazo\nComprar el material\nCortar\nPlegar y armar\nSoldar\nPintar\nInspeccionar antes de entregar\nEntregar y facturar',
    puntos_control:
      'Recepción del acero: certificado y medidas\nDespués del corte: medidas contra plano\nDespués de la soldadura: inspección visual de cordones\nAntes de entregar: control final con lista de verificación',
    tercerizados: 'si',
    tercerizados_detalle: 'Galvanizado en caliente (taller externo)\nEnsayos no destructivos de soldaduras críticas (laboratorio externo)',
    proveedores_criticos:
      'Proveedor principal de acero\nTaller de galvanizado\nProveedor de gases y consumibles de soldadura\nSe elige por precio y plazo; hoy no se evalúa a nadie formalmente',
    canales_cliente:
      'Correo electrónico y teléfono al área comercial\nVisitas a obra\nLos reclamos llegan por teléfono y se anotan en un cuaderno',
    instrumentos: 'Calibres y pie de rey\nCintas métricas\nMedidor de espesor de pintura\nBalanza de piso',
    cuando_sale_mal:
      'El encargado de producción avisa al gerente, rehacen la pieza o la reparan y siguen. No se anota casi nada y no se busca por qué pasó; si el cliente reclama, se le responde por teléfono.',
    satisfaccion:
      'No hay encuesta. Nos enteramos por si el cliente vuelve a pedir y por los reclamos que llegan. A veces el gerente llama al terminar una obra grande.',
    aspectos_ambientales:
      'Residuos de aceite — mantenimiento de máquinas\nChatarra metálica — corte y plegado\nHumos de soldadura — soldadura\nSolventes y envases de pintura — cabina de pintura\nConsumo de energía eléctrica — toda la planta\nRuido — plegado y corte',
    emergencias_ambientales: 'Derrame de aceite o solvente\nIncendio en el depósito de pinturas\nFuga de gas de soldadura',
    permisos_ambientales: 'Inscripción como generador de residuos peligrosos (a completar con el número real)',
    peligros:
      'Corte y plegado — atrapamiento y cortes\nSoldadura — quemaduras, radiación y humos\nIzaje con puente grúa — caída de cargas\nPintura — exposición a solventes\nTránsito interno de auto-elevador — atropellamiento\nTrabajo en altura — armado de estructuras en obra',
    emergencias_sst: 'Incendio en planta\nAccidente grave con atrapamiento\nCaída de carga izada\nIntoxicación por solventes',
    participacion:
      'Hay un delegado gremial y una reunión mensual donde se tratan temas de seguridad. Cualquiera puede dejar un reclamo en un buzón, pero casi no se usa.',
    contratistas: 'Empresa de mantenimiento eléctrico, una vez al mes\nTransportistas que cargan en planta\nPersonal de obra de los clientes cuando se arman estructuras en sitio',
    indicadores:
      'Pedidos entregados en fecha — mensual\nPiezas rehechas — mensual\nConsumo de energía — mensual\nAccidentes — mensual',
    auditores:
      'Responsable de administración (no participa de producción)\nEncargado de compras (si audita producción)\nUn soldador de otro turno, con capacitación a definir',
  };

  org.procesos = [
    { id: 'ej-1', nombre: 'Comercial', responsable: 'Gerente General', objetivo: 'Conseguir pedidos que la planta pueda cumplir y acordar con el cliente lo que se va a entregar.', entradas: 'Consultas y planos del cliente', salidas: 'Cotización aceptada y orden de trabajo', indicador: 'Cotizaciones aceptadas sobre enviadas' },
    { id: 'ej-2', nombre: 'Producción', responsable: 'Encargado de Producción', objetivo: 'Fabricar cada pieza conforme al plano, en el plazo acordado y sin que nadie se lastime.', entradas: 'Orden de trabajo, planos y material', salidas: 'Pieza terminada e inspeccionada', indicador: 'Pedidos entregados en fecha' },
    { id: 'ej-3', nombre: 'Compras y mantenimiento', responsable: 'Encargado de Compras', objetivo: 'Tener el material y las máquinas disponibles cuando producción los necesita.', entradas: 'Pedido de materiales y plan de mantenimiento', salidas: 'Material recibido y máquinas en condiciones', indicador: 'Paradas de máquina por falla' },
  ];

  return org;
}

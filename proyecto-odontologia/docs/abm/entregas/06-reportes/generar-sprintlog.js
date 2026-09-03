/* SprintLog Módulo 06 — Reportes (consumo, solo lectura).
   Formato calcado de docs/abm/modelo/com.docx y de
   docs/abm/entregas/05-gastos/generar-sprintlog.js.
   Sprint documental 4.5 · HU1–HU6 (numeración propia del sprint).
   Es un módulo de CONSULTA: sin secciones de transiciones de estado ni de auditoría. */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, TableLayoutType, VerticalAlign, ImageRun,
} = require("docx");

const FONT = "Calibri";
const COLOR_H1_H2 = "1F3864";
const COLOR_H3 = "000000";
const COLOR_H4 = "2E74B5";
const COLOR_TENUE = "555555";
const BORDE_TABLA = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const BORDES_CELDA = { top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA };
const SHADING_HEADER = { type: ShadingType.CLEAR, fill: "D9D9D9", color: "auto" };
const ANCHO_TABLA = 9075;
const PROY = "D:/Dev/Desarrollo Web/Cuarto semestre/Proyecto Integrador 2/Proyecto/Proyecto juan/proyecto-odontologia";
const MOCKUPS = path.join(PROY, "docs/abm/entregas/06-reportes/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/06-reportes/SprintLog-Reportes.docx");

// ── helpers de párrafo ───────────────────────────────────────────────────────
const P = (texto, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment,
    spacing: { after: opts.after ?? 160, line: 276 },
    children: [new TextRun({ text: texto, font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italics, color: opts.color })],
  });

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT, size: 30, bold: true, color: COLOR_H1_H2 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT, size: 26, bold: true, color: COLOR_H1_H2 })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT, size: 23, bold: true, color: COLOR_H3 })] });
const H4 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t, font: FONT, size: 22, italics: true, color: COLOR_H4 })] });

const linea = (primera, resto) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60, line: 276 },
    children: [
      new TextRun({ text: primera + " ", font: FONT, size: 22, bold: true }),
      new TextRun({ text: resto, font: FONT, size: 22 }),
    ],
  });

const criterio = (t) =>
  new Paragraph({
    spacing: { before: 120, after: 60, line: 276 },
    children: [new TextRun({ text: t, font: FONT, size: 22, bold: true })],
  });

const subtituloScrum = () =>
  P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 });

// ── helpers de tabla ─────────────────────────────────────────────────────────
const celda = (contenido, ancho, { header = false, bold = false, align } = {}) =>
  new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: BORDES_CELDA,
    shading: header ? SHADING_HEADER : undefined,
    verticalAlign: header ? VerticalAlign.CENTER : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, line: 276 },
        children: [new TextRun({ text: contenido, font: FONT, size: 20, bold: header || bold })],
      }),
    ],
  });

const tabla = (anchos, filas) =>
  new Table({
    width: { size: ANCHO_TABLA, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: {
      top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA,
      insideHorizontal: BORDE_TABLA, insideVertical: BORDE_TABLA,
    },
    rows: filas.map((celdas, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: celdas.map((txt, c) => celda(txt, anchos[c], { header: i === 0 })),
      })
    ),
  });

const RATIO = 1364 / 2004;
const figura = (archivo, pie) => {
  const data = fs.readFileSync(path.join(MOCKUPS, archivo));
  const w = 600;
  return [
    new Paragraph({ spacing: { before: 80, after: 60 }, children: [new TextRun({ text: pie, font: FONT, size: 22 })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new ImageRun({ type: "png", data, transformation: { width: w, height: Math.round(w * RATIO) } })],
    }),
  ];
};

// ── contenido ────────────────────────────────────────────────────────────────
const identificacion = [
  "Instituto Superior Santo Domingo",
  "Agustin Tacconi Gianello - Practica Profesionalizante",
  "Desarrollo Web - 5to Semestre 2026",
  "Docente - Nadia Gallardo",
].map((t) => P(t, { after: 40 }));

const hijos = [];
hijos.push(...identificacion);
hijos.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

hijos.push(H1("SPRINT 4.5 — Módulo de Reportes (consulta)"));
hijos.push(P("Consulta de solo lectura del estado económico del consultorio: resumen del período, ingresos por práctica, arqueo por medio de pago, egresos por tipo de gasto, pendientes de cobro y vista mensual."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// ── Objetivo ─────────────────────────────────────────────────────────────────
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "Este sprint implementa el módulo de Reportes del sistema Odontología Herrera. No es un ABM: no crea, no modifica ni da de baja nada. Es un módulo de consumo que responde la pregunta central del negocio, planteada en el documento de proyecto: cuánto se cobra, cuánto ingresa por cada práctica y cuánto se gasta. Se apoya en los datos que ya cargaron los ABM anteriores (Pagos y Gastos), leyendo solamente los movimientos vigentes.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "El módulo agrega seis endpoints de agregación bajo /api/reportes, todos protegidos por el permiso ver_reportes, que ya estaba sembrado y asignado al rol administrador. No hay migración de base de datos: el sprint se apoya en las columnas anulado e id_consultorio que agregaron los ABM 04 y 05. En el frontend reemplaza el marcador de posición de la pantalla Reportes por una pantalla real con selector de período, tarjetas de indicadores, gráficos de barras hechos con CSS (sin librerías de gráficos) y tablas.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Alcance ──────────────────────────────────────────────────────────────────
hijos.push(H2("Alcance del módulo"));
hijos.push(P(
  "Todos los endpoints son GET, de solo lectura, y se aíslan por consultorio: cada consulta filtra por el id_consultorio del usuario autenticado, nunca por un parámetro de la petición. El rango de fechas es opcional; si no se envía, se usa el mes actual (del día 1 de este mes a hoy). Solo cuentan los pagos con anulado = 0 y los gastos con anulado = 0.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([3050, 6025], [
  ["Endpoint", "Qué devuelve"],
  ["GET /api/reportes/resumen?desde=&hasta=", "Ingresos (Σ pagos vigentes por fecha de pago en el rango), egresos (Σ gastos vigentes por fecha de gasto en el rango), resultado neto y la cantidad de tratamientos por estado (snapshot del consultorio, sin filtrar por fecha)."],
  ["GET /api/reportes/ingresos-por-tipo?desde=&hasta=", "Ingresos agrupados por tipo de práctica, uniendo pagos → tratamientos → tipos_tratamiento. Ordenado de mayor a menor: qué práctica deja más dinero."],
  ["GET /api/reportes/ingresos-por-medio?desde=&hasta=", "Cobros agrupados por medio de pago (efectivo, transferencia, tarjeta, obra social): el arqueo de caja del período."],
  ["GET /api/reportes/egresos-por-tipo?desde=&hasta=", "Gastos vigentes agrupados por tipo de gasto en el período."],
  ["GET /api/reportes/pendientes", "Tratamientos no cancelados con saldo > 0: paciente, tratamiento, estado, precio, pagado y saldo (precio menos pagos vigentes). No depende del rango de fechas."],
  ["GET /api/reportes/mensual?anio=", "Serie de 12 meses del año indicado (por defecto, el actual) con ingresos, egresos y neto de cada mes, y los totales del año."],
]));
hijos.push(P(
  "Validación de formato: desde y hasta deben tener el formato AAAA-MM-DD y hasta no puede ser anterior a desde (400 «Los datos enviados no son válidos.»); anio, si se envía, debe ser un año entre 2000 y 2100.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Sprint Backlog ───────────────────────────────────────────────────────────
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([650, 4550, 1000, 1050, 1825], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU1", "Como responsable del consultorio quiero ver el resumen económico de un período —ingresos, egresos y resultado neto— con la cantidad de tratamientos por estado, para saber cómo viene el mes.", "Alta", "M", "ABM Pagos + ABM Gastos + permiso ver_reportes"],
  ["HU2", "Como responsable del consultorio quiero ver los ingresos del período agrupados por tipo de práctica, para saber qué práctica deja más dinero.", "Alta", "S", "HU1"],
  ["HU3", "Como asistente del consultorio quiero ver los cobros del período agrupados por medio de pago, para hacer el arqueo de caja.", "Media", "S", "HU1"],
  ["HU4", "Como responsable del consultorio quiero ver los gastos del período agrupados por tipo de gasto, para saber en qué se va la plata.", "Media", "S", "HU1"],
  ["HU5", "Como responsable del consultorio quiero ver la lista de tratamientos con saldo pendiente, para saber cuánto falta cobrar y a quién.", "Alta", "S", "ABM Tratamientos + ABM Pagos"],
  ["HU6", "Como responsable del consultorio quiero ver la evolución mensual de ingresos, egresos y neto de un año, para comparar los meses entre sí.", "Media", "S", "HU1"],
]));
hijos.push(P("", { after: 120 }));

// ── Descripción de cada HU ───────────────────────────────────────────────────
hijos.push(H2("Descripción de cada Historia de Usuario"));

// HU1
hijos.push(H3("HU1 – Resumen económico del período"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "responsable del consultorio"));
hijos.push(linea("quiero", "ver los ingresos, los egresos y el resultado neto de un período, más la cantidad de tratamientos por estado,"));
hijos.push(linea("para", "saber de un vistazo cómo viene económicamente el mes."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Resumen de un período con datos"));
hijos.push(linea("Dado", "el período del 1 al 30 de abril de 2026, con un pago vigente de $20.000,00 y dos gastos vigentes (laboratorio $30.000,00 e insumo $15.000,00)"));
hijos.push(linea("Cuando", "se abre la pantalla «Reportes» con ese rango"));
hijos.push(linea("Entonces", "las tarjetas muestran «Ingresos del período» $20.000,00, «Egresos del período» $45.000,00 y «Resultado neto» -$25.000,00, y la tarjeta «Tratamientos por estado» muestra los cuatro estados con su cantidad (finalizado: 1; el resto: 0)."));
hijos.push(criterio("Criterio 2: Rango por defecto y validación"));
hijos.push(linea("Dado", "que no se indica ningún rango de fechas"));
hijos.push(linea("Cuando", "se consulta el resumen"));
hijos.push(linea("Entonces", "se usa el mes actual (del día 1 a hoy) y la pantalla lo muestra en la leyenda «Período: …»; si se pide un rango con «hasta» anterior a «desde», el backend responde 400 «El parámetro «hasta» no puede ser anterior a «desde».» y la pantalla no cambia los totales."));
hijos.push(criterio("Criterio 3: Solo cuentan los movimientos vigentes"));
hijos.push(linea("Dado", "un pago o un gasto anulado dentro del período"));
hijos.push(linea("Cuando", "se consulta el resumen"));
hijos.push(linea("Entonces", "ese movimiento no suma en ingresos ni en egresos: los totales solo consideran pagos.anulado = 0 y gastos.anulado = 0."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-resumen.png", "Figura 1 – Prototipo de la pantalla «Reportes»: selector de período, tarjetas de indicadores y tratamientos por estado (HU1)"));
hijos.push(...figura("fig7-acceso.png", "Figura 2 – Prototipo de la pantalla de acceso denegado para un usuario sin el permiso ver_reportes (HU1)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerResumen", "Dos consultas de agregación (Σ monto y COUNT de pagos y de gastos vigentes con DATE(fecha) BETWEEN desde AND hasta, filtradas por id_consultorio) más una tercera que cuenta tratamientos por estado con LEFT JOIN a estados_tratamiento; calcula el neto.", "M"],
  ["reportes.validator — validarRango", "Middleware que valida el formato AAAA-MM-DD de desde y hasta y que hasta no sea anterior a desde; arma el arreglo errores.", "S"],
  ["Helper resolverRango", "Sin desde/hasta → primer día del mes actual a hoy; con fechas válidas → las respeta. Devuelve siempre strings AAAA-MM-DD.", "XS"],
  ["Ruta GET /api/reportes/resumen", "verificarToken + verificarPermiso('ver_reportes') + validarRango; el consultorio se toma de req.usuario.", "XS"],
  ["Frontend — PaginaReportes.jsx (base)", "Reemplaza el marcador de posición: selector de período (Desde / Hasta / Aplicar / Este mes), tarjetas KPI de ingresos / egresos / neto, panel «Tratamientos por estado», estados de carga y error (403 → mensaje de permisos).", "M"],
  ["Integración — AppRouter.jsx", "Reemplaza el componente «Próximamente» de la ruta reportes por <PaginaReportes> dentro de RutaPorPermiso permisoRequerido=\"ver_reportes\"; se elimina el componente placeholder que quedó sin uso.", "XS"],
  ["Pruebas de los criterios", "Resumen con datos, rango por defecto, validación de rango invertido y exclusión de anulados, vía API y en pantalla.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU2
hijos.push(H3("HU2 – Ingresos por tipo de práctica"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "responsable del consultorio"));
hijos.push(linea("quiero", "ver los ingresos del período agrupados por tipo de práctica,"));
hijos.push(linea("para", "saber qué práctica (endodoncia, ortodoncia, limpieza…) deja más dinero."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Agrupación por práctica"));
hijos.push(linea("Dado", "el período de abril de 2026 con el pago de $20.000,00 registrado contra el tratamiento de endodoncia de la paciente Ana Pérez"));
hijos.push(linea("Cuando", "se consulta «Ingresos por práctica»"));
hijos.push(linea("Entonces", "se muestra una barra «endodoncia» con $20.000,00 y el «Total» $20.000,00; el cálculo une pagos → tratamientos → tipos_tratamiento y suma solo pagos vigentes."));
hijos.push(criterio("Criterio 2: Orden y período vacío"));
hijos.push(linea("Dado", "un período sin cobros"));
hijos.push(linea("Cuando", "se consulta «Ingresos por práctica»"));
hijos.push(linea("Entonces", "se muestra el texto «Sin cobros en el período.» y el total en $0,00; cuando hay varias prácticas, se listan de mayor a menor importe."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-ingresos-tipo.png", "Figura 3 – Prototipo del panel «Ingresos por práctica» con barras CSS (HU2)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerIngresosPorTipo", "SELECT con INNER JOIN pagos → tratamientos → tipos_tratamiento, WHERE por id_consultorio, anulado = 0 y rango de DATE(fecha_pago); GROUP BY tipo, SUM(monto) y COUNT(pagos); ORDER BY total DESC.", "S"],
  ["Estructura común construirAgrupado", "Arma { periodo, items, total } reutilizado por los tres endpoints de agrupación (por tipo de práctica, por medio y por tipo de gasto).", "XS"],
  ["Ruta GET /api/reportes/ingresos-por-tipo", "verificarToken + verificarPermiso('ver_reportes') + validarRango.", "XS"],
  ["Frontend — componente BarrasReporte.jsx", "Barras horizontales hechas con div/CSS (ancho proporcional al máximo); recibe items { etiqueta, valor, detalle } y una función de formato; muestra un texto cuando no hay datos.", "S"],
  ["Frontend — panel en PaginaReportes.jsx", "Panel «Ingresos por práctica» con el total y las barras.", "XS"],
  ["Pruebas de los criterios", "Agrupación correcta, orden descendente y período sin cobros.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU3
hijos.push(H3("HU3 – Arqueo de caja por medio de pago"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "ver los cobros del período agrupados por medio de pago,"));
hijos.push(linea("para", "hacer el arqueo de caja y saber cuánto entró en efectivo, transferencia, tarjeta y obra social."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Agrupación por medio de pago"));
hijos.push(linea("Dado", "el período de abril de 2026 con el pago de $20.000,00 en efectivo"));
hijos.push(linea("Cuando", "se consulta «Arqueo por medio de pago»"));
hijos.push(linea("Entonces", "se muestra una barra «efectivo» con $20.000,00 y el «Total» $20.000,00; el importe surge de unir pagos → medios_pago sumando solo pagos vigentes."));
hijos.push(criterio("Criterio 2: Coherencia con el resumen"));
hijos.push(linea("Dado", "cualquier período"));
hijos.push(linea("Cuando", "se comparan el «Total» del arqueo por medio y los «Ingresos del período» del resumen"));
hijos.push(linea("Entonces", "ambos coinciden: el arqueo reparte por medio de pago exactamente el mismo total de ingresos."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-arqueo-medio.png", "Figura 4 – Prototipo del panel «Arqueo por medio de pago» (HU3)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerIngresosPorMedio", "SELECT con INNER JOIN pagos → medios_pago, WHERE por id_consultorio, anulado = 0 y rango; GROUP BY medio, SUM(monto) y COUNT(pagos); ORDER BY total DESC.", "S"],
  ["Ruta GET /api/reportes/ingresos-por-medio", "verificarToken + verificarPermiso('ver_reportes') + validarRango.", "XS"],
  ["Frontend — panel en PaginaReportes.jsx", "Panel «Arqueo por medio de pago» reutilizando BarrasReporte.jsx.", "XS"],
  ["Pruebas de los criterios", "Agrupación por medio y verificación de que el total coincide con los ingresos del resumen.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU4
hijos.push(H3("HU4 – Egresos por tipo de gasto"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "responsable del consultorio"));
hijos.push(linea("quiero", "ver los gastos del período agrupados por tipo de gasto,"));
hijos.push(linea("para", "saber en qué se está yendo la plata (insumos, laboratorio, prótesis, servicios externos)."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Agrupación por tipo de gasto"));
hijos.push(linea("Dado", "el período de abril de 2026 con un gasto de laboratorio de $30.000,00 y uno de insumo de $15.000,00, ambos vigentes"));
hijos.push(linea("Cuando", "se consulta «Egresos por tipo de gasto»"));
hijos.push(linea("Entonces", "se muestran dos barras —«laboratorio» $30.000,00 e «insumo» $15.000,00— ordenadas de mayor a menor, y el «Total» $45.000,00."));
hijos.push(criterio("Criterio 2: Los gastos anulados no cuentan"));
hijos.push(linea("Dado", "un gasto anulado dentro del período"));
hijos.push(linea("Cuando", "se consulta «Egresos por tipo de gasto»"));
hijos.push(linea("Entonces", "ese gasto no aparece en ningún grupo ni suma en el total (solo gastos.anulado = 0)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-egresos-tipo.png", "Figura 5 – Prototipo del panel «Egresos por tipo de gasto» (HU4)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerEgresosPorTipo", "SELECT con INNER JOIN gastos → tipos_gasto, WHERE por id_consultorio, anulado = 0 y rango de DATE(fecha_gasto); GROUP BY tipo, SUM(monto) y COUNT(gastos); ORDER BY total DESC.", "S"],
  ["Ruta GET /api/reportes/egresos-por-tipo", "verificarToken + verificarPermiso('ver_reportes') + validarRango.", "XS"],
  ["Frontend — panel en PaginaReportes.jsx", "Panel «Egresos por tipo de gasto» reutilizando BarrasReporte.jsx.", "XS"],
  ["Pruebas de los criterios", "Agrupación por tipo, orden descendente y exclusión de anulados.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU5
hijos.push(H3("HU5 – Pendientes de cobro por tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "responsable del consultorio"));
hijos.push(linea("quiero", "ver la lista de tratamientos con saldo pendiente, con su precio, lo pagado y lo que falta,"));
hijos.push(linea("para", "saber cuánto falta cobrar en total y a qué pacientes reclamar."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Saldo por tratamiento"));
hijos.push(linea("Dado", "el tratamiento de endodoncia de Ana Pérez con precio $50.000,00 y un pago vigente de $20.000,00"));
hijos.push(linea("Cuando", "se consulta «Pendientes de cobro»"));
hijos.push(linea("Entonces", "el tratamiento aparece con precio $50.000,00, pagado $20.000,00 y saldo $30.000,00, y el «saldo total» del panel suma ese importe; el saldo es precio menos la suma de los pagos vigentes."));
hijos.push(linea("Aclaración", "sobre la base de prueba: durante el ABM de Pagos se cargaron dos pagos de prueba adicionales ($25.000,00 y $5.000,00) que dejan este tratamiento saldado; con esos datos «Pendientes de cobro» aparece vacío con el texto «No hay tratamientos con saldo pendiente.». El criterio se valida contra el estado de referencia (un único pago de $20.000,00)."));
hijos.push(criterio("Criterio 2: Qué se excluye"));
hijos.push(linea("Dado", "un tratamiento cancelado o uno cuyo total pagado ya iguala o supera el precio"));
hijos.push(linea("Cuando", "se consulta «Pendientes de cobro»"));
hijos.push(linea("Entonces", "ese tratamiento no aparece en la lista (se excluyen los cancelados y los que tienen saldo menor o igual a cero); el reporte no depende del rango de fechas del período."));
hijos.push(criterio("Criterio 3: Enlace a la ficha"));
hijos.push(linea("Dado", "una fila de la tabla de pendientes"));
hijos.push(linea("Cuando", "se hace clic en el tratamiento"));
hijos.push(linea("Entonces", "se abre el detalle de ese tratamiento (/panel/tratamientos/:id)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig5-pendientes.png", "Figura 6 – Prototipo del panel «Pendientes de cobro» con el saldo por tratamiento (HU5)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerPendientes", "SELECT tratamientos → pacientes → tipos_tratamiento → estados_tratamiento con LEFT JOIN a pagos; GROUP BY tratamiento; saldo = precio_paciente − Σ(pagos vigentes); WHERE id_consultorio y estado <> cancelado; HAVING saldo > 0; ORDER BY saldo DESC. Devuelve total_pendientes y total_saldo.", "M"],
  ["Ruta GET /api/reportes/pendientes", "verificarToken + verificarPermiso('ver_reportes'); no recibe rango de fechas.", "XS"],
  ["Frontend — tabla de pendientes en PaginaReportes.jsx", "Tabla con paciente, tratamiento (enlace a la ficha), estado, precio, pagado y saldo; encabezado con la cantidad y el saldo total; texto «No hay tratamientos con saldo pendiente.» cuando está vacía.", "S"],
  ["Pruebas de los criterios", "Saldo correcto, exclusión de cancelados y de saldados, y navegación a la ficha.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU6
hijos.push(H3("HU6 – Vista mensual del año"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "responsable del consultorio"));
hijos.push(linea("quiero", "ver los ingresos, los egresos y el neto de cada mes de un año,"));
hijos.push(linea("para", "comparar los meses entre sí y ver la evolución."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Serie de 12 meses"));
hijos.push(linea("Dado", "el año 2026, con movimientos en abril (ingresos $20.000,00; egresos $45.000,00) y en septiembre (ingresos $30.000,00; egresos $0,00)"));
hijos.push(linea("Cuando", "se consulta la «Vista mensual» de 2026"));
hijos.push(linea("Entonces", "la tabla muestra las 12 filas (los meses sin movimientos en $0,00); abril muestra neto -$25.000,00 y septiembre neto $30.000,00; el pie muestra «Total 2026»: ingresos $50.000,00, egresos $45.000,00, neto $5.000,00."));
hijos.push(criterio("Criterio 2: Año por defecto y selector"));
hijos.push(linea("Dado", "que no se indica el año"));
hijos.push(linea("Cuando", "se consulta la vista mensual"));
hijos.push(linea("Entonces", "se usa el año actual; el selector de año de la pantalla permite cambiarlo y la tabla se recarga. Un anio fuera del rango 2000–2100 responde 400."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig6-mensual.png", "Figura 7 – Prototipo de la «Vista mensual» con la comparativa de barras por mes (HU6)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["reportes.service — obtenerMensual", "Dos consultas GROUP BY MONTH(fecha) con YEAR(fecha) = anio (pagos y gastos vigentes, por id_consultorio); arma un arreglo fijo de 12 meses completando con 0 los meses sin datos; calcula neto por mes y los totales del año.", "S"],
  ["reportes.validator — validarAnio", "Middleware que valida que anio (si viene) sea entero entre 2000 y 2100.", "XS"],
  ["Ruta GET /api/reportes/mensual", "verificarToken + verificarPermiso('ver_reportes') + validarAnio.", "XS"],
  ["Frontend — vista mensual en PaginaReportes.jsx", "Selector de año, tabla de 12 filas con ingresos / egresos / neto (neto negativo resaltado), barras de comparación por mes y fila de totales del año.", "S"],
  ["Pruebas de los criterios", "Serie completa de 12 meses, totales del año, año por defecto y validación del año.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ── Reglas de cálculo ────────────────────────────────────────────────────────
hijos.push(H2("Reglas de cálculo"));
hijos.push(P(
  "El módulo no tiene reglas de negocio de escritura (no hay altas, ediciones ni bajas) ni ciclo de estados ni auditoría. Sus reglas son de cálculo: definen qué entra en cada total.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([2600, 6475], [
  ["Regla", "Cómo se aplica"],
  ["Solo movimientos vigentes", "Todos los totales suman únicamente pagos.anulado = 0 y gastos.anulado = 0. Un movimiento anulado desaparece de todos los reportes."],
  ["Aislamiento por consultorio", "Cada consulta filtra por el id_consultorio del usuario autenticado (req.usuario), nunca por un parámetro de la petición. Un usuario no puede ver datos de otro consultorio manipulando la URL."],
  ["Rango por defecto", "Sin desde/hasta se usa el mes actual (día 1 a hoy). El rango se valida: formato AAAA-MM-DD y hasta no anterior a desde."],
  ["Fecha que se usa para el rango", "Ingresos: la fecha del pago (fecha_pago, la fecha contable del cobro). Egresos: la fecha del gasto (fecha_gasto). No la fecha de creación de la fila."],
  ["Resultado neto", "neto = ingresos − egresos. Puede ser negativo; la pantalla lo resalta."],
  ["Ingresos por práctica", "Se obtienen uniendo pagos → tratamientos → tipos_tratamiento (cada pago se registra siempre contra un tratamiento)."],
  ["Saldo de un tratamiento", "saldo = precio_paciente − Σ(pagos vigentes del tratamiento). «Pendientes de cobro» lista los tratamientos no cancelados con saldo > 0 y no depende del rango de fechas."],
  ["Tratamientos por estado", "Es un snapshot del consultorio (cuenta todos los tratamientos por estado, sin filtrar por fecha): responde «cómo está hoy la cartera», no «cuántos se crearon en el período»."],
]));
hijos.push(P("", { after: 160 }));

// ── Pruebas de criterios ─────────────────────────────────────────────────────
hijos.push(H2("Pruebas de criterios (Datos / Pasos / Resultado esperado)"));
hijos.push(P(
  "Las pruebas se ejecutaron contra la base real (odontología_herrera, MariaDB 10.4) con el backend levantado localmente y un JWT del rol administrador. Para obtener valores deterministas se usó el rango del 1 al 30 de abril de 2026, donde están el pago de $20.000,00 (efectivo, contra la endodoncia de Ana Pérez) y los dos gastos ($30.000,00 de laboratorio y $15.000,00 de insumo). El año completo 2026 tiene además dos pagos de prueba de septiembre ($25.000,00 y $5.000,00) cargados durante el ABM de Pagos.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([520, 2900, 2780, 2875], [
  ["Nro", "Datos", "Pasos", "Resultado esperado"],
  ["1", "Rango 2026-04-01 a 2026-04-30.", "GET /api/reportes/resumen?desde=2026-04-01&hasta=2026-04-30.", "200; ingresos 20000, egresos 45000, neto -25000, cantidad_pagos 1, cantidad_gastos 2; tratamientos_por_estado con finalizado 1 y el resto 0."],
  ["2", "Sin parámetros.", "GET /api/reportes/resumen.", "200; periodo.desde = primer día del mes actual, periodo.hasta = hoy."],
  ["3", "Rango invertido.", "GET /api/reportes/resumen?desde=2026-12-01&hasta=2026-01-01.", "400 «El parámetro «hasta» no puede ser anterior a «desde».»."],
  ["4", "Fecha mal formada.", "GET /api/reportes/resumen?desde=nope.", "400 «El parámetro «desde» no es una fecha válida (YYYY-MM-DD).»."],
  ["5", "Rango de abril 2026.", "GET /api/reportes/ingresos-por-tipo?desde=2026-04-01&hasta=2026-04-30.", "200; items = [{ nombre: 'endodoncia', total: 20000, cantidad_pagos: 1 }], total 20000."],
  ["6", "Rango de abril 2026.", "GET /api/reportes/ingresos-por-medio?desde=2026-04-01&hasta=2026-04-30.", "200; items = [{ nombre: 'efectivo', total: 20000, cantidad_pagos: 1 }], total 20000 (coincide con los ingresos del resumen)."],
  ["7", "Rango de abril 2026.", "GET /api/reportes/egresos-por-tipo?desde=2026-04-01&hasta=2026-04-30.", "200; items = [{ 'laboratorio', 30000, 1 }, { 'insumo', 15000, 1 }] en ese orden, total 45000."],
  ["8", "Estado de referencia (un pago de 20000 en el tratamiento 1).", "GET /api/reportes/pendientes.", "200; items = [{ id_tratamiento: 1, paciente: 'Pérez, Ana', precio: 50000, pagado: 20000, saldo: 30000 }], total_saldo 30000."],
  ["9", "Base viva (tratamiento 1 con 50000 pagados).", "GET /api/reportes/pendientes.", "200; items = [], total_pendientes 0, total_saldo 0 (el único tratamiento está saldado)."],
  ["10", "Año 2026.", "GET /api/reportes/mensual?anio=2026.", "200; 12 meses; abril { ingresos 20000, egresos 45000, neto -25000 }, septiembre { ingresos 30000, egresos 0, neto 30000 }, resto en 0; totales { ingresos 50000, egresos 45000, neto 5000 }."],
  ["11", "anio fuera de rango.", "GET /api/reportes/mensual?anio=99.", "400 «El parámetro «anio» debe ser un año entre 2000 y 2100.»."],
  ["12", "Sin header Authorization.", "GET /api/reportes/resumen.", "401 «No se envió token de autenticación.»."],
  ["13", "Usuario con un rol sin el permiso ver_reportes.", "GET a cualquier endpoint /api/reportes/*; revisar el menú lateral.", "403 «No tenés permisos para realizar esta acción.» en todos los endpoints; el ítem «Reportes» no aparece en el menú y la ruta muestra la pantalla de acceso denegado."],
  ["14", "Aislamiento por consultorio.", "Consultar cualquier reporte con un usuario del consultorio 1.", "Solo se agregan pagos, gastos y tratamientos con id_consultorio = 1; no hay forma de pedir los de otro consultorio desde la petición."],
]));
hijos.push(P("", { after: 160 }));

// ── Consideración siguiente ──────────────────────────────────────────────────
hijos.push(H2("Consideración para el cierre del proyecto"));
hijos.push(P(
  "Con el módulo de Reportes queda cubierto el recorrido completo de los seis ABM planificados en el roadmap: los cuatro catálogos de soporte, la ficha de Pacientes, y las tres entidades transaccionales (Tratamientos, Pagos y Gastos), más esta capa de consulta que las lee. El módulo de Reportes es la respuesta directa a la pregunta de negocio del documento de proyecto. Como líneas de trabajo futuras quedan, sin ser bloqueantes: exportar los reportes a PDF o planilla, agregar un comparativo entre dos períodos, y —cuando el sistema opere con más de un consultorio— un reporte consolidado para la administración central.",
  { alignment: AlignmentType.JUSTIFIED, after: 0 }
));

// ── documento ────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 276 } } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: COLOR_H1_H2 },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: COLOR_H1_H2 },
        paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 23, bold: true, color: COLOR_H3 },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 22, italics: true, color: COLOR_H4 },
        paragraph: { spacing: { before: 0, after: 0 }, outlineLevel: 3 } },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1417, right: 1417, bottom: 1417, left: 1417, header: 708, footer: 708 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA", space: 4 } },
              children: [new TextRun({ text: "Agustin Tacconi Gianello - Desarrollo Web", font: FONT, size: 18, color: COLOR_TENUE })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR_TENUE })],
            }),
          ],
        }),
      },
      children: hijos,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, buf);
  console.log("OK", SALIDA, buf.length, "bytes");
});

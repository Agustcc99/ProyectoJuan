/* SprintLog ABM 05 — Gastos (transaccional).
   Formato calcado de docs/abm/modelo/com.docx (ABM Transaccional) y de
   docs/abm/entregas/04-pagos/generar-sprintlog.js.
   Sprint documental 4.4 · HU1–HU6 (numeración propia del sprint). */
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
const MOCKUPS = path.join(PROY, "docs/abm/entregas/05-gastos/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/05-gastos/SprintLog-Gastos.docx");

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

hijos.push(H1("SPRINT 4.4 — ABM Transaccional de Gastos"));
hijos.push(P("Registro, edición acotada, consulta y baja lógica (anulación) de los egresos del consultorio, generales o imputados a un tratamiento."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// ── Objetivo ─────────────────────────────────────────────────────────────────
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "Este sprint implementa el ABM Transaccional de Gasto: el registro de los egresos del consultorio odontológico Herrera. Un gasto siempre tiene un tipo de gasto y, opcionalmente, se imputa a un tratamiento (la columna gastos.id_tratamiento es nullable): puede ser un gasto general, como el alquiler o los insumos del mes, o el costo de laboratorio de un tratamiento concreto. Es el último ABM transaccional antes del módulo de reportes.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "La tabla gastos ya existía con dos filas reales (un gasto general de $15.000,00 de insumo y un gasto de $30.000,00 de laboratorio imputado al tratamiento 1) y el permiso registrar_gastos asignado al rol administrador. Su migración agrega id_consultorio con su clave foránea, alineando la tabla con el aislamiento multiconsultorio, y las columnas de la baja lógica por anulación: anulado, motivo_anulacion, id_usuario_anula, fecha_anulacion y fecha_creacion. Reutiliza la tabla genérica auditoria_cambios creada en el Sprint de Tratamientos. Se suman los permisos ver_gastos, editar_gastos y anular_gastos, asignados al rol administrador.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Entidad transaccional seleccionada ───────────────────────────────────────
hijos.push(H2("Entidad transaccional seleccionada: Gasto"));
hijos.push(P(
  "El material distingue entre entidades de soporte y entidades transaccionales o principales (las que registran un evento del negocio). La siguiente tabla justifica la elección de Gasto contra las cuatro señales que define el material.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([2600, 6475], [
  ["Señal exigida", "Cómo la cumple Gasto"],
  ["Es un evento de negocio", "Registra un egreso concreto: un monto que salió del consultorio en una fecha, de un tipo de gasto, general o imputado a un tratamiento."],
  ["Afecta procesos y métricas", "Cada gasto vigente suma al total de egresos del período y, si está imputado, al costo del tratamiento; su anulación revierte ese efecto y lo saca de los reportes."],
  ["Tiene actores", "Usuario que lo registra (ID_USUARIO), usuario que lo anula (id_usuario_anula), paciente y tratamiento cuando el gasto está imputado, más el actor de cada cambio en auditoria_cambios."],
  ["Tiene ciclo de estados", "vigente → anulado (estado final). La anulación exige un motivo y sólo la puede hacer quien tiene el permiso anular_gastos."],
]));
hijos.push(P(
  "A diferencia del Pago, el Gasto no depende siempre de un Tratamiento: su clave foránea a tratamientos es opcional. Un gasto general no se imputa a nadie; un gasto imputado se puede asociar a un tratamiento en cualquier estado, porque incluso un tratamiento cancelado pudo haber generado un costo de laboratorio. Su baja lógica no es una columna activo con reactivación, sino la anulación: el registro se conserva con su motivo, su actor y su fecha, pero deja de contar para el total del período y para los reportes. El monto de un gasto es inmutable: para corregirlo se anula y se registra uno nuevo.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Sprint Backlog ───────────────────────────────────────────────────────────
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([650, 4550, 1000, 1050, 1825], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU1", "Como asistente del consultorio quiero registrar un gasto, general o imputado a un tratamiento, indicando el tipo, el monto y la fecha, para dejar asentado el egreso.", "Alta", "S/M", "Catálogo tipos_gasto + ABM Tratamientos + permiso registrar_gastos"],
  ["HU2", "Como asistente del consultorio quiero editar el tipo, la imputación, la fecha y la descripción de un gasto sin poder tocar el monto, para corregir la carga sin alterar el importe.", "Media", "S", "HU1"],
  ["HU3", "Como asistente del consultorio quiero anular un gasto indicando el motivo, para revertir un egreso cargado por error sin eliminar el registro ni perder el historial.", "Alta", "S", "HU1"],
  ["HU4", "Como usuario del sistema quiero consultar los gastos filtrando por tipo, período, imputación y estado, con el total del período, para controlar los egresos del consultorio.", "Alta", "M", "HU1"],
  ["HU5", "Como asistente del consultorio quiero ver los gastos imputados en la ficha del tratamiento e imputar uno nuevo desde ahí, para tener el costo del tratamiento a la vista.", "Media", "S", "HU1 + ABM Tratamientos"],
  ["HU6", "Como administrador del consultorio quiero que ver, registrar, editar y anular un gasto exijan permisos distintos y que toda operación quede registrada con su autor, para controlar quién hace qué y poder auditarlo.", "Media", "S", "HU1 … HU3"],
]));
hijos.push(P("", { after: 120 }));

// ── Descripción de cada HU ───────────────────────────────────────────────────
hijos.push(H2("Descripción de cada Historia de Usuario"));

// HU1
hijos.push(H3("HU1 – Registrar un gasto, general o imputado a un tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "registrar un gasto, general o imputado a un tratamiento, indicando el tipo de gasto, el monto y la fecha,"));
hijos.push(linea("para", "dejar asentado el egreso del consultorio."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Alta de un gasto general"));
hijos.push(linea("Dado", "el catálogo de tipos de gasto con «insumo» activo"));
hijos.push(linea("Cuando", "se registra un gasto general (sin tratamiento) de $15.000,00 de tipo «insumo» con la descripción «Compra de guantes descartables» desde la pantalla «Gastos»"));
hijos.push(linea("Entonces", "el backend responde 201, se muestra «Gasto registrado (ID N) por $ 15.000,00.», el gasto aparece en la lista como «vigente» con la imputación «General», y quedan estampados id_usuario e id_consultorio."));
hijos.push(criterio("Criterio 2: Alta de un gasto imputado a un tratamiento"));
hijos.push(linea("Dado", "el tratamiento de endodoncia de la paciente Ana Pérez"));
hijos.push(linea("Cuando", "se registra un gasto de $30.000,00 de tipo «laboratorio» eligiendo la opción «De un tratamiento» y seleccionando ese tratamiento"));
hijos.push(linea("Entonces", "el gasto se crea (201) con id_tratamiento apuntando al tratamiento de Ana Pérez, y aparece tanto en el listado de gastos como en la sección «Gastos imputados» de la ficha del tratamiento."));
hijos.push(criterio("Criterio 3: Validaciones del alta"));
hijos.push(linea("Dado", "que falta el tipo de gasto, el monto es cero, la fecha es posterior a hoy, el tipo elegido está inactivo o el tratamiento indicado no existe"));
hijos.push(linea("Cuando", "se intenta registrar el gasto"));
hijos.push(linea("Entonces", "el backend responde 400 con los mensajes por campo («El tipo de gasto es obligatorio.», «El monto debe ser mayor a cero.», «La fecha del gasto no puede ser futura.», «El tipo de gasto está inactivo.») o 404 «El tratamiento no existe o no pertenece a este consultorio.», y el gasto no se crea."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-registrar.png", "Figura 1 – Prototipo del modal «Registrar gasto» (gasto general) desde la pantalla «Gastos» (HU1)"));
hijos.push(...figura("fig5-imputado.png", "Figura 2 – Prototipo del modal «Registrar gasto» con la opción «De un tratamiento» y el selector de tratamiento (HU1)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Migración 009_gastos.sql", "ALTER TABLE aditivo: agrega id_consultorio (+ FK a consultorios, guard contra information_schema), anulado, motivo_anulacion, id_usuario_anula (+ FK a usuarios), fecha_anulacion y fecha_creacion; backfill de las 2 filas existentes al consultorio 1.", "S"],
  ["Migración 010_permisos_gastos.sql", "Alta de los permisos ver_gastos, editar_gastos y anular_gastos y asignación al rol administrador (INSERT IGNORE por código, reejecutable).", "XS"],
  ["gastos.service — crearGasto", "Normaliza los datos, valida tipo de gasto (existe y activo), monto > 0, tratamiento (si se imputa: existe y del consultorio, cualquier estado) y fecha no futura; INSERT que estampa id_usuario e id_consultorio; audita accion = 'alta' dentro de la transacción; devuelve el gasto con sus nombres resueltos.", "M"],
  ["gastos.validator — validarDatosAlta", "Middleware que arma el arreglo errores: id_tipo_gasto entero positivo, monto > 0 y acotado, id_tratamiento opcional entero positivo, fecha válida, descripción acotada.", "S"],
  ["Ruta POST /api/gastos + GET /api/gastos/opciones", "verificarToken + verificarPermiso('registrar_gastos') para el alta; opciones con los tipos de gasto activos y los tratamientos del consultorio, bajo ver_gastos, para poblar los selectores sin exigir ver_catalogos ni ver_tratamientos.", "S"],
  ["Frontend — FormularioGasto.jsx", "Modal de alta con el toggle «Gasto general / De un tratamiento», selector de tratamiento cuando corresponde y validación de cliente espejo de la del backend.", "M"],
  ["Pruebas del alta y sus validaciones", "Los tres criterios vía API (fetch) y en pantalla.", "S"],
  ["", "Total", "S/M"],
]));
hijos.push(P("", { after: 120 }));

// HU2
hijos.push(H3("HU2 – Editar un gasto sin tocar el monto"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "corregir el tipo de gasto, la imputación, la fecha y la descripción de un gasto ya registrado, sin poder modificar el monto,"));
hijos.push(linea("para", "arreglar una carga incorrecta sin alterar el importe del egreso."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Edición permitida y cambio de imputación"));
hijos.push(linea("Dado", "un gasto vigente cargado como «insumo» y general"));
hijos.push(linea("Cuando", "se cambia el tipo a «servicio externo», se lo imputa al tratamiento de Ana Pérez y se guarda"));
hijos.push(linea("Entonces", "el backend responde 200, se muestra «El gasto se actualizó correctamente.» y cada campo cambiado deja una fila en el historial (valor anterior → valor nuevo). Enviar id_tratamiento nulo vuelve a dejar el gasto como general."));
hijos.push(criterio("Criterio 2: El monto no se edita"));
hijos.push(linea("Dado", "un gasto vigente de $15.000,00"));
hijos.push(linea("Cuando", "se envía una modificación con un monto distinto"));
hijos.push(linea("Entonces", "el sistema rechaza el cambio (409) con «El monto de un gasto no se edita: anulá y registrá uno nuevo.» y en la pantalla el campo Monto aparece deshabilitado."));
hijos.push(criterio("Criterio 3: Un gasto anulado no se edita"));
hijos.push(linea("Dado", "un gasto ya anulado"));
hijos.push(linea("Cuando", "se intenta modificar cualquiera de sus campos"));
hijos.push(linea("Entonces", "el sistema responde 409 «Un gasto anulado no se puede editar.»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-editar.png", "Figura 3 – Prototipo del modal «Editar gasto» con el monto bloqueado y el toggle de imputación (HU2)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["gastos.service — actualizarGasto", "Verifica que el gasto exista y pertenezca al consultorio (404); rechaza (409) si está anulado o si el monto entrante difiere del actual; aplica sólo id_tipo_gasto, id_tratamiento (incluye null → general), fecha_gasto y descripcion.", "M"],
  ["Validaciones de la edición", "Tipo de gasto existente y activo cuando cambia; tratamiento del consultorio cuando se imputa; fecha no futura cuando cambia; descripción acotada.", "S"],
  ["Ruta PUT /api/gastos/:id", "verificarToken + verificarPermiso('editar_gastos'); valida el id y el cuerpo.", "XS"],
  ["Registro en auditoría", "Por cada campo que cambia inserta una fila en auditoria_cambios con campo, valor_anterior, valor_nuevo, id_usuario y fecha, dentro de la misma transacción.", "S"],
  ["Frontend — modo edición en FormularioGasto.jsx", "Campo Monto deshabilitado con la leyenda de por qué; sólo envía los campos permitidos; renderiza el arreglo errores del backend.", "S"],
  ["Pruebas de los criterios de aceptación", "Edición y cambio de imputación, bloqueo del monto y bloqueo de edición de un gasto anulado.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU3
hijos.push(H3("HU3 – Anular un gasto con motivo"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "anular un gasto indicando el motivo,"));
hijos.push(linea("para", "revertir un egreso cargado por error sin eliminar el registro de la base ni perder su historial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Anulación con motivo"));
hijos.push(linea("Dado", "un gasto vigente de $15.000,00"));
hijos.push(linea("Cuando", "se lo anula indicando el motivo «Gasto cargado dos veces por error» (mínimo 5 caracteres)"));
hijos.push(linea("Entonces", "el backend responde 200, el gasto queda «anulado» con el motivo, el actor y la fecha de anulación, deja de contar para el total del período y para los reportes, y la acción queda en el historial."));
hijos.push(criterio("Criterio 2: Motivo obligatorio"));
hijos.push(linea("Dado", "el pedido de anulación de un gasto"));
hijos.push(linea("Cuando", "el motivo está vacío o tiene menos de 5 caracteres"));
hijos.push(linea("Entonces", "el sistema responde 400 «El motivo de anulación es obligatorio.» / «El motivo de anulación debe tener al menos 5 caracteres.» y el gasto no se anula."));
hijos.push(criterio("Criterio 3: Sin doble anulación y sin reactivar"));
hijos.push(linea("Dado", "un gasto ya anulado"));
hijos.push(linea("Cuando", "se intenta anularlo de nuevo"));
hijos.push(linea("Entonces", "el sistema responde 409 «El gasto ya está anulado.»; no existe una operación para revertir la anulación."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-anular.png", "Figura 4 – Prototipo del modal «Anular gasto» con motivo obligatorio (HU3)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Columnas de anulación (migración 009)", "anulado, motivo_anulacion, id_usuario_anula (+ FK), fecha_anulacion: guardan la baja lógica y su trazabilidad.", "XS"],
  ["gastos.service — anularGasto", "Valida el motivo (mín. 5 caracteres) y que el gasto no esté ya anulado; UPDATE que setea anulado = 1, motivo, actor y fecha; audita accion = 'anulacion' (campo 'anulado', 0 → 1) en la transacción.", "M"],
  ["Ruta PATCH /api/gastos/:id/anular", "verificarToken + verificarPermiso('anular_gastos'); valida el id y el motivo.", "S"],
  ["Efecto sobre los totales", "El total del período (listado) y el total imputado (ficha del tratamiento) suman sólo los gastos vigentes; el gasto anulado figura aparte en el total anulado.", "S"],
  ["Frontend — AnularGastoModal.jsx", "Motivo obligatorio (mín. 5); la fila anulada se muestra tachada y sin la acción «Anular».", "M"],
  ["Pruebas del bloqueo y de la conservación del historial", "Anulación con motivo, rechazo sin motivo, rechazo de doble anulación y verificación de que el gasto anulado sigue visible en «todos».", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU4
hijos.push(H3("HU4 – Consulta: los gastos del consultorio"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "consultar el listado de gastos filtrando por tipo, período, imputación y estado, con el total del período,"));
hijos.push(linea("para", "controlar los egresos del consultorio y encontrar un gasto puntual."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Filtros y total del período"));
hijos.push(linea("Dado", "la pantalla «Gastos» con el gasto general de $15.000,00 y el imputado de $30.000,00"));
hijos.push(linea("Cuando", "se filtra por estado «vigentes» y por un rango de fechas que abarca ambos"));
hijos.push(linea("Entonces", "se muestran los dos gastos con su tipo y su imputación, y el «Total del período (vigente)» muestra $ 45.000,00. Filtrar por imputación «Gastos generales» deja sólo el de $15.000,00."));
hijos.push(criterio("Criterio 2: Sin resultados"));
hijos.push(linea("Dado", "que ninguna combinación de filtros arroja coincidencias"));
hijos.push(linea("Cuando", "se aplican los filtros"));
hijos.push(linea("Entonces", "se muestra una lista vacía con el mensaje «Sin resultados»."));
hijos.push(criterio("Criterio 3: Aislamiento por consultorio"));
hijos.push(linea("Dado", "un usuario autenticado en un consultorio"));
hijos.push(linea("Cuando", "consulta la lista o el detalle de un gasto"));
hijos.push(linea("Entonces", "sólo obtiene gastos de su propio consultorio, aun manipulando los parámetros de la petición (todas las queries filtran por req.usuario.id_consultorio)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-listado.png", "Figura 5 – Prototipo de la pantalla «Gastos» — listado con filtros y total del período (HU4)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["gastos.service — listarGastos", "WHERE por id_consultorio; filtros por id_tipo_gasto, id_tratamiento, imputación (id_tratamiento IS / IS NOT NULL), rango de DATE(fecha_gasto) y estado (vigentes / anulados / todos); orden fecha_desc / fecha_asc; LIMIT/OFFSET y COUNT total; totales vigente / anulado sobre el conjunto filtrado.", "L"],
  ["Resolución de nombres", "JOIN a tipos_gasto siempre; LEFT JOIN a tratamientos, pacientes y tipos_tratamiento para los gastos imputados.", "S"],
  ["gastos.validator — validarFiltrosListado", "Valida ?id_tipo_gasto, ?id_tratamiento, ?estado, ?imputacion, ?orden, ?desde, ?hasta (coherentes), ?pagina y ?porPagina (1–100).", "S"],
  ["Rutas GET /api/gastos y GET /api/gastos/:id", "verificarToken + verificarPermiso('ver_gastos'); el detalle agrega el historial de auditoría con el actor.", "S"],
  ["Frontend — PaginaGastos.jsx", "Filtros de estado / tipo / imputación / fechas, selector de orden, total del período, paginación, estado «Sin resultados», enlace al detalle del tratamiento y acciones «Editar» / «Anular» por fila.", "M"],
  ["Integración — AppRouter.jsx y LayoutPrincipal.jsx", "Ruta /panel/gastos protegida por ver_gastos, ítem «Gastos» en el menú y título en el breadcrumb.", "XS"],
  ["Pruebas de filtros, totales y aislamiento", "Verificar cada filtro, el total del período, «Sin resultados» y que un consultorio no vea datos de otro.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU5
hijos.push(H3("HU5 – Gastos imputados en la ficha del tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "ver los gastos imputados a un tratamiento en su ficha, con su total, e imputar un gasto nuevo desde ahí,"));
hijos.push(linea("para", "tener a la vista el costo real del tratamiento sin salir de su detalle."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Los gastos imputados aparecen en la ficha"));
hijos.push(linea("Dado", "el tratamiento de Ana Pérez con un gasto de laboratorio de $30.000,00 imputado"));
hijos.push(linea("Cuando", "se abre el detalle del tratamiento"));
hijos.push(linea("Entonces", "la sección «Gastos imputados» muestra ese gasto en la tabla y el «Total imputado (vigente)» muestra $ 30.000,00."));
hijos.push(criterio("Criterio 2: Imputar un gasto desde la ficha"));
hijos.push(linea("Dado", "la sección «Gastos imputados» del detalle del tratamiento"));
hijos.push(linea("Cuando", "se usa el botón «Imputar gasto», se completa el tipo y el monto y se guarda"));
hijos.push(linea("Entonces", "el gasto se crea ya imputado a ese tratamiento (el formulario no ofrece el toggle: la imputación queda fijada), la tabla y el total se actualizan y se muestra «Gasto imputado (ID N) por $ …»."));
hijos.push(criterio("Criterio 3: La anulación se refleja en la ficha"));
hijos.push(linea("Dado", "un gasto imputado vigente en la ficha del tratamiento"));
hijos.push(linea("Cuando", "se lo anula desde ahí"));
hijos.push(linea("Entonces", "la fila queda tachada como «anulado», el «Total imputado (vigente)» baja el monto anulado y ese monto pasa a mostrarse como «Anulado»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig6-ficha.png", "Figura 6 – Prototipo de la sección «Gastos imputados» dentro del detalle del tratamiento (HU5)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Frontend — SeccionGastosTratamiento.jsx", "Componente embebido que hace GET /api/gastos?id_tratamiento=:id&estado=todos, muestra el total imputado (vigente y anulado), la tabla de gastos y la anulación por fila.", "M"],
  ["FormularioGasto con imputación fija", "Cuando se abre con idTratamientoFijo el formulario oculta el toggle y el selector, muestra el tratamiento al que se imputa y envía siempre ese id_tratamiento.", "S"],
  ["Integración en DetalleTratamientoPage.jsx", "Se reemplaza la tabla estática «Gastos imputados» por <SeccionGastosTratamiento>; no se modifica tratamientos.service.js.", "S"],
  ["Refresco tras el cambio", "Después de un alta o una anulación el componente recarga su lista y su total, y avisa al detalle del tratamiento (onCambio).", "XS"],
  ["Pruebas de los criterios", "Gasto imputado visible en la ficha, alta desde la ficha con imputación fija y anulación reflejada en el total.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU6
hijos.push(H3("HU6 – Permisos diferenciados y trazabilidad"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "que ver, registrar, editar y anular un gasto exijan permisos distintos y que toda operación quede registrada con su autor,"));
hijos.push(linea("para", "controlar quién puede hacer qué y poder auditarlo después."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Sólo lectura sin permisos de escritura"));
hijos.push(linea("Dado", "un usuario con ver_gastos pero sin registrar_gastos ni anular_gastos"));
hijos.push(linea("Cuando", "abre la pantalla «Gastos» o el detalle de un tratamiento"));
hijos.push(linea("Entonces", "ve la lista, el total y la sección «Gastos imputados», pero no aparecen los botones «Registrar gasto» / «Imputar gasto» ni las acciones «Editar» / «Anular», y el backend responde 403 a POST, PUT y PATCH."));
hijos.push(criterio("Criterio 2: El menú y la lista exigen ver_gastos"));
hijos.push(linea("Dado", "un usuario sin ver_gastos"));
hijos.push(linea("Cuando", "inicia sesión"));
hijos.push(linea("Entonces", "el ítem «Gastos» no aparece en el menú lateral y GET /api/gastos responde 403; el 401 sin token responde «No se envió token de autenticación.»."));
hijos.push(criterio("Criterio 3: Trazabilidad del actor"));
hijos.push(linea("Dado", "que un usuario registra, edita o anula un gasto"));
hijos.push(linea("Cuando", "se guarda el cambio"));
hijos.push(linea("Entonces", "la fila de auditoria_cambios queda con id_usuario = el usuario autenticado y la fecha del cambio, dentro de la misma transacción; la anulación además estampa id_usuario_anula y fecha_anulacion en el gasto."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig7-permisos.png", "Figura 7 – Prototipo de la sección «Gastos imputados» en modo de sólo lectura (HU6)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Permiso por ruta", "verificarPermiso con ver_gastos / registrar_gastos / editar_gastos / anular_gastos según el método; registrar_gastos ya existía, los otros tres los agrega la migración 010.", "S"],
  ["Filtro por id_consultorio en el service", "Todas las queries de listar / obtener / actualizar / anular incluyen id_consultorio y el alta lo estampa junto con id_usuario.", "S"],
  ["Auditoría como fuente de trazabilidad", "registrarAuditoria(conexion, …) se llama siempre con la conexión de la transacción del cambio; id_usuario = req.usuario.id_usuario.", "S"],
  ["Frontend — botones y menú según tienePermiso", "PaginaGastos.jsx y SeccionGastosTratamiento.jsx ocultan «Registrar gasto» / «Imputar gasto», «Editar» y «Anular» según los permisos; LayoutPrincipal.jsx muestra el ítem «Gastos» sólo con ver_gastos.", "S"],
  ["Pruebas de acceso", "403 por método sin permiso, ítem de menú ausente sin ver_gastos, 401 sin token y verificación del actor en auditoria_cambios.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ── Reglas de negocio ────────────────────────────────────────────────────────
hijos.push(H2("Reglas de negocio"));
hijos.push(P(
  "El ciclo de vida del gasto es simple: nace «vigente» y sólo puede pasar a «anulado», que es un estado final. La baja lógica es esa anulación, con motivo obligatorio.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P("Matriz de estados del gasto (fila = estado origen, columna = estado destino):", { after: 80, bold: true }));
hijos.push(tabla([2275, 3400, 3400], [
  ["Origen \\ Destino", "vigente", "anulado"],
  ["vigente", "—", "Permitida (motivo obligatorio mín. 5; permiso anular_gastos)"],
  ["anulado", "No (no existe «reactivar»)", "No (409 «El gasto ya está anulado.»)"],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Reglas del alta y de la edición:", { after: 80, bold: true }));
hijos.push(tabla([2600, 6475], [
  ["Regla", "Comportamiento"],
  ["Obligatorios en el alta", "id_tipo_gasto y monto (> 0). Sin ellos → 400."],
  ["General vs. imputado", "id_tratamiento es opcional: sin él el gasto es general; con él se imputa a un tratamiento del consultorio, en cualquier estado. Un id_tratamiento inexistente → 404."],
  ["Tipo de gasto", "Debe existir y estar activo → 400 en caso contrario."],
  ["Fecha del gasto", "Por defecto la de hoy; si se indica, no puede ser futura → 400."],
  ["Descripción", "Opcional, recomendable; máximo 2000 caracteres."],
  ["Monto", "Inmutable. Enviar un monto distinto en la edición → 409 «El monto de un gasto no se edita: anulá y registrá uno nuevo.»."],
  ["Edición acotada", "Sólo id_tipo_gasto, id_tratamiento (incluye null → general), fecha_gasto y descripcion. Un gasto anulado no se edita → 409."],
  ["Efecto sobre los totales", "Sólo los gastos vigentes cuentan para el total del período y para el total imputado al tratamiento; un gasto anulado no entra en los reportes."],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Auditoría (tabla auditoria_cambios, entidad = 'gastos'):", { after: 80, bold: true }));
hijos.push(tabla([2000, 2600, 4475], [
  ["Acción", "Cuándo", "Qué registra"],
  ["alta", "POST /api/gastos", "id_usuario (actor), campo = 'monto', valor_nuevo = <monto>."],
  ["modificacion", "PUT /api/gastos/:id", "Una fila por campo cambiado: campo, valor_anterior, valor_nuevo, id_usuario, fecha."],
  ["anulacion", "PATCH /api/gastos/:id/anular", "campo = 'anulado', valor_anterior = '0', valor_nuevo = '1', motivo, id_usuario, fecha."],
]));
hijos.push(P(
  "Todas las escrituras de auditoría ocurren dentro de la misma transacción que el cambio auditado (getConnection + beginTransaction / commit / rollback), de modo que un cambio sin su rastro —o un rastro sin su cambio— no es posible.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Pruebas de criterios ─────────────────────────────────────────────────────
hijos.push(H2("Pruebas de criterios (Datos / Pasos / Resultado esperado)"));
hijos.push(P(
  "Las pruebas se ejecutaron contra la base real (odontología_herrera, MariaDB 10.4) con el backend levantado localmente y un JWT del rol administrador. Estado inicial: gasto ID 1 de $15.000,00 general (insumo) y gasto ID 2 de $30.000,00 imputado al tratamiento 1 (laboratorio); el tipo de gasto 3 («protesis») está inactivo. Las altas de prueba se eliminaron al finalizar; la base quedó en su estado inicial.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([520, 2900, 2780, 2875], [
  ["Nro", "Datos", "Pasos", "Resultado esperado"],
  ["1", "Migraciones 009 y 010 sin aplicar; gastos ID 1 y 2 sin columna anulado.", "Ejecutar 009_gastos.sql y 010_permisos_gastos.sql.", "Se agregan id_consultorio (+ FK), anulado, motivo_anulacion, id_usuario_anula (+ FK), fecha_anulacion y fecha_creacion; los gastos ID 1 y 2 quedan anulado = 0, id_consultorio = 1; se crean los permisos y se asignan al rol administrador. Reejecutar la migración no falla."],
  ["2", "Catálogo de tipos de gasto (insumo activo).", "POST /api/gastos con id_tipo_gasto 1, monto 5000, descripción, fecha 2026-05-02.", "201; el gasto nace vigente y general (imputado = false) con id_usuario e id_consultorio estampados; auditoría accion = 'alta'."],
  ["3", "Tratamiento 1 de Ana Pérez.", "POST /api/gastos con id_tipo_gasto 2, monto 12000, id_tratamiento 1.", "201; el gasto queda imputado (imputado = true, id_tratamiento = 1); aparece en GET /api/gastos?id_tratamiento=1."],
  ["4", "Body sin id_tipo_gasto y monto 0.", "POST /api/gastos.", "400 con errores: «El tipo de gasto es obligatorio.» y «El monto debe ser mayor a cero.»; no se crea nada."],
  ["5", "Fecha de gasto 2099-01-01.", "POST /api/gastos con esa fecha.", "400 «La fecha del gasto no puede ser futura.»."],
  ["6", "Tipo de gasto 3 («protesis», inactivo).", "POST /api/gastos con id_tipo_gasto 3.", "400 «El tipo de gasto está inactivo.»."],
  ["7", "id_tratamiento 9999 (inexistente).", "POST /api/gastos con ese id_tratamiento.", "404 «El tratamiento no existe o no pertenece a este consultorio.»."],
  ["8", "Un gasto vigente.", "PUT /api/gastos/:id con un monto distinto.", "409 «El monto de un gasto no se edita: anulá y registrá uno nuevo.»."],
  ["9", "Un gasto general vigente.", "PUT /api/gastos/:id cambiando id_tipo_gasto, descripcion e id_tratamiento a 1; luego otro PUT con id_tratamiento null.", "200 en ambos; los valores se actualizan (imputado pasa a true y luego a false); el historial suma una fila modificacion por campo."],
  ["10", "Un gasto vigente.", "PATCH /api/gastos/:id/anular sin motivo / con motivo «abc» / con motivo válido.", "400 «El motivo de anulación es obligatorio.» / «…al menos 5 caracteres.» en los dos primeros; 200 y estado «anulado» con motivo, actor y fecha en el tercero."],
  ["11", "Un gasto recién anulado.", "PATCH /api/gastos/:id/anular otra vez.", "409 «El gasto ya está anulado.»."],
  ["12", "Un gasto anulado.", "PUT /api/gastos/:id con cualquier campo.", "409 «Un gasto anulado no se puede editar.»."],
  ["13", "Gastos ID 1 ($15.000) y 2 ($30.000) vigentes.", "GET /api/gastos?estado=vigentes; luego ?imputacion=generales.", "Primero los dos gastos y totales.vigente = 45000; con imputacion = generales sólo el ID 1."],
  ["14", "?estado con un valor no permitido.", "GET /api/gastos?estado=basura.", "400 «El filtro estado debe ser uno de: vigentes, anulados, todos.»."],
  ["15", "Usuario con ver_tratamientos y sin ver_gastos ni registrar_gastos.", "GET /api/gastos; POST /api/gastos; revisar el menú.", "403 «No tenés permisos para realizar esta acción.» en ambas; el ítem «Gastos» no aparece en el menú."],
  ["16", "Usuario con registrar_gastos pero sin editar_gastos ni anular_gastos.", "POST /api/gastos; luego PUT y PATCH /anular sobre ese gasto.", "201 en el alta; 403 en PUT y en PATCH /anular (permisos diferenciados)."],
  ["17", "Sin header Authorization.", "GET /api/gastos.", "401 «No se envió token de autenticación.»."],
  ["18", "Cualquier alta / modificación / anulación.", "Consultar auditoria_cambios (entidad = 'gastos') para ese gasto.", "Filas con id_usuario = el usuario autenticado, la acción y la fecha correspondientes."],
]));
hijos.push(P("", { after: 160 }));

// ── Consideración siguiente sprint ───────────────────────────────────────────
hijos.push(H2("Consideración para el Sprint 5: Reportes"));
hijos.push(P(
  "Con los tres ABM transaccionales terminados (Tratamientos, Pagos y Gastos), la iteración siguiente es el módulo de Reportes, de sólo lectura. Agregará los ingresos (pagos vigentes), los egresos (gastos vigentes), el pendiente por tratamiento (precio menos pagos vigentes) y un resumen mensual, todo aislado por consultorio y usando el permiso ver_reportes, que ya está sembrado. Los gastos anulados y los pagos anulados no entran en ningún total del reporte. No requiere cambios de esquema: se apoya en las columnas anulado e id_consultorio que agregaron los ABM 04 y 05.",
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

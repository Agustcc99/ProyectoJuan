/* SprintLog ABM 04 — Pagos (transaccional).
   Formato calcado de docs/abm/modelo/com.docx (ABM Transaccional) y de
   docs/abm/entregas/03-tratamientos/generar-sprintlog.js.
   Sprint documental 4.3 · HU1–HU6 (numeración propia del sprint). */
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
const MOCKUPS = path.join(PROY, "docs/abm/entregas/04-pagos/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/04-pagos/SprintLog-Pagos.docx");

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

hijos.push(H1("SPRINT 4.3 — ABM Transaccional de Pagos"));
hijos.push(P("Registro, edición acotada, consulta (caja) y baja lógica (anulación) de los pagos que financian cada tratamiento."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// ── Objetivo ─────────────────────────────────────────────────────────────────
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "Este sprint implementa el ABM Transaccional de Pago: el registro de los cobros que financian cada tratamiento del consultorio odontológico Herrera. Cada pago se asienta contra un tratamiento existente con un medio de pago, y la suma de los pagos vigentes de un tratamiento frente a su precio define el saldo pendiente, que nunca se almacena sino que se deriva.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "La tabla pagos ya existía con una fila real (un pago de $20.000 en efectivo sobre el tratamiento 1) y el permiso registrar_pagos asignado al rol administrador. Su migración agrega id_consultorio con su clave foránea (alineando la tabla con el aislamiento multiconsultorio), y las columnas de la baja lógica por anulación: anulado, motivo_anulacion, id_usuario_anula, fecha_anulacion y fecha_creacion. Reutiliza la tabla genérica auditoria_cambios creada en el Sprint de Tratamientos. Se suman los permisos ver_pagos, editar_pagos y anular_pagos, asignados al rol administrador.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Entidad transaccional seleccionada ───────────────────────────────────────
hijos.push(H2("Entidad transaccional seleccionada: Pago"));
hijos.push(P(
  "El material distingue entre entidades de soporte y entidades transaccionales o principales (las que registran un evento del negocio). La siguiente tabla justifica la elección de Pago contra las cuatro señales que define el material.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([2600, 6475], [
  ["Señal exigida", "Cómo la cumple Pago"],
  ["Es un evento de negocio", "Registra un cobro concreto: un monto que ingresó al consultorio en una fecha, por un medio de pago, contra un tratamiento."],
  ["Afecta procesos y métricas", "Cada pago vigente reduce el saldo pendiente del tratamiento y suma a los totales de caja; su anulación revierte ese efecto."],
  ["Tiene actores", "Usuario que lo registra (ID_USUARIO), paciente al que corresponde el tratamiento cobrado, y usuario que lo anula (id_usuario_anula), más el actor de cada cambio en auditoria_cambios."],
  ["Tiene ciclo de estados", "vigente → anulado (estado final). La anulación exige un motivo y sólo la puede hacer quien tiene el permiso anular_pagos."],
]));
hijos.push(P(
  "El Pago depende siempre de un Tratamiento: no existe un pago sin un tratamiento contra el cual imputarlo. Su baja lógica no es una columna activo con reactivación, sino la anulación: el registro se conserva con su motivo, su actor y su fecha, pero deja de contar para el saldo y para la caja. El monto de un pago es inmutable: para corregirlo se anula y se registra uno nuevo.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Sprint Backlog ───────────────────────────────────────────────────────────
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([650, 4550, 1000, 1050, 1825], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU1", "Como asistente del consultorio quiero registrar un pago contra un tratamiento, indicando el monto, el medio de pago y la fecha, para dejar asentado el cobro y ver el saldo recalculado.", "Alta", "S/M", "ABM Tratamientos + permiso registrar_pagos"],
  ["HU2", "Como asistente del consultorio quiero editar los datos administrativos de un pago (medio, fecha, notas) sin poder tocar el monto, para corregir la carga sin alterar el importe cobrado.", "Media", "S", "HU1"],
  ["HU3", "Como asistente del consultorio quiero anular un pago indicando el motivo, para revertir un cobro cargado por error sin eliminar el registro ni perder el historial.", "Alta", "S", "HU1"],
  ["HU4", "Como usuario del sistema quiero consultar la caja: el listado global de pagos con filtros por rango de fechas, medio y estado, con sus totales, para controlar los ingresos del consultorio.", "Alta", "M", "HU1"],
  ["HU5", "Como administrador del consultorio quiero que el sobrepago se permita con una advertencia y que no se puedan registrar pagos en un tratamiento cancelado, para no bloquear la operación real pero avisar de las inconsistencias.", "Media", "S", "HU1"],
  ["HU6", "Como administrador del consultorio quiero que ver, registrar, editar y anular un pago exijan permisos distintos y que toda operación quede registrada con su autor, para controlar quién hace qué y poder auditarlo.", "Media", "S", "HU1 … HU3"],
]));
hijos.push(P("", { after: 120 }));

// ── Descripción de cada HU ───────────────────────────────────────────────────
hijos.push(H2("Descripción de cada Historia de Usuario"));

// HU1
hijos.push(H3("HU1 – Registrar un pago contra un tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "registrar un pago contra un tratamiento, indicando el monto, el medio de pago y la fecha,"));
hijos.push(linea("para", "dejar asentado el cobro y ver el saldo del tratamiento recalculado."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Alta correcta y saldo recalculado"));
hijos.push(linea("Dado", "el tratamiento de endodoncia de la paciente Ana Pérez, de $50.000,00 con $20.000,00 ya cobrados (saldo $30.000,00)"));
hijos.push(linea("Cuando", "se registra un pago de $10.000,00 por transferencia desde la sección «Pagos» del detalle del tratamiento"));
hijos.push(linea("Entonces", "el backend responde 201, se muestra «Pago registrado (ID N) por $ 10.000,00.», el pago aparece en la tabla como «vigente» y el saldo del tratamiento pasa a $20.000,00, con id_usuario e id_consultorio estampados."));
hijos.push(criterio("Criterio 2: Validación de campos obligatorios"));
hijos.push(linea("Dado", "que falta el medio de pago o el monto ingresado es cero"));
hijos.push(linea("Cuando", "se intenta registrar el pago"));
hijos.push(linea("Entonces", "se muestran mensajes de error por campo («El medio de pago es obligatorio.», «El monto debe ser mayor a cero.») y el pago no se crea (400)."));
hijos.push(criterio("Criterio 3: Fecha no futura y medio válido"));
hijos.push(linea("Dado", "una fecha de pago posterior al día de hoy, o un medio de pago inexistente o inactivo"));
hijos.push(linea("Cuando", "se intenta registrar el pago"));
hijos.push(linea("Entonces", "el backend responde 400 con «La fecha del pago no puede ser futura.» o «El medio de pago está inactivo.» según corresponda; si no se indica fecha, se usa la del día."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-registrar.png", "Figura 1 – Prototipo del modal «Registrar pago» desde el detalle del tratamiento (HU1)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Migración 007_pagos.sql", "ALTER TABLE aditivo: agrega id_consultorio (+ FK a consultorios, guard contra information_schema), anulado, motivo_anulacion, id_usuario_anula (+ FK a usuarios), fecha_anulacion y fecha_creacion; backfill de la fila existente al consultorio 1.", "S"],
  ["Migración 008_permisos_pagos.sql", "Alta de los permisos ver_pagos, editar_pagos y anular_pagos y asignación al rol administrador (INSERT IGNORE por código, reejecutable).", "XS"],
  ["pagos.service — crearPago", "Normaliza los datos, valida tratamiento (existe, del consultorio, no cancelado), medio activo, monto > 0 y fecha no futura; INSERT que estampa id_usuario e id_consultorio; audita accion = 'alta' dentro de la transacción; devuelve el pago y la advertencia de sobrepago si corresponde.", "M"],
  ["pagos.validator — validarDatosAlta", "Middleware que arma el arreglo errores: id_tratamiento e id_medio_pago enteros positivos, monto > 0 y acotado, fecha válida, notas acotadas.", "S"],
  ["Ruta POST /api/pagos + GET /api/pagos/opciones", "verificarToken + verificarPermiso('registrar_pagos') para el alta; opciones con los medios de pago activos, bajo ver_pagos, para poblar el selector sin exigir ver_catalogos.", "S"],
  ["Frontend — FormularioPago.jsx + SeccionPagosTratamiento.jsx", "Modal de alta con validación de cliente espejo de la del backend, embebido en el detalle del tratamiento; refresco silencioso del saldo del tratamiento tras el alta.", "M"],
  ["Pruebas del alta y sus validaciones", "Los tres criterios vía API (curl) y en pantalla.", "S"],
  ["", "Total", "S/M"],
]));
hijos.push(P("", { after: 120 }));

// HU2
hijos.push(H3("HU2 – Editar los datos administrativos de un pago"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "corregir el medio de pago, la fecha y las notas de un pago ya registrado, sin poder modificar el monto,"));
hijos.push(linea("para", "arreglar una carga administrativa incorrecta sin alterar el importe efectivamente cobrado."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Edición administrativa permitida"));
hijos.push(linea("Dado", "un pago vigente cargado como «efectivo»"));
hijos.push(linea("Cuando", "se cambia el medio a «tarjeta» y se agrega una nota, y se guarda"));
hijos.push(linea("Entonces", "el backend responde 200, se muestra «Pago modificado correctamente.» y cada campo cambiado deja una fila en el historial (valor anterior → valor nuevo)."));
hijos.push(criterio("Criterio 2: El monto no se edita"));
hijos.push(linea("Dado", "un pago vigente de $10.000,00"));
hijos.push(linea("Cuando", "se envía una modificación con un monto distinto"));
hijos.push(linea("Entonces", "el sistema rechaza el cambio (409) con «El monto de un pago no se edita: anulá y registrá uno nuevo.» y en la pantalla el campo Monto aparece deshabilitado."));
hijos.push(criterio("Criterio 3: Un pago anulado no se edita"));
hijos.push(linea("Dado", "un pago ya anulado"));
hijos.push(linea("Cuando", "se intenta modificar cualquiera de sus campos"));
hijos.push(linea("Entonces", "el sistema responde 409 «Un pago anulado no se puede editar.»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-editar.png", "Figura 2 – Prototipo del modal «Editar pago» con el monto bloqueado (HU2)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pagos.service — actualizarPago", "Verifica que el pago exista y pertenezca al consultorio (404); rechaza (409) si está anulado o si el monto entrante difiere del actual; aplica sólo id_medio_pago, fecha_pago y notas.", "M"],
  ["Validaciones de la edición", "Medio de pago existente y activo cuando cambia; fecha no futura cuando cambia.", "S"],
  ["Ruta PUT /api/pagos/:id", "verificarToken + verificarPermiso('editar_pagos'); valida el id y el cuerpo.", "XS"],
  ["Registro en auditoría", "Por cada campo que cambia inserta una fila en auditoria_cambios con campo, valor_anterior, valor_nuevo, id_usuario y fecha, dentro de la misma transacción.", "S"],
  ["Frontend — modo edición en FormularioPago.jsx", "Campo Monto deshabilitado con la leyenda de por qué; sólo envía los campos permitidos; renderiza el arreglo errores del backend.", "S"],
  ["Pruebas de los criterios de aceptación", "Edición administrativa, bloqueo del monto y bloqueo de edición de un pago anulado.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU3
hijos.push(H3("HU3 – Anular un pago con motivo"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "anular un pago indicando el motivo,"));
hijos.push(linea("para", "revertir un cobro cargado por error sin eliminar el registro de la base ni perder su historial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Anulación con motivo"));
hijos.push(linea("Dado", "un pago vigente de $25.000,00"));
hijos.push(linea("Cuando", "se lo anula indicando el motivo «Pago cargado por error en el tratamiento equivocado» (mínimo 5 caracteres)"));
hijos.push(linea("Entonces", "el backend responde 200, el pago queda «anulado» con el motivo, el actor y la fecha de anulación, deja de contar para el saldo del tratamiento y para los totales de caja, y la acción queda en el historial."));
hijos.push(criterio("Criterio 2: Motivo obligatorio"));
hijos.push(linea("Dado", "el pedido de anulación de un pago"));
hijos.push(linea("Cuando", "el motivo está vacío o tiene menos de 5 caracteres"));
hijos.push(linea("Entonces", "el sistema responde 400 «El motivo de anulación es obligatorio.» / «El motivo de anulación debe tener al menos 5 caracteres.» y el pago no se anula."));
hijos.push(criterio("Criterio 3: Sin doble anulación y sin reactivar"));
hijos.push(linea("Dado", "un pago ya anulado"));
hijos.push(linea("Cuando", "se intenta anularlo de nuevo"));
hijos.push(linea("Entonces", "el sistema responde 409 «El pago ya está anulado.»; no existe una operación para revertir la anulación."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-anular.png", "Figura 3 – Prototipo del modal «Anular pago» con motivo obligatorio (HU3)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Columnas de anulación (migración 007)", "anulado, motivo_anulacion, id_usuario_anula (+ FK), fecha_anulacion: guardan la baja lógica y su trazabilidad.", "XS"],
  ["pagos.service — anularPago", "Valida el motivo (mín. 5 caracteres) y que el pago no esté ya anulado; UPDATE que setea anulado = 1, motivo, actor y fecha; audita accion = 'anulacion' (campo 'anulado', 0 → 1) en la transacción.", "M"],
  ["Ruta PATCH /api/pagos/:id/anular", "verificarToken + verificarPermiso('anular_pagos'); valida el id y el motivo.", "S"],
  ["Ajuste en tratamientos.service.js", "Los tres SUM(monto) sobre pagos (saldo del listado, tope de precio en la edición, bloqueo de cancelación) pasan a filtrar AND anulado = 0.", "S"],
  ["Frontend — AnularPagoModal.jsx", "Motivo obligatorio (mín. 5); la fila anulada se muestra tachada y sin la acción «Anular»; refresco silencioso del saldo del tratamiento.", "M"],
  ["Pruebas del bloqueo y de la conservación del historial", "Anulación con motivo, rechazo sin motivo, rechazo de doble anulación y verificación de que el pago anulado sigue visible en «todos».", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU4
hijos.push(H3("HU4 – Consulta: la caja del consultorio"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "consultar el listado global de pagos filtrando por rango de fechas, medio de pago y estado, con los totales por estado,"));
hijos.push(linea("para", "controlar los ingresos del consultorio y encontrar un pago puntual."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Filtros y totales"));
hijos.push(linea("Dado", "la pantalla «Pagos»"));
hijos.push(linea("Cuando", "se filtra por estado «vigentes», por el medio «efectivo» y por un rango de fechas de pago"));
hijos.push(linea("Entonces", "se muestran únicamente los pagos que coinciden, con su paciente y tratamiento, y los totales «Total vigente» y «Total anulado» reflejan el conjunto filtrado."));
hijos.push(linea("Nota:", "cada fila enlaza al detalle del tratamiento correspondiente."));
hijos.push(criterio("Criterio 2: Sin resultados"));
hijos.push(linea("Dado", "que ninguna combinación de filtros arroja coincidencias"));
hijos.push(linea("Cuando", "se aplican los filtros"));
hijos.push(linea("Entonces", "se muestra una lista vacía con el mensaje «Sin resultados»."));
hijos.push(criterio("Criterio 3: Aislamiento por consultorio"));
hijos.push(linea("Dado", "un usuario autenticado en un consultorio"));
hijos.push(linea("Cuando", "consulta la caja o el detalle de un pago"));
hijos.push(linea("Entonces", "sólo obtiene pagos de su propio consultorio, aun manipulando los parámetros de la petición (todas las queries filtran por req.usuario.id_consultorio)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-caja.png", "Figura 4 – Prototipo de la pantalla «Pagos» — caja con filtros y totales (HU4)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pagos.service — listarPagos", "WHERE por id_consultorio; filtros por id_tratamiento, id_medio_pago, rango de DATE(fecha_pago) y estado (vigentes / anulados / todos); orden fecha_desc / fecha_asc; LIMIT/OFFSET y COUNT total; totales vigente / anulado sobre el conjunto filtrado.", "L"],
  ["Resumen por tratamiento", "Cuando se filtra por id_tratamiento agrega resumen: precio, total pagado (pagos vigentes) y saldo.", "S"],
  ["pagos.validator — validarFiltrosListado", "Valida ?id_tratamiento, ?id_medio_pago, ?estado, ?orden, ?desde, ?hasta (coherentes), ?pagina y ?porPagina (1–100).", "S"],
  ["Rutas GET /api/pagos y GET /api/pagos/:id", "verificarToken + verificarPermiso('ver_pagos'); el detalle agrega el historial de auditoría con el actor.", "S"],
  ["Frontend — PaginaPagos.jsx", "Filtros de estado / medio / fechas, selector de orden, totales, paginación, estado «Sin resultados», enlace al detalle del tratamiento y acción «Anular» por fila.", "M"],
  ["Integración — AppRouter.jsx y LayoutPrincipal.jsx", "Ruta /panel/pagos protegida por ver_pagos, ítem «Pagos» en el menú y título en el breadcrumb.", "XS"],
  ["Pruebas de filtros, totales y aislamiento", "Verificar cada filtro, los totales, «Sin resultados» y que un consultorio no vea datos de otro.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU5
hijos.push(H3("HU5 – Sobrepago con advertencia y bloqueo en tratamiento cancelado"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "que un pago que hace superar el precio del tratamiento se registre igual pero con una advertencia, y que no se puedan registrar pagos en un tratamiento cancelado,"));
hijos.push(linea("para", "no bloquear la operación real del mostrador pero avisar de las inconsistencias."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Sobrepago permitido con advertencia"));
hijos.push(linea("Dado", "el tratamiento de $50.000,00 con $30.000,00 ya cobrados (saldo $20.000,00)"));
hijos.push(linea("Cuando", "se registra un pago de $25.000,00"));
hijos.push(linea("Entonces", "el pago se registra (201) y la respuesta incluye advertencia: «El total pagado supera el precio del tratamiento.», que la pantalla muestra como un banner amarillo sin impedir la operación."));
hijos.push(criterio("Criterio 2: No se paga un tratamiento cancelado"));
hijos.push(linea("Dado", "un tratamiento en estado «cancelado»"));
hijos.push(linea("Cuando", "se intenta registrar un pago contra él"));
hijos.push(linea("Entonces", "el backend responde 409 «No se pueden registrar pagos en un tratamiento cancelado.» y en la pantalla el botón «Registrar pago» no se ofrece."));
hijos.push(criterio("Criterio 3: El saldo ignora los pagos anulados"));
hijos.push(linea("Dado", "un tratamiento con un pago vigente y uno anulado"));
hijos.push(linea("Cuando", "se consulta su saldo (en el detalle del tratamiento o en el resumen de la caja)"));
hijos.push(linea("Entonces", "el total pagado y el saldo sólo cuentan los pagos vigentes; el pago anulado figura en los totales de «anulado»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig5-sobrepago.png", "Figura 5 – Prototipo de la sección «Pagos» con la advertencia de sobrepago (HU5)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Constante PERMITIR_SOBREPAGO y chequeo en crearPago", "Si Σ pagos vigentes + monto > precio, se registra igual y se devuelve advertencia; la constante en true permite invertir la política a un 409.", "S"],
  ["Chequeo de tratamiento no cancelado", "asegurarTratamientoUtilizable lee el estado del tratamiento y lanza 409 si es «cancelado».", "S"],
  ["Saldo con pagos vigentes", "sumarPagosVigentes (AND anulado = 0) alimenta el resumen, la advertencia de sobrepago y el ajuste en tratamientos.service.js.", "S"],
  ["Frontend — banner de advertencia", "SeccionPagosTratamiento.jsx muestra la advertencia devuelta por el alta y el flag resumen.sobrepago como banner amarillo; oculta «Registrar pago» si el tratamiento está cancelado.", "S"],
  ["Pruebas de los criterios", "Sobrepago con advertencia, rechazo en tratamiento cancelado y saldo que ignora los anulados.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU6
hijos.push(H3("HU6 – Permisos diferenciados y trazabilidad"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "que ver, registrar, editar y anular un pago exijan permisos distintos y que toda operación quede registrada con su autor,"));
hijos.push(linea("para", "controlar quién puede hacer qué y poder auditarlo después."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Sólo lectura sin permisos de escritura"));
hijos.push(linea("Dado", "un usuario con ver_pagos pero sin registrar_pagos ni anular_pagos"));
hijos.push(linea("Cuando", "abre el detalle de un tratamiento"));
hijos.push(linea("Entonces", "ve el saldo y la tabla de pagos, pero no aparecen el botón «Registrar pago» ni la acción «Anular», y el backend responde 403 a POST y PATCH."));
hijos.push(criterio("Criterio 2: El menú y la caja exigen ver_pagos"));
hijos.push(linea("Dado", "un usuario sin ver_pagos"));
hijos.push(linea("Cuando", "inicia sesión"));
hijos.push(linea("Entonces", "el ítem «Pagos» no aparece en el menú lateral y GET /api/pagos responde 403; el 401 sin token responde «No se envió token de autenticación.»."));
hijos.push(criterio("Criterio 3: Trazabilidad del actor"));
hijos.push(linea("Dado", "que un usuario registra, edita o anula un pago"));
hijos.push(linea("Cuando", "se guarda el cambio"));
hijos.push(linea("Entonces", "la fila de auditoria_cambios queda con id_usuario = el usuario autenticado y la fecha del cambio, dentro de la misma transacción; la anulación además estampa id_usuario_anula y fecha_anulacion en el pago."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig7-permisos.png", "Figura 6 – Prototipo de la sección «Pagos» en modo de sólo lectura (HU6)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Permiso por ruta", "verificarPermiso con ver_pagos / registrar_pagos / editar_pagos / anular_pagos según el método; registrar_pagos ya existía, los otros tres los agrega la migración 008.", "S"],
  ["Filtro por id_consultorio en el service", "Todas las queries de listar / obtener / actualizar / anular incluyen id_consultorio y el alta lo estampa junto con id_usuario.", "S"],
  ["Auditoría como fuente de trazabilidad", "registrarAuditoria(conexion, …) se llama siempre con la conexión de la transacción del cambio; id_usuario = req.usuario.id_usuario.", "S"],
  ["Frontend — botones y menú según tienePermiso", "SeccionPagosTratamiento.jsx y PaginaPagos.jsx ocultan «Registrar pago» y «Anular» según los permisos; LayoutPrincipal.jsx muestra el ítem «Pagos» sólo con ver_pagos.", "S"],
  ["Pruebas de acceso", "403 por método sin permiso, ítem de menú ausente sin ver_pagos, 401 sin token y verificación del actor en auditoria_cambios.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ── Reglas de negocio ────────────────────────────────────────────────────────
hijos.push(H2("Reglas de negocio"));
hijos.push(P(
  "El ciclo de vida del pago es simple: nace «vigente» y sólo puede pasar a «anulado», que es un estado final. La baja lógica es esa anulación, con motivo obligatorio.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P("Matriz de estados del pago (fila = estado origen, columna = estado destino):", { after: 80, bold: true }));
hijos.push(tabla([2275, 3400, 3400], [
  ["Origen \\ Destino", "vigente", "anulado"],
  ["vigente", "—", "Permitida (motivo obligatorio mín. 5; permiso anular_pagos)"],
  ["anulado", "No (no existe «reactivar»)", "No (409 «El pago ya está anulado.»)"],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Reglas del alta y de la edición:", { after: 80, bold: true }));
hijos.push(tabla([2600, 6475], [
  ["Regla", "Comportamiento"],
  ["Obligatorios en el alta", "id_tratamiento, id_medio_pago y monto (> 0). Sin ellos → 400."],
  ["Tratamiento cancelado", "No se pueden registrar pagos → 409 «No se pueden registrar pagos en un tratamiento cancelado.»."],
  ["Medio de pago", "Debe existir y estar activo → 400 en caso contrario."],
  ["Fecha del pago", "Por defecto la de hoy; si se indica, no puede ser futura → 400."],
  ["Sobrepago", "Se permite (PERMITIR_SOBREPAGO = true): el pago se registra y se devuelve la advertencia «El total pagado supera el precio del tratamiento.»."],
  ["Monto", "Inmutable. Enviar un monto distinto en la edición → 409 «El monto de un pago no se edita: anulá y registrá uno nuevo.»."],
  ["Edición acotada", "Sólo id_medio_pago, fecha_pago y notas. Un pago anulado no se edita → 409."],
  ["Efecto sobre el saldo", "Sólo los pagos vigentes cuentan para el total pagado, el saldo del tratamiento y los totales de caja."],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Auditoría (tabla auditoria_cambios, entidad = 'pagos'):", { after: 80, bold: true }));
hijos.push(tabla([2000, 2600, 4475], [
  ["Acción", "Cuándo", "Qué registra"],
  ["alta", "POST /api/pagos", "id_usuario (actor), campo = 'monto', valor_nuevo = <monto>."],
  ["modificacion", "PUT /api/pagos/:id", "Una fila por campo cambiado: campo, valor_anterior, valor_nuevo, id_usuario, fecha."],
  ["anulacion", "PATCH /api/pagos/:id/anular", "campo = 'anulado', valor_anterior = '0', valor_nuevo = '1', motivo, id_usuario, fecha."],
]));
hijos.push(P(
  "Todas las escrituras de auditoría ocurren dentro de la misma transacción que el cambio auditado (getConnection + beginTransaction / commit / rollback), de modo que un cambio sin su rastro —o un rastro sin su cambio— no es posible.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Pruebas de criterios ─────────────────────────────────────────────────────
hijos.push(H2("Pruebas de criterios (Datos / Pasos / Resultado esperado)"));
hijos.push(P(
  "Las pruebas se ejecutaron contra la base real (odontología_herrera, MariaDB 10.4) con el backend levantado localmente y un JWT del rol administrador. Estado inicial: tratamiento 1 de $50.000,00 con el pago 1 de $20.000,00 vigente (saldo $30.000,00). Las altas de prueba se eliminaron al finalizar; la base quedó en su estado inicial.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([520, 2900, 2780, 2875], [
  ["Nro", "Datos", "Pasos", "Resultado esperado"],
  ["1", "Migraciones 007 y 008 sin aplicar; pago ID 1 sin columna anulado.", "Ejecutar 007_pagos.sql y 008_permisos_pagos.sql.", "Se agregan id_consultorio (+ FK), anulado, motivo_anulacion, id_usuario_anula (+ FK), fecha_anulacion y fecha_creacion; el pago ID 1 queda anulado = 0, id_consultorio = 1; se crean los permisos y se asignan al rol administrador."],
  ["2", "Tratamiento 1 (saldo $30.000).", "POST /api/pagos con id_tratamiento 1, id_medio_pago 1, monto 10000, fecha 2026-05-02.", "201; el pago nace vigente con id_usuario e id_consultorio estampados; auditoría accion = 'alta'; el saldo del tratamiento pasa a $20.000."],
  ["3", "Body sin id_medio_pago y monto 0.", "POST /api/pagos.", "400 con errores: «El medio de pago es obligatorio.» y «El monto debe ser mayor a cero.»; no se crea nada."],
  ["4", "Fecha de pago 2099-01-01.", "POST /api/pagos con esa fecha.", "400 «La fecha del pago no puede ser futura.»."],
  ["5", "id_tratamiento 999 (inexistente).", "POST /api/pagos.", "404 «El tratamiento no existe o no pertenece a este consultorio.»."],
  ["6", "Tratamiento 1 con saldo $30.000.", "POST /api/pagos con monto 25000 (Σ vigentes + monto = 55.000 > 50.000).", "201; la respuesta incluye advertencia «El total pagado supera el precio del tratamiento.»; el pago se registra."],
  ["7", "Un pago vigente.", "PUT /api/pagos/:id con un monto distinto.", "409 «El monto de un pago no se edita: anulá y registrá uno nuevo.»."],
  ["8", "Un pago vigente.", "PUT /api/pagos/:id cambiando id_medio_pago y notas.", "200; los valores se actualizan; el historial suma una fila modificacion por campo."],
  ["9", "Un pago vigente.", "PATCH /api/pagos/:id/anular sin motivo / con motivo «abc» / con motivo válido.", "400 «El motivo de anulación es obligatorio.» / «…al menos 5 caracteres.» en los dos primeros; 200 y estado «anulado» con motivo, actor y fecha en el tercero."],
  ["10", "Un pago recién anulado.", "PATCH /api/pagos/:id/anular otra vez.", "409 «El pago ya está anulado.»."],
  ["11", "Un tratamiento con un pago vigente y uno anulado.", "GET /api/pagos?id_tratamiento=1&estado=todos y GET /api/tratamientos/1.", "resumen.total_pagado y resumen.saldo (y total_cobrado / saldo del tratamiento) sólo cuentan el vigente; totales.anulado refleja el anulado."],
  ["12", "Un pago anulado.", "PUT /api/pagos/:id con cualquier campo.", "409 «Un pago anulado no se puede editar.»."],
  ["13", "Un tratamiento en estado «cancelado».", "POST /api/pagos contra ese tratamiento.", "409 «No se pueden registrar pagos en un tratamiento cancelado.»."],
  ["14", "?estado con un valor no permitido.", "GET /api/pagos?estado=basura.", "400 «El filtro estado debe ser uno de: vigentes, anulados, todos.»."],
  ["15", "Usuario con ver_tratamientos y sin ver_pagos ni registrar_pagos.", "GET /api/pagos; POST /api/pagos; revisar el menú.", "403 «No tenés permisos para realizar esta acción.» en ambas; el ítem «Pagos» no aparece en el menú."],
  ["16", "Sin header Authorization.", "GET /api/pagos.", "401 «No se envió token de autenticación.»."],
  ["17", "Cualquier alta / modificación / anulación.", "Consultar auditoria_cambios (entidad = 'pagos') para ese pago.", "Filas con id_usuario = el usuario autenticado, la acción y la fecha correspondientes."],
]));
hijos.push(P("", { after: 160 }));

// ── Consideración siguiente sprint ───────────────────────────────────────────
hijos.push(H2("Consideración para el Sprint 4.4: ABM de Gastos"));
hijos.push(P(
  "El registro de los gastos del consultorio (Gasto) queda planificado como la iteración siguiente del ABM Transaccional. A diferencia del pago, el gasto puede ser general o estar imputado a un tratamiento (gastos.id_tratamiento es NULLABLE). El ABM de gastos agregará id_consultorio y la columna anulado a la tabla gastos, reutilizará la tabla auditoria_cambios y habilitará la edición y la anulación de gastos, con permisos ver_gastos, editar_gastos y anular_gastos (registrar_gastos ya existe). Se documentará con el mismo formato aplicado en este sprint: descripción Scrum, criterios de aceptación, prototipo de interfaz, subtareas técnicas con su estimación y pruebas de criterios.",
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

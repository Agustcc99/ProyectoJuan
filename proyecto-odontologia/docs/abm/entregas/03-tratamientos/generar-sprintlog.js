/* SprintLog ABM 03 — Tratamientos (transaccional).
   Formato calcado de docs/abm/modelo/com.docx (SPRINT 4 — ABM Transaccional) y de
   docs/abm/entregas/02-pacientes/generar-sprintlog.js.
   Sprint 4 · HU13–HU19 (HU13–HU16 ya existían en com.docx; HU17–HU19 se agregan
   para el motor de estados, el detalle con historial y los permisos/auditoría). */
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
const MOCKUPS = path.join(PROY, "docs/abm/entregas/03-tratamientos/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/03-tratamientos/SprintLog-Tratamientos.docx");

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

hijos.push(H1("SPRINT 4 — ABM Transaccional"));
hijos.push(P("Registro, modificación, consulta, motor de estados y baja lógica (cancelación) de Tratamientos, la entidad transaccional núcleo del sistema."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// ── Objetivo ─────────────────────────────────────────────────────────────────
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "El Sprint 4 implementa el ABM Transaccional de Tratamiento, la entidad principal del sistema de gestión del consultorio odontológico Herrera: registra la práctica efectivamente realizada a un paciente, su precio, su ciclo de estados y su relación con los pagos que la financian.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "A diferencia de las entidades de soporte trabajadas en sprints anteriores (roles, permisos y catálogos), Tratamiento es un evento del negocio: tiene actores (paciente y usuario responsable), afecta directamente la facturación del consultorio y atraviesa un ciclo de estados definido. Su migración agrega id_consultorio con su clave foránea (alineando la tabla con el aislamiento multiconsultorio del Sprint 2), fecha_actualizacion y motivo_cancelacion, y crea la tabla genérica auditoria_cambios que también usarán los ABM de pagos y gastos. Se suman los permisos cambiar_estado_tratamientos y cancelar_tratamientos (ver_tratamientos, crear_tratamientos y editar_tratamientos ya estaban sembrados y asignados al rol administrador).",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Entidad transaccional seleccionada ───────────────────────────────────────
hijos.push(H2("Entidad transaccional seleccionada: Tratamiento"));
hijos.push(P(
  "El material distingue entre entidades de soporte y entidades transaccionales o principales (las que registran un evento del negocio). La siguiente tabla justifica la elección de Tratamiento contra las cuatro señales que define el material.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([2600, 6475], [
  ["Señal exigida", "Cómo la cumple Tratamiento"],
  ["Es un evento de negocio", "Registra una práctica que efectivamente se le realizó a un paciente, con su fecha de inicio y de fin."],
  ["Afecta procesos y métricas", "Su precio (PRECIO_PACIENTE) es la base de todo cálculo de facturación: el saldo de cada tratamiento se deriva de PRECIO_PACIENTE menos la suma de los pagos."],
  ["Tiene actores", "Paciente (a quién se le realiza, ID_PACIENTE) y usuario responsable (quién lo registra y lo modifica, ID_USUARIO, más el actor de cada cambio en auditoria_cambios)."],
  ["Tiene ciclo de estados", "pendiente → en proceso → finalizado / cancelado, con transiciones controladas por una matriz y motivo obligatorio al cancelar."],
]));
hijos.push(P(
  "Tratamiento es además el nodo central del modelo: tanto los pagos como los gastos del consultorio se registran en relación con un tratamiento, nunca al revés. La baja lógica de esta entidad no es una columna activo sino el estado «cancelado», que conserva el registro y su historial completo.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Sprint Backlog ───────────────────────────────────────────────────────────
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([700, 4600, 1050, 1000, 1725], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU13", "Como asistente del consultorio quiero registrar un nuevo tratamiento para un paciente, indicando la práctica realizada y el precio acordado, para dejar asentado el trabajo y lo que corresponde cobrar.", "Alta", "S/M", "Requiere un paciente cargado (ABM 02)"],
  ["HU14", "Como asistente del consultorio quiero modificar los datos de un tratamiento existente para corregir la práctica, el precio o las observaciones cuando la información inicial fue incompleta.", "Alta", "S/M", "HU13"],
  ["HU15", "Como usuario del sistema quiero consultar el listado de tratamientos, filtrando por estado, paciente, tipo y rango de fechas, para encontrar rápidamente el que necesito.", "Alta", "M", "HU13"],
  ["HU16", "Como asistente del consultorio quiero dar de baja lógica (cancelar) un tratamiento indicando el motivo, para cerrar su ciclo sin eliminar el registro ni perder el historial.", "Alta", "S", "HU13, HU15"],
  ["HU17", "Como asistente del consultorio quiero que el tratamiento avance por su ciclo de estados mediante transiciones controladas, para que su situación refleje siempre el trabajo real y no se salteen pasos.", "Alta", "M", "HU13"],
  ["HU18", "Como usuario del sistema quiero abrir el detalle de un tratamiento con su saldo, sus pagos, sus gastos imputados y el historial completo de cambios, para entender en una pantalla qué pasó y quién lo modificó.", "Media", "M", "HU13 … HU17"],
  ["HU19", "Como administrador del consultorio quiero que cada operación sobre tratamientos exija su permiso y quede registrada con su autor, para controlar quién puede hacer qué y poder auditarlo.", "Media", "S", "HU13 … HU17"],
]));
hijos.push(P("", { after: 120 }));

// ── Descripción de cada HU ───────────────────────────────────────────────────
hijos.push(H2("Descripción de cada Historia de Usuario"));

// HU13
hijos.push(H3("HU13 – Alta de tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "registrar un nuevo tratamiento para un paciente, indicando la práctica realizada, el precio acordado y la fecha de inicio,"));
hijos.push(linea("para", "dejar asentado el trabajo y lo que corresponde cobrar."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Alta correcta"));
hijos.push(linea("Dado", "el formulario «Nuevo tratamiento» sobre la paciente Ana Pérez"));
hijos.push(linea("Cuando", "se selecciona el tipo «endodoncia», se ingresa el precio 50.000,00 y la fecha de inicio, y se guarda"));
hijos.push(linea("Entonces", "el backend responde 201, se muestra «Tratamiento creado (ID N) en estado «pendiente».» y el tratamiento aparece en el listado en estado «pendiente», con id_consultorio e id_usuario estampados."));
hijos.push(criterio("Criterio 2: Validación de campos obligatorios"));
hijos.push(linea("Dado", "que falta el tipo de tratamiento o el precio ingresado es cero"));
hijos.push(linea("Cuando", "se intenta guardar"));
hijos.push(linea("Entonces", "se muestran mensajes de error por campo («El tipo de tratamiento es obligatorio.», «El precio debe ser mayor a cero.») y el tratamiento no se crea (400)."));
hijos.push(criterio("Criterio 3: Estado inicial no editable"));
hijos.push(linea("Dado", "el formulario de alta"));
hijos.push(linea("Cuando", "se lo completa y se guarda"));
hijos.push(linea("Entonces", "el estado no es un campo del formulario: el tratamiento se crea siempre en «pendiente», y el paciente y el tipo deben existir y estar activos."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-alta.png", "Figura 1 – Prototipo de la pantalla «Nuevo tratamiento» (HU13)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Migración 005_tratamientos.sql", "ALTER TABLE aditivo: agrega id_consultorio (+ FK a consultorios), fecha_actualizacion y motivo_cancelacion; backfill de la fila existente al consultorio 1; crea la tabla genérica auditoria_cambios.", "S"],
  ["Migración 006_permisos_tratamientos.sql", "Alta de los permisos cambiar_estado_tratamientos y cancelar_tratamientos y asignación al rol administrador (INSERT IGNORE por código, reejecutable).", "XS"],
  ["tratamientos.service — crearTratamiento", "Normaliza los datos, valida paciente activo del consultorio y tipo activo, fuerza id_estado = 1 (pendiente), INSERT que estampa id_usuario e id_consultorio, audita accion = 'alta' dentro de la transacción.", "M"],
  ["tratamientos.validator — validarDatosAlta", "Middleware que arma el arreglo errores: id_paciente e id_tipo_tratamiento enteros positivos, precio > 0, descripción y observaciones acotadas, fecha de inicio válida.", "S"],
  ["Ruta POST /api/tratamientos", "verificarToken + verificarPermiso('crear_tratamientos'); responde 201 con el tratamiento creado.", "XS"],
  ["tratamientos.service — obtenerOpciones + ruta GET /api/tratamientos/opciones", "Devuelve tipos activos, estados y pacientes activos del consultorio para poblar los selectores del formulario sin exigir ver_pacientes ni ver_catalogos.", "S"],
  ["Frontend — FormularioTratamiento.jsx + alta en PaginaTratamientos.jsx / FichaPacientePage.jsx", "Modal de alta con validación de cliente espejo de la del backend; desde la ficha del paciente el selector de paciente queda fijado.", "M"],
  ["Pruebas del alta y sus validaciones", "Los tres criterios vía API (curl) y en pantalla.", "S"],
  ["", "Total", "S/M"],
]));
hijos.push(P("", { after: 120 }));

// HU14
hijos.push(H3("HU14 – Modificación de tratamiento"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "corregir la práctica, el precio, las fechas y las observaciones de un tratamiento existente, respetando lo que cada estado permite tocar,"));
hijos.push(linea("para", "mantener la información vigente cuando la carga inicial fue incompleta o errónea."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Modificación permitida"));
hijos.push(linea("Dado", "un tratamiento en estado «pendiente»"));
hijos.push(linea("Cuando", "se cambia el tipo a «perno y corona» y el precio a 65.000,00 y se guarda"));
hijos.push(linea("Entonces", "el backend responde 200, se muestra «El tratamiento se actualizó correctamente.», los nuevos valores se reflejan en el detalle y en el listado y cada campo cambiado deja una fila en el historial (valor anterior → valor nuevo)."));
hijos.push(criterio("Criterio 2: Precio menor a lo ya cobrado"));
hijos.push(linea("Dado", "un tratamiento de 50.000 con 20.000,00 ya cobrados en pagos"));
hijos.push(linea("Cuando", "se intenta bajar el precio a 15.000"));
hijos.push(linea("Entonces", "el sistema bloquea el cambio (409) e informa «El precio no puede ser menor al total ya cobrado ($20000.00).»."));
hijos.push(criterio("Criterio 3: Campos bloqueados por estado"));
hijos.push(linea("Dado", "un tratamiento en estado «en proceso»"));
hijos.push(linea("Cuando", "se lo edita"));
hijos.push(linea("Entonces", "el paciente, el tipo y la fecha de inicio se muestran deshabilitados; si el tratamiento está «finalizado» o «cancelado» sólo se editan las observaciones y cualquier otro cambio responde 409 «Tratamiento <estado>, no editable.»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-editar.png", "Figura 2 – Prototipo de la pantalla «Editar tratamiento» con campos bloqueados por estado (HU14)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["tratamientos.service — actualizarTratamiento", "Verifica que el tratamiento exista y pertenezca al consultorio (404); calcula los campos editables según el estado y rechaza (409) los cambios sobre campos bloqueados.", "M"],
  ["Regla de negocio de precio", "Rechaza (409) un precio menor al total ya cobrado en pagos y un precio menor o igual a cero.", "S"],
  ["Ruta PUT /api/tratamientos/:id", "verificarToken + verificarPermiso('editar_tratamientos'); valida el id y el cuerpo.", "S"],
  ["Registro en auditoría", "Por cada campo que cambia inserta una fila en auditoria_cambios con campo, valor_anterior, valor_nuevo, id_usuario y fecha, dentro de la misma transacción.", "M"],
  ["Frontend — modo edición en FormularioTratamiento.jsx", "Habilita/deshabilita cada campo según el estado y muestra la leyenda correspondiente; renderiza el arreglo errores del backend.", "M"],
  ["Pruebas de los criterios de aceptación", "Edición normal, bloqueo de precio y bloqueo de edición sobre tratamientos finalizados/cancelados.", "S"],
  ["", "Total", "S/M"],
]));
hijos.push(P("", { after: 120 }));

// HU15
hijos.push(H3("HU15 – Consulta: listado con filtros, búsqueda y orden"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "listar los tratamientos filtrando por estado, paciente, tipo y rango de fechas, buscando por texto y ordenando el resultado,"));
hijos.push(linea("para", "encontrar rápidamente el tratamiento que necesito consultar."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Filtros, búsqueda y orden"));
hijos.push(linea("Dado", "el listado de tratamientos"));
hijos.push(linea("Cuando", "se filtra por estado «en proceso», se busca «Pérez» y se ordena por fecha de inicio descendente"));
hijos.push(linea("Entonces", "se muestran únicamente las coincidencias, en ese orden, junto con el precio y el saldo de cada una."));
hijos.push(criterio("Criterio 2: Sin resultados"));
hijos.push(linea("Dado", "que ninguna combinación de filtros arroja coincidencias"));
hijos.push(linea("Cuando", "se aplican los filtros"));
hijos.push(linea("Entonces", "se muestra una lista vacía con el mensaje «Sin resultados»."));
hijos.push(criterio("Criterio 3: Aislamiento por consultorio"));
hijos.push(linea("Dado", "un usuario autenticado en un consultorio"));
hijos.push(linea("Cuando", "consulta el listado o el detalle"));
hijos.push(linea("Entonces", "sólo obtiene tratamientos de su propio consultorio, aun manipulando los parámetros de la petición (todas las queries filtran por req.usuario.id_consultorio)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-listado.png", "Figura 3 – Prototipo de la pantalla «Tratamientos» — listado y filtros (HU15)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["tratamientos.service — listarTratamientos", "WHERE por id_consultorio; filtros por id_estado, id_paciente e id_tipo; LIKE sobre descripción y nombre del paciente; rango de fechas de inicio; orden fecha_desc / fecha_asc / actualizacion_desc; LIMIT/OFFSET y COUNT total.", "L"],
  ["Cálculo de saldo por tratamiento", "Deriva total_cobrado (SUM de pagos) y saldo = precio − total_cobrado en la propia query, sin almacenarlos.", "M"],
  ["tratamientos.validator — validarFiltrosListado", "Valida ?id_estado (1–4), ?id_paciente, ?id_tipo, ?orden, ?desde, ?hasta, ?pagina y ?porPagina (1–100).", "S"],
  ["Ruta GET /api/tratamientos", "verificarToken + verificarPermiso('ver_tratamientos').", "S"],
  ["Frontend — PaginaTratamientos.jsx", "Filtros de estado / tipo / fechas, buscador, selector de orden, paginación, chip de estado con color y estado «Sin resultados».", "M"],
  ["Pruebas de filtros, orden y aislamiento", "Verificar cada filtro, el orden, «Sin resultados» y que un consultorio no vea datos de otro.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU16
hijos.push(H3("HU16 – Baja lógica de tratamiento (cancelación)"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "cancelar un tratamiento indicando el motivo,"));
hijos.push(linea("para", "cerrar su ciclo sin eliminar el registro de la base de datos ni perder su historial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Cancelación con motivo"));
hijos.push(linea("Dado", "un tratamiento en estado «pendiente» sin pagos"));
hijos.push(linea("Cuando", "se lo cancela indicando el motivo «El paciente no continuó el tratamiento» (mínimo 5 caracteres)"));
hijos.push(linea("Entonces", "el estado pasa a «cancelado», el motivo queda registrado en motivo_cancelacion y en el historial, y el tratamiento deja de figurar entre los pendientes."));
hijos.push(criterio("Criterio 2: Cancelación con pagos vigentes"));
hijos.push(linea("Dado", "un tratamiento con un pago registrado de 20.000,00"));
hijos.push(linea("Cuando", "se intenta cancelarlo"));
hijos.push(linea("Entonces", "el sistema rechaza la operación (409) e indica «No se puede cancelar: el tratamiento tiene pagos registrados. Anulá los pagos primero.»."));
hijos.push(criterio("Criterio 3: Conservación del registro"));
hijos.push(linea("Dado", "un tratamiento cancelado"));
hijos.push(linea("Cuando", "se lo busca filtrando por estado «cancelado»"));
hijos.push(linea("Entonces", "aparece con todos sus datos y su historial completo, sin haberse eliminado de la base."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-cancelar.png", "Figura 4 – Prototipo del modal «Cambiar estado» con motivo de cancelación (HU16)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Columnas motivo_cancelacion y auditoria_cambios.motivo", "Agregadas en la migración 005; guardan el motivo de la baja lógica.", "XS"],
  ["tratamientos.service — cambiarEstadoTratamiento (destino cancelado)", "Valida el motivo (mín. 5 caracteres) y que no existan pagos antes de permitir la baja lógica; setea motivo_cancelacion y audita accion = 'cancelacion'.", "M"],
  ["Ruta PATCH /api/tratamientos/:id/estado con permiso extra", "verificarPermiso('cambiar_estado_tratamientos') y, si el destino es «cancelado», también verificarPermiso('cancelar_tratamientos').", "S"],
  ["Frontend — CambiarEstadoModal.jsx", "Motivo obligatorio cuando el destino es «cancelado»; la opción «cancelado» sólo aparece si el usuario tiene el permiso.", "M"],
  ["Pruebas del bloqueo y de la conservación del historial", "Cancelación con motivo, rechazo con pagos, rechazo sin permiso y verificación de que el tratamiento cancelado no se elimina.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// HU17
hijos.push(H3("HU17 – Motor de estados: transiciones controladas"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "asistente del consultorio"));
hijos.push(linea("quiero", "que el tratamiento avance por su ciclo de estados (pendiente → en proceso → finalizado) mediante transiciones controladas,"));
hijos.push(linea("para", "que su situación refleje siempre el trabajo real y no se salteen pasos."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Transición válida"));
hijos.push(linea("Dado", "un tratamiento en estado «pendiente»"));
hijos.push(linea("Cuando", "se lo pasa a «en proceso» y luego a «finalizado»"));
hijos.push(linea("Entonces", "cada cambio se acepta, al pasar a «en proceso» se completa la fecha de inicio si estaba vacía, al finalizar se completa la fecha de fin con la fecha del día, y cada transición queda en el historial."));
hijos.push(criterio("Criterio 2: Transición inválida"));
hijos.push(linea("Dado", "un tratamiento en estado «pendiente»"));
hijos.push(linea("Cuando", "se intenta pasarlo directo a «finalizado»"));
hijos.push(linea("Entonces", "el sistema responde 409 «Debe iniciarse antes de finalizar.» y el estado no cambia."));
hijos.push(criterio("Criterio 3: Estados finales"));
hijos.push(linea("Dado", "un tratamiento «finalizado» o «cancelado»"));
hijos.push(linea("Cuando", "se intenta cambiar su estado"));
hijos.push(linea("Entonces", "el sistema responde 409 «El tratamiento está <estado>: no admite cambios de estado.» y en la pantalla el botón «Cambiar estado» no se ofrece."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig5-estado.png", "Figura 5 – Prototipo del modal «Cambiar estado» (transición hacia «finalizado») (HU17)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["tratamientos.service — matriz TRANSICIONES_VALIDAS y cambiarEstadoTratamiento", "Define {1:[2,4], 2:[3,4], 3:[], 4:[]} y valida el destino contra ella; mensajes propios para pendiente→finalizado y para los estados finales.", "M"],
  ["Autocompletado de fechas", "Al pasar a «finalizado» setea fecha_fin = CURDATE() si está vacía; al pasar a «en proceso» setea fecha_inicio = CURDATE() si está vacía.", "S"],
  ["Auditoría de la transición", "Inserta en auditoria_cambios accion = 'cambio_estado', campo = 'id_estado', valor_anterior y valor_nuevo con los nombres de estado.", "S"],
  ["Frontend — transiciones alcanzables", "El detalle expone transiciones_posibles y CambiarEstadoModal.jsx sólo ofrece esas opciones; el botón se oculta si no hay ninguna.", "M"],
  ["Pruebas del motor de estados", "Transición válida encadenada, transición inválida directa y bloqueo desde estados finales.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU18
hijos.push(H3("HU18 – Detalle del tratamiento con historial de auditoría"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "abrir el detalle de un tratamiento y ver su saldo, sus pagos, sus gastos imputados y el historial completo de cambios,"));
hijos.push(linea("para", "entender en una sola pantalla qué pasó con ese tratamiento y quién lo modificó."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Detalle completo"));
hijos.push(linea("Dado", "el listado de tratamientos"));
hijos.push(linea("Cuando", "se abre un tratamiento"));
hijos.push(linea("Entonces", "se muestran el precio, el total cobrado y el saldo, la lista de pagos y de gastos imputados, y el historial de cambios con campo, valor anterior, valor nuevo, fecha y actor."));
hijos.push(criterio("Criterio 2: Historial de una modificación"));
hijos.push(linea("Dado", "un tratamiento cuyo precio pasó de 50.000 a 65.000"));
hijos.push(linea("Cuando", "se abre el detalle"));
hijos.push(linea("Entonces", "el historial muestra «precio_paciente: 50000 → 65000», con el usuario que lo hizo y la fecha del cambio."));
hijos.push(criterio("Criterio 3: Cancelación en el historial"));
hijos.push(linea("Dado", "un tratamiento cancelado"));
hijos.push(linea("Cuando", "se abre el detalle"));
hijos.push(linea("Entonces", "el historial incluye la acción de cancelación con el motivo registrado."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig6-detalle.png", "Figura 6 – Prototipo de la pantalla «Detalle del tratamiento» con la línea de tiempo del historial (HU18)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["tratamientos.service — obtenerTratamientoPorId", "Trae el tratamiento del consultorio (404 si no) y le agrega historial (JOIN a usuarios para el actor), pagos (JOIN a medios_pago), gastos (JOIN a tipos_gasto), total_cobrado, saldo y transiciones_posibles.", "M"],
  ["Ruta GET /api/tratamientos/:id", "verificarToken + verificarPermiso('ver_tratamientos'); valida el id.", "XS"],
  ["Frontend — DetalleTratamientoPage.jsx", "Ruta /panel/tratamientos/:id; paneles de datos, pagos, gastos e historial como línea de tiempo; badge de estado con color.", "M"],
  ["Integración — AppRouter.jsx y LayoutPrincipal.jsx", "Ruta tratamientos/:id protegida por ver_tratamientos y título «Detalle del tratamiento» en el breadcrumb.", "XS"],
  ["Pruebas del detalle", "Detalle completo, historial de una modificación y de una cancelación.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// HU19
hijos.push(H3("HU19 – Permisos diferenciados y trazabilidad"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "que ver, crear, editar, cambiar de estado y cancelar un tratamiento exijan permisos distintos y que toda operación quede registrada con su autor,"));
hijos.push(linea("para", "controlar quién puede hacer qué y poder auditarlo después."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Sólo lectura sin permisos de escritura"));
hijos.push(linea("Dado", "un usuario con ver_tratamientos pero sin editar_tratamientos ni cambiar_estado_tratamientos"));
hijos.push(linea("Cuando", "abre el detalle de un tratamiento"));
hijos.push(linea("Entonces", "ve los datos y el historial, los botones «Editar» y «Cambiar estado» aparecen deshabilitados y el backend responde 403 a PUT y PATCH."));
hijos.push(criterio("Criterio 2: Permiso extra para cancelar"));
hijos.push(linea("Dado", "un usuario con cambiar_estado_tratamientos pero sin cancelar_tratamientos"));
hijos.push(linea("Cuando", "intenta pasar un tratamiento a «cancelado»"));
hijos.push(linea("Entonces", "el sistema responde 403; las demás transiciones (pendiente → en proceso, en proceso → finalizado) sí se permiten."));
hijos.push(criterio("Criterio 3: Trazabilidad del actor"));
hijos.push(linea("Dado", "que un usuario edita o cambia el estado de un tratamiento"));
hijos.push(linea("Cuando", "se guarda el cambio"));
hijos.push(linea("Entonces", "la fila de auditoria_cambios queda con id_usuario = el usuario autenticado y la fecha del cambio, dentro de la misma transacción."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig7-permisos.png", "Figura 7 – Prototipo del detalle en modo de sólo lectura (HU19)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([2900, 4900, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Permiso por ruta", "verificarPermiso con ver / crear / editar / cambiar_estado_tratamientos según el método; middleware extra que exige cancelar_tratamientos cuando el body pide id_estado = 4.", "S"],
  ["Filtro por id_consultorio en el service", "Todas las queries de listar / obtener / actualizar / cambiar estado incluyen id_consultorio y todo INSERT lo estampa junto con id_usuario.", "S"],
  ["Auditoría como fuente de trazabilidad", "registrarAuditoria(conexion, …) se llama siempre con la conexión de la transacción del cambio; id_usuario = req.usuario.id_usuario.", "S"],
  ["Frontend — botones según tienePermiso", "PaginaTratamientos.jsx y DetalleTratamientoPage.jsx ocultan o deshabilitan «Nuevo», «Editar» y «Cambiar estado» según los permisos del usuario.", "S"],
  ["Pruebas de acceso", "403 por método sin permiso, 403 al cancelar sin cancelar_tratamientos y verificación del actor en auditoria_cambios.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ── Reglas de negocio ────────────────────────────────────────────────────────
hijos.push(H2("Reglas de negocio del motor de estados"));
hijos.push(P(
  "El ciclo de vida del tratamiento se controla con una matriz de transiciones. La baja lógica es el estado «cancelado»; «finalizado» y «cancelado» son estados finales.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P("Matriz de transiciones (fila = estado origen, columna = estado destino):", { after: 80, bold: true }));
hijos.push(tabla([1875, 1800, 1800, 1800, 1800], [
  ["Origen \\ Destino", "pendiente", "en proceso", "finalizado", "cancelado"],
  ["pendiente", "—", "Permitida", "No («Debe iniciarse antes de finalizar.»)", "Permitida (motivo obligatorio)"],
  ["en proceso", "No", "—", "Permitida (setea fecha de fin)", "Permitida (motivo obligatorio)"],
  ["finalizado", "No", "No", "—", "No (estado final)"],
  ["cancelado", "No", "No", "No", "— (estado final)"],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Campos editables según el estado:", { after: 80, bold: true }));
hijos.push(tabla([1700, 3900, 3475], [
  ["Estado", "Campos editables", "Bloqueados"],
  ["pendiente", "paciente, tipo, descripción, precio, fecha de inicio, fecha de fin, observaciones", "id_tratamiento"],
  ["en proceso", "descripción, precio, fecha de fin, observaciones", "paciente, tipo, fecha de inicio, id_tratamiento"],
  ["finalizado / cancelado", "observaciones", "todo el resto → 409 «Tratamiento <estado>, no editable.»"],
]));
hijos.push(P("", { after: 100 }));
hijos.push(P("Auditoría (tabla auditoria_cambios, entidad = 'tratamientos'):", { after: 80, bold: true }));
hijos.push(tabla([2000, 2400, 4675], [
  ["Acción", "Cuándo", "Qué registra"],
  ["alta", "POST /api/tratamientos", "id_usuario (actor), valor_nuevo = 'pendiente'."],
  ["modificacion", "PUT /api/tratamientos/:id", "Una fila por campo cambiado: campo, valor_anterior, valor_nuevo, id_usuario, fecha."],
  ["cambio_estado", "PATCH /:id/estado (destino ≠ cancelado)", "campo = 'id_estado', valor_anterior y valor_nuevo con los nombres de estado, id_usuario, fecha."],
  ["cancelacion", "PATCH /:id/estado (destino = cancelado)", "Igual que cambio_estado más el motivo de cancelación."],
]));
hijos.push(P(
  "Todas las escrituras de auditoría ocurren dentro de la misma transacción que el cambio auditado (getConnection + beginTransaction / commit / rollback), de modo que un cambio sin su rastro —o un rastro sin su cambio— no es posible.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// ── Pruebas de criterios ─────────────────────────────────────────────────────
hijos.push(H2("Pruebas de criterios (Datos / Pasos / Resultado esperado)"));
hijos.push(P(
  "Las pruebas se ejecutaron contra la base real (odontología_herrera) con el backend levantado localmente y un JWT del rol administrador. El tratamiento existente (ID 1, «en proceso», $50.000 con $20.000 cobrados) se conserva intacto; las altas de prueba se eliminaron al finalizar.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(tabla([520, 2900, 2780, 2875], [
  ["Nro", "Datos", "Pasos", "Resultado esperado"],
  ["1", "Migraciones 005 y 006 sin aplicar; tratamiento ID 1 en «en proceso».", "Ejecutar 005_tratamientos.sql y 006_permisos_tratamientos.sql.", "Se agregan id_consultorio (+ FK), fecha_actualizacion y motivo_cancelacion; se crea auditoria_cambios; el tratamiento ID 1 conserva todos sus datos con id_consultorio = 1."],
  ["2", "Paciente Ana Pérez activo; tipo «endodoncia» activo.", "POST /api/tratamientos con id_paciente, id_tipo_tratamiento, precio 50000 y fecha de inicio.", "201; el tratamiento nace en «pendiente» con id_consultorio e id_usuario estampados; aparece en el listado con su ID."],
  ["3", "Body sin id_tipo_tratamiento y precio 0.", "POST /api/tratamientos.", "400 con errores: «El tipo de tratamiento es obligatorio.» y «El precio debe ser mayor a cero.»; no se crea nada."],
  ["4", "Tratamiento en «pendiente».", "PUT /api/tratamientos/:id cambiando tipo y precio.", "200; el detalle y el listado reflejan los nuevos valores; el historial suma una fila por campo (valor_anterior → valor_nuevo)."],
  ["5", "Tratamiento ID 1 (50.000, 20.000 cobrados).", "PUT /api/tratamientos/1 con precio 15000.", "409 «El precio no puede ser menor al total ya cobrado ($20000.00).»."],
  ["6", "Tratamiento «cancelado».", "PUT /api/tratamientos/:id cambiando el precio.", "409 «Tratamiento cancelado, no editable.»; con sólo observaciones el PUT responde 200."],
  ["7", "Tratamiento en «pendiente».", "PATCH /:id/estado con id_estado = 3.", "409 «Debe iniciarse antes de finalizar.»; el estado no cambia."],
  ["8", "Tratamiento en «pendiente».", "PATCH /:id/estado a 2, luego a 3.", "200 en cada paso; al pasar a «en proceso» se completa la fecha de inicio, al finalizar se completa la fecha de fin; ambas transiciones quedan en el historial."],
  ["9", "Tratamiento en «en proceso» sin pagos.", "PATCH /:id/estado a 4 sin motivo / con motivo «no» / con motivo válido.", "400 «El motivo de cancelación es obligatorio (mínimo 5 caracteres).» en los dos primeros; 200 y estado «cancelado» con el motivo guardado en el tercero."],
  ["10", "Tratamiento ID 1 con un pago de 20.000.", "PATCH /api/tratamientos/1/estado a 4 con motivo válido.", "409 «No se puede cancelar: el tratamiento tiene pagos registrados. Anulá los pagos primero.»."],
  ["11", "Filtros que no coinciden con ningún tratamiento.", "GET /api/tratamientos con esos filtros.", "Lista vacía; la pantalla muestra «Sin resultados»."],
  ["12", "Usuario con ver_tratamientos y sin editar / cambiar_estado.", "Abrir el detalle; intentar PUT y PATCH.", "El detalle se ve; «Editar» y «Cambiar estado» deshabilitados; la API responde 403."],
  ["13", "Cualquier alta / modificación / cambio de estado.", "Consultar auditoria_cambios para ese tratamiento.", "Filas con id_usuario = el usuario autenticado, la acción y la fecha correspondientes."],
]));
hijos.push(P("", { after: 160 }));

// ── Consideración siguiente sprint ───────────────────────────────────────────
hijos.push(H2("Consideración para el Sprint 4.1: registro de pagos"));
hijos.push(P(
  "El registro de pagos parciales sobre un tratamiento (Pago), con distintos medios de pago y su impacto en el saldo pendiente, queda planificado como la iteración siguiente del ABM Transaccional. El ABM de pagos agregará id_consultorio y la columna ANULADO a la tabla pagos, reutilizará la tabla auditoria_cambios creada en este sprint y habilitará la anulación de pagos, que es la precondición para cancelar un tratamiento que ya tiene cobros. Se documentará con el mismo formato aplicado en este sprint: descripción Scrum, criterios de aceptación, prototipo de interfaz, subtareas técnicas con su estimación y pruebas de criterios.",
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

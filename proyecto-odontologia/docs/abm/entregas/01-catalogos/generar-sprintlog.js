/* SprintLog ABM 01 — Catálogos. Formato calcado de docs/abm/modelo/com.docx (Sprint 4). */
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
const BORDES_CELDA = {
  top: BORDE_TABLA, bottom: BORDE_TABLA, left: BORDE_TABLA, right: BORDE_TABLA,
};
const SHADING_HEADER = { type: ShadingType.CLEAR, fill: "D9D9D9", color: "auto" };
const ANCHO_TABLA = 9075;
const PROY = "D:/Dev/Desarrollo Web/Cuarto semestre/Proyecto Integrador 2/Proyecto/Proyecto juan/proyecto-odontologia";
const MOCKUPS = path.join(PROY, "docs/abm/entregas/01-catalogos/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/01-catalogos/SprintLog-Catalogos.docx");

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

// Línea Gherkin / Scrum: primera palabra en negrita, resto normal.
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

const figura = (archivo, pie, ratioAlto) => {
  const data = fs.readFileSync(path.join(MOCKUPS, archivo));
  const w = 600;
  return [
    new Paragraph({ spacing: { before: 80, after: 60 }, children: [new TextRun({ text: pie, font: FONT, size: 22 })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new ImageRun({ type: "png", data, transformation: { width: w, height: Math.round(w * ratioAlto) } })],
    }),
  ];
};

const RATIO = 1364 / 2004;

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

hijos.push(H1("SPRINT 3.1 — ABM de Catálogos"));
hijos.push(P("Registro, modificación, consulta y baja lógica de los catálogos de soporte del sistema."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// Objetivo
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "El Sprint 3.1 implementa el ABM de los cuatro catálogos de soporte del sistema del consultorio odontológico Herrera: estados de tratamiento, medios de pago, tipos de gasto y tipos de tratamiento. Son listas de baja cardinalidad y bajo volumen que parametrizan el dominio: cada tratamiento, pago y gasto que se registre en los sprints siguientes referencia un ítem de estos catálogos.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "A diferencia de las entidades transaccionales, un catálogo no es un evento de negocio ni tiene ciclo de estados propio: es administración pura. Por eso los cuatro se agrupan en un único módulo, con endpoints parametrizados por catálogo y un solo par de permisos (ver_catalogos y gestionar_catalogos). Tres de las cuatro tablas no tenían baja lógica; este sprint agrega la columna activo de forma aditiva, sin recrear ni renombrar nada.",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// Sprint Backlog
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([760, 4380, 1150, 1160, 1625], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU-01", "Como administrador del consultorio quiero dar de alta un ítem en cualquiera de los cuatro catálogos, indicando su nombre y una descripción opcional, para poder usarlo al registrar tratamientos, pagos o gastos.", "Alta", "S", "Ninguna"],
  ["HU-02", "Como administrador del consultorio quiero modificar el nombre y la descripción de un ítem de catálogo para corregir la información cuando la carga inicial fue incompleta o errónea.", "Alta", "S", "HU-01"],
  ["HU-03", "Como usuario del sistema quiero consultar el listado de cada catálogo, cambiando de catálogo por pestañas y filtrando por estado y por texto, para encontrar rápidamente el ítem que necesito.", "Alta", "S", "HU-01"],
  ["HU-04", "Como administrador del consultorio quiero desactivar y reactivar ítems de catálogo, con las protecciones del caso, para retirar de circulación los que ya no se usan sin perder el historial.", "Alta", "S", "HU-01, HU-03"],
]));
hijos.push(P("", { after: 120 }));

// Descripción de cada HU
hijos.push(H2("Descripción de cada Historia de Usuario"));

// ---- HU-01 ----
hijos.push(H3("HU-01 – Alta de ítem de catálogo"));
hijos.push(P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 }));
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "dar de alta un ítem en cualquiera de los cuatro catálogos, indicando su nombre y, opcionalmente, una descripción,"));
hijos.push(linea("para", "poder seleccionarlo al registrar tratamientos, pagos o gastos."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Alta correcta"));
hijos.push(linea("Dado", "el formulario «Nuevo medio de pago» en la pestaña Medios de pago"));
hijos.push(linea("Cuando", "se ingresa el nombre «cheque» y se guarda"));
hijos.push(linea("Entonces", "se muestra el mensaje «Se creó el medio de pago «cheque».» y el ítem aparece en el listado en estado Activo."));
hijos.push(criterio("Criterio 2: Validación de campos"));
hijos.push(linea("Dado", "que el nombre está vacío, tiene menos de 2 caracteres o supera el máximo del catálogo (20, o 50 en tipos de tratamiento)"));
hijos.push(linea("Cuando", "se intenta guardar"));
hijos.push(linea("Entonces", "se muestran los errores por campo dentro del formulario y el ítem no se crea."));
hijos.push(criterio("Criterio 3: Unicidad por catálogo"));
hijos.push(linea("Dado", "que ya existe un medio de pago activo llamado «efectivo»"));
hijos.push(linea("Cuando", "se intenta crear otro «EFECTIVO» (misma palabra, distinta capitalización)"));
hijos.push(linea("Entonces", "el sistema responde 409 con «Ya existe un medio de pago activo con ese nombre.» y no se crea el duplicado."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-alta.png", "Figura 1 – Prototipo de la pantalla «Nuevo medio de pago» (HU-01)", RATIO));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Migración 001_catalogos_activo.sql", "ALTER TABLE aditivo: agrega activo y descripcion a estados_tratamiento, medios_pago y tipos_gasto.", "XS"],
  ["Migración 002_permisos_catalogos.sql", "Alta de los permisos ver_catalogos y gestionar_catalogos y asignación al rol administrador.", "XS"],
  ["catalogos.service — mapa CATALOGOS + crearItemDeCatalogo", "Traducción slug → tabla/columna, normalización, longitud por catálogo y chequeo de unicidad case-insensitive entre activos.", "M"],
  ["catalogos.validator — validarDatosItem", "Middleware que arma el array de errores por campo y responde con el formato uniforme.", "S"],
  ["Ruta POST /api/catalogos/:catalogo", "Protegida con verificarToken y verificarPermiso('gestionar_catalogos').", "S"],
  ["Frontend — FormularioItemCatalogo.jsx", "Modal de alta reutilizando el patrón de modales de roles/.", "M"],
  ["Pruebas del alta y sus validaciones", "Verificar los tres criterios con datos reales vía API y en pantalla.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-02 ----
hijos.push(H3("HU-02 – Modificación de ítem de catálogo"));
hijos.push(P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 }));
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "modificar el nombre y la descripción de un ítem de catálogo,"));
hijos.push(linea("para", "mantener la información vigente cuando la carga inicial fue incompleta o errónea."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Modificación permitida"));
hijos.push(linea("Dado", "un tipo de gasto llamado «otro» sin uso en gastos registrados"));
hijos.push(linea("Cuando", "se cambia su descripción a «Gastos varios sin categoría específica» y se guarda"));
hijos.push(linea("Entonces", "se muestra confirmación y el nuevo valor se refleja en el listado."));
hijos.push(criterio("Criterio 2: Ítem protegido — nombre bloqueado"));
hijos.push(linea("Dado", "el estado de tratamiento «cancelado» (uno de los cuatro estados base 1–4)"));
hijos.push(linea("Cuando", "se abre su edición"));
hijos.push(linea("Entonces", "el campo Nombre se muestra deshabilitado con la leyenda «Este ítem es del sistema: sólo se puede editar su descripción» y sólo se permite guardar la descripción."));
hijos.push(criterio("Criterio 3: Unicidad al renombrar"));
hijos.push(linea("Dado", "que existe un medio de pago activo «tarjeta»"));
hijos.push(linea("Cuando", "se intenta renombrar otro ítem activo como «Tarjeta»"));
hijos.push(linea("Entonces", "el sistema responde 409 y el cambio no se aplica."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-editar.png", "Figura 2 – Prototipo de la pantalla «Editar estado de tratamiento» (ítem protegido) (HU-02)", RATIO));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["catalogos.service — modificarItemDeCatalogo", "Validar existencia del ítem, unicidad si cambia el nombre y bloqueo de renombre para ítems protegidos (ids 1–4 de estados_tratamiento).", "M"],
  ["Ruta PUT /api/catalogos/:catalogo/:id", "Protegida con el permiso gestionar_catalogos; valida el id.", "S"],
  ["Frontend — modo edición del formulario", "El modal precarga los datos y deshabilita el nombre cuando el ítem es protegido.", "S"],
  ["Manejo de errores por campo del backend", "El modal muestra la lista de errores devuelta por el validador.", "S"],
  ["Pruebas de los criterios de aceptación", "Verificar edición normal, bloqueo de nombre en protegidos y 409 por duplicado.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-03 ----
hijos.push(H3("HU-03 – Consulta de catálogos con filtros"));
hijos.push(P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 }));
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "consultar el listado de cada catálogo, cambiando de catálogo por pestañas, filtrando por estado y buscando por texto,"));
hijos.push(linea("para", "encontrar rápidamente el ítem que necesito consultar."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Filtro por catálogo y por estado"));
hijos.push(linea("Dado", "el listado de catálogos"));
hijos.push(linea("Cuando", "se selecciona la pestaña «Tipos de gasto» y el filtro de estado «Inactivos»"));
hijos.push(linea("Entonces", "se muestran únicamente los tipos de gasto dados de baja, con su nombre, descripción y chip de estado."));
hijos.push(criterio("Criterio 2: Sin resultados"));
hijos.push(linea("Dado", "que la búsqueda por texto no coincide con ningún ítem del catálogo activo"));
hijos.push(linea("Cuando", "se escribe el texto en el buscador"));
hijos.push(linea("Entonces", "se muestra el mensaje «No se encontraron ítems con los filtros seleccionados.»."));
hijos.push(criterio("Criterio 3: Acceso de sólo lectura"));
hijos.push(linea("Dado", "un usuario con el permiso ver_catalogos pero sin gestionar_catalogos"));
hijos.push(linea("Cuando", "abre la pantalla de catálogos"));
hijos.push(linea("Entonces", "ve los listados completos pero los botones «Nuevo», «Editar», «Desactivar» y «Reactivar» aparecen deshabilitados, y el backend responde 403 a POST, PUT y PATCH."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-listado.png", "Figura 3 – Prototipo de la pantalla «Catálogos» — listado, pestañas y filtros (HU-03)", RATIO));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["catalogos.service — listarItemsDeCatalogo", "Filtro por estado (activos / inactivos / todos), orden por nombre y marca de ítem protegido.", "M"],
  ["Ruta GET /api/catalogos/:catalogo", "Protegida con ver_catalogos; valida el slug (404) y el query ?estado (400).", "S"],
  ["Frontend — PaginaCatalogos.jsx", "Pestaña por catálogo, filtro de estado contra el backend y búsqueda por texto en cliente.", "M"],
  ["Frontend — TablaCatalogo.jsx", "Tabla genérica con chip de estado, candado en ítems protegidos y botones según permiso.", "S"],
  ["Ruta y menú lateral", "Alta de la ruta /panel/administrador/catalogos y del ítem «Catálogos» en el menú.", "XS"],
  ["Pruebas de filtros, aislamiento de permiso y estado «Sin resultados»", "Verificar los tres criterios vía API y en pantalla.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-04 ----
hijos.push(H3("HU-04 – Baja lógica y reactivación de ítem de catálogo"));
hijos.push(P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 }));
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "desactivar un ítem de catálogo y poder reactivarlo,"));
hijos.push(linea("para", "retirar de circulación los ítems que ya no se usan sin eliminar el registro ni perder el historial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Baja lógica correcta"));
hijos.push(linea("Dado", "el tipo de gasto «otro», que no está referenciado por ningún gasto"));
hijos.push(linea("Cuando", "se lo desactiva y se confirma en el modal"));
hijos.push(linea("Entonces", "el estado pasa a Inactivo, deja de ofrecerse para nuevos registros y sigue visible con el filtro «Inactivos»."));
hijos.push(criterio("Criterio 2: Bloqueo por uso"));
hijos.push(linea("Dado", "el medio de pago «efectivo», usado por el pago registrado del tratamiento de endodoncia de Ana Pérez"));
hijos.push(linea("Cuando", "se intenta desactivarlo"));
hijos.push(linea("Entonces", "el sistema responde 409 con «No se puede desactivar: hay registros que usan este ítem.» y el ítem sigue activo."));
hijos.push(criterio("Criterio 3: Estados base protegidos"));
hijos.push(linea("Dado", "cualquiera de los cuatro estados de tratamiento base (pendiente, en proceso, finalizado, cancelado)"));
hijos.push(linea("Cuando", "se intenta desactivarlo"));
hijos.push(linea("Entonces", "el botón «Desactivar» está deshabilitado en pantalla y el backend responde 409 «Este ítem es del sistema y no puede desactivarse.»."));
hijos.push(criterio("Criterio 4: Reactivación con control de duplicados"));
hijos.push(linea("Dado", "un ítem inactivo cuyo nombre coincide con otro ítem ya activo del mismo catálogo"));
hijos.push(linea("Cuando", "se intenta reactivarlo"));
hijos.push(linea("Entonces", "el sistema responde 409 y el ítem permanece inactivo."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-baja.png", "Figura 4 – Prototipo del modal de confirmación «Confirmar baja lógica» (HU-04)", RATIO));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["catalogos.service — desactivarItemDeCatalogo", "Bloqueo de ítems protegidos, chequeo de uso contra la tabla transaccional que referencia el catálogo y baja lógica con activo = 0.", "M"],
  ["catalogos.service — reactivarItemDeCatalogo", "Rechazo si ya existe otro ítem activo con el mismo nombre.", "S"],
  ["Rutas PATCH /:catalogo/:id/desactivar y /reactivar", "Protegidas con gestionar_catalogos.", "S"],
  ["Frontend — modal de confirmación", "Reutiliza ConfirmacionAccionModal.jsx de roles/; candado y acciones deshabilitadas en protegidos.", "S"],
  ["Pruebas del bloqueo, la protección y la reactivación", "Verificar los cuatro criterios vía API y en pantalla; confirmar que el ítem no se elimina.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// Consideración siguiente sprint
hijos.push(H2("Consideración para el Sprint 3.2: ABM de Pacientes"));
hijos.push(P(
  "El siguiente sprint implementa el ABM de Pacientes, la entidad maestra sobre la que se apoya toda la navegación del sistema. A diferencia de los catálogos, Pacientes es una entidad de negocio: su migración agrega id_consultorio y su clave foránea para alinear la tabla con el aislamiento multiconsultorio del Sprint 2, y suma el par de permisos desactivar_pacientes / reactivar_pacientes. Se documentará con el mismo formato aplicado en este sprint: descripción Scrum, criterios de aceptación, prototipo de interfaz y subtareas técnicas con su estimación.",
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

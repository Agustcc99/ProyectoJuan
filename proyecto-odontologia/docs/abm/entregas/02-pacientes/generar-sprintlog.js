/* SprintLog ABM 02 — Pacientes. Formato calcado de docs/abm/modelo/com.docx (Sprint 4)
   y de docs/abm/entregas/01-catalogos/generar-sprintlog.js. */
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
const MOCKUPS = path.join(PROY, "docs/abm/entregas/02-pacientes/mockups");
const SALIDA = path.join(PROY, "docs/abm/entregas/02-pacientes/SprintLog-Pacientes.docx");

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

const subtituloScrum = () =>
  P("Descripción (formato Scrum)", { bold: true, size: 23, color: COLOR_H3, after: 80 });

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

hijos.push(H1("SPRINT 3.2 — ABM de Pacientes"));
hijos.push(P("Registro, modificación, consulta, ficha y baja lógica de la ficha de paciente, la entidad maestra central del sistema."));
hijos.push(P("Agustin Tacconi Gianello - Practica Profesionalizante", { after: 40 }));
hijos.push(P("Desarrollo Web - 5to Semestre 2026", { after: 40 }));
hijos.push(P("Docente - Nadia Gallardo", { after: 200 }));

// Objetivo
hijos.push(H2("Objetivo del Sprint"));
hijos.push(P(
  "El Sprint 3.2 implementa el ABM de Pacientes del consultorio odontológico Herrera. La ficha de paciente es la entidad maestra central del sistema: todo el flujo clínico-financiero de los sprints siguientes (tratamientos, y a partir de ellos pagos y gastos) cuelga de un paciente, y la ficha es el foco de la navegación. La tabla pacientes ya existía con datos reales y con la columna ACTIVO, la ruta /panel/pacientes y los permisos ver_pacientes, crear_pacientes y editar_pacientes; faltaba toda la implementación y el par de baja lógica.",
  { alignment: AlignmentType.JUSTIFIED }
));
hijos.push(P(
  "A diferencia de un catálogo, Pacientes es una entidad de negocio: su migración agrega id_consultorio con su clave foránea, alineando la tabla con el aislamiento multiconsultorio del Sprint 2 (todas las consultas filtran por req.usuario.id_consultorio y cada alta estampa el consultorio y el usuario autor). La migración también agrega, de forma aditiva y sin recrear ni renombrar nada, fecha_alta, id_usuario_alta y fecha_nacimiento, y se suman los permisos desactivar_pacientes y reactivar_pacientes. La unicidad del DNI es por consultorio y se valida por aplicación (case y espacios indiferentes).",
  { alignment: AlignmentType.JUSTIFIED, after: 200 }
));

// Sprint Backlog
hijos.push(H2("Sprint Backlog"));
hijos.push(tabla([760, 4380, 1150, 1160, 1625], [
  ["Nro", "Historia de Usuario", "Prioridad", "Estimación", "Dependencias"],
  ["HU-01", "Como recepcionista del consultorio quiero dar de alta la ficha de un paciente con sus datos personales para poder registrarle tratamientos más adelante.", "Alta", "M", "Ninguna"],
  ["HU-02", "Como recepcionista del consultorio quiero modificar los datos de una ficha de paciente para mantener la información al día y corregir errores de carga.", "Alta", "S", "HU-01"],
  ["HU-03", "Como usuario del sistema quiero consultar el listado de pacientes buscando por nombre, apellido o DNI, filtrando por estado y con paginación, para encontrar rápido la ficha que necesito.", "Alta", "M", "HU-01"],
  ["HU-04", "Como usuario del sistema quiero abrir la ficha completa de un paciente, con todos sus datos y un resumen de sus tratamientos, para tener el panorama del paciente en una sola pantalla.", "Alta", "S", "HU-01, HU-03"],
  ["HU-05", "Como administrador del consultorio quiero desactivar y reactivar la ficha de un paciente, conservando su historial, para sacar de circulación a los pacientes que ya no se atienden sin perder sus datos.", "Alta", "S", "HU-01, HU-03"],
  ["HU-06", "Como administrador del consultorio quiero que cada acción sobre pacientes exija su permiso y que un consultorio no vea las fichas de otro, para que la información quede protegida y aislada.", "Alta", "S", "HU-01 … HU-05"],
]));
hijos.push(P("", { after: 120 }));

hijos.push(H2("Descripción de cada Historia de Usuario"));

// ---- HU-01 ----
hijos.push(H3("HU-01 – Alta de paciente"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "recepcionista del consultorio"));
hijos.push(linea("quiero", "dar de alta la ficha de un paciente cargando su nombre, apellido y DNI (obligatorios) y, opcionalmente, teléfono, email, obra social, fecha de nacimiento y observaciones,"));
hijos.push(linea("para", "poder identificarlo y registrarle tratamientos más adelante."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Alta correcta con ID visible"));
hijos.push(linea("Dado", "el formulario «Nuevo paciente» con los datos de Lucía Fernández, DNI 27888444"));
hijos.push(linea("Cuando", "se completa el formulario y se guarda"));
hijos.push(linea("Entonces", "el backend responde 201, se muestra «Se creó la ficha de Lucía Fernández (ID 2).» y la ficha aparece en el listado en estado Activo, con id_consultorio y id_usuario_alta estampados y fecha_alta = NOW()."));
hijos.push(criterio("Criterio 2: Validación por campo"));
hijos.push(linea("Dado", "un alta con el nombre de 1 carácter, sin apellido, con DNI «12x» y un email mal formado"));
hijos.push(linea("Cuando", "se intenta guardar (en el cliente y en el backend)"));
hijos.push(linea("Entonces", "no se crea la ficha, el backend responde 400 con el arreglo errores y el formulario muestra un mensaje por cada campo inválido."));
hijos.push(criterio("Criterio 3: DNI duplicado en el consultorio"));
hijos.push(linea("Dado", "que ya existe la paciente Ana Pérez con DNI 30111222 en el consultorio"));
hijos.push(linea("Cuando", "se intenta dar de alta otra ficha con el DNI «30 111 222»"));
hijos.push(linea("Entonces", "el sistema responde 409 «Ya existe un paciente con ese DNI.» y no se crea el duplicado (la comparación ignora mayúsculas y espacios)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig1-alta.png", "Figura 1 – Prototipo de la pantalla «Nuevo paciente» (HU-01)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Migración 003_pacientes.sql", "ALTER TABLE aditivo: agrega id_consultorio (+ FK a consultorios), fecha_alta, id_usuario_alta (+ FK a usuarios) y fecha_nacimiento; backfill de las filas existentes al consultorio 1.", "S"],
  ["Migración 004_permisos_pacientes.sql", "Alta de los permisos desactivar_pacientes y reactivar_pacientes y asignación al rol administrador.", "XS"],
  ["pacientes.service — crearPaciente + helpers", "Normalización de datos, chequeo de DNI único por consultorio (case/space-insensitive), INSERT que estampa id_consultorio, id_usuario_alta y fecha_alta.", "M"],
  ["pacientes.validator — validarDatosPaciente", "Middleware que arma el arreglo errores por campo (nombre/apellido 2–50, DNI 7–20 solo dígitos, email, fecha no futura, longitudes).", "S"],
  ["Ruta POST /api/pacientes", "verificarToken + verificarPermiso('crear_pacientes'); responde 201 con la ficha creada.", "XS"],
  ["Frontend — FormularioPaciente.jsx + alta en PaginaPacientes.jsx", "Modal de alta con validación de cliente espejo de la del backend y render del arreglo errores.", "M"],
  ["Pruebas del alta", "Los tres criterios vía API (curl) y en pantalla.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-02 ----
hijos.push(H3("HU-02 – Modificación de la ficha del paciente"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "recepcionista del consultorio"));
hijos.push(linea("quiero", "modificar los datos de una ficha de paciente existente,"));
hijos.push(linea("para", "mantener la información al día y corregir errores de la carga inicial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Modificación reflejada en detalle y listado"));
hijos.push(linea("Dado", "la ficha de Lucía Fernández abierta en modo edición"));
hijos.push(linea("Cuando", "se cambia la obra social a «Swiss Medical» y se guarda"));
hijos.push(linea("Entonces", "el backend responde 200, se muestra «La ficha se actualizó correctamente.» y el nuevo valor se ve tanto en la ficha como en el listado."));
hijos.push(criterio("Criterio 2: Campos no editables"));
hijos.push(linea("Dado", "la ficha de un paciente"));
hijos.push(linea("Cuando", "se edita"));
hijos.push(linea("Entonces", "el identificador (ID_PACIENTE) y la fecha de alta se muestran como dato de sólo lectura y el backend nunca los modifica."));
hijos.push(criterio("Criterio 3: DNI que colisiona con otra ficha"));
hijos.push(linea("Dado", "la ficha de Lucía Fernández en edición"));
hijos.push(linea("Cuando", "se intenta cambiar su DNI a 30111222 (el de Ana Pérez)"));
hijos.push(linea("Entonces", "el sistema responde 409 «Ya existe un paciente con ese DNI.» y la ficha no se modifica; la validación de unicidad excluye la propia ficha."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig2-editar.png", "Figura 2 – Prototipo de la pantalla «Editar ficha del paciente» con el aviso de DNI duplicado (HU-02)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pacientes.service — actualizarPaciente", "Verifica que la ficha exista y pertenezca al consultorio (404), controla el DNI único excluyendo la propia ficha, UPDATE de los campos editables.", "M"],
  ["Ruta PUT /api/pacientes/:id", "verificarToken + verificarPermiso('editar_pacientes'); valida el id y el cuerpo.", "XS"],
  ["Frontend — modo edición en FichaPacientePage.jsx", "Reutiliza FormularioPaciente.jsx precargado; ID y fecha de alta quedan fuera del formulario.", "S"],
  ["Manejo de errores por campo", "El formulario muestra el arreglo errores del backend y el mensaje del 409.", "XS"],
  ["Pruebas de la modificación", "Edición normal, campos no editables y 409 por DNI en uso.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-03 ----
hijos.push(H3("HU-03 – Consulta: listado con búsqueda, filtro y paginación"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "consultar el listado de pacientes buscando por nombre, apellido o DNI, filtrando por estado (activos / inactivos / todos) y con paginación,"));
hijos.push(linea("para", "encontrar rápidamente la ficha que necesito."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Búsqueda y filtro"));
hijos.push(linea("Dado", "el listado de pacientes"));
hijos.push(linea("Cuando", "se busca «erez» con el filtro de estado «Activos»"));
hijos.push(linea("Entonces", "se muestra únicamente a Ana Pérez, con sus columnas Nombre, Apellido, DNI, Teléfono, Obra social y Estado, y la paginación indica «1 paciente · página 1 de 1»."));
hijos.push(criterio("Criterio 2: Sin resultados"));
hijos.push(linea("Dado", "que ningún paciente coincide con los filtros elegidos"));
hijos.push(linea("Cuando", "se aplica la búsqueda"));
hijos.push(linea("Entonces", "se muestra «No se encontraron pacientes con los filtros seleccionados.»."));
hijos.push(criterio("Criterio 3: Paginación y parámetros válidos"));
hijos.push(linea("Dado", "el listado con ?porPagina=1"));
hijos.push(linea("Cuando", "se piden las páginas siguientes"));
hijos.push(linea("Entonces", "el backend devuelve { pacientes, total, pagina, porPagina } y responde 400 si porPagina supera 100 o si el estado no es uno de los valores permitidos."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig3-listado.png", "Figura 3 – Prototipo de la pantalla «Pacientes» — listado con búsqueda, filtro y paginación (HU-03)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pacientes.service — listarPacientes", "WHERE por id_consultorio, LIKE sobre nombre/apellido/DNI/nombre completo, filtro de estado, ORDER BY apellido, nombre, LIMIT/OFFSET y COUNT total.", "M"],
  ["pacientes.validator — validarFiltrosListado", "Valida ?estado, ?pagina y ?porPagina (1–100).", "S"],
  ["Ruta GET /api/pacientes", "verificarToken + verificarPermiso('ver_pacientes').", "XS"],
  ["Frontend — PaginaPacientes.jsx", "Búsqueda contra el backend, filtro de estado, controles de paginación y fila clickeable hacia la ficha.", "M"],
  ["Frontend — pacientesService.js + estilos", "Funciones axios que devuelven respuesta.data y pacientes.css que reutiliza roles.css.", "S"],
  ["Pruebas del listado", "Búsqueda, filtro, «sin resultados», paginación y parámetros inválidos.", "S"],
  ["", "Total", "M"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-04 ----
hijos.push(H3("HU-04 – Ver ficha del paciente"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "usuario del sistema"));
hijos.push(linea("quiero", "abrir la ficha completa de un paciente, con todos sus datos personales y un resumen de sus tratamientos,"));
hijos.push(linea("para", "tener el panorama del paciente en una sola pantalla."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Ficha completa"));
hijos.push(linea("Dado", "el listado de pacientes"));
hijos.push(linea("Cuando", "se hace clic en la fila de Ana Pérez"));
hijos.push(linea("Entonces", "se abre /panel/pacientes/1 con el título «Ficha del paciente», todos sus datos y el contador tratamientos_total (1 tratamiento registrado)."));
hijos.push(criterio("Criterio 2: Paciente inexistente o de otro consultorio"));
hijos.push(linea("Dado", "una URL de ficha con un id que no existe o que pertenece a otro consultorio"));
hijos.push(linea("Cuando", "se abre la ficha"));
hijos.push(linea("Entonces", "el backend responde 404 y la pantalla muestra «El paciente no existe o no pertenece a tu consultorio.» con un botón para volver al listado."));
hijos.push(criterio("Criterio 3: Sección de tratamientos como anticipo"));
hijos.push(linea("Dado", "la ficha de un paciente"));
hijos.push(linea("Cuando", "se mira la sección «Tratamientos del paciente»"));
hijos.push(linea("Entonces", "se muestra el resumen y la leyenda de que el detalle y la carga se habilitan en el ABM 03 (próximamente)."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig4-ficha.png", "Figura 4 – Prototipo de la pantalla «Ficha del paciente» (HU-04)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pacientes.service — obtenerPacientePorId", "Trae la ficha del consultorio (404 si no) y le agrega tratamientos_total con COUNT sobre tratamientos.", "S"],
  ["Ruta GET /api/pacientes/:id", "verificarToken + verificarPermiso('ver_pacientes'); valida el id.", "XS"],
  ["Frontend — FichaPacientePage.jsx", "Ruta /panel/pacientes/:id, datos en modo lectura, ID y fecha de alta bloqueados, sección de tratamientos como placeholder del ABM 03.", "M"],
  ["Integración — AppRouter.jsx y LayoutPrincipal.jsx", "Ruta pacientes/:id protegida por ver_pacientes y título «Ficha del paciente» en el breadcrumb.", "XS"],
  ["Pruebas de la ficha", "Apertura desde el listado, 404 y sección de tratamientos.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-05 ----
hijos.push(H3("HU-05 – Baja lógica y reactivación de la ficha"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "desactivar la ficha de un paciente y poder reactivarla,"));
hijos.push(linea("para", "sacar de circulación a los pacientes que ya no se atienden sin eliminar el registro ni perder su historial."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Baja lógica con aviso de tratamientos"));
hijos.push(linea("Dado", "la ficha activa de Ana Pérez, que tiene 1 tratamiento registrado"));
hijos.push(linea("Cuando", "se la desactiva y se confirma en el modal"));
hijos.push(linea("Entonces", "la ficha pasa a Inactivo, se muestra «La ficha se desactivó correctamente.» y la advertencia «El paciente tiene 1 tratamientos registrados.»; la ficha deja de aparecer con el filtro «Activos» y sigue visible con «Inactivos» / «Todos»."));
hijos.push(criterio("Criterio 2: Reactivación"));
hijos.push(linea("Dado", "la ficha inactiva de Ana Pérez"));
hijos.push(linea("Cuando", "se la reactiva y se confirma"));
hijos.push(linea("Entonces", "vuelve a estado Activo; si existiera otra ficha activa con el mismo DNI el sistema respondería 409 y la ficha quedaría inactiva."));
hijos.push(criterio("Criterio 3: Doble baja"));
hijos.push(linea("Dado", "una ficha que ya está inactiva"));
hijos.push(linea("Cuando", "se intenta desactivarla otra vez"));
hijos.push(linea("Entonces", "el backend responde 400 «El paciente ya se encuentra inactivo.»."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig5-baja.png", "Figura 5 – Prototipo del modal «Confirmar baja lógica» en la ficha del paciente (HU-05)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["pacientes.service — desactivarPaciente", "Verifica ficha del consultorio, rechaza la doble baja, UPDATE activo = 0 y devuelve advertencia si tratamientos_total > 0.", "S"],
  ["pacientes.service — reactivarPaciente", "Rechaza si ya está activa y si hay otra ficha activa con el mismo DNI (409); UPDATE activo = 1.", "S"],
  ["Rutas PATCH /api/pacientes/:id/desactivar y /reactivar", "Protegidas con desactivar_pacientes y reactivar_pacientes respectivamente.", "XS"],
  ["Frontend — modal de confirmación en la ficha", "Reutiliza ConfirmacionAccionModal.jsx de roles/; muestra el mensaje de éxito y la advertencia.", "S"],
  ["Pruebas de baja y reactivación", "Baja con aviso, filtros por estado, reactivación y doble baja.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// ---- HU-06 ----
hijos.push(H3("HU-06 – Acceso por permiso y aislamiento por consultorio"));
hijos.push(subtituloScrum());
hijos.push(linea("Como", "administrador del consultorio"));
hijos.push(linea("quiero", "que cada acción sobre pacientes exija su permiso y que un consultorio no pueda ver ni tocar las fichas de otro,"));
hijos.push(linea("para", "que la información de los pacientes quede protegida y aislada por consultorio."));
hijos.push(H4("Criterios de aceptación"));
hijos.push(criterio("Criterio 1: Sólo lectura sin permisos de escritura"));
hijos.push(linea("Dado", "un usuario con ver_pacientes pero sin crear_pacientes, editar_pacientes ni el par desactivar/reactivar"));
hijos.push(linea("Cuando", "abre la pantalla de pacientes"));
hijos.push(linea("Entonces", "ve el listado y las fichas, el botón «Nuevo paciente» aparece deshabilitado y no se ofrecen «Editar», «Desactivar» ni «Reactivar»; el backend responde 403 a POST, PUT y PATCH."));
hijos.push(criterio("Criterio 2: Sin ver_pacientes no hay acceso"));
hijos.push(linea("Dado", "un usuario sin el permiso ver_pacientes"));
hijos.push(linea("Cuando", "intenta entrar a /panel/pacientes o llamar a GET /api/pacientes"));
hijos.push(linea("Entonces", "la ruta del panel lo deriva a «Acceso denegado» y la API responde 403 «No tenés permisos para realizar esta acción.»."));
hijos.push(criterio("Criterio 3: Aislamiento por consultorio"));
hijos.push(linea("Dado", "una ficha que pertenece a otro consultorio"));
hijos.push(linea("Cuando", "un usuario intenta verla, editarla, desactivarla o reactivarla"));
hijos.push(linea("Entonces", "el backend responde 404 «El paciente no existe o no pertenece a este consultorio.», porque todas las consultas filtran por req.usuario.id_consultorio."));
hijos.push(H4("Prototipo de interfaz"));
hijos.push(...figura("fig6-permisos.png", "Figura 6 – Prototipo del listado de pacientes en modo de sólo lectura (HU-06)"));
hijos.push(H4("Subtareas técnicas con estimación"));
hijos.push(tabla([3000, 4800, 1275], [
  ["Subtarea técnica", "Descripción", "Tamaño"],
  ["Permisos en cada ruta", "verificarPermiso con ver / crear / editar / desactivar / reactivar_pacientes según el método; sin try/catch, los errores van al middleware central.", "XS"],
  ["Filtro por id_consultorio en el service", "Todas las queries de listar/obtener/actualizar/desactivar/reactivar incluyen id_consultorio y todo INSERT lo estampa.", "S"],
  ["Frontend — botones según tienePermiso", "PaginaPacientes.jsx y FichaPacientePage.jsx ocultan o deshabilitan acciones según los permisos del usuario.", "S"],
  ["Integración — AppRouter.jsx", "Rutas pacientes y pacientes/:id envueltas en RutaPorPermiso permisoRequerido=\"ver_pacientes\".", "XS"],
  ["Pruebas de acceso", "403 por método sin permiso, «Acceso denegado» sin ver_pacientes y 404 por consultorio ajeno.", "S"],
  ["", "Total", "S"],
]));
hijos.push(P("", { after: 120 }));

// Consideración siguiente sprint
hijos.push(H2("Consideración para el Sprint siguiente: ABM de Tratamientos"));
hijos.push(P(
  "El siguiente sprint implementa el ABM de Tratamientos, la primera entidad transaccional del sistema. Un tratamiento es un evento de negocio con ciclo de estados (pendiente → en proceso → finalizado / cancelado) y referencia a un paciente (pacientes.ID_PACIENTE), a un tipo de tratamiento y a un estado, todos ya disponibles tras los ABM 01 y 02. Ese sprint agrega id_consultorio a tratamientos, crea la tabla genérica auditoria_cambios y sigue la plantilla completa del material de ABM transaccional (reglas de negocio con matriz de transiciones y pruebas de criterios con datos, pasos y resultado). Se documentará con el mismo formato aplicado en este sprint.",
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

const { poolDeConexiones } = require("../../config/db");

/*
  ABM 01 — Catálogos de soporte.

  Un único módulo para los cuatro catálogos, todos de estructura mínima
  (id + nombre + descripción + activo). El slug de la URL se traduce contra este
  mapa: el nombre real de la tabla y de las columnas SIEMPRE sale de acá, nunca
  del request, así que las queries que interpolan identificadores son seguras.

  - tabla / id / nombre: nombres reales en la BD. MySQL trata los identificadores
    como case-insensitive, por eso se escriben en minúscula aunque en la BD las
    columnas de estos catálogos históricos estén en MAYÚSCULAS (NOMBRE_ESTADO…).
  - maxNombre: límite del VARCHAR de la columna nombre (20, salvo tipos_tratamiento
    que es 50).
  - protegidos: ids que el sistema no deja desactivar ni renombrar. Los cuatro
    estados de tratamiento base (1..4) son parte del motor de estados del ABM de
    tratamientos, que depende de ellos por id y por nombre.
  - referencia: tabla transaccional (y su columna FK) que apunta a este catálogo.
    Se usa para impedir la baja lógica de un ítem que está en uso.
*/
const CATALOGOS = {
  "estados-tratamiento": {
    tabla: "estados_tratamiento",
    id: "id_estado",
    nombre: "nombre_estado",
    maxNombre: 20,
    etiqueta: "estado de tratamiento",
    protegidos: [1, 2, 3, 4],
    referencia: { tabla: "tratamientos", columna: "id_estado" },
  },
  "medios-pago": {
    tabla: "medios_pago",
    id: "id_medio_pago",
    nombre: "nombre_medio",
    maxNombre: 20,
    etiqueta: "medio de pago",
    protegidos: [],
    referencia: { tabla: "pagos", columna: "id_medio_pago" },
  },
  "tipos-gasto": {
    tabla: "tipos_gasto",
    id: "id_tipo_gasto",
    nombre: "nombre_tipo",
    maxNombre: 20,
    etiqueta: "tipo de gasto",
    protegidos: [],
    referencia: { tabla: "gastos", columna: "id_tipo_gasto" },
  },
  "tipos-tratamiento": {
    tabla: "tipos_tratamiento",
    id: "id_tipo_tratamiento",
    nombre: "nombre",
    maxNombre: 50,
    etiqueta: "tipo de tratamiento",
    protegidos: [],
    referencia: { tabla: "tratamientos", columna: "id_tipo_tratamiento" },
  },
};

const ESTADOS_FILTRO = ["activos", "inactivos", "todos"];

const MAX_DESCRIPCION = 255;
const MIN_NOMBRE = 2;

/*
  Devuelve la configuración de un catálogo a partir de su slug.
  Lanza 404 si el slug no corresponde a ninguno de los cuatro catálogos.
*/
function obtenerConfiguracionDeCatalogo(slugCatalogo) {
  const configuracion = CATALOGOS[slugCatalogo];

  if (!configuracion) {
    const error = new Error("Catálogo inexistente.");
    error.statusCode = 404;
    throw error;
  }

  return configuracion;
}

/*
  Normaliza y valida el nombre y la descripción de un ítem de catálogo.
  Devuelve { nombre, descripcion } ya listos para persistir.
*/
function normalizarDatosDeItem(datos, configuracion) {
  const nombreLimpio = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const descripcionLimpia =
    typeof datos.descripcion === "string" && datos.descripcion.trim() !== ""
      ? datos.descripcion.trim()
      : null;

  if (nombreLimpio.length < MIN_NOMBRE || nombreLimpio.length > configuracion.maxNombre) {
    const error = new Error(
      `El nombre debe tener entre ${MIN_NOMBRE} y ${configuracion.maxNombre} caracteres.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (descripcionLimpia && descripcionLimpia.length > MAX_DESCRIPCION) {
    const error = new Error(
      `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`
    );
    error.statusCode = 400;
    throw error;
  }

  return { nombre: nombreLimpio, descripcion: descripcionLimpia };
}

/*
  Da forma uniforme a la fila de cualquiera de los cuatro catálogos.
  `protegido` indica que el ítem no admite desactivación ni cambio de nombre.
*/
function mapearItem(fila, configuracion, slugCatalogo) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion || null,
    activo: Number(fila.activo) === 1 ? 1 : 0,
    protegido: configuracion.protegidos.includes(fila.id),
    catalogo: slugCatalogo,
  };
}

/*
  Busca un ítem por id dentro de un catálogo. Lanza 404 si no existe.
*/
async function obtenerItemPorId(configuracion, idItem) {
  const [filas] = await poolDeConexiones.query(
    `SELECT ${configuracion.id} AS id,
            ${configuracion.nombre} AS nombre,
            descripcion,
            activo
       FROM ${configuracion.tabla}
      WHERE ${configuracion.id} = ?
      LIMIT 1`,
    [idItem]
  );

  if (filas.length === 0) {
    const error = new Error("El ítem no existe en este catálogo.");
    error.statusCode = 404;
    throw error;
  }

  return filas[0];
}

/*
  Verifica que no exista otro ítem ACTIVO con el mismo nombre (case-insensitive)
  en el mismo catálogo. `idExcluido` se pasa al editar/reactivar para no chocar
  con el propio registro.
*/
async function existeNombreActivoDuplicado(configuracion, nombre, idExcluido = null) {
  const condiciones = [`LOWER(${configuracion.nombre}) = LOWER(?)`, "activo = 1"];
  const parametros = [nombre];

  if (idExcluido !== null) {
    condiciones.push(`${configuracion.id} <> ?`);
    parametros.push(idExcluido);
  }

  const [filas] = await poolDeConexiones.query(
    `SELECT ${configuracion.id} AS id
       FROM ${configuracion.tabla}
      WHERE ${condiciones.join(" AND ")}
      LIMIT 1`,
    parametros
  );

  return filas.length > 0;
}

/*
  Indica si un ítem está referenciado por al menos una fila de su tabla
  transaccional. Bloquea la baja lógica.
*/
async function itemEstaEnUso(configuracion, idItem) {
  const { tabla, columna } = configuracion.referencia;

  const [filas] = await poolDeConexiones.query(
    `SELECT 1 FROM ${tabla} WHERE ${columna} = ? LIMIT 1`,
    [idItem]
  );

  return filas.length > 0;
}

/*
  Lista los ítems de un catálogo, opcionalmente filtrados por estado.
  estadoFiltro ∈ "activos" | "inactivos" | "todos" (default "todos").
*/
async function listarItemsDeCatalogo(slugCatalogo, estadoFiltro = "todos") {
  const configuracion = obtenerConfiguracionDeCatalogo(slugCatalogo);

  const condiciones = [];
  const parametros = [];

  if (estadoFiltro === "activos") {
    condiciones.push("activo = 1");
  } else if (estadoFiltro === "inactivos") {
    condiciones.push("activo = 0");
  }

  const clausulaWhere =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const [filas] = await poolDeConexiones.query(
    `SELECT ${configuracion.id} AS id,
            ${configuracion.nombre} AS nombre,
            descripcion,
            activo
       FROM ${configuracion.tabla}
       ${clausulaWhere}
      ORDER BY ${configuracion.nombre} ASC`,
    parametros
  );

  return filas.map((fila) => mapearItem(fila, configuracion, slugCatalogo));
}

/*
  Alta de un ítem de catálogo. Siempre nace activo.
*/
async function crearItemDeCatalogo(slugCatalogo, datos) {
  const configuracion = obtenerConfiguracionDeCatalogo(slugCatalogo);
  const { nombre, descripcion } = normalizarDatosDeItem(datos, configuracion);

  if (await existeNombreActivoDuplicado(configuracion, nombre)) {
    const error = new Error(
      `Ya existe un ${configuracion.etiqueta} activo con ese nombre.`
    );
    error.statusCode = 409;
    throw error;
  }

  const [resultado] = await poolDeConexiones.query(
    `INSERT INTO ${configuracion.tabla} (${configuracion.nombre}, descripcion, activo)
     VALUES (?, ?, 1)`,
    [nombre, descripcion]
  );

  return mapearItem(
    { id: resultado.insertId, nombre, descripcion, activo: 1 },
    configuracion,
    slugCatalogo
  );
}

/*
  Modificación de un ítem. Un ítem protegido puede cambiar su descripción pero
  no su nombre.
*/
async function modificarItemDeCatalogo(slugCatalogo, idItem, datos) {
  const configuracion = obtenerConfiguracionDeCatalogo(slugCatalogo);
  const { nombre, descripcion } = normalizarDatosDeItem(datos, configuracion);

  const itemActual = await obtenerItemPorId(configuracion, idItem);
  const esProtegido = configuracion.protegidos.includes(itemActual.id);

  const cambiaElNombre =
    nombre.toLowerCase() !== String(itemActual.nombre).toLowerCase();

  if (esProtegido && cambiaElNombre) {
    const error = new Error(
      "Este ítem es del sistema: se puede editar su descripción pero no su nombre."
    );
    error.statusCode = 409;
    throw error;
  }

  if (
    cambiaElNombre &&
    (await existeNombreActivoDuplicado(configuracion, nombre, itemActual.id))
  ) {
    const error = new Error(
      `Ya existe un ${configuracion.etiqueta} activo con ese nombre.`
    );
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE ${configuracion.tabla}
        SET ${configuracion.nombre} = ?,
            descripcion = ?
      WHERE ${configuracion.id} = ?`,
    [esProtegido ? itemActual.nombre : nombre, descripcion, itemActual.id]
  );

  return mapearItem(
    {
      id: itemActual.id,
      nombre: esProtegido ? itemActual.nombre : nombre,
      descripcion,
      activo: itemActual.activo,
    },
    configuracion,
    slugCatalogo
  );
}

/*
  Baja lógica. Bloqueada si el ítem es protegido o está en uso por la tabla
  transaccional que lo referencia.
*/
async function desactivarItemDeCatalogo(slugCatalogo, idItem) {
  const configuracion = obtenerConfiguracionDeCatalogo(slugCatalogo);
  const itemActual = await obtenerItemPorId(configuracion, idItem);

  if (configuracion.protegidos.includes(itemActual.id)) {
    const error = new Error(
      "Este ítem es del sistema y no puede desactivarse."
    );
    error.statusCode = 409;
    throw error;
  }

  if (Number(itemActual.activo) === 0) {
    const error = new Error("El ítem ya se encuentra inactivo.");
    error.statusCode = 400;
    throw error;
  }

  if (await itemEstaEnUso(configuracion, itemActual.id)) {
    const error = new Error(
      "No se puede desactivar: hay registros que usan este ítem."
    );
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE ${configuracion.tabla} SET activo = 0 WHERE ${configuracion.id} = ?`,
    [itemActual.id]
  );

  return mapearItem(
    { ...itemActual, activo: 0 },
    configuracion,
    slugCatalogo
  );
}

/*
  Reactivación. Rechaza si ya hay otro ítem activo con el mismo nombre.
*/
async function reactivarItemDeCatalogo(slugCatalogo, idItem) {
  const configuracion = obtenerConfiguracionDeCatalogo(slugCatalogo);
  const itemActual = await obtenerItemPorId(configuracion, idItem);

  if (Number(itemActual.activo) === 1) {
    const error = new Error("El ítem ya se encuentra activo.");
    error.statusCode = 400;
    throw error;
  }

  if (
    await existeNombreActivoDuplicado(
      configuracion,
      itemActual.nombre,
      itemActual.id
    )
  ) {
    const error = new Error(
      "No se puede reactivar: ya existe otro ítem activo con el mismo nombre."
    );
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE ${configuracion.tabla} SET activo = 1 WHERE ${configuracion.id} = ?`,
    [itemActual.id]
  );

  return mapearItem(
    { ...itemActual, activo: 1 },
    configuracion,
    slugCatalogo
  );
}

module.exports = {
  CATALOGOS,
  ESTADOS_FILTRO,
  MAX_DESCRIPCION,
  MIN_NOMBRE,
  listarItemsDeCatalogo,
  crearItemDeCatalogo,
  modificarItemDeCatalogo,
  desactivarItemDeCatalogo,
  reactivarItemDeCatalogo,
};

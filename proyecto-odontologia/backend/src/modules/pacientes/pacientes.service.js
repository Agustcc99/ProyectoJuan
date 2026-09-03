const { poolDeConexiones } = require("../../config/db");

/*
  ABM 02 — Pacientes (entidad maestra).

  Toda la información de un paciente está aislada por consultorio: cada query
  filtra por el id_consultorio que llega en req.usuario (nunca desde el body), y
  cada INSERT lo estampa junto con el usuario autor, igual que roles/usuarios.

  Las columnas de dominio de `pacientes` están en MAYÚSCULAS en la BD
  (ID_PACIENTE, NOMBRE, DNI, ACTIVO…); MySQL trata los identificadores como
  case-insensitive, así que acá el SQL se escribe en minúsculas, como en
  auth.service.js.
*/

const LONGITUD_PAGINA_POR_DEFECTO = 20;
const LONGITUD_PAGINA_MAXIMA = 100;

// Columnas que se devuelven en el listado y en el detalle.
const COLUMNAS_PACIENTE = `
  id_paciente,
  nombre,
  apellido,
  dni,
  telefono,
  email,
  obra_social,
  observaciones,
  fecha_nacimiento,
  fecha_alta,
  id_usuario_alta,
  id_consultorio,
  activo
`;

/*
  Normaliza el DNI para comparaciones de unicidad: sin espacios y en minúsculas
  (el DNI son solo dígitos, pero se mantiene el criterio case/space-insensitive
  pedido en la especificación).
*/
function normalizarDniParaComparar(dni) {
  return String(dni || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/*
  Toma el body y devuelve un objeto con los campos ya recortados y con los
  opcionales vacíos convertidos a null.
*/
function normalizarDatosDePaciente(datos) {
  const texto = (valor) =>
    typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;

  return {
    nombre: texto(datos.nombre),
    apellido: texto(datos.apellido),
    dni: texto(datos.dni),
    telefono: texto(datos.telefono),
    email: texto(datos.email),
    obra_social: texto(datos.obra_social),
    fecha_nacimiento: texto(datos.fecha_nacimiento),
    observaciones: texto(datos.observaciones),
  };
}

function mapearPaciente(fila) {
  return {
    id_paciente: fila.id_paciente,
    nombre: fila.nombre,
    apellido: fila.apellido,
    dni: fila.dni,
    telefono: fila.telefono || null,
    email: fila.email || null,
    obra_social: fila.obra_social || null,
    observaciones: fila.observaciones || null,
    fecha_nacimiento: fila.fecha_nacimiento || null,
    fecha_alta: fila.fecha_alta || null,
    id_usuario_alta: fila.id_usuario_alta || null,
    id_consultorio: fila.id_consultorio,
    activo: Number(fila.activo) === 1 ? 1 : 0,
  };
}

/*
  Busca la fila cruda de un paciente del consultorio. Lanza 404 si no existe o
  pertenece a otro consultorio.
*/
async function obtenerFilaPacienteDelConsultorio(idPaciente, idConsultorio) {
  const [filas] = await poolDeConexiones.query(
    `SELECT ${COLUMNAS_PACIENTE}
       FROM pacientes
      WHERE id_paciente = ?
        AND id_consultorio = ?
      LIMIT 1`,
    [idPaciente, idConsultorio]
  );

  if (filas.length === 0) {
    const error = new Error("El paciente no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  return filas[0];
}

/*
  Indica si ya existe OTRO paciente en el consultorio con el mismo DNI
  (case/space-insensitive). `idExcluido` se pasa en edición/reactivación para no
  chocar contra el propio registro. `soloActivos` limita la búsqueda a fichas
  activas (se usa al reactivar).
*/
async function existeDniDuplicado(
  dni,
  idConsultorio,
  { idExcluido = null, soloActivos = false } = {}
) {
  const condiciones = [
    "id_consultorio = ?",
    "REPLACE(LOWER(dni), ' ', '') = ?",
  ];
  const parametros = [idConsultorio, normalizarDniParaComparar(dni)];

  if (idExcluido !== null) {
    condiciones.push("id_paciente <> ?");
    parametros.push(idExcluido);
  }

  if (soloActivos) {
    condiciones.push("activo = 1");
  }

  const [filas] = await poolDeConexiones.query(
    `SELECT id_paciente
       FROM pacientes
      WHERE ${condiciones.join(" AND ")}
      LIMIT 1`,
    parametros
  );

  return filas.length > 0;
}

/*
  Cuenta los tratamientos registrados de un paciente.
*/
async function contarTratamientosDePaciente(idPaciente) {
  const [filas] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS total FROM tratamientos WHERE id_paciente = ?`,
    [idPaciente]
  );

  return filas[0].total;
}

/*
  Listado paginado con búsqueda por nombre / apellido / DNI y filtro por estado.
  Devuelve { pacientes, total, pagina, porPagina }.
*/
async function listarPacientes(filtros = {}) {
  const {
    idConsultorio,
    busqueda = "",
    estado = "todos",
    pagina = 1,
    porPagina = LONGITUD_PAGINA_POR_DEFECTO,
  } = filtros;

  const numeroPagina = Math.max(1, Number(pagina) || 1);
  const cantidadPorPagina = Math.min(
    LONGITUD_PAGINA_MAXIMA,
    Math.max(1, Number(porPagina) || LONGITUD_PAGINA_POR_DEFECTO)
  );
  const desplazamiento = (numeroPagina - 1) * cantidadPorPagina;

  const condiciones = ["id_consultorio = ?"];
  const parametros = [idConsultorio];

  const textoBusqueda = String(busqueda || "").trim();
  if (textoBusqueda !== "") {
    condiciones.push(
      "(nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR CONCAT(nombre, ' ', apellido) LIKE ?)"
    );
    const patron = `%${textoBusqueda}%`;
    parametros.push(patron, patron, patron, patron);
  }

  if (estado === "activos") {
    condiciones.push("activo = 1");
  } else if (estado === "inactivos") {
    condiciones.push("activo = 0");
  }

  const clausulaWhere = `WHERE ${condiciones.join(" AND ")}`;

  const [filasTotal] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS total FROM pacientes ${clausulaWhere}`,
    parametros
  );
  const total = filasTotal[0].total;

  const [filas] = await poolDeConexiones.query(
    `SELECT ${COLUMNAS_PACIENTE}
       FROM pacientes
       ${clausulaWhere}
      ORDER BY apellido ASC, nombre ASC
      LIMIT ? OFFSET ?`,
    [...parametros, cantidadPorPagina, desplazamiento]
  );

  return {
    pacientes: filas.map(mapearPaciente),
    total,
    pagina: numeroPagina,
    porPagina: cantidadPorPagina,
  };
}

/*
  Detalle de un paciente + contador de tratamientos.
*/
async function obtenerPacientePorId(idPaciente, idConsultorio) {
  const fila = await obtenerFilaPacienteDelConsultorio(idPaciente, idConsultorio);
  const tratamientosTotal = await contarTratamientosDePaciente(idPaciente);

  return {
    ...mapearPaciente(fila),
    tratamientos_total: tratamientosTotal,
  };
}

/*
  Alta de paciente. Nace activo, en el consultorio del usuario autenticado y con
  el usuario como autor del alta.
*/
async function crearPaciente(datos, idUsuario, idConsultorio) {
  const normalizados = normalizarDatosDePaciente(datos);

  if (
    await existeDniDuplicado(normalizados.dni, idConsultorio)
  ) {
    const error = new Error("Ya existe un paciente con ese DNI.");
    error.statusCode = 409;
    throw error;
  }

  const [resultado] = await poolDeConexiones.query(
    `INSERT INTO pacientes
       (nombre, apellido, dni, telefono, email, obra_social, observaciones,
        fecha_nacimiento, activo, id_consultorio, id_usuario_alta, fecha_alta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
    [
      normalizados.nombre,
      normalizados.apellido,
      normalizados.dni,
      normalizados.telefono,
      normalizados.email,
      normalizados.obra_social,
      normalizados.observaciones,
      normalizados.fecha_nacimiento,
      idConsultorio,
      idUsuario,
    ]
  );

  return obtenerPacientePorId(resultado.insertId, idConsultorio);
}

/*
  Modificación de la ficha. ID_PACIENTE, fecha_alta e id_usuario_alta no se
  tocan. El DNI puede cambiar pero no puede colisionar con otro paciente del
  consultorio.
*/
async function actualizarPaciente(idPaciente, datos, idConsultorio) {
  await obtenerFilaPacienteDelConsultorio(idPaciente, idConsultorio);

  const normalizados = normalizarDatosDePaciente(datos);

  if (
    await existeDniDuplicado(normalizados.dni, idConsultorio, {
      idExcluido: idPaciente,
    })
  ) {
    const error = new Error("Ya existe un paciente con ese DNI.");
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE pacientes
        SET nombre = ?,
            apellido = ?,
            dni = ?,
            telefono = ?,
            email = ?,
            obra_social = ?,
            observaciones = ?,
            fecha_nacimiento = ?
      WHERE id_paciente = ?
        AND id_consultorio = ?`,
    [
      normalizados.nombre,
      normalizados.apellido,
      normalizados.dni,
      normalizados.telefono,
      normalizados.email,
      normalizados.obra_social,
      normalizados.observaciones,
      normalizados.fecha_nacimiento,
      idPaciente,
      idConsultorio,
    ]
  );

  return obtenerPacientePorId(idPaciente, idConsultorio);
}

/*
  Baja lógica. Se permite aunque el paciente tenga tratamientos (la baja de la
  ficha es independiente); en ese caso se devuelve una advertencia informativa.
*/
async function desactivarPaciente(idPaciente, idConsultorio) {
  const fila = await obtenerFilaPacienteDelConsultorio(idPaciente, idConsultorio);

  if (Number(fila.activo) === 0) {
    const error = new Error("El paciente ya se encuentra inactivo.");
    error.statusCode = 400;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE pacientes
        SET activo = 0
      WHERE id_paciente = ?
        AND id_consultorio = ?`,
    [idPaciente, idConsultorio]
  );

  const paciente = await obtenerPacientePorId(idPaciente, idConsultorio);

  const resultado = { paciente };

  if (paciente.tratamientos_total > 0) {
    resultado.advertencia = `El paciente tiene ${paciente.tratamientos_total} tratamientos registrados.`;
  }

  return resultado;
}

/*
  Reactivación. Se rechaza si ya hay otro paciente ACTIVO con el mismo DNI en el
  consultorio (no puede haber dos fichas activas del mismo documento).
*/
async function reactivarPaciente(idPaciente, idConsultorio) {
  const fila = await obtenerFilaPacienteDelConsultorio(idPaciente, idConsultorio);

  if (Number(fila.activo) === 1) {
    const error = new Error("El paciente ya se encuentra activo.");
    error.statusCode = 400;
    throw error;
  }

  if (
    await existeDniDuplicado(fila.dni, idConsultorio, {
      idExcluido: idPaciente,
      soloActivos: true,
    })
  ) {
    const error = new Error(
      "No se puede reactivar: ya existe otro paciente activo con el mismo DNI."
    );
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE pacientes
        SET activo = 1
      WHERE id_paciente = ?
        AND id_consultorio = ?`,
    [idPaciente, idConsultorio]
  );

  return { paciente: await obtenerPacientePorId(idPaciente, idConsultorio) };
}

module.exports = {
  listarPacientes,
  obtenerPacientePorId,
  crearPaciente,
  actualizarPaciente,
  desactivarPaciente,
  reactivarPaciente,
};

const { poolDeConexiones } = require("../../config/db");

/*
  ABM 03 — Tratamientos (entidad transaccional).

  Es el evento núcleo del negocio: pertenece a un paciente, es de un tipo, tiene
  un precio pactado y atraviesa un ciclo de estados. Contra él se registran pagos
  (ABM 04) y gastos (ABM 05).

  Reglas transversales (contrato en docs/abm/00-contexto-base.md):
  - Todo se aísla por consultorio: cada query filtra por el id_consultorio que
    llega en req.usuario, nunca desde el body. El alta lo estampa junto con el
    usuario autor.
  - Las columnas de dominio de `tratamientos` están en MAYÚSCULAS en la BD
    (ID_TRATAMIENTO, PRECIO_PACIENTE…); MySQL trata los identificadores como
    case-insensitive, así que acá el SQL se escribe en minúsculas.
  - La baja lógica NO es una columna `activo`: es el estado «cancelado» (id 4).
  - Toda alta / modificación / cambio de estado escribe en `auditoria_cambios`
    DENTRO de la misma transacción que el cambio.
*/

const LONGITUD_PAGINA_POR_DEFECTO = 20;
const LONGITUD_PAGINA_MAXIMA = 100;

// Ids reales de estados_tratamiento (seeds fijos, ver contexto-base §7).
const ESTADO = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  FINALIZADO: 3,
  CANCELADO: 4,
};

const NOMBRE_ESTADO = {
  1: "pendiente",
  2: "en proceso",
  3: "finalizado",
  4: "cancelado",
};

/*
  Matriz de transiciones válidas del motor de estados.

    pendiente ──▶ en proceso ──▶ finalizado
        │              │
        └──────────────┴──▶ cancelado

  «finalizado» y «cancelado» son estados finales: no admiten salida.
*/
const TRANSICIONES_VALIDAS = {
  1: [2, 4],
  2: [3, 4],
  3: [],
  4: [],
};

const ORDENES_VALIDOS = ["fecha_desc", "fecha_asc", "actualizacion_desc"];

const CLAUSULA_ORDEN = {
  fecha_desc: "t.fecha_inicio DESC, t.id_tratamiento DESC",
  fecha_asc: "t.fecha_inicio ASC, t.id_tratamiento ASC",
  actualizacion_desc: "t.fecha_actualizacion DESC, t.id_tratamiento DESC",
};

const MOTIVO_CANCELACION_MIN = 5;

// SELECT base con los nombres de paciente / tipo / estado ya resueltos y el
// total cobrado derivado de los pagos (nunca se almacena).
const SELECT_TRATAMIENTO = `
  SELECT
    t.id_tratamiento,
    t.id_paciente,
    t.id_tipo_tratamiento,
    t.descripcion,
    t.precio_paciente,
    t.id_estado,
    t.fecha_inicio,
    t.fecha_fin,
    t.observaciones,
    t.motivo_cancelacion,
    t.id_usuario,
    t.id_consultorio,
    t.fecha_creacion,
    t.fecha_actualizacion,
    p.nombre   AS paciente_nombre,
    p.apellido AS paciente_apellido,
    tt.nombre  AS tipo_nombre,
    e.nombre_estado AS estado_nombre,
    COALESCE((
      SELECT SUM(pg.monto) FROM pagos pg
       WHERE pg.id_tratamiento = t.id_tratamiento AND pg.anulado = 0
    ), 0) AS total_cobrado
  FROM tratamientos t
  INNER JOIN pacientes p           ON p.id_paciente = t.id_paciente
  INNER JOIN tipos_tratamiento tt  ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
  INNER JOIN estados_tratamiento e ON e.id_estado = t.id_estado
`;

// ── Normalización de entrada ────────────────────────────────────────────────

function textoONulo(valor) {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

function fechaONula(valor) {
  const texto = textoONulo(valor);
  return texto ? texto.slice(0, 10) : null;
}

function aNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

// ── Mapeo de salida ─────────────────────────────────────────────────────────

function mapearTratamiento(fila) {
  const precio = Number(fila.precio_paciente);
  const cobrado = Number(fila.total_cobrado) || 0;

  return {
    id_tratamiento: fila.id_tratamiento,
    id_paciente: fila.id_paciente,
    paciente_nombre: fila.paciente_nombre,
    paciente_apellido: fila.paciente_apellido,
    id_tipo_tratamiento: fila.id_tipo_tratamiento,
    tipo_nombre: fila.tipo_nombre,
    descripcion: fila.descripcion || null,
    precio_paciente: precio,
    id_estado: fila.id_estado,
    estado_nombre: fila.estado_nombre,
    fecha_inicio: fila.fecha_inicio || null,
    fecha_fin: fila.fecha_fin || null,
    observaciones: fila.observaciones || null,
    motivo_cancelacion: fila.motivo_cancelacion || null,
    id_usuario: fila.id_usuario,
    id_consultorio: fila.id_consultorio,
    fecha_creacion: fila.fecha_creacion || null,
    fecha_actualizacion: fila.fecha_actualizacion || null,
    total_cobrado: cobrado,
    saldo: Number((precio - cobrado).toFixed(2)),
  };
}

function crearError(mensaje, statusCode) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
}

// ── Lecturas auxiliares ─────────────────────────────────────────────────────

async function obtenerFilaTratamiento(idTratamiento, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `${SELECT_TRATAMIENTO} WHERE t.id_tratamiento = ? AND t.id_consultorio = ? LIMIT 1`,
    [idTratamiento, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError(
      "El tratamiento no existe o no pertenece a este consultorio.",
      404
    );
  }

  return filas[0];
}

/*
  Valida que el paciente exista, esté activo y pertenezca al consultorio.
  Devuelve la fila para reutilizarla.
*/
async function asegurarPacienteUtilizable(idPaciente, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_paciente, activo FROM pacientes
      WHERE id_paciente = ? AND id_consultorio = ? LIMIT 1`,
    [idPaciente, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError(
      "El paciente no existe o no pertenece a este consultorio.",
      400
    );
  }

  if (Number(filas[0].activo) !== 1) {
    throw crearError("El paciente está inactivo.", 400);
  }
}

async function asegurarTipoUtilizable(idTipo, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_tipo_tratamiento, activo FROM tipos_tratamiento
      WHERE id_tipo_tratamiento = ? LIMIT 1`,
    [idTipo]
  );

  if (filas.length === 0) {
    throw crearError("El tipo de tratamiento no existe.", 400);
  }

  if (Number(filas[0].activo) !== 1) {
    throw crearError("El tipo de tratamiento está inactivo.", 400);
  }
}

/*
  Inserta una fila de auditoría. Se llama siempre con la conexión de la
  transacción del cambio que se está auditando.
*/
async function registrarAuditoria(conexion, datos) {
  const {
    idEntidad,
    idUsuario,
    accion,
    campo = null,
    valorAnterior = null,
    valorNuevo = null,
    motivo = null,
  } = datos;

  await conexion.query(
    `INSERT INTO auditoria_cambios
       (entidad, id_entidad, id_usuario, accion, campo, valor_anterior, valor_nuevo, motivo)
     VALUES ('tratamientos', ?, ?, ?, ?, ?, ?, ?)`,
    [
      idEntidad,
      idUsuario,
      accion,
      campo,
      valorAnterior === null || valorAnterior === undefined ? null : String(valorAnterior),
      valorNuevo === null || valorNuevo === undefined ? null : String(valorNuevo),
      motivo,
    ]
  );
}

function transicionesPosibles(idEstadoActual) {
  return (TRANSICIONES_VALIDAS[idEstadoActual] || []).map((idDestino) => ({
    id_estado: idDestino,
    nombre: NOMBRE_ESTADO[idDestino],
    requiere_motivo: idDestino === ESTADO.CANCELADO,
  }));
}

// ── Casos de uso ────────────────────────────────────────────────────────────

/*
  Listado paginado con filtros por estado, paciente, tipo y rango de fechas de
  inicio, búsqueda por texto (descripción o paciente) y orden configurable.
  Devuelve { tratamientos, total, pagina, porPagina }.
*/
async function listarTratamientos(filtros = {}) {
  const {
    idConsultorio,
    idPaciente = null,
    idEstado = null,
    idTipo = null,
    busqueda = "",
    desde = null,
    hasta = null,
    orden = "fecha_desc",
    pagina = 1,
    porPagina = LONGITUD_PAGINA_POR_DEFECTO,
  } = filtros;

  const numeroPagina = Math.max(1, Number(pagina) || 1);
  const cantidadPorPagina = Math.min(
    LONGITUD_PAGINA_MAXIMA,
    Math.max(1, Number(porPagina) || LONGITUD_PAGINA_POR_DEFECTO)
  );
  const desplazamiento = (numeroPagina - 1) * cantidadPorPagina;

  const condiciones = ["t.id_consultorio = ?"];
  const parametros = [idConsultorio];

  if (idPaciente) {
    condiciones.push("t.id_paciente = ?");
    parametros.push(idPaciente);
  }

  if (idEstado) {
    condiciones.push("t.id_estado = ?");
    parametros.push(idEstado);
  }

  if (idTipo) {
    condiciones.push("t.id_tipo_tratamiento = ?");
    parametros.push(idTipo);
  }

  const textoBusqueda = String(busqueda || "").trim();
  if (textoBusqueda !== "") {
    condiciones.push(
      "(t.descripcion LIKE ? OR p.nombre LIKE ? OR p.apellido LIKE ? OR CONCAT(p.nombre, ' ', p.apellido) LIKE ?)"
    );
    const patron = `%${textoBusqueda}%`;
    parametros.push(patron, patron, patron, patron);
  }

  if (desde) {
    condiciones.push("t.fecha_inicio >= ?");
    parametros.push(desde);
  }

  if (hasta) {
    condiciones.push("t.fecha_inicio <= ?");
    parametros.push(hasta);
  }

  const clausulaWhere = `WHERE ${condiciones.join(" AND ")}`;
  const clausulaOrden =
    CLAUSULA_ORDEN[orden] || CLAUSULA_ORDEN.fecha_desc;

  const [filasTotal] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS total
       FROM tratamientos t
       INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
       ${clausulaWhere}`,
    parametros
  );
  const total = filasTotal[0].total;

  const [filas] = await poolDeConexiones.query(
    `${SELECT_TRATAMIENTO} ${clausulaWhere} ORDER BY ${clausulaOrden} LIMIT ? OFFSET ?`,
    [...parametros, cantidadPorPagina, desplazamiento]
  );

  return {
    tratamientos: filas.map(mapearTratamiento),
    total,
    pagina: numeroPagina,
    porPagina: cantidadPorPagina,
  };
}

/*
  Opciones para poblar los selectores del formulario sin exigir los permisos
  ver_pacientes / ver_catalogos: tipos de tratamiento activos, estados y
  pacientes activos del consultorio.
*/
async function obtenerOpciones(idConsultorio) {
  const [tipos] = await poolDeConexiones.query(
    `SELECT id_tipo_tratamiento AS id, nombre
       FROM tipos_tratamiento
      WHERE activo = 1
      ORDER BY nombre ASC`
  );

  const [estados] = await poolDeConexiones.query(
    `SELECT id_estado AS id, nombre_estado AS nombre
       FROM estados_tratamiento
      ORDER BY id_estado ASC`
  );

  const [pacientes] = await poolDeConexiones.query(
    `SELECT id_paciente AS id, nombre, apellido
       FROM pacientes
      WHERE id_consultorio = ? AND activo = 1
      ORDER BY apellido ASC, nombre ASC`,
    [idConsultorio]
  );

  return { tipos, estados, pacientes };
}

/*
  Detalle de un tratamiento + historial de auditoría + pagos + gastos imputados
  + transiciones de estado alcanzables.
*/
async function obtenerTratamientoPorId(idTratamiento, idConsultorio) {
  const fila = await obtenerFilaTratamiento(idTratamiento, idConsultorio);
  const tratamiento = mapearTratamiento(fila);

  const [historial] = await poolDeConexiones.query(
    `SELECT
        a.id_auditoria,
        a.accion,
        a.campo,
        a.valor_anterior,
        a.valor_nuevo,
        a.motivo,
        a.fecha,
        a.id_usuario,
        u.nombre   AS usuario_nombre,
        u.apellido AS usuario_apellido,
        u.email    AS usuario_email
      FROM auditoria_cambios a
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
     WHERE a.entidad = 'tratamientos' AND a.id_entidad = ?
     ORDER BY a.fecha ASC, a.id_auditoria ASC`,
    [idTratamiento]
  );

  const [pagos] = await poolDeConexiones.query(
    `SELECT
        pg.id_pago,
        pg.monto,
        pg.id_medio_pago,
        mp.nombre_medio AS medio_nombre,
        pg.fecha_pago,
        pg.notas,
        pg.anulado
      FROM pagos pg
      INNER JOIN medios_pago mp ON mp.id_medio_pago = pg.id_medio_pago
     WHERE pg.id_tratamiento = ?
     ORDER BY pg.fecha_pago ASC, pg.id_pago ASC`,
    [idTratamiento]
  );

  const [gastos] = await poolDeConexiones.query(
    `SELECT
        g.id_gasto,
        g.monto,
        g.id_tipo_gasto,
        tg.nombre_tipo AS tipo_nombre,
        g.descripcion,
        g.fecha_gasto
      FROM gastos g
      INNER JOIN tipos_gasto tg ON tg.id_tipo_gasto = g.id_tipo_gasto
     WHERE g.id_tratamiento = ?
     ORDER BY g.fecha_gasto ASC, g.id_gasto ASC`,
    [idTratamiento]
  );

  return {
    ...tratamiento,
    transiciones_posibles: transicionesPosibles(tratamiento.id_estado),
    historial: historial.map((h) => ({
      id_auditoria: h.id_auditoria,
      accion: h.accion,
      campo: h.campo || null,
      valor_anterior: h.valor_anterior,
      valor_nuevo: h.valor_nuevo,
      motivo: h.motivo || null,
      fecha: h.fecha,
      id_usuario: h.id_usuario,
      usuario:
        h.usuario_nombre || h.usuario_apellido
          ? `${h.usuario_nombre || ""} ${h.usuario_apellido || ""}`.trim()
          : h.usuario_email || `Usuario ${h.id_usuario}`,
    })),
    pagos: pagos.map((pg) => ({
      id_pago: pg.id_pago,
      monto: Number(pg.monto),
      id_medio_pago: pg.id_medio_pago,
      medio_nombre: pg.medio_nombre,
      fecha_pago: pg.fecha_pago,
      notas: pg.notas || null,
      anulado: Number(pg.anulado) === 1,
    })),
    gastos: gastos.map((g) => ({
      id_gasto: g.id_gasto,
      monto: Number(g.monto),
      id_tipo_gasto: g.id_tipo_gasto,
      tipo_nombre: g.tipo_nombre,
      descripcion: g.descripcion || null,
      fecha_gasto: g.fecha_gasto,
    })),
  };
}

/*
  Alta de tratamiento. Nace SIEMPRE en «pendiente», en el consultorio del usuario
  autenticado y con ese usuario como autor. El paciente y el tipo deben existir y
  estar activos; el precio debe ser mayor a cero.
*/
async function crearTratamiento(datos, idUsuario, idConsultorio) {
  const idPaciente = aNumero(datos.id_paciente);
  const idTipo = aNumero(datos.id_tipo_tratamiento);
  const precio = aNumero(datos.precio_paciente);
  const descripcion = textoONulo(datos.descripcion);
  const observaciones = textoONulo(datos.observaciones);
  const fechaInicio = fechaONula(datos.fecha_inicio);

  if (!idPaciente) throw crearError("El paciente es obligatorio.", 400);
  if (!idTipo) throw crearError("El tipo de tratamiento es obligatorio.", 400);
  if (precio === null || precio <= 0) {
    throw crearError("El precio debe ser mayor a cero.", 400);
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    await asegurarPacienteUtilizable(idPaciente, idConsultorio, conexion);
    await asegurarTipoUtilizable(idTipo, conexion);

    const [resultado] = await conexion.query(
      `INSERT INTO tratamientos
         (id_paciente, id_tipo_tratamiento, descripcion, precio_paciente, id_estado,
          fecha_inicio, fecha_fin, observaciones, id_usuario, id_consultorio, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NOW())`,
      [
        idPaciente,
        idTipo,
        descripcion,
        precio,
        ESTADO.PENDIENTE,
        fechaInicio,
        observaciones,
        idUsuario,
        idConsultorio,
      ]
    );

    await registrarAuditoria(conexion, {
      idEntidad: resultado.insertId,
      idUsuario,
      accion: "alta",
      valorNuevo: "pendiente",
    });

    await conexion.commit();

    return obtenerTratamientoPorId(resultado.insertId, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/*
  Campos que se pueden modificar según el estado del tratamiento.
*/
function camposEditablesPorEstado(idEstado) {
  if (idEstado === ESTADO.PENDIENTE) {
    return [
      "id_paciente",
      "id_tipo_tratamiento",
      "descripcion",
      "precio_paciente",
      "fecha_inicio",
      "fecha_fin",
      "observaciones",
    ];
  }

  if (idEstado === ESTADO.EN_PROCESO) {
    return ["descripcion", "precio_paciente", "fecha_fin", "observaciones"];
  }

  // finalizado / cancelado
  return ["observaciones"];
}

/*
  Modificación. Los campos permitidos dependen del estado (ver arriba). Intentar
  cambiar un campo bloqueado devuelve 409. El precio nuevo no puede quedar por
  debajo del total ya cobrado en pagos. Cada campo que cambia deja una fila en
  auditoría.
*/
async function actualizarTratamiento(idTratamiento, datos, idUsuario, idConsultorio) {
  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const actual = await obtenerFilaTratamiento(idTratamiento, idConsultorio, conexion);
    const idEstado = actual.id_estado;
    const editables = camposEditablesPorEstado(idEstado);

    // Valores entrantes normalizados (solo los que el cliente mandó).
    const entrantes = {};
    if (datos.id_paciente !== undefined) entrantes.id_paciente = aNumero(datos.id_paciente);
    if (datos.id_tipo_tratamiento !== undefined)
      entrantes.id_tipo_tratamiento = aNumero(datos.id_tipo_tratamiento);
    if (datos.descripcion !== undefined) entrantes.descripcion = textoONulo(datos.descripcion);
    if (datos.precio_paciente !== undefined)
      entrantes.precio_paciente = aNumero(datos.precio_paciente);
    if (datos.fecha_inicio !== undefined) entrantes.fecha_inicio = fechaONula(datos.fecha_inicio);
    if (datos.fecha_fin !== undefined) entrantes.fecha_fin = fechaONula(datos.fecha_fin);
    if (datos.observaciones !== undefined)
      entrantes.observaciones = textoONulo(datos.observaciones);

    // Normalización de los valores actuales para comparar.
    const valorActual = {
      id_paciente: actual.id_paciente,
      id_tipo_tratamiento: actual.id_tipo_tratamiento,
      descripcion: actual.descripcion || null,
      precio_paciente: Number(actual.precio_paciente),
      fecha_inicio: actual.fecha_inicio
        ? String(actual.fecha_inicio).slice(0, 10)
        : null,
      fecha_fin: actual.fecha_fin ? String(actual.fecha_fin).slice(0, 10) : null,
      observaciones: actual.observaciones || null,
    };

    // Campos que realmente cambian.
    const camposQueCambian = Object.keys(entrantes).filter(
      (campo) => entrantes[campo] !== valorActual[campo]
    );

    // Bloqueo por estado: si intenta cambiar un campo no editable → 409.
    const bloqueados = camposQueCambian.filter((campo) => !editables.includes(campo));
    if (bloqueados.length > 0) {
      if (idEstado === ESTADO.FINALIZADO || idEstado === ESTADO.CANCELADO) {
        throw crearError(
          `Tratamiento ${NOMBRE_ESTADO[idEstado]}, no editable.`,
          409
        );
      }
      throw crearError(
        "En un tratamiento en proceso no se puede cambiar el paciente ni el tipo de tratamiento.",
        409
      );
    }

    if (camposQueCambian.length === 0) {
      await conexion.commit();
      return obtenerTratamientoPorId(idTratamiento, idConsultorio);
    }

    // Validaciones de negocio sobre los valores nuevos.
    if (camposQueCambian.includes("id_paciente")) {
      if (!entrantes.id_paciente) throw crearError("El paciente es obligatorio.", 400);
      await asegurarPacienteUtilizable(entrantes.id_paciente, idConsultorio, conexion);
    }

    if (camposQueCambian.includes("id_tipo_tratamiento")) {
      if (!entrantes.id_tipo_tratamiento)
        throw crearError("El tipo de tratamiento es obligatorio.", 400);
      await asegurarTipoUtilizable(entrantes.id_tipo_tratamiento, conexion);
    }

    const precioFinal = camposQueCambian.includes("precio_paciente")
      ? entrantes.precio_paciente
      : valorActual.precio_paciente;

    if (camposQueCambian.includes("precio_paciente")) {
      if (precioFinal === null || precioFinal <= 0) {
        throw crearError("El precio debe ser mayor a cero.", 400);
      }

      const [filasCobrado] = await conexion.query(
        `SELECT COALESCE(SUM(monto), 0) AS cobrado FROM pagos WHERE id_tratamiento = ? AND anulado = 0`,
        [idTratamiento]
      );
      const cobrado = Number(filasCobrado[0].cobrado) || 0;

      if (precioFinal < cobrado) {
        throw crearError(
          `El precio no puede ser menor al total ya cobrado ($${cobrado.toFixed(2)}).`,
          409
        );
      }
    }

    const fechaInicioFinal = camposQueCambian.includes("fecha_inicio")
      ? entrantes.fecha_inicio
      : valorActual.fecha_inicio;
    const fechaFinFinal = camposQueCambian.includes("fecha_fin")
      ? entrantes.fecha_fin
      : valorActual.fecha_fin;

    if (fechaInicioFinal && fechaFinFinal && fechaFinFinal < fechaInicioFinal) {
      throw crearError(
        "La fecha de fin no puede ser anterior a la fecha de inicio.",
        400
      );
    }

    // Armado dinámico del UPDATE.
    const asignaciones = camposQueCambian.map((campo) => `${campo} = ?`);
    const valores = camposQueCambian.map((campo) => entrantes[campo]);

    await conexion.query(
      `UPDATE tratamientos SET ${asignaciones.join(", ")}
        WHERE id_tratamiento = ? AND id_consultorio = ?`,
      [...valores, idTratamiento, idConsultorio]
    );

    for (const campo of camposQueCambian) {
      await registrarAuditoria(conexion, {
        idEntidad: idTratamiento,
        idUsuario,
        accion: "modificacion",
        campo,
        valorAnterior: valorActual[campo],
        valorNuevo: entrantes[campo],
      });
    }

    await conexion.commit();

    return obtenerTratamientoPorId(idTratamiento, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/*
  Transición de estado contra la matriz. Reglas:
  - `→ finalizado`: si FECHA_FIN está vacía, se setea hoy.
  - `→ en proceso`: si FECHA_INICIO está vacía, se setea hoy.
  - `→ cancelado`: motivo obligatorio (mín. 5 caracteres) y ningún pago
    registrado; queda guardado en motivo_cancelacion.
*/
async function cambiarEstadoTratamiento(idTratamiento, datos, idUsuario, idConsultorio) {
  const idEstadoDestino = aNumero(datos.id_estado);
  const motivo = textoONulo(datos.motivo);

  if (!NOMBRE_ESTADO[idEstadoDestino]) {
    throw crearError("El estado destino no es válido.", 400);
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const actual = await obtenerFilaTratamiento(idTratamiento, idConsultorio, conexion);
    const idEstadoOrigen = actual.id_estado;

    if (idEstadoOrigen === idEstadoDestino) {
      throw crearError(
        `El tratamiento ya está en estado «${NOMBRE_ESTADO[idEstadoDestino]}».`,
        400
      );
    }

    const permitidas = TRANSICIONES_VALIDAS[idEstadoOrigen] || [];
    if (!permitidas.includes(idEstadoDestino)) {
      if (idEstadoOrigen === ESTADO.FINALIZADO || idEstadoOrigen === ESTADO.CANCELADO) {
        throw crearError(
          `El tratamiento está ${NOMBRE_ESTADO[idEstadoOrigen]}: no admite cambios de estado.`,
          409
        );
      }
      if (
        idEstadoOrigen === ESTADO.PENDIENTE &&
        idEstadoDestino === ESTADO.FINALIZADO
      ) {
        throw crearError("Debe iniciarse antes de finalizar.", 409);
      }
      throw crearError(
        `Transición de estado no permitida: ${NOMBRE_ESTADO[idEstadoOrigen]} → ${NOMBRE_ESTADO[idEstadoDestino]}.`,
        409
      );
    }

    const asignaciones = ["id_estado = ?"];
    const valores = [idEstadoDestino];
    let accion = "cambio_estado";
    let motivoAuditoria = null;

    if (idEstadoDestino === ESTADO.CANCELADO) {
      if (!motivo || motivo.length < MOTIVO_CANCELACION_MIN) {
        throw crearError(
          `El motivo de cancelación es obligatorio (mínimo ${MOTIVO_CANCELACION_MIN} caracteres).`,
          400
        );
      }

      const [filasCobrado] = await conexion.query(
        `SELECT COALESCE(SUM(monto), 0) AS cobrado FROM pagos WHERE id_tratamiento = ? AND anulado = 0`,
        [idTratamiento]
      );

      if (Number(filasCobrado[0].cobrado) > 0) {
        throw crearError(
          "No se puede cancelar: el tratamiento tiene pagos registrados. Anulá los pagos primero.",
          409
        );
      }

      asignaciones.push("motivo_cancelacion = ?");
      valores.push(motivo);
      accion = "cancelacion";
      motivoAuditoria = motivo;
    }

    if (
      idEstadoDestino === ESTADO.FINALIZADO &&
      !actual.fecha_fin
    ) {
      asignaciones.push("fecha_fin = CURDATE()");
    }

    if (
      idEstadoDestino === ESTADO.EN_PROCESO &&
      !actual.fecha_inicio
    ) {
      asignaciones.push("fecha_inicio = CURDATE()");
    }

    await conexion.query(
      `UPDATE tratamientos SET ${asignaciones.join(", ")}
        WHERE id_tratamiento = ? AND id_consultorio = ?`,
      [...valores, idTratamiento, idConsultorio]
    );

    await registrarAuditoria(conexion, {
      idEntidad: idTratamiento,
      idUsuario,
      accion,
      campo: "id_estado",
      valorAnterior: NOMBRE_ESTADO[idEstadoOrigen],
      valorNuevo: NOMBRE_ESTADO[idEstadoDestino],
      motivo: motivoAuditoria,
    });

    await conexion.commit();

    return obtenerTratamientoPorId(idTratamiento, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  ESTADO,
  NOMBRE_ESTADO,
  TRANSICIONES_VALIDAS,
  ORDENES_VALIDOS,
  MOTIVO_CANCELACION_MIN,
  listarTratamientos,
  obtenerOpciones,
  obtenerTratamientoPorId,
  crearTratamiento,
  actualizarTratamiento,
  cambiarEstadoTratamiento,
};

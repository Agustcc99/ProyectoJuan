const { poolDeConexiones } = require("../../config/db");

/*
  ABM 05 — Gastos (entidad transaccional).

  Un gasto es un egreso del consultorio. Siempre tiene un tipo de gasto y,
  OPCIONALMENTE, se imputa a un tratamiento (gastos.id_tratamiento NULLABLE):
  puede ser un gasto general (alquiler, insumos del mes) o el costo de
  laboratorio de un tratamiento concreto.

  Reglas transversales (contrato en docs/abm/00-contexto-base.md):
  - Todo se aísla por consultorio: cada query filtra por el id_consultorio que
    llega en req.usuario, nunca desde el body. El alta lo estampa junto con el
    usuario autor, y valida que el tratamiento (si se imputa) sea del mismo
    consultorio.
  - Las columnas de dominio de `gastos` están en MAYÚSCULAS en la BD (ID_GASTO,
    MONTO, FECHA_GASTO…); MySQL trata los identificadores como case-insensitive,
    así que acá el SQL se escribe en minúsculas.
  - La baja lógica NO es física: es la anulación (`anulado = 1` + motivo + actor).
    Un gasto anulado deja de contar para el total del período y para los
    reportes. No hay "reactivar".
  - El monto NO se edita: para corregirlo se anula el gasto y se registra uno
    nuevo.
  - Toda alta / modificación / anulación escribe en `auditoria_cambios`
    (entidad = 'gastos') DENTRO de la misma transacción que el cambio.
*/

const LONGITUD_PAGINA_POR_DEFECTO = 20;
const LONGITUD_PAGINA_MAXIMA = 100;

const MOTIVO_ANULACION_MIN = 5;

const DESCRIPCION_MAX = 2000;

const ORDENES_VALIDOS = ["fecha_desc", "fecha_asc"];

const CLAUSULA_ORDEN = {
  fecha_desc: "g.fecha_gasto DESC, g.id_gasto DESC",
  fecha_asc: "g.fecha_gasto ASC, g.id_gasto ASC",
};

const ESTADOS_FILTRO = ["vigentes", "anulados", "todos"];

const IMPUTACION_FILTRO = ["todos", "con_tratamiento", "generales"];

// SELECT base con el tipo de gasto y, si el gasto está imputado, el paciente y
// el tipo de tratamiento ya resueltos, más los actores (autor y quien anuló).
const SELECT_GASTO = `
  SELECT
    g.id_gasto,
    g.id_tratamiento,
    g.id_tipo_gasto,
    g.monto,
    g.descripcion,
    g.fecha_gasto,
    g.anulado,
    g.motivo_anulacion,
    g.id_usuario_anula,
    g.fecha_anulacion,
    g.id_usuario,
    g.id_consultorio,
    g.fecha_creacion,
    tg.nombre_tipo AS tipo_nombre,
    t.id_paciente,
    t.descripcion  AS tratamiento_descripcion,
    t.id_estado    AS tratamiento_id_estado,
    p.nombre       AS paciente_nombre,
    p.apellido     AS paciente_apellido,
    tt.nombre      AS tipo_tratamiento_nombre,
    ua.nombre      AS anulado_por_nombre,
    ua.apellido    AS anulado_por_apellido,
    ua.email       AS anulado_por_email,
    uc.nombre      AS registrado_por_nombre,
    uc.apellido    AS registrado_por_apellido,
    uc.email       AS registrado_por_email
  FROM gastos g
  INNER JOIN tipos_gasto tg        ON tg.id_tipo_gasto = g.id_tipo_gasto
  LEFT JOIN tratamientos t         ON t.id_tratamiento = g.id_tratamiento
  LEFT JOIN pacientes p            ON p.id_paciente = t.id_paciente
  LEFT JOIN tipos_tratamiento tt   ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
  LEFT JOIN usuarios ua            ON ua.id_usuario = g.id_usuario_anula
  LEFT JOIN usuarios uc            ON uc.id_usuario = g.id_usuario
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

function hoyISO() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
}

function redondear2(valor) {
  return Number((Number(valor) || 0).toFixed(2));
}

// ── Mapeo de salida ─────────────────────────────────────────────────────────

function nombreCompleto(nombre, apellido, email, idUsuario) {
  if (nombre || apellido) {
    return `${nombre || ""} ${apellido || ""}`.trim();
  }
  return email || (idUsuario ? `Usuario ${idUsuario}` : null);
}

function mapearGasto(fila) {
  return {
    id_gasto: fila.id_gasto,
    id_tratamiento: fila.id_tratamiento || null,
    imputado: fila.id_tratamiento != null,
    id_tipo_gasto: fila.id_tipo_gasto,
    tipo_nombre: fila.tipo_nombre,
    monto: Number(fila.monto),
    descripcion: fila.descripcion || null,
    fecha_gasto: fila.fecha_gasto || null,
    anulado: Number(fila.anulado) === 1,
    motivo_anulacion: fila.motivo_anulacion || null,
    fecha_anulacion: fila.fecha_anulacion || null,
    anulado_por: nombreCompleto(
      fila.anulado_por_nombre,
      fila.anulado_por_apellido,
      fila.anulado_por_email,
      fila.id_usuario_anula
    ),
    id_usuario: fila.id_usuario,
    registrado_por: nombreCompleto(
      fila.registrado_por_nombre,
      fila.registrado_por_apellido,
      fila.registrado_por_email,
      fila.id_usuario
    ),
    id_consultorio: fila.id_consultorio,
    fecha_creacion: fila.fecha_creacion || null,
    id_paciente: fila.id_paciente || null,
    paciente_nombre: fila.paciente_nombre || null,
    paciente_apellido: fila.paciente_apellido || null,
    tipo_tratamiento_nombre: fila.tipo_tratamiento_nombre || null,
    tratamiento_descripcion: fila.tratamiento_descripcion || null,
    tratamiento_id_estado: fila.tratamiento_id_estado || null,
  };
}

function crearError(mensaje, statusCode) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
}

// ── Lecturas auxiliares ─────────────────────────────────────────────────────

async function obtenerFilaGasto(idGasto, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `${SELECT_GASTO} WHERE g.id_gasto = ? AND g.id_consultorio = ? LIMIT 1`,
    [idGasto, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError("El gasto no existe o no pertenece a este consultorio.", 404);
  }

  return filas[0];
}

/*
  Valida que el tratamiento exista y pertenezca al consultorio. Un gasto se puede
  imputar a un tratamiento en CUALQUIER estado (un tratamiento cancelado igual
  pudo generar un gasto de laboratorio).
*/
async function asegurarTratamientoImputable(idTratamiento, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_tratamiento FROM tratamientos
      WHERE id_tratamiento = ? AND id_consultorio = ? LIMIT 1`,
    [idTratamiento, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError(
      "El tratamiento no existe o no pertenece a este consultorio.",
      404
    );
  }
}

async function asegurarTipoGastoUtilizable(idTipoGasto, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_tipo_gasto, activo FROM tipos_gasto WHERE id_tipo_gasto = ? LIMIT 1`,
    [idTipoGasto]
  );

  if (filas.length === 0) {
    throw crearError("El tipo de gasto no existe.", 400);
  }

  if (Number(filas[0].activo) !== 1) {
    throw crearError("El tipo de gasto está inactivo.", 400);
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
     VALUES ('gastos', ?, ?, ?, ?, ?, ?, ?)`,
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

// ── Casos de uso ────────────────────────────────────────────────────────────

/*
  Opciones para poblar los selectores del formulario sin exigir el permiso
  ver_catalogos ni ver_tratamientos: tipos de gasto activos y tratamientos del
  consultorio (cualquier estado) para el selector de imputación.
*/
async function obtenerOpciones(idConsultorio) {
  const [tipos] = await poolDeConexiones.query(
    `SELECT id_tipo_gasto AS id, nombre_tipo AS nombre
       FROM tipos_gasto
      WHERE activo = 1
      ORDER BY nombre_tipo ASC`
  );

  const [tratamientos] = await poolDeConexiones.query(
    `SELECT
        t.id_tratamiento AS id,
        p.apellido       AS paciente_apellido,
        p.nombre         AS paciente_nombre,
        tt.nombre        AS tipo_nombre
       FROM tratamientos t
       INNER JOIN pacientes p          ON p.id_paciente = t.id_paciente
       INNER JOIN tipos_tratamiento tt ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
      WHERE t.id_consultorio = ?
      ORDER BY t.fecha_inicio DESC, t.id_tratamiento DESC`,
    [idConsultorio]
  );

  return {
    tipos,
    tratamientos: tratamientos.map((t) => ({
      id: t.id,
      etiqueta: `#${t.id} · ${t.paciente_apellido}, ${t.paciente_nombre} · ${t.tipo_nombre}`,
    })),
  };
}

/*
  Listado paginado. Filtros: tipo de gasto, tratamiento, rango de fechas de gasto,
  estado (vigentes / anulados / todos) e imputación (todos / con_tratamiento /
  generales). Orden por fecha de gasto.
  Devuelve { gastos, total, pagina, porPagina, totales: { vigente, anulado } }.
  `totales.vigente` es el total del período filtrado (gastos vigentes).
*/
async function listarGastos(filtros = {}) {
  const {
    idConsultorio,
    idTipoGasto = null,
    idTratamiento = null,
    desde = null,
    hasta = null,
    estado = "vigentes",
    imputacion = "todos",
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

  // Condiciones comunes (sin el filtro de estado, que se aplica aparte para
  // poder devolver siempre los totales de vigente y anulado).
  const condicionesBase = ["g.id_consultorio = ?"];
  const parametrosBase = [idConsultorio];

  if (idTipoGasto) {
    condicionesBase.push("g.id_tipo_gasto = ?");
    parametrosBase.push(idTipoGasto);
  }

  if (idTratamiento) {
    condicionesBase.push("g.id_tratamiento = ?");
    parametrosBase.push(idTratamiento);
  }

  if (imputacion === "con_tratamiento") {
    condicionesBase.push("g.id_tratamiento IS NOT NULL");
  } else if (imputacion === "generales") {
    condicionesBase.push("g.id_tratamiento IS NULL");
  }

  if (desde) {
    condicionesBase.push("DATE(g.fecha_gasto) >= ?");
    parametrosBase.push(desde);
  }

  if (hasta) {
    condicionesBase.push("DATE(g.fecha_gasto) <= ?");
    parametrosBase.push(hasta);
  }

  const condiciones = [...condicionesBase];
  const parametros = [...parametrosBase];

  if (estado === "vigentes") {
    condiciones.push("g.anulado = 0");
  } else if (estado === "anulados") {
    condiciones.push("g.anulado = 1");
  }

  const clausulaWhere = `WHERE ${condiciones.join(" AND ")}`;
  const clausulaOrden = CLAUSULA_ORDEN[orden] || CLAUSULA_ORDEN.fecha_desc;

  const [filasTotal] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS total FROM gastos g ${clausulaWhere}`,
    parametros
  );
  const total = filasTotal[0].total;

  const [filas] = await poolDeConexiones.query(
    `${SELECT_GASTO} ${clausulaWhere} ORDER BY ${clausulaOrden} LIMIT ? OFFSET ?`,
    [...parametros, cantidadPorPagina, desplazamiento]
  );

  // Totales por estado sobre el conjunto filtrado (ignorando el filtro de
  // estado), para mostrar siempre el total del período vigente y el anulado.
  const [filasTotales] = await poolDeConexiones.query(
    `SELECT
        COALESCE(SUM(CASE WHEN g.anulado = 0 THEN g.monto END), 0) AS vigente,
        COALESCE(SUM(CASE WHEN g.anulado = 1 THEN g.monto END), 0) AS anulado
       FROM gastos g
      WHERE ${condicionesBase.join(" AND ")}`,
    parametrosBase
  );

  return {
    gastos: filas.map(mapearGasto),
    total,
    pagina: numeroPagina,
    porPagina: cantidadPorPagina,
    totales: {
      vigente: redondear2(filasTotales[0].vigente),
      anulado: redondear2(filasTotales[0].anulado),
    },
  };
}

/*
  Detalle de un gasto + historial de auditoría (alta, modificaciones, anulación)
  con el actor de cada cambio.
*/
async function obtenerGastoPorId(idGasto, idConsultorio) {
  const fila = await obtenerFilaGasto(idGasto, idConsultorio);
  const gasto = mapearGasto(fila);

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
     WHERE a.entidad = 'gastos' AND a.id_entidad = ?
     ORDER BY a.fecha ASC, a.id_auditoria ASC`,
    [idGasto]
  );

  return {
    ...gasto,
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
        nombreCompleto(
          h.usuario_nombre,
          h.usuario_apellido,
          h.usuario_email,
          h.id_usuario
        ) || `Usuario ${h.id_usuario}`,
    })),
  };
}

/*
  Alta de un gasto. Estampa id_usuario e id_consultorio. Valida tipo de gasto
  (existe y activo), monto (> 0), tratamiento (si se imputa: existe y del
  consultorio) y fecha (no futura).
*/
async function crearGasto(datos, idUsuario, idConsultorio) {
  const idTipoGasto = aNumero(datos.id_tipo_gasto);
  const monto = aNumero(datos.monto);
  const idTratamiento =
    datos.id_tratamiento === undefined ||
    datos.id_tratamiento === null ||
    datos.id_tratamiento === ""
      ? null
      : aNumero(datos.id_tratamiento);
  const fechaGasto = fechaONula(datos.fecha_gasto);
  const descripcion = textoONulo(datos.descripcion);

  if (!idTipoGasto) throw crearError("El tipo de gasto es obligatorio.", 400);
  if (monto === null || monto <= 0) {
    throw crearError("El monto debe ser mayor a cero.", 400);
  }
  if (
    datos.id_tratamiento !== undefined &&
    datos.id_tratamiento !== null &&
    datos.id_tratamiento !== "" &&
    !idTratamiento
  ) {
    throw crearError("El tratamiento indicado no es válido.", 400);
  }
  if (descripcion && descripcion.length > DESCRIPCION_MAX) {
    throw crearError(
      `La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`,
      400
    );
  }
  if (fechaGasto && fechaGasto > hoyISO()) {
    throw crearError("La fecha del gasto no puede ser futura.", 400);
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    await asegurarTipoGastoUtilizable(idTipoGasto, conexion);
    if (idTratamiento) {
      await asegurarTratamientoImputable(idTratamiento, idConsultorio, conexion);
    }

    const [resultado] = await conexion.query(
      `INSERT INTO gastos
         (id_tratamiento, id_tipo_gasto, monto, descripcion, fecha_gasto,
          id_usuario, id_consultorio, anulado, fecha_creacion)
       VALUES (?, ?, ?, ?, COALESCE(?, NOW()), ?, ?, 0, NOW())`,
      [
        idTratamiento,
        idTipoGasto,
        monto,
        descripcion,
        fechaGasto,
        idUsuario,
        idConsultorio,
      ]
    );

    await registrarAuditoria(conexion, {
      idEntidad: resultado.insertId,
      idUsuario,
      accion: "alta",
      campo: "monto",
      valorNuevo: monto,
    });

    await conexion.commit();

    return obtenerGastoPorId(resultado.insertId, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/*
  Modificación acotada: id_tipo_gasto, id_tratamiento (incluye pasar de imputado
  a general y viceversa), descripcion y fecha_gasto. El monto NO se edita (409).
  Un gasto anulado no se edita (409). Cada campo que cambia deja una fila en
  auditoría.
*/
async function actualizarGasto(idGasto, datos, idUsuario, idConsultorio) {
  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const actual = await obtenerFilaGasto(idGasto, idConsultorio, conexion);

    if (Number(actual.anulado) === 1) {
      throw crearError("Un gasto anulado no se puede editar.", 409);
    }

    // El monto es inmutable: si lo mandan distinto → 409; si lo mandan igual, se
    // ignora en silencio.
    if (datos.monto !== undefined && datos.monto !== null && datos.monto !== "") {
      const montoEntrante = aNumero(datos.monto);
      if (montoEntrante === null || montoEntrante !== Number(actual.monto)) {
        throw crearError(
          "El monto de un gasto no se edita: anulá y registrá uno nuevo.",
          409
        );
      }
    }

    const entrantes = {};
    if (datos.id_tipo_gasto !== undefined) {
      entrantes.id_tipo_gasto = aNumero(datos.id_tipo_gasto);
    }
    if (datos.id_tratamiento !== undefined) {
      entrantes.id_tratamiento =
        datos.id_tratamiento === null || datos.id_tratamiento === ""
          ? null
          : aNumero(datos.id_tratamiento);
    }
    if (datos.descripcion !== undefined) {
      entrantes.descripcion = textoONulo(datos.descripcion);
    }
    if (datos.fecha_gasto !== undefined) {
      entrantes.fecha_gasto = fechaONula(datos.fecha_gasto);
    }

    const valorActual = {
      id_tipo_gasto: actual.id_tipo_gasto,
      id_tratamiento: actual.id_tratamiento || null,
      descripcion: actual.descripcion || null,
      fecha_gasto: actual.fecha_gasto
        ? String(actual.fecha_gasto).slice(0, 10)
        : null,
    };

    const camposQueCambian = Object.keys(entrantes).filter(
      (campo) => entrantes[campo] !== valorActual[campo]
    );

    if (camposQueCambian.length === 0) {
      await conexion.commit();
      return obtenerGastoPorId(idGasto, idConsultorio);
    }

    if (camposQueCambian.includes("id_tipo_gasto")) {
      if (!entrantes.id_tipo_gasto) {
        throw crearError("El tipo de gasto es obligatorio.", 400);
      }
      await asegurarTipoGastoUtilizable(entrantes.id_tipo_gasto, conexion);
    }

    if (camposQueCambian.includes("id_tratamiento") && entrantes.id_tratamiento) {
      await asegurarTratamientoImputable(
        entrantes.id_tratamiento,
        idConsultorio,
        conexion
      );
    }

    if (camposQueCambian.includes("descripcion")) {
      if (entrantes.descripcion && entrantes.descripcion.length > DESCRIPCION_MAX) {
        throw crearError(
          `La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`,
          400
        );
      }
    }

    if (camposQueCambian.includes("fecha_gasto")) {
      if (entrantes.fecha_gasto && entrantes.fecha_gasto > hoyISO()) {
        throw crearError("La fecha del gasto no puede ser futura.", 400);
      }
    }

    const asignaciones = camposQueCambian.map((campo) => `${campo} = ?`);
    const valores = camposQueCambian.map((campo) => entrantes[campo]);

    await conexion.query(
      `UPDATE gastos SET ${asignaciones.join(", ")}
        WHERE id_gasto = ? AND id_consultorio = ?`,
      [...valores, idGasto, idConsultorio]
    );

    for (const campo of camposQueCambian) {
      await registrarAuditoria(conexion, {
        idEntidad: idGasto,
        idUsuario,
        accion: "modificacion",
        campo,
        valorAnterior: valorActual[campo],
        valorNuevo: entrantes[campo],
      });
    }

    await conexion.commit();

    return obtenerGastoPorId(idGasto, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/*
  Baja lógica = anulación. Motivo obligatorio (mín. 5 caracteres). Setea
  anulado = 1, motivo_anulacion, id_usuario_anula y fecha_anulacion. No hay
  reactivar. Un gasto ya anulado → 409.
*/
async function anularGasto(idGasto, datos, idUsuario, idConsultorio) {
  const motivo = textoONulo(datos.motivo);

  if (!motivo || motivo.length < MOTIVO_ANULACION_MIN) {
    throw crearError(
      `El motivo de anulación es obligatorio (mínimo ${MOTIVO_ANULACION_MIN} caracteres).`,
      400
    );
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const actual = await obtenerFilaGasto(idGasto, idConsultorio, conexion);

    if (Number(actual.anulado) === 1) {
      throw crearError("El gasto ya está anulado.", 409);
    }

    await conexion.query(
      `UPDATE gastos
          SET anulado = 1,
              motivo_anulacion = ?,
              id_usuario_anula = ?,
              fecha_anulacion = NOW()
        WHERE id_gasto = ? AND id_consultorio = ?`,
      [motivo, idUsuario, idGasto, idConsultorio]
    );

    await registrarAuditoria(conexion, {
      idEntidad: idGasto,
      idUsuario,
      accion: "anulacion",
      campo: "anulado",
      valorAnterior: "0",
      valorNuevo: "1",
      motivo,
    });

    await conexion.commit();

    return obtenerGastoPorId(idGasto, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  ORDENES_VALIDOS,
  ESTADOS_FILTRO,
  IMPUTACION_FILTRO,
  MOTIVO_ANULACION_MIN,
  DESCRIPCION_MAX,
  obtenerOpciones,
  listarGastos,
  obtenerGastoPorId,
  crearGasto,
  actualizarGasto,
  anularGasto,
};

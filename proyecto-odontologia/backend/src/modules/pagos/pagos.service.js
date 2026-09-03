const { poolDeConexiones } = require("../../config/db");

/*
  ABM 04 — Pagos (entidad transaccional).

  Cada pago se registra CONTRA un tratamiento existente (pagos.id_tratamiento
  NOT NULL) con un medio de pago. La suma de los pagos vigentes de un tratamiento
  frente a su precio_paciente define el saldo pendiente (nunca se almacena, se
  deriva).

  Reglas transversales (contrato en docs/abm/00-contexto-base.md):
  - Todo se aísla por consultorio: cada query filtra por el id_consultorio que
    llega en req.usuario, nunca desde el body. El alta lo estampa junto con el
    usuario autor, y valida que el tratamiento sea del mismo consultorio.
  - Las columnas de dominio de `pagos` están en MAYÚSCULAS en la BD (ID_PAGO,
    MONTO, FECHA_PAGO…); MySQL trata los identificadores como case-insensitive,
    así que acá el SQL se escribe en minúsculas.
  - La baja lógica NO es física: es la anulación (`anulado = 1` + motivo + actor).
    Un pago anulado deja de contar para el saldo y para la caja. No hay
    "reactivar".
  - El monto NO se edita: para corregirlo se anula el pago y se registra uno
    nuevo.
  - Toda alta / modificación / anulación escribe en `auditoria_cambios`
    (entidad = 'pagos') DENTRO de la misma transacción que el cambio.
*/

const LONGITUD_PAGINA_POR_DEFECTO = 20;
const LONGITUD_PAGINA_MAXIMA = 100;

const MOTIVO_ANULACION_MIN = 5;

/*
  Política de sobrepago: por defecto se PERMITE registrar un pago que haga que el
  total cobrado supere el precio del tratamiento, devolviendo una advertencia (no
  se bloquea). Poner en false para bloquearlo con un 409.
*/
const PERMITIR_SOBREPAGO = true;

// Id real del estado «cancelado» de estados_tratamiento (seed fijo).
const ESTADO_TRATAMIENTO_CANCELADO = 4;

const ORDENES_VALIDOS = ["fecha_desc", "fecha_asc"];

const CLAUSULA_ORDEN = {
  fecha_desc: "pg.fecha_pago DESC, pg.id_pago DESC",
  fecha_asc: "pg.fecha_pago ASC, pg.id_pago ASC",
};

const ESTADOS_FILTRO = ["vigentes", "anulados", "todos"];

// SELECT base con los nombres de paciente / tratamiento / medio / actores ya
// resueltos.
const SELECT_PAGO = `
  SELECT
    pg.id_pago,
    pg.id_tratamiento,
    pg.monto,
    pg.id_medio_pago,
    pg.fecha_pago,
    pg.notas,
    pg.anulado,
    pg.motivo_anulacion,
    pg.id_usuario_anula,
    pg.fecha_anulacion,
    pg.id_usuario,
    pg.id_consultorio,
    pg.fecha_creacion,
    mp.nombre_medio AS medio_nombre,
    t.id_paciente,
    t.descripcion  AS tratamiento_descripcion,
    t.precio_paciente,
    t.id_estado    AS tratamiento_id_estado,
    p.nombre       AS paciente_nombre,
    p.apellido     AS paciente_apellido,
    tt.nombre      AS tipo_nombre,
    ua.nombre      AS anulado_por_nombre,
    ua.apellido    AS anulado_por_apellido,
    ua.email       AS anulado_por_email,
    uc.nombre      AS registrado_por_nombre,
    uc.apellido    AS registrado_por_apellido,
    uc.email       AS registrado_por_email
  FROM pagos pg
  INNER JOIN tratamientos t       ON t.id_tratamiento = pg.id_tratamiento
  INNER JOIN pacientes p          ON p.id_paciente = t.id_paciente
  INNER JOIN tipos_tratamiento tt ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
  INNER JOIN medios_pago mp       ON mp.id_medio_pago = pg.id_medio_pago
  LEFT JOIN usuarios ua           ON ua.id_usuario = pg.id_usuario_anula
  LEFT JOIN usuarios uc           ON uc.id_usuario = pg.id_usuario
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

function mapearPago(fila) {
  const precio = Number(fila.precio_paciente);

  return {
    id_pago: fila.id_pago,
    id_tratamiento: fila.id_tratamiento,
    monto: Number(fila.monto),
    id_medio_pago: fila.id_medio_pago,
    medio_nombre: fila.medio_nombre,
    fecha_pago: fila.fecha_pago || null,
    notas: fila.notas || null,
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
    id_paciente: fila.id_paciente,
    paciente_nombre: fila.paciente_nombre,
    paciente_apellido: fila.paciente_apellido,
    tipo_nombre: fila.tipo_nombre,
    tratamiento_descripcion: fila.tratamiento_descripcion || null,
    precio_paciente: precio,
    tratamiento_id_estado: fila.tratamiento_id_estado,
  };
}

function crearError(mensaje, statusCode) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
}

// ── Lecturas auxiliares ─────────────────────────────────────────────────────

async function obtenerFilaPago(idPago, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `${SELECT_PAGO} WHERE pg.id_pago = ? AND pg.id_consultorio = ? LIMIT 1`,
    [idPago, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError("El pago no existe o no pertenece a este consultorio.", 404);
  }

  return filas[0];
}

/*
  Valida que el tratamiento exista, pertenezca al consultorio y no esté
  cancelado. Devuelve { id_tratamiento, id_estado, precio_paciente }.
*/
async function asegurarTratamientoUtilizable(idTratamiento, idConsultorio, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_tratamiento, id_estado, precio_paciente
       FROM tratamientos
      WHERE id_tratamiento = ? AND id_consultorio = ? LIMIT 1`,
    [idTratamiento, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError(
      "El tratamiento no existe o no pertenece a este consultorio.",
      404
    );
  }

  if (Number(filas[0].id_estado) === ESTADO_TRATAMIENTO_CANCELADO) {
    throw crearError(
      "No se pueden registrar pagos en un tratamiento cancelado.",
      409
    );
  }

  return filas[0];
}

async function asegurarMedioUtilizable(idMedioPago, ejecutor = poolDeConexiones) {
  const [filas] = await ejecutor.query(
    `SELECT id_medio_pago, activo FROM medios_pago WHERE id_medio_pago = ? LIMIT 1`,
    [idMedioPago]
  );

  if (filas.length === 0) {
    throw crearError("El medio de pago no existe.", 400);
  }

  if (Number(filas[0].activo) !== 1) {
    throw crearError("El medio de pago está inactivo.", 400);
  }
}

async function sumarPagosVigentes(idTratamiento, ejecutor = poolDeConexiones, idPagoExcluido = null) {
  const condiciones = ["id_tratamiento = ?", "anulado = 0"];
  const parametros = [idTratamiento];

  if (idPagoExcluido) {
    condiciones.push("id_pago <> ?");
    parametros.push(idPagoExcluido);
  }

  const [filas] = await ejecutor.query(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE ${condiciones.join(" AND ")}`,
    parametros
  );

  return Number(filas[0].total) || 0;
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
     VALUES ('pagos', ?, ?, ?, ?, ?, ?, ?)`,
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
  Opciones para poblar los selectores del formulario y del filtro de caja sin
  exigir el permiso ver_catalogos: medios de pago activos.
*/
async function obtenerOpciones() {
  const [medios] = await poolDeConexiones.query(
    `SELECT id_medio_pago AS id, nombre_medio AS nombre
       FROM medios_pago
      WHERE activo = 1
      ORDER BY nombre_medio ASC`
  );

  return { medios };
}

/*
  Listado paginado (vista «caja»). Filtros: tratamiento, medio de pago, rango de
  fechas de pago y estado (vigentes / anulados / todos). Orden por fecha de pago.
  Devuelve { pagos, total, pagina, porPagina, totales, resumen? }.
  `resumen` sólo se incluye cuando se filtra por un tratamiento concreto.
*/
async function listarPagos(filtros = {}) {
  const {
    idConsultorio,
    idTratamiento = null,
    idMedioPago = null,
    desde = null,
    hasta = null,
    estado = "vigentes",
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

  // Condiciones comunes (sin el filtro de estado, que se aplica aparte).
  const condicionesBase = ["pg.id_consultorio = ?"];
  const parametrosBase = [idConsultorio];

  if (idTratamiento) {
    condicionesBase.push("pg.id_tratamiento = ?");
    parametrosBase.push(idTratamiento);
  }

  if (idMedioPago) {
    condicionesBase.push("pg.id_medio_pago = ?");
    parametrosBase.push(idMedioPago);
  }

  if (desde) {
    condicionesBase.push("DATE(pg.fecha_pago) >= ?");
    parametrosBase.push(desde);
  }

  if (hasta) {
    condicionesBase.push("DATE(pg.fecha_pago) <= ?");
    parametrosBase.push(hasta);
  }

  const condiciones = [...condicionesBase];
  const parametros = [...parametrosBase];

  if (estado === "vigentes") {
    condiciones.push("pg.anulado = 0");
  } else if (estado === "anulados") {
    condiciones.push("pg.anulado = 1");
  }

  const clausulaWhere = `WHERE ${condiciones.join(" AND ")}`;
  const clausulaOrden = CLAUSULA_ORDEN[orden] || CLAUSULA_ORDEN.fecha_desc;

  const [filasTotal] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS total FROM pagos pg ${clausulaWhere}`,
    parametros
  );
  const total = filasTotal[0].total;

  const [filas] = await poolDeConexiones.query(
    `${SELECT_PAGO} ${clausulaWhere} ORDER BY ${clausulaOrden} LIMIT ? OFFSET ?`,
    [...parametros, cantidadPorPagina, desplazamiento]
  );

  // Totales por estado sobre el conjunto filtrado (ignorando el filtro de
  // estado, para que la caja muestre siempre vigente y anulado).
  const [filasTotales] = await poolDeConexiones.query(
    `SELECT
        COALESCE(SUM(CASE WHEN pg.anulado = 0 THEN pg.monto END), 0) AS vigente,
        COALESCE(SUM(CASE WHEN pg.anulado = 1 THEN pg.monto END), 0) AS anulado
       FROM pagos pg
      WHERE ${condicionesBase.join(" AND ")}`,
    parametrosBase
  );

  const resultado = {
    pagos: filas.map(mapearPago),
    total,
    pagina: numeroPagina,
    porPagina: cantidadPorPagina,
    totales: {
      vigente: redondear2(filasTotales[0].vigente),
      anulado: redondear2(filasTotales[0].anulado),
    },
  };

  if (idTratamiento) {
    resultado.resumen = await obtenerResumenTratamiento(idTratamiento, idConsultorio);
  }

  return resultado;
}

/*
  Resumen de saldo de un tratamiento: precio, total pagado (pagos vigentes) y
  saldo pendiente. Lo consume la sección «Pagos» del detalle del tratamiento.
*/
async function obtenerResumenTratamiento(idTratamiento, idConsultorio) {
  const [filas] = await poolDeConexiones.query(
    `SELECT id_tratamiento, id_estado, precio_paciente
       FROM tratamientos
      WHERE id_tratamiento = ? AND id_consultorio = ? LIMIT 1`,
    [idTratamiento, idConsultorio]
  );

  if (filas.length === 0) {
    throw crearError(
      "El tratamiento no existe o no pertenece a este consultorio.",
      404
    );
  }

  const precio = Number(filas[0].precio_paciente);
  const totalPagado = await sumarPagosVigentes(idTratamiento);
  const saldo = redondear2(precio - totalPagado);

  return {
    id_tratamiento: filas[0].id_tratamiento,
    tratamiento_id_estado: filas[0].id_estado,
    precio_paciente: precio,
    total_pagado: redondear2(totalPagado),
    saldo,
    sobrepago: totalPagado > precio,
  };
}

/*
  Detalle de un pago + historial de auditoría (alta, modificaciones, anulación)
  con el actor de cada cambio.
*/
async function obtenerPagoPorId(idPago, idConsultorio) {
  const fila = await obtenerFilaPago(idPago, idConsultorio);
  const pago = mapearPago(fila);

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
     WHERE a.entidad = 'pagos' AND a.id_entidad = ?
     ORDER BY a.fecha ASC, a.id_auditoria ASC`,
    [idPago]
  );

  return {
    ...pago,
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
  Alta de un pago contra un tratamiento. Estampa id_usuario e id_consultorio.
  Valida tratamiento (existe, del consultorio, no cancelado), medio de pago
  (existe y activo), monto (> 0) y fecha (no futura). El sobrepago se permite con
  advertencia (ver PERMITIR_SOBREPAGO).
  Devuelve { pago, advertencia? }.
*/
async function crearPago(datos, idUsuario, idConsultorio) {
  const idTratamiento = aNumero(datos.id_tratamiento);
  const idMedioPago = aNumero(datos.id_medio_pago);
  const monto = aNumero(datos.monto);
  const fechaPago = fechaONula(datos.fecha_pago);
  const notas = textoONulo(datos.notas);

  if (!idTratamiento) throw crearError("El tratamiento es obligatorio.", 400);
  if (!idMedioPago) throw crearError("El medio de pago es obligatorio.", 400);
  if (monto === null || monto <= 0) {
    throw crearError("El monto debe ser mayor a cero.", 400);
  }
  if (fechaPago && fechaPago > hoyISO()) {
    throw crearError("La fecha del pago no puede ser futura.", 400);
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const tratamiento = await asegurarTratamientoUtilizable(
      idTratamiento,
      idConsultorio,
      conexion
    );
    await asegurarMedioUtilizable(idMedioPago, conexion);

    const totalVigente = await sumarPagosVigentes(idTratamiento, conexion);
    const precio = Number(tratamiento.precio_paciente);
    const superaPrecio = totalVigente + monto > precio;

    if (superaPrecio && !PERMITIR_SOBREPAGO) {
      throw crearError(
        "El total pagado superaría el precio del tratamiento.",
        409
      );
    }

    const [resultado] = await conexion.query(
      `INSERT INTO pagos
         (id_tratamiento, monto, id_medio_pago, fecha_pago, notas,
          id_usuario, id_consultorio, anulado, fecha_creacion)
       VALUES (?, ?, ?, COALESCE(?, NOW()), ?, ?, ?, 0, NOW())`,
      [idTratamiento, monto, idMedioPago, fechaPago, notas, idUsuario, idConsultorio]
    );

    await registrarAuditoria(conexion, {
      idEntidad: resultado.insertId,
      idUsuario,
      accion: "alta",
      campo: "monto",
      valorNuevo: monto,
    });

    await conexion.commit();

    const pago = await obtenerPagoPorId(resultado.insertId, idConsultorio);

    return {
      pago,
      advertencia: superaPrecio
        ? "El total pagado supera el precio del tratamiento."
        : undefined,
    };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/*
  Modificación acotada: sólo id_medio_pago, fecha_pago y notas. El monto NO se
  edita (409). Un pago anulado no se edita (409). Cada campo que cambia deja una
  fila en auditoría.
*/
async function actualizarPago(idPago, datos, idUsuario, idConsultorio) {
  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    const actual = await obtenerFilaPago(idPago, idConsultorio, conexion);

    if (Number(actual.anulado) === 1) {
      throw crearError("Un pago anulado no se puede editar.", 409);
    }

    // El monto es inmutable: si lo mandan distinto → 409; si lo mandan igual, se
    // ignora en silencio.
    if (datos.monto !== undefined && datos.monto !== null && datos.monto !== "") {
      const montoEntrante = aNumero(datos.monto);
      if (montoEntrante === null || montoEntrante !== Number(actual.monto)) {
        throw crearError(
          "El monto de un pago no se edita: anulá y registrá uno nuevo.",
          409
        );
      }
    }

    const entrantes = {};
    if (datos.id_medio_pago !== undefined) {
      entrantes.id_medio_pago = aNumero(datos.id_medio_pago);
    }
    if (datos.fecha_pago !== undefined) {
      entrantes.fecha_pago = fechaONula(datos.fecha_pago);
    }
    if (datos.notas !== undefined) {
      entrantes.notas = textoONulo(datos.notas);
    }

    const valorActual = {
      id_medio_pago: actual.id_medio_pago,
      fecha_pago: actual.fecha_pago
        ? String(actual.fecha_pago).slice(0, 10)
        : null,
      notas: actual.notas || null,
    };

    const camposQueCambian = Object.keys(entrantes).filter(
      (campo) => entrantes[campo] !== valorActual[campo]
    );

    if (camposQueCambian.length === 0) {
      await conexion.commit();
      return obtenerPagoPorId(idPago, idConsultorio);
    }

    if (camposQueCambian.includes("id_medio_pago")) {
      if (!entrantes.id_medio_pago) {
        throw crearError("El medio de pago es obligatorio.", 400);
      }
      await asegurarMedioUtilizable(entrantes.id_medio_pago, conexion);
    }

    if (camposQueCambian.includes("fecha_pago")) {
      if (entrantes.fecha_pago && entrantes.fecha_pago > hoyISO()) {
        throw crearError("La fecha del pago no puede ser futura.", 400);
      }
    }

    const asignaciones = camposQueCambian.map((campo) => `${campo} = ?`);
    const valores = camposQueCambian.map((campo) => entrantes[campo]);

    await conexion.query(
      `UPDATE pagos SET ${asignaciones.join(", ")}
        WHERE id_pago = ? AND id_consultorio = ?`,
      [...valores, idPago, idConsultorio]
    );

    for (const campo of camposQueCambian) {
      await registrarAuditoria(conexion, {
        idEntidad: idPago,
        idUsuario,
        accion: "modificacion",
        campo,
        valorAnterior: valorActual[campo],
        valorNuevo: entrantes[campo],
      });
    }

    await conexion.commit();

    return obtenerPagoPorId(idPago, idConsultorio);
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
  reactivar. Un pago ya anulado → 409.
*/
async function anularPago(idPago, datos, idUsuario, idConsultorio) {
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

    const actual = await obtenerFilaPago(idPago, idConsultorio, conexion);

    if (Number(actual.anulado) === 1) {
      throw crearError("El pago ya está anulado.", 409);
    }

    await conexion.query(
      `UPDATE pagos
          SET anulado = 1,
              motivo_anulacion = ?,
              id_usuario_anula = ?,
              fecha_anulacion = NOW()
        WHERE id_pago = ? AND id_consultorio = ?`,
      [motivo, idUsuario, idPago, idConsultorio]
    );

    await registrarAuditoria(conexion, {
      idEntidad: idPago,
      idUsuario,
      accion: "anulacion",
      campo: "anulado",
      valorAnterior: "0",
      valorNuevo: "1",
      motivo,
    });

    await conexion.commit();

    return obtenerPagoPorId(idPago, idConsultorio);
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
  MOTIVO_ANULACION_MIN,
  PERMITIR_SOBREPAGO,
  obtenerOpciones,
  listarPagos,
  obtenerResumenTratamiento,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  anularPago,
};

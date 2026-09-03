const { poolDeConexiones } = require("../../config/db");

/*
  Módulo 06 — Reportes (CONSUMO, no es un ABM).

  Solo lectura: responde la pregunta central del negocio del consultorio Herrera
  — cuánto se cobra, cuánto ingresa por cada práctica, cuánto se gasta. No crea,
  modifica ni da de baja nada.

  Reglas transversales (contrato en docs/abm/00-contexto-base.md):
  - Todo se aísla por consultorio: cada query filtra por el id_consultorio que
    llega en req.usuario, nunca desde el body ni desde la query string.
  - Solo cuentan los movimientos vigentes: pagos.anulado = 0 y gastos.anulado = 0.
  - Rango por defecto: el mes actual (del día 1 de este mes a hoy). El chequeo de
    formato y de coherencia (desde <= hasta) vive en reportes.validator.js.
  - Las columnas de dominio están en MAYÚSCULAS en la BD (FECHA_PAGO, MONTO…);
    MySQL trata los identificadores como case-insensitive, así que acá el SQL se
    escribe en minúsculas, igual que el resto de los services.
  - Sin escritura → sin transacciones y sin auditoría.
*/

// Id real del estado «cancelado» de estados_tratamiento (seed fijo). Un
// tratamiento cancelado no genera saldo pendiente.
const ESTADO_TRATAMIENTO_CANCELADO = 4;

function redondear2(valor) {
  return Number((Number(valor) || 0).toFixed(2));
}

function hoyISO() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
}

function primerDiaDelMesISO() {
  return `${hoyISO().slice(0, 7)}-01`;
}

function esFechaISO(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/*
  Normaliza el rango [desde, hasta]. Sin parámetros → mes actual. Devuelve
  siempre strings YYYY-MM-DD.
*/
function resolverRango(desde, hasta) {
  return {
    desde: esFechaISO(desde) ? desde : primerDiaDelMesISO(),
    hasta: esFechaISO(hasta) ? hasta : hoyISO(),
  };
}

function resolverAnio(anio) {
  const numero = Number(anio);
  if (Number.isInteger(numero) && numero >= 2000 && numero <= 2100) {
    return numero;
  }
  return Number(hoyISO().slice(0, 4));
}

/*
  Resumen del período: ingresos (Σ pagos vigentes por FECHA_PAGO en rango),
  egresos (Σ gastos vigentes por FECHA_GASTO en rango), resultado neto y la
  cantidad de tratamientos por estado.

  El conteo de tratamientos por estado es un SNAPSHOT del consultorio (no se
  filtra por fecha): responde «¿cómo está hoy la cartera de tratamientos?», no
  «¿cuántos se crearon en el período?».
*/
async function obtenerResumen(idConsultorio, filtros = {}) {
  const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

  const [[ingresos]] = await poolDeConexiones.query(
    `SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
       FROM pagos
      WHERE id_consultorio = ? AND anulado = 0
        AND DATE(fecha_pago) BETWEEN ? AND ?`,
    [idConsultorio, desde, hasta]
  );

  const [[egresos]] = await poolDeConexiones.query(
    `SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
       FROM gastos
      WHERE id_consultorio = ? AND anulado = 0
        AND DATE(fecha_gasto) BETWEEN ? AND ?`,
    [idConsultorio, desde, hasta]
  );

  const [estados] = await poolDeConexiones.query(
    `SELECT e.id_estado,
            e.nombre_estado AS nombre,
            COUNT(t.id_tratamiento) AS cantidad
       FROM estados_tratamiento e
       LEFT JOIN tratamientos t
         ON t.id_estado = e.id_estado
        AND t.id_consultorio = ?
      GROUP BY e.id_estado, e.nombre_estado
      ORDER BY e.id_estado ASC`,
    [idConsultorio]
  );

  const totalIngresos = redondear2(ingresos.total);
  const totalEgresos = redondear2(egresos.total);

  return {
    periodo: { desde, hasta },
    ingresos: totalIngresos,
    egresos: totalEgresos,
    neto: redondear2(totalIngresos - totalEgresos),
    cantidad_pagos: Number(ingresos.cantidad) || 0,
    cantidad_gastos: Number(egresos.cantidad) || 0,
    tratamientos_por_estado: estados.map((fila) => ({
      id_estado: fila.id_estado,
      nombre: fila.nombre,
      cantidad: Number(fila.cantidad) || 0,
    })),
  };
}

/*
  Ingresos agrupados por tipo de práctica (uniendo pagos → tratamientos →
  tipos_tratamiento): qué práctica deja más dinero en el período.
*/
async function obtenerIngresosPorTipo(idConsultorio, filtros = {}) {
  const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

  const [filas] = await poolDeConexiones.query(
    `SELECT tt.id_tipo_tratamiento,
            tt.nombre AS nombre,
            COALESCE(SUM(pg.monto), 0) AS total,
            COUNT(pg.id_pago) AS cantidad_pagos
       FROM pagos pg
       INNER JOIN tratamientos t
         ON t.id_tratamiento = pg.id_tratamiento
       INNER JOIN tipos_tratamiento tt
         ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
      WHERE pg.id_consultorio = ? AND pg.anulado = 0
        AND DATE(pg.fecha_pago) BETWEEN ? AND ?
      GROUP BY tt.id_tipo_tratamiento, tt.nombre
      ORDER BY total DESC, tt.nombre ASC`,
    [idConsultorio, desde, hasta]
  );

  return construirAgrupado({ desde, hasta }, filas, "id_tipo_tratamiento", "cantidad_pagos");
}

/*
  Cobros agrupados por medio de pago (arqueo de caja): cuánto entró en efectivo,
  transferencia, tarjeta y obra social en el período.
*/
async function obtenerIngresosPorMedio(idConsultorio, filtros = {}) {
  const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

  const [filas] = await poolDeConexiones.query(
    `SELECT mp.id_medio_pago,
            mp.nombre_medio AS nombre,
            COALESCE(SUM(pg.monto), 0) AS total,
            COUNT(pg.id_pago) AS cantidad_pagos
       FROM pagos pg
       INNER JOIN medios_pago mp
         ON mp.id_medio_pago = pg.id_medio_pago
      WHERE pg.id_consultorio = ? AND pg.anulado = 0
        AND DATE(pg.fecha_pago) BETWEEN ? AND ?
      GROUP BY mp.id_medio_pago, mp.nombre_medio
      ORDER BY total DESC, mp.nombre_medio ASC`,
    [idConsultorio, desde, hasta]
  );

  return construirAgrupado({ desde, hasta }, filas, "id_medio_pago", "cantidad_pagos");
}

/*
  Gastos agrupados por tipo de gasto en el período.
*/
async function obtenerEgresosPorTipo(idConsultorio, filtros = {}) {
  const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

  const [filas] = await poolDeConexiones.query(
    `SELECT tg.id_tipo_gasto,
            tg.nombre_tipo AS nombre,
            COALESCE(SUM(g.monto), 0) AS total,
            COUNT(g.id_gasto) AS cantidad_gastos
       FROM gastos g
       INNER JOIN tipos_gasto tg
         ON tg.id_tipo_gasto = g.id_tipo_gasto
      WHERE g.id_consultorio = ? AND g.anulado = 0
        AND DATE(g.fecha_gasto) BETWEEN ? AND ?
      GROUP BY tg.id_tipo_gasto, tg.nombre_tipo
      ORDER BY total DESC, tg.nombre_tipo ASC`,
    [idConsultorio, desde, hasta]
  );

  return construirAgrupado({ desde, hasta }, filas, "id_tipo_gasto", "cantidad_gastos");
}

/*
  Estructura común de los tres endpoints de agrupación: { periodo, items, total }.
*/
function construirAgrupado(periodo, filas, claveId, claveCantidad) {
  const items = filas.map((fila) => ({
    [claveId]: fila[claveId],
    nombre: fila.nombre,
    total: redondear2(fila.total),
    [claveCantidad]: Number(fila[claveCantidad]) || 0,
  }));

  return {
    periodo,
    items,
    total: redondear2(items.reduce((suma, item) => suma + item.total, 0)),
  };
}

/*
  Tratamientos con saldo pendiente (> 0): precio del paciente menos la suma de
  sus pagos vigentes. Excluye los tratamientos cancelados. No depende del rango
  de fechas: es la deuda viva del consultorio.
*/
async function obtenerPendientes(idConsultorio) {
  const [filas] = await poolDeConexiones.query(
    `SELECT t.id_tratamiento,
            p.nombre   AS paciente_nombre,
            p.apellido AS paciente_apellido,
            tt.nombre  AS tipo_tratamiento,
            t.id_estado,
            e.nombre_estado AS estado,
            t.precio_paciente AS precio,
            COALESCE(SUM(CASE WHEN pg.anulado = 0 THEN pg.monto END), 0) AS pagado,
            (t.precio_paciente - COALESCE(SUM(CASE WHEN pg.anulado = 0 THEN pg.monto END), 0)) AS saldo
       FROM tratamientos t
       INNER JOIN pacientes p
         ON p.id_paciente = t.id_paciente
       INNER JOIN tipos_tratamiento tt
         ON tt.id_tipo_tratamiento = t.id_tipo_tratamiento
       INNER JOIN estados_tratamiento e
         ON e.id_estado = t.id_estado
       LEFT JOIN pagos pg
         ON pg.id_tratamiento = t.id_tratamiento
      WHERE t.id_consultorio = ? AND t.id_estado <> ?
      GROUP BY t.id_tratamiento, p.nombre, p.apellido, tt.nombre,
               t.id_estado, e.nombre_estado, t.precio_paciente
     HAVING saldo > 0
      ORDER BY saldo DESC, t.id_tratamiento ASC`,
    [idConsultorio, ESTADO_TRATAMIENTO_CANCELADO]
  );

  const items = filas.map((fila) => {
    const precio = redondear2(fila.precio);
    const pagado = redondear2(fila.pagado);

    return {
      id_tratamiento: fila.id_tratamiento,
      paciente: `${fila.paciente_apellido}, ${fila.paciente_nombre}`,
      tipo_tratamiento: fila.tipo_tratamiento,
      id_estado: fila.id_estado,
      estado: fila.estado,
      precio,
      pagado,
      saldo: redondear2(precio - pagado),
    };
  });

  return {
    items,
    total_pendientes: items.length,
    total_saldo: redondear2(items.reduce((suma, item) => suma + item.saldo, 0)),
  };
}

/*
  Serie mensual de un año: 12 filas fijas (mes sin movimientos → 0) con ingresos,
  egresos y neto. Año por defecto: el actual.
*/
async function obtenerMensual(idConsultorio, filtros = {}) {
  const anio = resolverAnio(filtros.anio);

  const [ingresos] = await poolDeConexiones.query(
    `SELECT MONTH(fecha_pago) AS mes, COALESCE(SUM(monto), 0) AS total
       FROM pagos
      WHERE id_consultorio = ? AND anulado = 0 AND YEAR(fecha_pago) = ?
      GROUP BY MONTH(fecha_pago)`,
    [idConsultorio, anio]
  );

  const [egresos] = await poolDeConexiones.query(
    `SELECT MONTH(fecha_gasto) AS mes, COALESCE(SUM(monto), 0) AS total
       FROM gastos
      WHERE id_consultorio = ? AND anulado = 0 AND YEAR(fecha_gasto) = ?
      GROUP BY MONTH(fecha_gasto)`,
    [idConsultorio, anio]
  );

  const mapaIngresos = new Map(ingresos.map((fila) => [Number(fila.mes), Number(fila.total)]));
  const mapaEgresos = new Map(egresos.map((fila) => [Number(fila.mes), Number(fila.total)]));

  const meses = [];
  for (let mes = 1; mes <= 12; mes += 1) {
    const ingresoMes = redondear2(mapaIngresos.get(mes) || 0);
    const egresoMes = redondear2(mapaEgresos.get(mes) || 0);
    meses.push({
      mes,
      ingresos: ingresoMes,
      egresos: egresoMes,
      neto: redondear2(ingresoMes - egresoMes),
    });
  }

  return {
    anio,
    meses,
    totales: {
      ingresos: redondear2(meses.reduce((suma, item) => suma + item.ingresos, 0)),
      egresos: redondear2(meses.reduce((suma, item) => suma + item.egresos, 0)),
      neto: redondear2(meses.reduce((suma, item) => suma + item.neto, 0)),
    },
  };
}

module.exports = {
  resolverRango,
  obtenerResumen,
  obtenerIngresosPorTipo,
  obtenerIngresosPorMedio,
  obtenerEgresosPorTipo,
  obtenerPendientes,
  obtenerMensual,
};

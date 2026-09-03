import api from "../../../services/api";

/*
  Módulo 06 — Reportes (consumo, solo lectura). Cada función devuelve
  respuesta.data ({ ok, mensaje, ...datos }). El JWT y el manejo del 401 los
  pone api.js. El rango por defecto (mes actual) lo resuelve el backend cuando
  no se pasan `desde` / `hasta`.
*/

function paramsRango({ desde, hasta } = {}) {
  return { desde: desde || undefined, hasta: hasta || undefined };
}

export async function obtenerResumen(rango) {
  const respuesta = await api.get("/reportes/resumen", { params: paramsRango(rango) });
  return respuesta.data;
}

export async function obtenerIngresosPorTipo(rango) {
  const respuesta = await api.get("/reportes/ingresos-por-tipo", {
    params: paramsRango(rango),
  });
  return respuesta.data;
}

export async function obtenerIngresosPorMedio(rango) {
  const respuesta = await api.get("/reportes/ingresos-por-medio", {
    params: paramsRango(rango),
  });
  return respuesta.data;
}

export async function obtenerEgresosPorTipo(rango) {
  const respuesta = await api.get("/reportes/egresos-por-tipo", {
    params: paramsRango(rango),
  });
  return respuesta.data;
}

export async function obtenerPendientes() {
  const respuesta = await api.get("/reportes/pendientes");
  return respuesta.data;
}

export async function obtenerMensual(anio) {
  const respuesta = await api.get("/reportes/mensual", {
    params: { anio: anio || undefined },
  });
  return respuesta.data;
}

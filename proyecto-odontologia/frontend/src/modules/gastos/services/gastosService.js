import api from "../../../services/api";

/*
  ABM 05 — Gastos. Cada función devuelve respuesta.data
  ({ ok, mensaje, ...datos }). El JWT y el manejo del 401 los pone api.js.
*/

export async function obtenerGastos({
  idTipoGasto,
  idTratamiento,
  desde,
  hasta,
  estado = "vigentes",
  imputacion = "todos",
  orden = "fecha_desc",
  pagina = 1,
  porPagina = 20,
} = {}) {
  const respuesta = await api.get("/gastos", {
    params: {
      id_tipo_gasto: idTipoGasto || undefined,
      id_tratamiento: idTratamiento || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      estado,
      imputacion,
      orden,
      pagina,
      porPagina,
    },
  });
  return respuesta.data;
}

export async function obtenerOpcionesGasto() {
  const respuesta = await api.get("/gastos/opciones");
  return respuesta.data;
}

export async function obtenerGasto(idGasto) {
  const respuesta = await api.get(`/gastos/${idGasto}`);
  return respuesta.data;
}

export async function registrarGasto(datos) {
  const respuesta = await api.post("/gastos", datos);
  return respuesta.data;
}

export async function actualizarGasto(idGasto, datos) {
  const respuesta = await api.put(`/gastos/${idGasto}`, datos);
  return respuesta.data;
}

export async function anularGasto(idGasto, motivo) {
  const respuesta = await api.patch(`/gastos/${idGasto}/anular`, { motivo });
  return respuesta.data;
}

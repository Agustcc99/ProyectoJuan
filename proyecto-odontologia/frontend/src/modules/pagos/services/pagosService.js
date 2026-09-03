import api from "../../../services/api";

/*
  ABM 04 — Pagos. Cada función devuelve respuesta.data
  ({ ok, mensaje, ...datos }). El JWT y el manejo del 401 los pone api.js.
*/

export async function obtenerPagos({
  idTratamiento,
  idMedioPago,
  desde,
  hasta,
  estado = "vigentes",
  orden = "fecha_desc",
  pagina = 1,
  porPagina = 20,
} = {}) {
  const respuesta = await api.get("/pagos", {
    params: {
      id_tratamiento: idTratamiento || undefined,
      id_medio_pago: idMedioPago || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      estado,
      orden,
      pagina,
      porPagina,
    },
  });
  return respuesta.data;
}

export async function obtenerOpcionesPago() {
  const respuesta = await api.get("/pagos/opciones");
  return respuesta.data;
}

export async function obtenerPago(idPago) {
  const respuesta = await api.get(`/pagos/${idPago}`);
  return respuesta.data;
}

export async function registrarPago(datos) {
  const respuesta = await api.post("/pagos", datos);
  return respuesta.data;
}

export async function actualizarPago(idPago, datos) {
  const respuesta = await api.put(`/pagos/${idPago}`, datos);
  return respuesta.data;
}

export async function anularPago(idPago, motivo) {
  const respuesta = await api.patch(`/pagos/${idPago}/anular`, { motivo });
  return respuesta.data;
}

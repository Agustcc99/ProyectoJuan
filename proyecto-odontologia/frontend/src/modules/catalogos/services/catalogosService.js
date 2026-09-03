import api from "../../../services/api";

/*
  ABM 01 — Catálogos de soporte.
  El slug identifica el catálogo: estados-tratamiento | medios-pago |
  tipos-gasto | tipos-tratamiento. Cada función devuelve respuesta.data
  ({ ok, mensaje, items } o { ok, mensaje, item }).
*/

export async function obtenerCatalogo(slug, { estado = "todos" } = {}) {
  const respuesta = await api.get(`/catalogos/${slug}`, { params: { estado } });
  return respuesta.data;
}

export async function crearItemCatalogo(slug, datos) {
  const respuesta = await api.post(`/catalogos/${slug}`, datos);
  return respuesta.data;
}

export async function actualizarItemCatalogo(slug, idItem, datos) {
  const respuesta = await api.put(`/catalogos/${slug}/${idItem}`, datos);
  return respuesta.data;
}

export async function desactivarItemCatalogo(slug, idItem) {
  const respuesta = await api.patch(`/catalogos/${slug}/${idItem}/desactivar`);
  return respuesta.data;
}

export async function reactivarItemCatalogo(slug, idItem) {
  const respuesta = await api.patch(`/catalogos/${slug}/${idItem}/reactivar`);
  return respuesta.data;
}

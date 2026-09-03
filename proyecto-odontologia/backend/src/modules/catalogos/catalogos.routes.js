const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  validarCatalogo,
  validarFiltroEstado,
  validarIdItem,
  validarDatosItem,
} = require("./catalogos.validator");

const {
  listarItemsDeCatalogo,
  crearItemDeCatalogo,
  modificarItemDeCatalogo,
  desactivarItemDeCatalogo,
  reactivarItemDeCatalogo,
} = require("./catalogos.service");

/*
  ABM 01 — Catálogos de soporte.
  Base: /api/catalogos. :catalogo ∈ estados-tratamiento | medios-pago |
  tipos-gasto | tipos-tratamiento.

  Sin try/catch: los errores de los services (con .statusCode) llegan al
  errorMiddleware central registrado en app.js.
*/

/*
  Lista los ítems de un catálogo. Query opcional ?estado=activos|inactivos|todos.
*/
router.get(
  "/:catalogo",
  verificarToken,
  verificarPermiso("ver_catalogos"),
  validarCatalogo,
  validarFiltroEstado,
  async (req, res) => {
    const items = await listarItemsDeCatalogo(
      req.params.catalogo,
      req.query.estado || "todos"
    );

    enviarExito(res, 200, "Catálogo obtenido correctamente.", { items });
  }
);

/*
  Alta de un ítem. Body: { nombre, descripcion? }.
*/
router.post(
  "/:catalogo",
  verificarToken,
  verificarPermiso("gestionar_catalogos"),
  validarCatalogo,
  validarDatosItem,
  async (req, res) => {
    const item = await crearItemDeCatalogo(req.params.catalogo, req.body);

    enviarExito(res, 201, "Ítem de catálogo creado correctamente.", { item });
  }
);

/*
  Modificación de un ítem. Body: { nombre, descripcion? }.
*/
router.put(
  "/:catalogo/:id",
  verificarToken,
  verificarPermiso("gestionar_catalogos"),
  validarCatalogo,
  validarIdItem,
  validarDatosItem,
  async (req, res) => {
    const item = await modificarItemDeCatalogo(
      req.params.catalogo,
      Number(req.params.id),
      req.body
    );

    enviarExito(res, 200, "Ítem de catálogo modificado correctamente.", { item });
  }
);

/*
  Baja lógica de un ítem.
*/
router.patch(
  "/:catalogo/:id/desactivar",
  verificarToken,
  verificarPermiso("gestionar_catalogos"),
  validarCatalogo,
  validarIdItem,
  async (req, res) => {
    const item = await desactivarItemDeCatalogo(
      req.params.catalogo,
      Number(req.params.id)
    );

    enviarExito(res, 200, "Ítem de catálogo desactivado correctamente.", { item });
  }
);

/*
  Reactivación de un ítem dado de baja.
*/
router.patch(
  "/:catalogo/:id/reactivar",
  verificarToken,
  verificarPermiso("gestionar_catalogos"),
  validarCatalogo,
  validarIdItem,
  async (req, res) => {
    const item = await reactivarItemDeCatalogo(
      req.params.catalogo,
      Number(req.params.id)
    );

    enviarExito(res, 200, "Ítem de catálogo reactivado correctamente.", { item });
  }
);

module.exports = router;

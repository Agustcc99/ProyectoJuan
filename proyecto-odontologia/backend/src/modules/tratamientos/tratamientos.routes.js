const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  validarIdTratamiento,
  validarFiltrosListado,
  validarDatosAlta,
  validarDatosEdicion,
  validarCambioEstado,
} = require("./tratamientos.validator");

const {
  listarTratamientos,
  obtenerOpciones,
  obtenerTratamientoPorId,
  crearTratamiento,
  actualizarTratamiento,
  cambiarEstadoTratamiento,
  ESTADO,
} = require("./tratamientos.service");

/*
  ABM 03 — Tratamientos (transaccional). Base: /api/tratamientos.

  Sin try/catch: los errores que lanzan los services (con .statusCode) llegan al
  errorMiddleware central registrado en app.js. Todas las rutas resuelven el
  consultorio desde req.usuario (nunca desde el body).

  La baja lógica es el estado «cancelado»: no hay desactivar/reactivar.
*/

/*
  Middleware que exige el permiso extra `cancelar_tratamientos` cuando el cambio
  de estado apunta a «cancelado». Para el resto de las transiciones alcanza con
  `cambiar_estado_tratamientos`, que ya se verificó antes en la cadena.
*/
function exigirPermisoDeCancelacionSiCorresponde(req, res, next) {
  if (Number(req.body?.id_estado) === ESTADO.CANCELADO) {
    return verificarPermiso("cancelar_tratamientos")(req, res, next);
  }
  return next();
}

/*
  Opciones para poblar los selectores del formulario (tipos activos, estados y
  pacientes activos del consultorio). Va antes de "/:id" para que "opciones" no
  se interprete como un id.
*/
router.get(
  "/opciones",
  verificarToken,
  verificarPermiso("ver_tratamientos"),
  async (req, res) => {
    const opciones = await obtenerOpciones(req.usuario.id_consultorio);
    enviarExito(res, 200, "Opciones obtenidas correctamente.", opciones);
  }
);

/*
  Listado paginado. Query opcional: ?id_paciente= ?id_estado= ?id_tipo=
  ?busqueda= ?desde= ?hasta= ?orden=fecha_desc|fecha_asc|actualizacion_desc
  ?pagina= ?porPagina=.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_tratamientos"),
  validarFiltrosListado,
  async (req, res) => {
    const resultado = await listarTratamientos({
      idConsultorio: req.usuario.id_consultorio,
      idPaciente: req.query.id_paciente ? Number(req.query.id_paciente) : null,
      idEstado: req.query.id_estado ? Number(req.query.id_estado) : null,
      idTipo: req.query.id_tipo ? Number(req.query.id_tipo) : null,
      busqueda: req.query.busqueda || "",
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      orden: req.query.orden || "fecha_desc",
      pagina: req.query.pagina || 1,
      porPagina: req.query.porPagina || 20,
    });

    enviarExito(res, 200, "Tratamientos obtenidos correctamente.", resultado);
  }
);

/*
  Detalle de un tratamiento + historial de auditoría + pagos + gastos.
*/
router.get(
  "/:id",
  verificarToken,
  verificarPermiso("ver_tratamientos"),
  validarIdTratamiento,
  async (req, res) => {
    const tratamiento = await obtenerTratamientoPorId(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Tratamiento obtenido correctamente.", { tratamiento });
  }
);

/*
  Alta de tratamiento. Nace en «pendiente».
*/
router.post(
  "/",
  verificarToken,
  verificarPermiso("crear_tratamientos"),
  validarDatosAlta,
  async (req, res) => {
    const tratamiento = await crearTratamiento(
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 201, "Tratamiento creado correctamente.", { tratamiento });
  }
);

/*
  Modificación. Los campos editables dependen del estado.
*/
router.put(
  "/:id",
  verificarToken,
  verificarPermiso("editar_tratamientos"),
  validarIdTratamiento,
  validarDatosEdicion,
  async (req, res) => {
    const tratamiento = await actualizarTratamiento(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Tratamiento modificado correctamente.", { tratamiento });
  }
);

/*
  Transición de estado. { id_estado, motivo? }. Cancelar (id_estado = 4) exige
  además el permiso cancelar_tratamientos y un motivo.
*/
router.patch(
  "/:id/estado",
  verificarToken,
  verificarPermiso("cambiar_estado_tratamientos"),
  exigirPermisoDeCancelacionSiCorresponde,
  validarIdTratamiento,
  validarCambioEstado,
  async (req, res) => {
    const tratamiento = await cambiarEstadoTratamiento(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Estado del tratamiento actualizado correctamente.", {
      tratamiento,
    });
  }
);

module.exports = router;

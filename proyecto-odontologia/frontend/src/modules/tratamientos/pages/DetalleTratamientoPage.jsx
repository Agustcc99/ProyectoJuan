import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerTratamiento,
  obtenerOpcionesTratamiento,
  actualizarTratamiento,
  cambiarEstadoTratamiento,
} from "../services/tratamientosService";
import FormularioTratamiento from "../components/FormularioTratamiento";
import CambiarEstadoModal from "../components/CambiarEstadoModal";
import SeccionPagosTratamiento from "../../pagos/components/SeccionPagosTratamiento";
import SeccionGastosTratamiento from "../../gastos/components/SeccionGastosTratamiento";
import "../../roles/styles/roles.css";
import "../../pacientes/styles/pacientes.css";
import "../styles/tratamientos.css";

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function formatearFecha(valor, conHora = false) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-AR", conHora ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

function describirCambio(item) {
  if (item.accion === "alta") return "Alta del tratamiento";
  if (item.accion === "cancelacion")
    return `Cancelado${item.motivo ? ` — motivo: "${item.motivo}"` : ""}`;
  if (item.accion === "cambio_estado")
    return `Estado: ${item.valor_anterior} → ${item.valor_nuevo}`;
  if (item.accion === "modificacion") {
    const anterior = item.valor_anterior ?? "(vacío)";
    const nuevo = item.valor_nuevo ?? "(vacío)";
    return `${item.campo}: ${anterior} → ${nuevo}`;
  }
  return item.accion;
}

function DetalleTratamientoPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { tienePermiso } = useAuth();

  const puedeEditar = tienePermiso("editar_tratamientos");
  const puedeCambiarEstado = tienePermiso("cambiar_estado_tratamientos");
  const puedeCancelar = tienePermiso("cancelar_tratamientos");

  const [tratamiento, setTratamiento] = useState(null);
  const [opciones, setOpciones] = useState({ tipos: [], estados: [], pacientes: [] });
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [editando, setEditando] = useState(false);
  const [erroresForm, setErroresForm] = useState([]);
  const [modalEstado, setModalEstado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");
      const datos = await obtenerTratamiento(id);
      setTratamiento(datos.tratamiento);
    } catch (error) {
      const codigo = error.response?.status;
      const mensaje = error.response?.data?.mensaje;
      setMensajeError(
        codigo === 403
          ? "No tenés permisos suficientes para ver este tratamiento."
          : codigo === 404
          ? "El tratamiento no existe o no pertenece a tu consultorio."
          : mensaje || "No se pudo cargar el tratamiento."
      );
      setTratamiento(null);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /*
    Refresco «silencioso»: recarga los datos del tratamiento sin activar el
    estado de carga de página completa (que desmontaría el subárbol). Lo usa la
    sección de pagos para reflejar el saldo tras registrar o anular un pago.
  */
  const refrescarTratamiento = useCallback(async () => {
    try {
      const datos = await obtenerTratamiento(id);
      setTratamiento(datos.tratamiento);
    } catch {
      /* se conserva lo que había; la sección de pagos muestra su propio error */
    }
  }, [id]);

  useEffect(() => {
    obtenerOpcionesTratamiento()
      .then((datos) =>
        setOpciones({
          tipos: datos.tipos || [],
          estados: datos.estados || [],
          pacientes: datos.pacientes || [],
        })
      )
      .catch(() => {});
  }, []);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  async function guardarEdicion(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      limpiarMensajes();
      const respuesta = await actualizarTratamiento(id, datos);
      setTratamiento(respuesta.tratamiento);
      setEditando(false);
      setMensajeExito("El tratamiento se actualizó correctamente.");
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([datosError?.mensaje || "No se pudo actualizar el tratamiento."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarCambioEstado(datos) {
    try {
      setProcesando(true);
      limpiarMensajes();
      const respuesta = await cambiarEstadoTratamiento(id, datos);
      setTratamiento(respuesta.tratamiento);
      setModalEstado(false);
      setMensajeExito(
        `El tratamiento pasó a estado «${respuesta.tratamiento.estado_nombre}».`
      );
    } catch (error) {
      const mensaje = error.response?.data?.mensaje;
      setMensajeError(mensaje || "No se pudo cambiar el estado.");
      setModalEstado(false);
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <main className="roles-page tratamientos-detalle">
        <p className="roles-page__estado">Cargando tratamiento...</p>
      </main>
    );
  }

  if (!tratamiento) {
    return (
      <main className="roles-page tratamientos-detalle">
        <div className="roles-page__mensaje roles-page__mensaje--error">
          {mensajeError || "No se pudo cargar el tratamiento."}
        </div>
        <button
          type="button"
          className="roles-page__boton-secundario"
          onClick={() => navegar("/panel/tratamientos")}
        >
          Volver al listado
        </button>
      </main>
    );
  }

  const esFinal = tratamiento.id_estado === 3 || tratamiento.id_estado === 4;
  const transicionesVisibles = (tratamiento.transiciones_posibles || []).filter(
    (t) => t.id_estado !== 4 || puedeCancelar
  );

  return (
    <>
      <main className="roles-page tratamientos-detalle">
        <section className="roles-page__encabezado">
          <div>
            <p className="roles-page__etiqueta">Tratamiento</p>
            <h1>
              {tratamiento.paciente_apellido}, {tratamiento.paciente_nombre}
            </h1>
            <p className="roles-page__descripcion">
              {tratamiento.tipo_nombre} · ID {tratamiento.id_tratamiento} ·{" "}
              <span
                className={`roles-page__badge tratamientos-badge--estado-${tratamiento.id_estado}`}
              >
                {tratamiento.estado_nombre}
              </span>
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              type="button"
              className="roles-page__boton-secundario"
              onClick={() => navegar("/panel/tratamientos")}
            >
              Volver
            </button>

            {!editando && puedeEditar && (
              <button
                type="button"
                className="roles-page__boton-principal"
                onClick={() => {
                  limpiarMensajes();
                  setErroresForm([]);
                  setEditando(true);
                }}
              >
                Editar
              </button>
            )}

            {puedeCambiarEstado && transicionesVisibles.length > 0 && (
              <button
                type="button"
                className="roles-page__boton-exito"
                onClick={() => {
                  limpiarMensajes();
                  setModalEstado(true);
                }}
              >
                Cambiar estado
              </button>
            )}
          </div>
        </section>

        {mensajeError && (
          <div className="roles-page__mensaje roles-page__mensaje--error">
            {mensajeError}
          </div>
        )}
        {mensajeExito && (
          <div className="roles-page__mensaje roles-page__mensaje--exito">
            {mensajeExito}
          </div>
        )}
        {esFinal && (
          <div className="roles-page__mensaje roles-page__mensaje--advertencia">
            Tratamiento {tratamiento.estado_nombre}: sólo se pueden editar las
            observaciones y no admite cambios de estado.
          </div>
        )}

        <section className="roles-page__panel">
          <h2 className="pacientes-ficha__subtitulo">Datos del tratamiento</h2>
          <dl className="pacientes-ficha__datos">
            <div>
              <dt>Precio del paciente</dt>
              <dd>{formatearMoneda(tratamiento.precio_paciente)}</dd>
            </div>
            <div>
              <dt>Total cobrado</dt>
              <dd>{formatearMoneda(tratamiento.total_cobrado)}</dd>
            </div>
            <div>
              <dt>Saldo pendiente</dt>
              <dd>
                <strong>{formatearMoneda(tratamiento.saldo)}</strong>
              </dd>
            </div>
            <div>
              <dt>Fecha de inicio</dt>
              <dd>{formatearFecha(tratamiento.fecha_inicio)}</dd>
            </div>
            <div>
              <dt>Fecha de fin</dt>
              <dd>{formatearFecha(tratamiento.fecha_fin)}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>{formatearFecha(tratamiento.fecha_actualizacion, true)}</dd>
            </div>
          </dl>

          <div className="pacientes-ficha__bloque">
            <dt>Descripción</dt>
            <dd>{tratamiento.descripcion || "Sin descripción."}</dd>
          </div>
          <div className="pacientes-ficha__bloque">
            <dt>Observaciones</dt>
            <dd>{tratamiento.observaciones || "Sin observaciones."}</dd>
          </div>
          {tratamiento.motivo_cancelacion && (
            <div className="pacientes-ficha__bloque">
              <dt>Motivo de cancelación</dt>
              <dd>{tratamiento.motivo_cancelacion}</dd>
            </div>
          )}
        </section>

        <SeccionPagosTratamiento
          idTratamiento={tratamiento.id_tratamiento}
          estadoTratamiento={tratamiento.id_estado}
          onCambio={refrescarTratamiento}
        />

        <SeccionGastosTratamiento
          idTratamiento={tratamiento.id_tratamiento}
          tratamientoTexto={`${tratamiento.tipo_nombre} · ${tratamiento.paciente_apellido}, ${tratamiento.paciente_nombre}`}
        />

        <section className="roles-page__panel">
          <h2 className="pacientes-ficha__subtitulo">
            Historial de cambios ({tratamiento.historial.length})
          </h2>
          {tratamiento.historial.length === 0 ? (
            <p className="roles-page__estado">Sin cambios registrados todavía.</p>
          ) : (
            <ul className="tratamientos-timeline">
              {tratamiento.historial.map((item) => (
                <li key={item.id_auditoria} className="tratamientos-timeline__item">
                  <span className="tratamientos-timeline__punto" aria-hidden="true" />
                  <div>
                    <p className="tratamientos-timeline__texto">
                      {describirCambio(item)}
                    </p>
                    <p className="tratamientos-timeline__meta">
                      {item.usuario} · {formatearFecha(item.fecha, true)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {editando && (
        <FormularioTratamiento
          modo="editar"
          tratamiento={tratamiento}
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarEdicion}
          onCancelar={() => {
            if (!procesando) {
              setEditando(false);
              setErroresForm([]);
            }
          }}
        />
      )}

      {modalEstado && (
        <CambiarEstadoModal
          abierto
          tratamiento={tratamiento}
          puedeCancelar={puedeCancelar}
          cargando={procesando}
          onConfirmar={confirmarCambioEstado}
          onCancelar={() => {
            if (!procesando) setModalEstado(false);
          }}
        />
      )}
    </>
  );
}

export default DetalleTratamientoPage;

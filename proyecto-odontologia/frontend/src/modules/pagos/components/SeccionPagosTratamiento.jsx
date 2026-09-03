import { useCallback, useEffect, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerPagos,
  obtenerOpcionesPago,
  registrarPago,
  anularPago,
} from "../services/pagosService";
import FormularioPago from "./FormularioPago";
import AnularPagoModal from "./AnularPagoModal";
import "../styles/pagos.css";

/*
  Sección «Pagos» embebida en el detalle del tratamiento (ABM 03 → ABM 04).

  Muestra el saldo pendiente destacado, la lista de pagos del tratamiento
  (vigentes y anulados), el alta de un pago y la anulación por fila. Al cambiar
  algo llama onCambio() para que el detalle del tratamiento recargue su saldo.

  - idTratamiento
  - estadoTratamiento: id del estado del tratamiento (4 = cancelado → no se puede
    registrar pago).
  - onCambio: callback opcional tras alta / anulación.
*/

const ESTADO_CANCELADO = 4;

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function formatearFecha(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

function SeccionPagosTratamiento({ idTratamiento, estadoTratamiento, onCambio }) {
  const { tienePermiso } = useAuth();
  const puedeRegistrar = tienePermiso("registrar_pagos");
  const puedeAnular = tienePermiso("anular_pagos");

  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [opciones, setOpciones] = useState({ medios: [] });

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [advertencia, setAdvertencia] = useState("");

  const [modalAlta, setModalAlta] = useState(false);
  const [erroresAlta, setErroresAlta] = useState([]);
  const [pagoAAnular, setPagoAAnular] = useState(null);

  const tratamientoCancelado = Number(estadoTratamiento) === ESTADO_CANCELADO;

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");
      const datos = await obtenerPagos({
        idTratamiento,
        estado: "todos",
        orden: "fecha_desc",
        porPagina: 100,
      });
      setPagos(Array.isArray(datos.pagos) ? datos.pagos : []);
      setResumen(datos.resumen || null);
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudieron cargar los pagos."
      );
      setPagos([]);
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, [idTratamiento]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!puedeRegistrar) return;
    obtenerOpcionesPago()
      .then((datos) => setOpciones({ medios: datos.medios || [] }))
      .catch(() => {});
  }, [puedeRegistrar]);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
    setAdvertencia("");
  }

  async function guardarAlta(datos) {
    try {
      setProcesando(true);
      setErroresAlta([]);
      limpiarMensajes();
      const respuesta = await registrarPago(datos);
      setModalAlta(false);
      setMensajeExito(
        `Pago registrado (ID ${respuesta.pago.id_pago}) por ${formatearMoneda(
          respuesta.pago.monto
        )}.`
      );
      if (respuesta.advertencia) setAdvertencia(respuesta.advertencia);
      await cargar();
      if (onCambio) onCambio();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresAlta(datosError.errores);
      } else {
        setErroresAlta([datosError?.mensaje || "No se pudo registrar el pago."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarAnulacion(motivo) {
    try {
      setProcesando(true);
      limpiarMensajes();
      await anularPago(pagoAAnular.id_pago, motivo);
      setPagoAAnular(null);
      setMensajeExito("El pago se anuló correctamente.");
      await cargar();
      if (onCambio) onCambio();
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudo anular el pago."
      );
      setPagoAAnular(null);
    } finally {
      setProcesando(false);
    }
  }

  const saldo = resumen ? resumen.saldo : null;

  return (
    <section className="roles-page__panel pagos-seccion">
      <div className="roles-page__titulo-seccion-permisos">
        <h2 className="pacientes-ficha__subtitulo">Pagos ({pagos.length})</h2>

        {puedeRegistrar && !tratamientoCancelado && (
          <button
            type="button"
            className="roles-page__boton-principal"
            onClick={() => {
              setErroresAlta([]);
              limpiarMensajes();
              setModalAlta(true);
            }}
          >
            Registrar pago
          </button>
        )}
      </div>

      {resumen && (
        <dl className="pagos-seccion__saldo">
          <div>
            <dt>Precio del tratamiento</dt>
            <dd>{formatearMoneda(resumen.precio_paciente)}</dd>
          </div>
          <div>
            <dt>Total pagado</dt>
            <dd>{formatearMoneda(resumen.total_pagado)}</dd>
          </div>
          <div className="pagos-seccion__saldo-destacado">
            <dt>Saldo pendiente</dt>
            <dd>
              <strong>{formatearMoneda(saldo)}</strong>
            </dd>
          </div>
        </dl>
      )}

      {resumen?.sobrepago && (
        <div className="roles-page__mensaje roles-page__mensaje--advertencia">
          El total pagado supera el precio del tratamiento.
        </div>
      )}

      {advertencia && (
        <div className="roles-page__mensaje roles-page__mensaje--advertencia">
          {advertencia}
        </div>
      )}
      {mensajeExito && (
        <div className="roles-page__mensaje roles-page__mensaje--exito">
          {mensajeExito}
        </div>
      )}
      {mensajeError && (
        <div className="roles-page__mensaje roles-page__mensaje--error">
          {mensajeError}
        </div>
      )}

      {tratamientoCancelado && (
        <div className="roles-page__mensaje roles-page__mensaje--advertencia">
          Tratamiento cancelado: no se pueden registrar nuevos pagos.
        </div>
      )}

      {cargando ? (
        <p className="roles-page__estado">Cargando pagos...</p>
      ) : pagos.length === 0 ? (
        <p className="roles-page__estado">Sin pagos registrados.</p>
      ) : (
        <div className="roles-page__tabla-contenedor">
          <table className="roles-page__tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Medio</th>
                <th>Notas</th>
                <th>Estado</th>
                {puedeAnular && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr
                  key={pago.id_pago}
                  className={pago.anulado ? "pagos-fila--anulada" : ""}
                >
                  <td>{formatearFecha(pago.fecha_pago)}</td>
                  <td>{formatearMoneda(pago.monto)}</td>
                  <td>{pago.medio_nombre}</td>
                  <td>{pago.notas || "—"}</td>
                  <td>
                    <span
                      className={`roles-page__badge ${
                        pago.anulado
                          ? "tratamientos-badge--estado-4"
                          : "tratamientos-badge--estado-3"
                      }`}
                    >
                      {pago.anulado ? "anulado" : "vigente"}
                    </span>
                  </td>
                  {puedeAnular && (
                    <td className="pagos-fila__acciones">
                      {!pago.anulado && (
                        <button
                          type="button"
                          className="roles-page__boton-peligro roles-page__boton--chico"
                          onClick={() => {
                            limpiarMensajes();
                            setPagoAAnular(pago);
                          }}
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAlta && (
        <FormularioPago
          modo="crear"
          idTratamiento={idTratamiento}
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresAlta}
          onGuardar={guardarAlta}
          onCancelar={() => {
            if (!procesando) setModalAlta(false);
          }}
        />
      )}

      <AnularPagoModal
        abierto={Boolean(pagoAAnular)}
        pago={pagoAAnular}
        cargando={procesando}
        onConfirmar={confirmarAnulacion}
        onCancelar={() => {
          if (!procesando) setPagoAAnular(null);
        }}
      />
    </section>
  );
}

export default SeccionPagosTratamiento;

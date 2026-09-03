import { useCallback, useEffect, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerGastos,
  obtenerOpcionesGasto,
  registrarGasto,
  anularGasto,
} from "../services/gastosService";
import FormularioGasto from "./FormularioGasto";
import AnularGastoModal from "./AnularGastoModal";
import "../styles/gastos.css";

/*
  Sección «Gastos imputados» embebida en el detalle del tratamiento (ABM 03 →
  ABM 05).

  Muestra el total de gastos imputados (vigentes), la lista de gastos del
  tratamiento (vigentes y anulados), el alta de un gasto imputado («Imputar
  gasto», prefija este tratamiento) y la anulación por fila.

  - idTratamiento
  - tratamientoTexto: descripción legible del tratamiento (para el formulario)
  - onCambio: callback opcional tras alta / anulación.
*/

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

function SeccionGastosTratamiento({ idTratamiento, tratamientoTexto = "", onCambio }) {
  const { tienePermiso } = useAuth();
  const puedeRegistrar = tienePermiso("registrar_gastos");
  const puedeAnular = tienePermiso("anular_gastos");

  const [gastos, setGastos] = useState([]);
  const [totales, setTotales] = useState({ vigente: 0, anulado: 0 });
  const [opciones, setOpciones] = useState({ tipos: [], tratamientos: [] });

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [modalAlta, setModalAlta] = useState(false);
  const [erroresAlta, setErroresAlta] = useState([]);
  const [gastoAAnular, setGastoAAnular] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");
      const datos = await obtenerGastos({
        idTratamiento,
        estado: "todos",
        orden: "fecha_desc",
        porPagina: 100,
      });
      setGastos(Array.isArray(datos.gastos) ? datos.gastos : []);
      setTotales(datos.totales || { vigente: 0, anulado: 0 });
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudieron cargar los gastos."
      );
      setGastos([]);
    } finally {
      setCargando(false);
    }
  }, [idTratamiento]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!puedeRegistrar) return;
    obtenerOpcionesGasto()
      .then((datos) =>
        setOpciones({
          tipos: datos.tipos || [],
          tratamientos: datos.tratamientos || [],
        })
      )
      .catch(() => {});
  }, [puedeRegistrar]);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  async function guardarAlta(datos) {
    try {
      setProcesando(true);
      setErroresAlta([]);
      limpiarMensajes();
      const respuesta = await registrarGasto(datos);
      setModalAlta(false);
      setMensajeExito(
        `Gasto imputado (ID ${respuesta.gasto.id_gasto}) por ${formatearMoneda(
          respuesta.gasto.monto
        )}.`
      );
      await cargar();
      if (onCambio) onCambio();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresAlta(datosError.errores);
      } else {
        setErroresAlta([datosError?.mensaje || "No se pudo registrar el gasto."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarAnulacion(motivo) {
    try {
      setProcesando(true);
      limpiarMensajes();
      await anularGasto(gastoAAnular.id_gasto, motivo);
      setGastoAAnular(null);
      setMensajeExito("El gasto se anuló correctamente.");
      await cargar();
      if (onCambio) onCambio();
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudo anular el gasto."
      );
      setGastoAAnular(null);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="roles-page__panel gastos-seccion">
      <div className="roles-page__titulo-seccion-permisos">
        <h2 className="pacientes-ficha__subtitulo">
          Gastos imputados ({gastos.length})
        </h2>

        {puedeRegistrar && (
          <button
            type="button"
            className="roles-page__boton-principal"
            onClick={() => {
              setErroresAlta([]);
              limpiarMensajes();
              setModalAlta(true);
            }}
          >
            Imputar gasto
          </button>
        )}
      </div>

      <dl className="gastos-seccion__total">
        <div>
          <dt>Total imputado (vigente)</dt>
          <dd>
            <strong>{formatearMoneda(totales.vigente)}</strong>
          </dd>
        </div>
        {totales.anulado > 0 && (
          <div>
            <dt>Anulado</dt>
            <dd>{formatearMoneda(totales.anulado)}</dd>
          </div>
        )}
      </dl>

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

      {cargando ? (
        <p className="roles-page__estado">Cargando gastos...</p>
      ) : gastos.length === 0 ? (
        <p className="roles-page__estado">Sin gastos imputados.</p>
      ) : (
        <div className="roles-page__tabla-contenedor">
          <table className="roles-page__tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Estado</th>
                {puedeAnular && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {gastos.map((gasto) => (
                <tr
                  key={gasto.id_gasto}
                  className={gasto.anulado ? "gastos-fila--anulada" : ""}
                >
                  <td>{formatearFecha(gasto.fecha_gasto)}</td>
                  <td>{gasto.tipo_nombre}</td>
                  <td>{gasto.descripcion || "—"}</td>
                  <td>{formatearMoneda(gasto.monto)}</td>
                  <td>
                    <span
                      className={`roles-page__badge ${
                        gasto.anulado
                          ? "tratamientos-badge--estado-4"
                          : "tratamientos-badge--estado-3"
                      }`}
                    >
                      {gasto.anulado ? "anulado" : "vigente"}
                    </span>
                  </td>
                  {puedeAnular && (
                    <td className="gastos-fila__acciones">
                      {!gasto.anulado && (
                        <button
                          type="button"
                          className="roles-page__boton-peligro roles-page__boton--chico"
                          onClick={() => {
                            limpiarMensajes();
                            setGastoAAnular(gasto);
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
        <FormularioGasto
          modo="crear"
          idTratamientoFijo={idTratamiento}
          tratamientoTexto={tratamientoTexto}
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresAlta}
          onGuardar={guardarAlta}
          onCancelar={() => {
            if (!procesando) setModalAlta(false);
          }}
        />
      )}

      <AnularGastoModal
        abierto={Boolean(gastoAAnular)}
        gasto={gastoAAnular}
        cargando={procesando}
        onConfirmar={confirmarAnulacion}
        onCancelar={() => {
          if (!procesando) setGastoAAnular(null);
        }}
      />
    </section>
  );
}

export default SeccionGastosTratamiento;

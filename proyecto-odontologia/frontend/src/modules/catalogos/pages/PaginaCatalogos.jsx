import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerCatalogo,
  crearItemCatalogo,
  actualizarItemCatalogo,
  desactivarItemCatalogo,
  reactivarItemCatalogo,
} from "../services/catalogosService";
import TablaCatalogo from "../components/TablaCatalogo";
import FormularioItemCatalogo from "../components/FormularioItemCatalogo";
import ConfirmacionAccionModal from "../../roles/components/ConfirmacionAccionModal";
import "../../roles/styles/roles.css";
import "../styles/catalogos.css";

/*
  ABM 01 — Catálogos de soporte. Una página con una pestaña por catálogo.
  `slug` coincide con el parámetro :catalogo del backend.
  `maxNombre` refleja el límite del VARCHAR de cada tabla.
*/
const CATALOGOS = [
  {
    slug: "estados-tratamiento",
    titulo: "Estados de tratamiento",
    etiqueta: "estado de tratamiento",
    maxNombre: 20,
  },
  {
    slug: "medios-pago",
    titulo: "Medios de pago",
    etiqueta: "medio de pago",
    maxNombre: 20,
  },
  {
    slug: "tipos-gasto",
    titulo: "Tipos de gasto",
    etiqueta: "tipo de gasto",
    maxNombre: 20,
  },
  {
    slug: "tipos-tratamiento",
    titulo: "Tipos de tratamiento",
    etiqueta: "tipo de tratamiento",
    maxNombre: 50,
  },
];

const MODAL_FORM_CERRADO = { abierto: false, modo: "crear", item: null };
const MODAL_CONFIRM_CERRADO = { abierto: false, tipo: null, item: null };

function PaginaCatalogos() {
  const { tienePermiso } = useAuth();
  const puedeGestionar = tienePermiso("gestionar_catalogos");

  const [slugActivo, setSlugActivo] = useState(CATALOGOS[0].slug);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [modalForm, setModalForm] = useState(MODAL_FORM_CERRADO);
  const [erroresForm, setErroresForm] = useState([]);
  const [modalConfirm, setModalConfirm] = useState(MODAL_CONFIRM_CERRADO);

  const catalogoActivo = useMemo(
    () => CATALOGOS.find((catalogo) => catalogo.slug === slugActivo),
    [slugActivo]
  );

  const limpiarMensajes = useCallback(() => {
    setMensajeError("");
    setMensajeExito("");
  }, []);

  const cargarItems = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");

      const datos = await obtenerCatalogo(slugActivo, { estado: filtroEstado });
      setItems(Array.isArray(datos.items) ? datos.items : []);
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError(
          "No tenés permisos suficientes para consultar los catálogos."
        );
      } else {
        setMensajeError(mensajeBackend || "No se pudo cargar el catálogo.");
      }

      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [slugActivo, filtroEstado]);

  useEffect(() => {
    cargarItems();
  }, [cargarItems]);

  function cambiarCatalogo(slug) {
    if (slug === slugActivo) return;
    limpiarMensajes();
    setBusqueda("");
    setFiltroEstado("todos");
    setSlugActivo(slug);
  }

  // ── Alta / edición ──────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarMensajes();
    setErroresForm([]);
    setModalForm({ abierto: true, modo: "crear", item: null });
  }

  function abrirModalEditar(item) {
    limpiarMensajes();
    setErroresForm([]);
    setModalForm({ abierto: true, modo: "editar", item });
  }

  function cerrarModalForm() {
    if (procesando) return;
    setModalForm(MODAL_FORM_CERRADO);
    setErroresForm([]);
  }

  async function guardarItem({ nombre, descripcion }) {
    const { modo, item } = modalForm;

    try {
      setProcesando(true);
      setErroresForm([]);
      limpiarMensajes();

      const cuerpo = { nombre, descripcion: descripcion || undefined };

      if (modo === "crear") {
        await crearItemCatalogo(slugActivo, cuerpo);
        setMensajeExito(`Se creó el ${catalogoActivo.etiqueta} «${nombre}».`);
      } else {
        await actualizarItemCatalogo(slugActivo, item.id, cuerpo);
        setMensajeExito(`Se actualizó el ${catalogoActivo.etiqueta} «${nombre}».`);
      }

      setModalForm(MODAL_FORM_CERRADO);
      await cargarItems();
    } catch (error) {
      const datos = error.response?.data;

      if (Array.isArray(datos?.errores) && datos.errores.length > 0) {
        setErroresForm(datos.errores);
      } else {
        setErroresForm([datos?.mensaje || "No se pudo guardar el ítem."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  // ── Baja / reactivación ─────────────────────────────────────────────────────

  function abrirModalDesactivar(item) {
    limpiarMensajes();
    setModalConfirm({ abierto: true, tipo: "desactivar", item });
  }

  function abrirModalReactivar(item) {
    limpiarMensajes();
    setModalConfirm({ abierto: true, tipo: "reactivar", item });
  }

  function cerrarModalConfirm() {
    if (procesando) return;
    setModalConfirm(MODAL_CONFIRM_CERRADO);
  }

  async function confirmarAccion() {
    const { tipo, item } = modalConfirm;
    if (!tipo || !item) return;

    try {
      setProcesando(true);
      limpiarMensajes();

      if (tipo === "desactivar") {
        await desactivarItemCatalogo(slugActivo, item.id);
        setMensajeExito(`Se desactivó «${item.nombre}».`);
      } else {
        await reactivarItemCatalogo(slugActivo, item.id);
        setMensajeExito(`Se reactivó «${item.nombre}».`);
      }

      setModalConfirm(MODAL_CONFIRM_CERRADO);
      await cargarItems();
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;
      setMensajeError(mensajeBackend || "No se pudo completar la acción.");
      setModalConfirm(MODAL_CONFIRM_CERRADO);
    } finally {
      setProcesando(false);
    }
  }

  // ── Filtro de texto en cliente ──────────────────────────────────────────────

  const itemsFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return items;

    return items.filter((item) => {
      const nombre = item.nombre?.toLowerCase() || "";
      const descripcion = item.descripcion?.toLowerCase() || "";
      return nombre.includes(texto) || descripcion.includes(texto);
    });
  }, [items, busqueda]);

  const itemConfirm = modalConfirm.item;
  const esDesactivar = modalConfirm.tipo === "desactivar";

  return (
    <>
      <main className="roles-page catalogos-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Catálogos</h1>
            <p className="roles-page__descripcion">
              Administrá las listas de soporte del sistema: estados de
              tratamiento, medios de pago, tipos de gasto y tipos de tratamiento.
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              className="roles-page__boton-principal"
              type="button"
              disabled={!puedeGestionar}
              onClick={abrirModalNuevo}
            >
              Nuevo {catalogoActivo.etiqueta}
            </button>
          </div>
        </section>

        <nav className="catalogos-page__pestanas">
          {CATALOGOS.map((catalogo) => (
            <button
              key={catalogo.slug}
              type="button"
              className={
                catalogo.slug === slugActivo
                  ? "catalogos-page__pestana catalogos-page__pestana--activa"
                  : "catalogos-page__pestana"
              }
              onClick={() => cambiarCatalogo(catalogo.slug)}
            >
              {catalogo.titulo}
            </button>
          ))}
        </nav>

        <section className="roles-page__panel">
          <div className="roles-page__filtros">
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />

            <select
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          {!puedeGestionar && (
            <div className="roles-page__mensaje roles-page__mensaje--advertencia">
              Tenés acceso de sólo lectura. Necesitás el permiso «gestionar
              catálogos» para crear, editar o dar de baja ítems.
            </div>
          )}

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

          {cargando ? (
            <p className="roles-page__estado">Cargando catálogo...</p>
          ) : (
            <TablaCatalogo
              items={itemsFiltrados}
              puedeGestionar={puedeGestionar}
              onEditar={abrirModalEditar}
              onDesactivar={abrirModalDesactivar}
              onReactivar={abrirModalReactivar}
            />
          )}
        </section>
      </main>

      {modalForm.abierto && (
        <FormularioItemCatalogo
          key={`${modalForm.modo}-${modalForm.item?.id ?? "nuevo"}-${slugActivo}`}
          modo={modalForm.modo}
          item={modalForm.item}
          etiquetaCatalogo={catalogoActivo.etiqueta}
          maxNombre={catalogoActivo.maxNombre}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarItem}
          onCancelar={cerrarModalForm}
        />
      )}

      <ConfirmacionAccionModal
        abierto={modalConfirm.abierto}
        tipo={esDesactivar ? "peligro" : "exito"}
        titulo={
          esDesactivar ? "Confirmar baja lógica" : "Confirmar reactivación"
        }
        descripcion={
          esDesactivar
            ? `Estás por desactivar «${itemConfirm?.nombre}». No se elimina de la base, pero deja de estar disponible para nuevos registros.`
            : `Estás por reactivar «${itemConfirm?.nombre}». Volverá a estar disponible para nuevos registros.`
        }
        textoConfirmar={esDesactivar ? "Desactivar" : "Reactivar"}
        textoCancelar="Cancelar"
        cargando={procesando}
        onCancelar={cerrarModalConfirm}
        onConfirmar={confirmarAccion}
      />
    </>
  );
}

export default PaginaCatalogos;

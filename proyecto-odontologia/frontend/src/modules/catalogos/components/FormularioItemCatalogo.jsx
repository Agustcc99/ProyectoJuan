import { useState } from "react";

/*
  Modal de alta / edición de un ítem de catálogo.
  - modo: "crear" | "editar".
  - item: ítem a editar (sólo en modo "editar").
  - En ítems protegidos el nombre queda deshabilitado (sólo se edita la descripción).
  - erroresBackend: array de strings devuelto por el validador del backend.

  El componente se monta cuando se abre el modal (la página lo renderiza con una
  `key` distinta por apertura), así que el estado arranca de los props sin efectos.
*/
function FormularioItemCatalogo({
  modo = "crear",
  item = null,
  etiquetaCatalogo = "ítem",
  maxNombre = 20,
  maxDescripcion = 255,
  cargando = false,
  erroresBackend = [],
  onGuardar,
  onCancelar,
}) {
  const [nombre, setNombre] = useState(() => item?.nombre || "");
  const [descripcion, setDescripcion] = useState(() => item?.descripcion || "");

  const esEdicion = modo === "editar";
  const esProtegido = Boolean(item?.protegido);

  function manejarEnvio(evento) {
    evento.preventDefault();
    onGuardar({ nombre: nombre.trim(), descripcion: descripcion.trim() });
  }

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion catalogos-form">
        <div className="modal-confirmacion__contenido">
          <h2>
            {esEdicion
              ? `Editar ${etiquetaCatalogo}`
              : `Nuevo ${etiquetaCatalogo}`}
          </h2>
          <p>
            {esProtegido
              ? "Este ítem es del sistema: sólo se puede editar su descripción."
              : "Completá el nombre y, opcionalmente, una descripción."}
          </p>
        </div>

        {erroresBackend.length > 0 && (
          <div className="roles-page__mensaje roles-page__mensaje--error">
            <ul className="catalogos-form__errores">
              {erroresBackend.map((error, indice) => (
                <li key={indice}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form className="catalogos-form__cuerpo" onSubmit={manejarEnvio}>
          <div className="roles-page__campo">
            <label htmlFor="catalogo-nombre">Nombre</label>
            <input
              id="catalogo-nombre"
              type="text"
              value={nombre}
              maxLength={maxNombre}
              disabled={esProtegido || cargando}
              autoFocus={!esProtegido}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder={`Entre 2 y ${maxNombre} caracteres`}
            />
          </div>

          <div className="roles-page__campo">
            <label htmlFor="catalogo-descripcion">Descripción (opcional)</label>
            <textarea
              id="catalogo-descripcion"
              rows={3}
              value={descripcion}
              maxLength={maxDescripcion}
              disabled={cargando}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder={`Hasta ${maxDescripcion} caracteres`}
            />
          </div>

          <div className="modal-confirmacion__acciones">
            <button
              type="button"
              className="modal-confirmacion__boton modal-confirmacion__boton--secundario"
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="modal-confirmacion__boton modal-confirmacion__boton--exito"
              disabled={cargando || nombre.trim().length < 2}
            >
              {cargando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioItemCatalogo;

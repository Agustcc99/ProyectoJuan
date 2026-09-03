/*
  Tabla genérica para cualquiera de los cuatro catálogos.
  Columnas: Nombre, Descripción, Estado, Acciones.
  Los ítems protegidos muestran un candado y no ofrecen desactivar ni editar.
*/
function TablaCatalogo({
  items,
  puedeGestionar,
  onEditar,
  onDesactivar,
  onReactivar,
}) {
  if (items.length === 0) {
    return (
      <p className="roles-page__estado">
        No se encontraron ítems con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="roles-page__tabla-contenedor">
      <table className="roles-page__tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const activo = Number(item.activo) === 1;

            return (
              <tr key={item.id}>
                <td>
                  <strong>{item.nombre}</strong>
                  {item.protegido && (
                    <span
                      className="catalogos-page__candado"
                      title="Ítem del sistema: no se puede desactivar ni renombrar"
                    >
                      
                    </span>
                  )}
                </td>

                <td>{item.descripcion || "Sin descripción"}</td>

                <td>
                  <span
                    className={
                      activo
                        ? "roles-page__badge roles-page__badge--activo"
                        : "roles-page__badge roles-page__badge--inactivo"
                    }
                  >
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td>
                  <div className="roles-page__acciones">
                    <button
                      type="button"
                      disabled={!puedeGestionar}
                      onClick={() => onEditar(item)}
                    >
                      Editar
                    </button>

                    {activo ? (
                      <button
                        type="button"
                        className="roles-page__accion-peligro"
                        disabled={!puedeGestionar || item.protegido}
                        onClick={() => onDesactivar(item)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="roles-page__accion-exito"
                        disabled={!puedeGestionar}
                        onClick={() => onReactivar(item)}
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TablaCatalogo;

function PaginaTratamientos() {
    return (
      <>
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Tratamientos</h2>
            <p className="page-header-sub">
              Registrá y hacé seguimiento de los tratamientos odontológicos.
            </p>
          </div>
          <button className="panel-btn-primary" type="button" disabled>
            + Nuevo tratamiento
          </button>
        </div>
  
        <div className="panel-card">
          <div className="panel-card-placeholder">
            <div className="panel-card-placeholder-icon">📋</div>
            <p className="panel-card-placeholder-title">Módulo en desarrollo</p>
            <p className="panel-card-placeholder-text">
              La gestión de tratamientos se implementará en el próximo sprint.
            </p>
          </div>
        </div>
      </>
    );
  }
  
  export default PaginaTratamientos;
  
function PaginaAdministrador() {
    return (
      <>
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Administrador</h2>
            <p className="page-header-sub">
              Gestioná los usuarios del sistema, roles y permisos de acceso.
            </p>
          </div>
          <button className="panel-btn-primary" type="button" disabled>
            + Nuevo usuario
          </button>
        </div>
  
        <div className="panel-card">
          <div className="panel-card-placeholder">
            <div className="panel-card-placeholder-icon">⚙️</div>
            <p className="panel-card-placeholder-title">Módulo en desarrollo</p>
            <p className="panel-card-placeholder-text">
              La administración de usuarios y roles se implementará en el próximo sprint.
            </p>
          </div>
        </div>
      </>
    );
  }
  
  export default PaginaAdministrador;
  
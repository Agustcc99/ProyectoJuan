import { Link, useLocation } from "react-router-dom";

function AccesoDenegadoPage() {
  const location = useLocation();
  const rutaIntentada = location.state?.desde;

  return (
    <main className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <span className="badge text-bg-danger mb-3">
            Acceso restringido
          </span>

          <h1 className="fw-bold mb-3">Acceso denegado</h1>

          <p className="text-muted mb-3">
            No tenés permisos suficientes para ingresar a esta sección del
            sistema.
          </p>

          {rutaIntentada && (
            <p className="text-muted small mb-4">
              Ruta solicitada: <strong>{rutaIntentada}</strong>
            </p>
          )}

          <Link className="btn btn-primary rounded-3" to="/panel">
            Volver al panel principal
          </Link>
        </div>
      </div>
    </main>
  );
}

export default AccesoDenegadoPage;
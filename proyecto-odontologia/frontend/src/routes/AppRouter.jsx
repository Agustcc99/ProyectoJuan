import { Navigate, Route, Routes } from "react-router-dom";
import PaginaLogin from "../modules/auth/pages/PaginaLogin";
import RegistroPage from "../modules/auth/pages/RegistroPage";
import RecuperarContrasenaPage from "../modules/auth/pages/RecuperarContrasenaPage";

function PanelAdminTemporal() {
  return (
    <main className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h1 className="fw-bold text-primary">Panel administrativo</h1>
          <p className="text-muted">
            Acceso para usuario administrador. Desde este panel se podrán
            gestionar usuarios, pacientes, tratamientos, pagos, gastos y
            reportes.
          </p>
        </div>
      </div>
    </main>
  );
}

function PanelEmpleadoTemporal() {
  return (
    <main className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h1 className="fw-bold text-info">Panel de empleado</h1>
          <p className="text-muted">
            Acceso limitado para usuario empleado. Desde este panel se podrán
            consultar y cargar datos operativos permitidos.
          </p>
        </div>
      </div>
    </main>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<PaginaLogin />} />

      <Route path="/registro" element={<RegistroPage />} />

      <Route
        path="/recuperar-contrasena"
        element={<RecuperarContrasenaPage />}
      />

      <Route path="/panel-admin" element={<PanelAdminTemporal />} />

      <Route path="/panel-empleado" element={<PanelEmpleadoTemporal />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
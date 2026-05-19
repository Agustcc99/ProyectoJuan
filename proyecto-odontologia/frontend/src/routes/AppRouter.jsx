import { Navigate, Route, Routes } from "react-router-dom";

// Auth
import PaginaLogin from "../modules/auth/pages/PaginaLogin";
import RegistroPage from "../modules/auth/pages/RegistroPage";
import RecuperarContrasenaPage from "../modules/auth/pages/RecuperarContrasenaPage";
import RestablecerContrasenaPage from "../modules/auth/pages/RestablecerContrasenaPage";

// Guards
import RutaPrivada from "./RutaPrivada";
import RutaPorRol from "./RutaPorRol";

// Layout del panel
import LayoutPrincipal from "../components/layout/LayoutPrincipal";

// Páginas
import PaginaDashboard from "../modules/dashboard/DashboardPage";
import PaginaPacientes from "../modules/pacientes/pages/PaginaPacientes";

// Roles
import { ROLES_USUARIO } from "../utils/roles";

function Proximamente({ titulo }) {
  return (
    <main className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h1 className="fw-bold">{titulo}</h1>
          <p className="text-muted mb-0">
            Esta sección será desarrollada próximamente.
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

      {/* Autenticación */}
      <Route path="/login" element={<PaginaLogin />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route
        path="/recuperar-contrasena"
        element={<RecuperarContrasenaPage />}
      />
      <Route
      path="/restablecer-contrasena"
      element={<RestablecerContrasenaPage />}
      />

      {/* Panel Administrador */}
      <Route
        path="/panel-admin"
        element={
          <RutaPrivada>
            <RutaPorRol rolesPermitidos={[ROLES_USUARIO.ADMINISTRADOR]}>
              <LayoutPrincipal baseRuta="/panel-admin" />
            </RutaPorRol>
          </RutaPrivada>
        }
      >
        <Route index element={<PaginaDashboard baseRuta="/panel-admin" />} />
        <Route path="pacientes" element={<PaginaPacientes />} />
        <Route
          path="tratamientos"
          element={<Proximamente titulo="Tratamientos" />}
        />
        <Route path="reportes" element={<Proximamente titulo="Reportes" />} />
        <Route
          path="administrador"
          element={<Proximamente titulo="Administrador" />}
        />
      </Route>

      {/* Panel Empleado */}
      <Route
        path="/panel-empleado"
        element={
          <RutaPrivada>
            <RutaPorRol rolesPermitidos={[ROLES_USUARIO.EMPLEADO]}>
              <LayoutPrincipal baseRuta="/panel-empleado" />
            </RutaPorRol>
          </RutaPrivada>
        }
      >
        <Route index element={<PaginaDashboard baseRuta="/panel-empleado" />} />
        <Route path="pacientes" element={<PaginaPacientes />} />
        <Route
          path="tratamientos"
          element={<Proximamente titulo="Tratamientos" />}
        />
        <Route path="reportes" element={<Proximamente titulo="Reportes" />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
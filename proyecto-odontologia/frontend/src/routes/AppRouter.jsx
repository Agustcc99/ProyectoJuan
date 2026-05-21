import { Link, Navigate, Route, Routes } from "react-router-dom";

// Auth
import PaginaLogin from "../modules/auth/pages/PaginaLogin";
import RegistroPage from "../modules/auth/pages/RegistroPage";
import RecuperarContrasenaPage from "../modules/auth/pages/RecuperarContrasenaPage";
import RestablecerContrasenaPage from "../modules/auth/pages/RestablecerContrasenaPage";

// Guards
import RutaPrivada from "./RutaPrivada";
import RutaPorPermiso from "./RutaPorPermiso";

// Layout del panel
import LayoutPrincipal from "../components/layout/LayoutPrincipal";

// Páginas
import PaginaDashboard from "../modules/dashboard/DashboardPage";
import PaginaPacientes from "../modules/pacientes/pages/PaginaPacientes";
import RolesPage from "../modules/roles/pages/RolesPage";
import CrearRolPage from "../modules/roles/pages/CrearRolPage";
import EditarRolPage from "../modules/roles/pages/EditarRolPage";
import UsuariosRolesPage from "../modules/usuarios/pages/UsuariosRolesPage";

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

function AccesoDenegado() {
  return (
    <main className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h1 className="fw-bold">Acceso denegado</h1>
          <p className="text-muted">
            No tenés permisos suficientes para ingresar a esta sección.
          </p>

          <Link className="btn btn-primary rounded-3" to="/panel">
            Volver al panel
          </Link>
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

      {/* Redirecciones temporales para no romper el login actual */}
      <Route path="/panel-admin/*" element={<Navigate to="/panel" replace />} />
      <Route
        path="/panel-empleado/*"
        element={<Navigate to="/panel" replace />}
      />

      {/* Panel único protegido */}
      <Route
        path="/panel"
        element={
          <RutaPrivada>
            <LayoutPrincipal baseRuta="/panel" />
          </RutaPrivada>
        }
      >
        <Route index element={<PaginaDashboard baseRuta="/panel" />} />

        <Route path="acceso-denegado" element={<AccesoDenegado />} />

        <Route
          path="pacientes"
          element={
            <RutaPorPermiso permisoRequerido="ver_pacientes">
              <PaginaPacientes />
            </RutaPorPermiso>
          }
        />

        <Route
          path="tratamientos"
          element={
            <RutaPorPermiso permisoRequerido="ver_tratamientos">
              <Proximamente titulo="Tratamientos" />
            </RutaPorPermiso>
          }
        />

        <Route
          path="reportes"
          element={
            <RutaPorPermiso permisoRequerido="ver_reportes">
              <Proximamente titulo="Reportes" />
            </RutaPorPermiso>
          }
        />

        <Route
          path="administrador"
          element={
            <RutaPorPermiso permisoRequerido="ver_roles">
              <RolesPage />
            </RutaPorPermiso>
          }
        />

        <Route
          path="administrador/nuevo"
          element={
            <RutaPorPermiso
              permisosRequeridos={["crear_roles", "asignar_permisos"]}
              modo="todos"
            >
              <CrearRolPage />
            </RutaPorPermiso>
          }
        />

        <Route
          path="administrador/roles/:idRol/detalle"
          element={
            <RutaPorPermiso
              permisosRequeridos={["ver_roles", "editar_roles", "asignar_permisos"]}
              modo="todos"
            >
              <EditarRolPage />
            </RutaPorPermiso>
          }
        />

        <Route
          path="administrador/usuarios"
          element={
            <RutaPorPermiso permisoRequerido="ver_usuarios">
              <UsuariosRolesPage />
            </RutaPorPermiso>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
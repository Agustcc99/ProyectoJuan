import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

// FIX HT2 (AUD-02): manejo automático de sesión expirada
import { EVENTO_SESION_EXPIRADA } from "../services/api";

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
import FichaPacientePage from "../modules/pacientes/pages/FichaPacientePage";
import RolesPage from "../modules/roles/pages/RolesPage";
import CrearRolPage from "../modules/roles/pages/CrearRolPage";
import EditarRolPage from "../modules/roles/pages/EditarRolPage";
import UsuariosRolesPage from "../modules/usuarios/pages/UsuariosRolesPage";
import PaginaCatalogos from "../modules/catalogos/pages/PaginaCatalogos";
import PaginaTratamientos from "../modules/tratamientos/pages/PaginaTratamientos";
import DetalleTratamientoPage from "../modules/tratamientos/pages/DetalleTratamientoPage";
import PaginaPagos from "../modules/pagos/pages/PaginaPagos";
import PaginaGastos from "../modules/gastos/pages/PaginaGastos";
import PaginaReportes from "../modules/reportes/page/PaginaReportes";

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
  const navigate = useNavigate();

  /*
    FIX HT2 (AUD-02): al detectar un 401, el interceptor de api.js ya limpió la
    sesión y emite este evento. Acá sólo se hace la redirección a /login, para que
    ninguna pantalla protegida quede inutilizable.

    FIX HT4 (AUD-05): el mensaje informativo ya no viaja en el state de la
    navegación; lo guarda el AuthContext y lo lee la pantalla de login.
  */
  useEffect(() => {
    function manejarSesionExpirada() {
      navigate("/login", { replace: true });
    }

    window.addEventListener(EVENTO_SESION_EXPIRADA, manejarSesionExpirada);

    return () => {
      window.removeEventListener(EVENTO_SESION_EXPIRADA, manejarSesionExpirada);
    };
  }, [navigate]);

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
          path="pacientes/:id"
          element={
            <RutaPorPermiso permisoRequerido="ver_pacientes">
              <FichaPacientePage />
            </RutaPorPermiso>
          }
        />

        <Route
          path="tratamientos"
          element={
            <RutaPorPermiso permisoRequerido="ver_tratamientos">
              <PaginaTratamientos />
            </RutaPorPermiso>
          }
        />

        <Route
          path="tratamientos/:id"
          element={
            <RutaPorPermiso permisoRequerido="ver_tratamientos">
              <DetalleTratamientoPage />
            </RutaPorPermiso>
          }
        />

        <Route
          path="pagos"
          element={
            <RutaPorPermiso permisoRequerido="ver_pagos">
              <PaginaPagos />
            </RutaPorPermiso>
          }
        />

        <Route
          path="gastos"
          element={
            <RutaPorPermiso permisoRequerido="ver_gastos">
              <PaginaGastos />
            </RutaPorPermiso>
          }
        />

        <Route
          path="reportes"
          element={
            <RutaPorPermiso permisoRequerido="ver_reportes">
              <PaginaReportes />
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

        <Route
          path="administrador/catalogos"
          element={
            <RutaPorPermiso permisoRequerido="ver_catalogos">
              <PaginaCatalogos />
            </RutaPorPermiso>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
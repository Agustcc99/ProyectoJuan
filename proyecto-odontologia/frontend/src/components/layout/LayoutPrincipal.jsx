import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

// FIX HT4 (AUD-05): usuario, permisos y cierre de sesión salen del contexto.
import useAuth from "../../hooks/useAuth";
import { ROLES_USUARIO } from "../../utils/roles";

// ── Íconos SVG inline ───────────────────────────────

function IconoDiente() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C9.5 2 7.5 3.5 6.5 5.5 5.5 4.5 4 4 2.5 4.5 1 5 .5 7 1 8.5c.5 1.5 1.5 2.5 1.5 4 0 3 1.5 7 3 8.5.5.5 1 .5 1.5 0 .5-.5.5-2 .5-3s0-2 1-2 1 1 1 2 0 2.5.5 3c.5.5 1 .5 1.5 0C13 19.5 14.5 15.5 14.5 12.5c0-1.5 1-2.5 1.5-4 .5-1.5 0-3.5-1.5-4C13.5 4 13 4.5 12 5c-1-.5-1.5-1-2-1.5C9.5 3 10.5 2 12 2z" />
    </svg>
  );
}

function IconoHome() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconoPacientes() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconoTratamientos() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconoReportes() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconoAdmin() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 15.54a5 5 0 0 1 0-7.07" />
    </svg>
  );
}

function IconoCerrarSesion() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconoMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function obtenerIniciales(nombre = "", apellido = "") {
  const n = nombre.trim()[0] || "";
  const a = apellido.trim()[0] || "";
  return (n + a).toUpperCase() || "U";
}

function obtenerNombreRol(usuario) {
  // FIX HT1: si el backend informa el rol vigente se muestra ese, así el cambio de
  // rol en sesión activa también se refleja en la interfaz.
  if (usuario?.nombre_rol) return usuario.nombre_rol;

  if (usuario?.id_rol === ROLES_USUARIO.ADMINISTRADOR) return "Administrador";
  if (usuario?.id_rol === ROLES_USUARIO.EMPLEADO) return "Empleado";
  return "Usuario";
}

function obtenerTituloRutaActual(pathname) {
  if (pathname === "/panel") return "Dashboard";
  if (pathname === "/panel/pacientes") return "Pacientes";
  if (pathname === "/panel/tratamientos") return "Tratamientos";
  if (pathname === "/panel/reportes") return "Reportes";
  if (pathname === "/panel/administrador") return "Administración";
  if (pathname === "/panel/administrador/nuevo") return "Nuevo rol";
  if (pathname === "/panel/administrador/usuarios") return "Usuarios y roles";
  if (pathname === "/panel/acceso-denegado") return "Acceso denegado";

  if (
    pathname.startsWith("/panel/administrador/roles/") &&
    pathname.endsWith("/detalle")
  ) {
    return "Detalle del rol";
  }

  return "Panel";
}

// ── Componente principal ──────────────────────────────────────────────────────

function LayoutPrincipal({ baseRuta = "/panel" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  /*
    FIX HT4 (AUD-05): reemplaza el estado local de permisos y usuario, las lecturas
    de localStorage y la revalidación periódica que vivían en este componente.
    La revalidación de HT1 ahora corre en el AuthProvider, que sobrevive a los
    cambios de pantalla.
  */
  const { usuario, cerrarSesion, tienePermiso, tieneAlgunPermiso } = useAuth();

  const iniciales = obtenerIniciales(usuario?.nombre, usuario?.apellido);

  const nombreCompleto = usuario
    ? `${usuario.nombre} ${usuario.apellido}`
    : "Usuario";

  const nombreRol = obtenerNombreRol(usuario);

  const tituloActual = obtenerTituloRutaActual(location.pathname);

  function manejarCerrarSesion() {
    // FIX HT4: el cierre de sesión limpia el estado global y la persistencia.
    cerrarSesion();
    navigate("/login");
  }

  function cerrarSidebarSiMovil() {
    if (window.innerWidth < 992) {
      setSidebarAbierto(false);
    }
  }

  const itemsNav = [
    {
      a: `${baseRuta}`,
      icono: <IconoHome />,
      texto: "Inicio",
      exacto: true,
      mostrar: true,
    },
    {
      a: `${baseRuta}/pacientes`,
      icono: <IconoPacientes />,
      texto: "Pacientes",
      mostrar: tienePermiso("ver_pacientes"),
    },
    {
      a: `${baseRuta}/tratamientos`,
      icono: <IconoTratamientos />,
      texto: "Tratamientos",
      mostrar: tienePermiso("ver_tratamientos"),
    },
    {
      a: `${baseRuta}/reportes`,
      icono: <IconoReportes />,
      texto: "Reportes",
      mostrar: tienePermiso("ver_reportes"),
    },
  ];

  if (
    tieneAlgunPermiso([
      "ver_roles",
      "crear_roles",
      "editar_roles",
      "asignar_permisos",
      "ver_usuarios",
      "asignar_roles_usuarios",
    ])
  ) {
    itemsNav.push({
      a: tienePermiso("ver_roles")
        ? `${baseRuta}/administrador`
        : `${baseRuta}/administrador/usuarios`,
      icono: <IconoAdmin />,
      texto: "Administración",
      mostrar: true,
    });
  }

  const itemsNavVisibles = itemsNav.filter((item) => item.mostrar);

  return (
    <div className="panel-layout">
      {/* Overlay móvil */}
      {sidebarAbierto && (
        <div
          onClick={() => setSidebarAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 99,
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`panel-sidebar${sidebarAbierto ? " open" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <IconoDiente />
          </div>

          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Consultorio Herrera</span>
            <span className="sidebar-brand-sub">Sistema odontológico</span>
          </div>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <p className="sidebar-nav-label">Menú principal</p>

            {itemsNavVisibles.map((item) => (
              <NavLink
                key={item.a}
                to={item.a}
                end={item.exacto}
                onClick={cerrarSidebarSiMovil}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? " active" : ""}`
                }
              >
                <span className="sidebar-nav-icon">{item.icono}</span>
                <span className="sidebar-nav-text">{item.texto}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{iniciales}</div>

            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{nombreCompleto}</p>
              <p className="sidebar-user-role">{nombreRol}</p>
            </div>
          </div>

          <button
            className="sidebar-logout-btn"
            onClick={manejarCerrarSesion}
            type="button"
          >
            <IconoCerrarSesion />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="panel-main">
        {/* Topbar */}
        <header className="panel-topbar">
          <button
            className="d-lg-none btn btn-sm p-1 me-2"
            style={{
              border: "none",
              background: "transparent",
              color: "#17324d",
            }}
            onClick={() => setSidebarAbierto((prev) => !prev)}
            aria-label="Abrir menú"
            type="button"
          >
            <IconoMenu />
          </button>

          <div className="panel-topbar-breadcrumb">
            <span className="topbar-page-title">Panel</span>
            <span className="topbar-separator">›</span>
            <span className="topbar-section-name">{tituloActual}</span>
          </div>

          <div className="panel-topbar-actions">
            <div className="topbar-user-chip">
              <div className="topbar-user-avatar">{iniciales}</div>
              <span className="topbar-user-name">{usuario?.nombre}</span>
            </div>
          </div>
        </header>

        {/* Contenido de la ruta activa */}
        <main className="panel-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default LayoutPrincipal;
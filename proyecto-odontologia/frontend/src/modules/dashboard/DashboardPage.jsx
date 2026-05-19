// src/modules/dashboard/DashboardPage.jsx

import { Link } from "react-router-dom";
import { Users, ClipboardList, BarChart3 } from "lucide-react";

import "./DashboardPage.css";

function DashboardPage({ baseRuta }) {
  return (
    <section className="dashboard">
      <div className="dashboard__encabezado">
        <p className="dashboard__etiqueta">Panel principal</p>

        <h1 className="dashboard__titulo">
          Sistema de gestión odontológica
        </h1>

        <p className="dashboard__descripcion">
          Accedé rápidamente a pacientes, tratamientos y reportes desde un único
          lugar.
        </p>
      </div>

      <div className="dashboard__contenedor-tarjetas">
        <Link
          to={`${baseRuta}/pacientes`}
          className="dashboard-card dashboard-card--pacientes"
        >
          <div className="dashboard-card__icono">
            <Users size={42} strokeWidth={1.8} />
          </div>

          <h2 className="dashboard-card__titulo">Pacientes</h2>

          <p className="dashboard-card__descripcion">
            Registrar, buscar y administrar la información de los pacientes.
          </p>
        </Link>

        <Link
          to={`${baseRuta}/tratamientos`}
          className="dashboard-card dashboard-card--tratamientos"
        >
          <div className="dashboard-card__icono">
            <ClipboardList size={42} strokeWidth={1.8} />
          </div>

          <h2 className="dashboard-card__titulo">Tratamientos</h2>

          <p className="dashboard-card__descripcion">
            Gestionar tratamientos, estados, pagos y gastos asociados.
          </p>
        </Link>

        <Link
          to={`${baseRuta}/reportes`}
          className="dashboard-card dashboard-card--reportes"
        >
          <div className="dashboard-card__icono">
            <BarChart3 size={42} strokeWidth={1.8} />
          </div>

          <h2 className="dashboard-card__titulo">Reportes</h2>

          <p className="dashboard-card__descripcion">
            Consultar reportes mensuales, pendientes y resúmenes financieros.
          </p>
        </Link>
      </div>
    </section>
  );
}

export default DashboardPage;
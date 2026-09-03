const express = require("express");
const cors = require("cors");

// FIX HT3 (AUD-04): helpers y middlewares de respuesta/errores centralizados.
const { enviarExito } = require("./utils/response");
const {
  manejarRutaNoEncontrada,
  manejarErrores,
} = require("./middlewares/errorMiddleware");

const authRoutes = require("./modules/auth/auth.routes");
const rolesRoutes = require("./modules/roles/roles.routes");
const permisosRoutes = require("./modules/permisos/permisos.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const catalogosRoutes = require("./modules/catalogos/catalogos.routes");
const pacientesRoutes = require("./modules/pacientes/pacientes.routes");
const tratamientosRoutes = require("./modules/tratamientos/tratamientos.routes");
const pagosRoutes = require("./modules/pagos/pagos.routes");
const gastosRoutes = require("./modules/gastos/gastos.routes");
const reportesRoutes = require("./modules/reportes/reportes.routes");

const app = express();

/*
  FIX HT9 (AUD-11) - Criterio 2: origen restringido.

  cors() sin configuración refleja cualquier Origin como permitido. Ahora sólo se
  aceptan los orígenes explícitos definidos en CORS_ORIGENES_PERMITIDOS (separados
  por coma), con http://localhost:5173 -el puerto de Vite en desarrollo- como
  valor por defecto si la variable no está definida.

  Las peticiones sin header Origin (curl, Postman, llamadas servidor-a-servidor)
  se dejan pasar: CORS es una restricción que impone el navegador, no aplica a
  esos clientes, y bloquearlas no sumaría seguridad real.
*/
const origenesPermitidos = (
  process.env.CORS_ORIGENES_PERMITIDOS || "http://localhost:5173"
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origenPeticion, callback) {
      if (!origenPeticion || origenesPermitidos.includes(origenPeticion)) {
        return callback(null, true);
      }

      const error = new Error("Origen no autorizado por la política de CORS.");
      error.statusCode = 403;
      return callback(error);
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  enviarExito(res, 200, "Backend funcionando correctamente");
});

/*
  FIX HT6 (AUD-08): se eliminó GET /api/db-test.

  Era un endpoint de diagnóstico público (SELECT 1+1 contra MySQL) sin ningún
  consumidor en el frontend ni en el resto del backend. La conexión a la base ya
  se valida al arrancar el servidor (probarConexionBaseDatos() en server.js), así
  que no aportaba nada que /api/health no cubra, y exponía la disponibilidad del
  driver de base de datos a cualquiera sin autenticar.
*/

// Rutas para autenticación
app.use("/api/auth", authRoutes);

// Rutas para roles
app.use("/api/roles", rolesRoutes);

// Rutas para permisos
app.use("/api/permisos", permisosRoutes);

// Rutas para usuarios
app.use("/api/usuarios", usuariosRoutes);

// Rutas para catálogos de soporte (ABM 01)
app.use("/api/catalogos", catalogosRoutes);

// Rutas para pacientes (ABM 02)
app.use("/api/pacientes", pacientesRoutes);

// Rutas para tratamientos (ABM 03)
app.use("/api/tratamientos", tratamientosRoutes);

// Rutas para pagos (ABM 04)
app.use("/api/pagos", pagosRoutes);

// Rutas para gastos (ABM 05)
app.use("/api/gastos", gastosRoutes);

// Rutas para reportes (Módulo 06 — consumo, solo lectura)
app.use("/api/reportes", reportesRoutes);

/*
  FIX HT3 (AUD-04): cierre de la cadena de middlewares.
  Deben ir después de todas las rutas: primero el 404 uniforme y por último el
  manejador de errores centralizado.
*/
app.use(manejarRutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;

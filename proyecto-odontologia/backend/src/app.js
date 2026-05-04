const express = require("express");
const cors = require("cors");

const { poolDeConexiones } = require("./config/db");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    mensaje: "Backend funcionando correctamente",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [resultado] = await poolDeConexiones.query("SELECT 1 + 1 AS resultado");

    res.json({
      mensaje: "Conexión con MySQL funcionando correctamente",
      resultado: resultado[0].resultado,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al conectar con la base de datos",
      error: error.message,
    });
  }
});
// Rutas para autenticación
app.use("/api/auth", authRoutes);

module.exports = app;
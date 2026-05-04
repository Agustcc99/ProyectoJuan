const mysql = require("mysql2/promise");
require("dotenv").config();

const poolDeConexiones = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function probarConexionBaseDatos() {
  try {
    const conexion = await poolDeConexiones.getConnection();
    console.log("Conexión a MySQL realizada correctamente");
    conexion.release();
  } catch (error) {
    console.error("Error al conectar con MySQL:", error.message);
  }
}

module.exports = {
  poolDeConexiones,
  probarConexionBaseDatos,
};
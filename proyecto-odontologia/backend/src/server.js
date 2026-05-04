require("dotenv").config();

const app = require("./app");
const { probarConexionBaseDatos } = require("./config/db");

const puerto = process.env.PORT || 3000;

async function iniciarServidor() {
  await probarConexionBaseDatos();

  app.listen(puerto, () => {
    console.log(`Servidor backend escuchando en el puerto ${puerto}`);
  });
}

iniciarServidor();
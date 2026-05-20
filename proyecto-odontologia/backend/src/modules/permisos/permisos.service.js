const { poolDeConexiones } = require("../../config/db");

/*
  Obtiene todos los permisos activos del sistema.
  Estos permisos son los que después podrá asignar el administrador a cada rol.
*/
async function listarPermisosActivos() {
  const [permisosEncontrados] = await poolDeConexiones.query(
    `SELECT
        id_permiso,
        codigo_permiso,
        nombre_permiso,
        descripcion,
        activo
     FROM permisos
     WHERE activo = 1
     ORDER BY nombre_permiso ASC`
  );

  return permisosEncontrados;
}

module.exports = {
  listarPermisosActivos,
};
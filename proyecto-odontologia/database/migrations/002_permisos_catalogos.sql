-- ============================================================================
-- 002_permisos_catalogos.sql  ·  ABM 01 — Catálogos de soporte
-- ----------------------------------------------------------------------------
-- Alta de los dos permisos del ABM de catálogos y su asignación al rol
-- administrador (id_rol = 1). Los catálogos son administración pura, por eso
-- alcanza con un par ver / gestionar para los cuatro catálogos.
--
-- `INSERT IGNORE` + la clave única `codigo_permiso` hacen esta migración
-- reejecutable sin duplicar filas. La asignación a roles_permisos filtra por
-- código, así que no depende de un id_permiso fijo.
-- ============================================================================

INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_catalogos',       'Ver catálogos',       'Permite consultar los catálogos de soporte del sistema.', 1),
  ('gestionar_catalogos', 'Gestionar catálogos', 'Permite el alta, la edición y la baja lógica de ítems de catálogo.', 1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('ver_catalogos', 'gestionar_catalogos');

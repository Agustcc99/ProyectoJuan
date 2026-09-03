-- ============================================================================
-- 004_permisos_pacientes.sql  ·  ABM 02 — Pacientes
-- ----------------------------------------------------------------------------
-- Alta del par de permisos de baja lógica que faltaba para pacientes y su
-- asignación al rol administrador (id_rol = 1). ver_pacientes, crear_pacientes
-- y editar_pacientes ya estaban sembrados; acá se suman:
--   - desactivar_pacientes
--   - reactivar_pacientes
--
-- `INSERT IGNORE` + la clave única `codigo_permiso` hacen esta migración
-- reejecutable sin duplicar filas. La asignación a roles_permisos filtra por
-- código, así que no depende de un id_permiso fijo.
-- ============================================================================

INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('desactivar_pacientes', 'Desactivar pacientes', 'Baja lógica de fichas de paciente.', 1),
  ('reactivar_pacientes',  'Reactivar pacientes',  'Reactivar fichas de paciente dadas de baja.', 1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('desactivar_pacientes', 'reactivar_pacientes');

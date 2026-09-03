-- ============================================================================
-- 010_permisos_gastos.sql  ·  ABM 05 — Gastos
-- ----------------------------------------------------------------------------
-- Alta de los permisos de consulta / edición / anulación de gastos y su
-- asignación al rol administrador (id_rol = 1).
--
--   - ver_gastos:    ver los gastos del consultorio (listado + detalle).
--   - editar_gastos: editar tipo de gasto / imputación (tratamiento) / fecha /
--                    descripción de un gasto (el monto NO se edita: se anula y
--                    se registra uno nuevo).
--   - anular_gastos: anular un gasto registrado (baja lógica con motivo).
--
-- `registrar_gastos` (alta de gastos) YA estaba sembrado y asignado al rol
-- administrador, así que no se toca.
--
-- `INSERT IGNORE` + la clave única `codigo_permiso` hacen esta migración
-- reejecutable sin duplicar filas. La asignación a roles_permisos filtra por
-- código, así que no depende de un id_permiso fijo.
-- ============================================================================

INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_gastos',    'Ver gastos',    'Ver los gastos del consultorio.',                          1),
  ('editar_gastos', 'Editar gastos', 'Editar tipo, imputación, fecha o descripción de un gasto.', 1),
  ('anular_gastos', 'Anular gastos', 'Anular un gasto registrado (baja lógica con motivo).',      1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('ver_gastos', 'editar_gastos', 'anular_gastos');

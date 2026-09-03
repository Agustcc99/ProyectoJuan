-- ============================================================================
-- 006_permisos_tratamientos.sql  ·  ABM 03 — Tratamientos
-- ----------------------------------------------------------------------------
-- Alta de los permisos nuevos del motor de estados y su asignación al rol
-- administrador (id_rol = 1).
--
--   - cambiar_estado_tratamientos: avanzar el tratamiento en su flujo
--     (pendiente → en proceso → finalizado).
--   - cancelar_tratamientos: pasar un tratamiento a «cancelado» (baja lógica),
--     exige motivo.
--
-- ver_tratamientos, crear_tratamientos y editar_tratamientos (id 12–14) ya
-- estaban sembrados Y asignados al rol administrador, así que no se tocan.
--
-- `INSERT IGNORE` + la clave única `codigo_permiso` hacen esta migración
-- reejecutable sin duplicar filas. La asignación a roles_permisos filtra por
-- código, así que no depende de un id_permiso fijo.
-- ============================================================================

INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('cambiar_estado_tratamientos', 'Cambiar estado de tratamiento', 'Avanzar el tratamiento en su flujo de estados.', 1),
  ('cancelar_tratamientos',       'Cancelar tratamientos',         'Pasar un tratamiento a Cancelado (baja lógica con motivo).', 1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('cambiar_estado_tratamientos', 'cancelar_tratamientos');

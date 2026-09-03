-- ============================================================================
-- 008_permisos_pagos.sql  ·  ABM 04 — Pagos
-- ----------------------------------------------------------------------------
-- Alta de los permisos de consulta / edición / anulación de pagos y su
-- asignación al rol administrador (id_rol = 1).
--
--   - ver_pagos:    ver los pagos de tratamientos (listado de caja + detalle).
--   - editar_pagos: editar medio de pago / fecha / notas de un pago (el monto
--                   NO se edita: se anula y se registra uno nuevo).
--   - anular_pagos: anular un pago registrado (baja lógica con motivo).
--
-- `registrar_pagos` (alta de pagos) YA estaba sembrado y asignado al rol
-- administrador, así que no se toca.
--
-- `INSERT IGNORE` + la clave única `codigo_permiso` hacen esta migración
-- reejecutable sin duplicar filas. La asignación a roles_permisos filtra por
-- código, así que no depende de un id_permiso fijo.
-- ============================================================================

INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_pagos',    'Ver pagos',    'Ver los pagos de tratamientos.',            1),
  ('editar_pagos', 'Editar pagos', 'Editar medio de pago, fecha o notas de un pago.', 1),
  ('anular_pagos', 'Anular pagos', 'Anular un pago registrado (baja lógica con motivo).', 1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('ver_pagos', 'editar_pagos', 'anular_pagos');

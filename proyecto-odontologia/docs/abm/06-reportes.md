# 06 — `reportes` (Consumo — NO es un ABM)

> Requiere: `00-contexto-base.md` + ABM 01–05 completados (necesita datos reales de pagos y gastos).

## Objetivo

Módulo de **solo lectura** que responde la pregunta central del negocio (del documento de
proyecto): *cuánto se cobra, cuánto ingresa por cada práctica, cuánto se gasta*. No crea,
modifica ni da de baja nada — sin migración propia (salvo, si hace falta, un permiso).

## Alcance

Endpoints bajo `/api/reportes`, todos `verificarToken` + `verificarPermiso("ver_reportes")`
(permiso ya sembrado).

| Endpoint | Devuelve |
|---|---|
| `GET /resumen?desde=&hasta=` | Ingresos (Σ `pagos` con `anulado=0`), egresos (Σ `gastos` con `anulado=0`), resultado neto, cantidad de tratamientos por estado. |
| `GET /ingresos-por-tipo?desde=&hasta=` | Ingresos agrupados por `tipos_tratamiento` (qué práctica deja más). |
| `GET /ingresos-por-medio?desde=&hasta=` | Cobros agrupados por `medios_pago` (arqueo de caja). |
| `GET /egresos-por-tipo?desde=&hasta=` | Gastos agrupados por `tipos_gasto`. |
| `GET /pendientes` | Tratamientos con saldo > 0: paciente, tratamiento, precio, pagado, saldo. |
| `GET /mensual?anio=` | Serie de 12 meses: ingresos, egresos, neto. |

## Reglas

- Solo cuentan `pagos.anulado = 0` y `gastos.anulado = 0`.
- Rango por defecto: mes actual. Validar `desde <= hasta`.
- Sin escritura → sin auditoría, sin transacciones.
- Los ingresos por tipo de práctica se calculan uniendo `pagos → tratamientos → tipos_tratamiento`.

## Frontend — `modules/reportes/`

- En `AppRouter.jsx` reemplazar el `<Proximamente>` de la ruta `reportes` por `PaginaReportes`.
- Ya existe `frontend/src/modules/reportes/page/PaginaReportes.jsx` (revisar contenido actual).
- `PaginaReportes.jsx`: selector de período, tarjetas KPI (ingresos / egresos / neto), tabla de
  pendientes, y gráficos simples. **No agregar librería de charts sin avisar** — usar barras con
  `div`/CSS o tablas.
- El ítem "Reportes" ya existe en el menú (`ver_reportes`).

## Documento SprintLog

`docs/abm/entregas/06-reportes/sprintlog.md` — HU de consulta: resumen del período, ingresos por
práctica, arqueo por medio, egresos por tipo, pendientes, vista mensual. Criterios de aceptación
con datos concretos (validar contra los seeds). Sin secciones de transiciones/auditoría.

## Checklist de aceptación

- [ ] Resumen del período con ingresos, egresos y neto correctos (validado con datos de prueba: 1 pago de 20.000, 2 gastos de 15.000 + 30.000).
- [ ] Ingresos por tipo de práctica y por medio de pago.
- [ ] Lista de pendientes con saldo por tratamiento (tratamiento 1: saldo 30.000).
- [ ] Vista mensual del año.
- [ ] Anulados excluidos de todos los totales.
- [ ] Sin `ver_reportes` → 403 y pantalla de acceso denegado.
- [ ] `sprintlog.md` generado.

# Roadmap — Módulo de Consentimiento Informado (Sprint 6)

> Planificación. No contiene código. Ordena las 6 conversaciones, sus dependencias y
> la numeración de Historias de Usuario. Se lee junto con `00-contexto-y-arquitectura.md`.

---

## 1. Las 6 conversaciones

```
01. Base de datos            → 3 migraciones + seed de plantillas + permisos
02. Backend panel            → módulo autenticado /api/consentimientos (generar, listar, PDF, anular, cancelar)
03. Backend firma y sellado  → router público /api/publico/consentimientos + PDF (pdfkit) + huella SHA-256
04. Frontend panel           → sección en la ficha del tratamiento + modal + QR + polling + ver PDF
05. Frontend firma (tablet)  → ruta pública /firmar/:token + asistente paso a paso + lienzo
06. Documentación SprintLog  → .docx Sprint 6 + mockups + checklist + prueba manual de la API
```

### Dependencias entre conversaciones

```
01 ──▶ 02 ──▶ 03 ──▶ 05
        │       │
        └──▶ 04 ─┘   (04 necesita 02 para el panel; se prueba de punta a punta con 03 y 05)
                     06 va al final: documenta lo realmente implementado
```

- **02 depende de 01** (tablas + seed).
- **03 depende de 02** (comparte el `service`: reglas de sesión, snapshot, estados).
- **04 depende de 02** (consume los endpoints del panel; el QR ya se genera en 02).
- **05 depende de 03** (consume los endpoints públicos y el sellado).
- **06 depende de todo**: se genera **después** del código, con nombres reales de
  archivo / endpoint / permiso / columna, y sus criterios de aceptación coinciden 1:1 con
  los checklists de 01–05.

> **Prueba de punta a punta** (recomendada antes de la conv. 06): con 01–05 hechas,
> generar una sesión desde la ficha en la PC, escanear el QR con el celular/tablet en la
> misma red apuntando al frontend de dev, confirmar DNI, firmar los documentos y verificar
> que los PDF quedan sellados y descargables desde la ficha.

---

## 2. Historias de Usuario del Sprint 6

Numeración **propia del sprint** (HU1…HU7), igual que hicieron pagos (4.3) y gastos (4.4).

| Nro | Historia de Usuario | Prioridad | Estimación | Conversación | Dependencias |
|---|---|---|---|---|---|
| HU1 | Como asistente, quiero **seleccionar 1 o más documentos de consentimiento** para un tratamiento y **obtener un QR** para que el paciente los firme en la tablet. | Alta | M | 01, 02, 04 | ABM 03 + `generar_consentimientos` |
| HU2 | Como paciente, quiero **confirmar mi identidad con mi DNI** en la tablet antes de ver los documentos. | Alta | S | 01, 03, 05 | HU1 |
| HU3 | Como paciente, quiero **leer y firmar cada documento en secuencia** sobre un lienzo, viendo mi progreso. | Alta | M | 03, 05 | HU2 |
| HU4 | Como consultorio, quiero que cada firma **selle un PDF inmutable** con el texto exacto, mis datos, la fecha/hora del servidor y una **huella SHA-256**. | Alta | M | 03 | HU3 |
| HU5 | Como asistente, quiero **ver los consentimientos de un tratamiento** (estado y quién los generó/firmó) y **descargar los PDF** desde la ficha. | Alta | S/M | 02, 04 | HU1 |
| HU6 | Como responsable, quiero **anular un consentimiento firmado** indicando el motivo, sin perder el PDF ni el historial. | Media | S | 02, 04 | HU4 |
| HU7 | Como administrador, quiero **permisos diferenciados** (ver / generar / anular) y **trazabilidad** de cada acción (quién generó, IP/hora de la firma, quién anuló). | Media | S | 01, 02, 03 | HU1…HU6 |

### Reparto de HU por conversación

| Conversación | HU que cierra (total o parcialmente) |
|---|---|
| 01 Base de datos | Soporte de HU1, HU2, HU4, HU7 (tablas, seed, permisos) |
| 02 Backend panel | HU1 (generar sesión + QR), HU5 (listar + PDF), HU6 (anular), HU7 (permisos, auditoría de alta/anulación/cancelación) |
| 03 Backend firma y sellado | HU2 (identidad), HU3 (firmar), HU4 (sellado + huella), HU7 (traza de firma) |
| 04 Frontend panel | HU1 (modal + QR + polling), HU5 (sección + ver PDF), HU6 (modal anular) |
| 05 Frontend firma | HU2 (pantalla identidad), HU3 (asistente + lienzo + progreso) |
| 06 SprintLog | — (documentación) |

---

## 3. Numeración global del proyecto

`com.docx` usa: Sprint 1 = HU1–HU6 · Sprint 2 = HU7–HU12 · Sprint 3 = HT1–HT9 ·
Sprint 4 = HU13–HU16 (Tratamientos). Los ABM documentales posteriores usan numeración
propia por sprint (pagos 4.3 HU1–HU6, gastos 4.4 HU1–HU6, reportes 4.5 HU1–HU6).

**Este módulo = Sprint 6**, HU1–HU7 propias. El **Sprint 5** lo ocupa otra funcionalidad
que el dueño desarrolla antes (fuera de alcance de esta carpeta).

---

## 4. Escala de estimación (TSHIRT, la del modelo)

`XS` · `S` · `M` · `L` y combinaciones (`S/M`). **No usar horas.** Si una subtarea da `XL`,
partirla.

---

## 5. Checklist global de aceptación del módulo

Se cierra al terminar las 6 conversaciones. Cada ítem tiene su detalle en el documento
de su fase.

### Base de datos (01)
- [ ] 4 tablas nuevas creadas; ninguna tabla existente alterada salvo FKs.
- [ ] Seed: 3 plantillas activas en el consultorio 1, con su texto real.
- [ ] 3 permisos nuevos sembrados y asignados al rol administrador.
- [ ] Migraciones reejecutables sin error (`IF NOT EXISTS`, `INSERT IGNORE`, guard de FK).
- [ ] `database/README.md` actualizado.

### Backend panel (02)
- [ ] `POST /api/consentimientos/sesiones` crea la sesión + N documentos con snapshot y devuelve URL + QR.
- [ ] Bloquea si el tratamiento está cancelado / el paciente no tiene DNI / no se eligió ninguna plantilla.
- [ ] `GET /api/consentimientos/sesiones?id_tratamiento=` lista sesiones + documentos con estado; aplica expiración perezosa.
- [ ] `GET /api/consentimientos/:id/pdf` sirve el PDF solo si está `firmado`.
- [ ] `PATCH /api/consentimientos/:id/anular` exige permiso + motivo ≥ 5; conserva el PDF.
- [ ] `PATCH /api/consentimientos/sesiones/:id/cancelar` invalida el token.
- [ ] Auditoría de alta / anulación / cancelación en `auditoria_cambios`.
- [ ] Aislamiento por consultorio en todas las queries.
- [ ] Permisos: 403 sin `ver_/generar_/anular_consentimientos` según corresponda.

### Backend firma y sellado (03)
- [ ] `GET /api/publico/consentimientos/:token` devuelve datos mínimos; nunca DNI completo ni datos de contacto.
- [ ] `POST .../:token/identidad` valida el DNI normalizado; 5 intentos, al 6.º cancela la sesión.
- [ ] `POST .../:token/documentos/:id/firmar` sella el PDF, calcula la huella, marca `firmado`, en transacción con anti-replay.
- [ ] Token vencido → `expirada`; sesión `completa` / `cancelada` → rechaza nuevas firmas.
- [ ] El PDF contiene: título, "Odontología Herrera", datos del paciente, texto exacto, imagen de la firma, fecha/hora con zona, huella SHA-256 en el pie.
- [ ] Rate limiter por IP sobre el router público.
- [ ] `app.set("trust proxy", 1)` agregado y documentado.

### Frontend panel (04)
- [ ] Sección "Consentimientos" en la ficha del tratamiento (después de "Gastos imputados").
- [ ] Botón "Generar consentimiento" solo con permiso y si el tratamiento no está cancelado.
- [ ] Modal con las plantillas activas (checkboxes); al confirmar muestra el QR grande + link.
- [ ] Polling cada 5 s mientras el modal está abierto: refleja "firmado N de M" y el estado final.
- [ ] Lista de sesiones/documentos con badges; "Ver PDF" descarga el binario (con JWT, vía blob).
- [ ] Modal de anulación con motivo (mín. 5).

### Frontend firma (05)
- [ ] Ruta `/firmar/:token` accesible **sin login**, fuera de `/panel`.
- [ ] Usa `publicoApi` (no el `api` con JWT/redirección).
- [ ] Pantalla de identidad → documentos → lienzo (`react-signature-canvas`) → siguiente → éxito.
- [ ] El botón "Firmar" se habilita al llegar al final del texto.
- [ ] Estados de error claros: token inválido / expirado / sesión cancelada / ya completa.
- [ ] Responsive, mobile-first, botones grandes para táctil.

### Documentación (06)
- [ ] `SprintLog-Consentimientos.docx` con el formato de `com.docx` (Calibri, headings `#1F3864`/`#2E74B5`, tablas 9075 DXA, header con borde + footer con nº de página).
- [ ] Mockups en escala de grises en `entregas/.../mockups/`.
- [ ] Criterios de aceptación Gherkin 1:1 con los checklists de 01–05.
- [ ] Tabla de prueba manual de la API (autenticada + pública).
- [ ] Sección de reglas de negocio con las dos máquinas de estado.

---

## 6. Riesgos y mitigaciones (registro)

| Riesgo | Mitigación | Dónde se aborda |
|---|---|---|
| Endpoint público = superficie de ataque | Token de un solo uso + hash en BD + TTL + rate limit + salida mínima + anti-replay | 03 + `00-contexto` §4.1 |
| Fuerza bruta del DNI | Tope de 5 intentos por sesión → cancela | 03 |
| Pérdida de firmas por corte de red | Sellado incremental documento a documento | 03 + `00-contexto` D5 |
| PDF alterado antes de llegar a la BD | Generación 100% server-side + huella SHA-256 | 03 + `00-contexto` §4.2/§4.3 |
| `auditoria_cambios` no admite al paciente como actor | Traza de la firma en columnas propias | `00-contexto` §8 |
| Hora del dispositivo no confiable | Siempre `NOW()` del servidor; zona explícita en el PDF | `00-contexto` §9.3 |
| Filesystem efímero en despliegue | PDF como BLOB en MySQL | `00-contexto` D2 |
| `api` compartido secuestra el 401 en la tablet | Cliente `publicoApi` separado | 05 + `00-contexto` §4.4 |
| Cold start del hosting come el TTL | TTL de 30 min (no 15) | `00-contexto` D9 |

---

## 7. Estado

| Fase | Estado | Sprint / notas |
|---|---|---|
| 01 Base de datos | ⬜ Pendiente | Migraciones `0NN` — el número real se fija al abrir la conversación (siguiente disponible tras `010_permisos_gastos.sql`). |
| 02 Backend panel | ⬜ Pendiente | |
| 03 Backend firma y sellado | ⬜ Pendiente | |
| 04 Frontend panel | ⬜ Pendiente | |
| 05 Frontend firma (tablet) | ⬜ Pendiente | |
| 06 Documentación SprintLog | ⬜ Pendiente | Sprint documental 6, HU1–HU7. |

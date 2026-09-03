# Módulo de Consentimiento Informado con firma electrónica — Odontología Herrera

> **Sprint 6** del proyecto (el 5 ya está planificado aparte). Primer módulo **no-ABM**:
> es un subsistema con una pantalla pública, generación de PDF y sellado de integridad.
>
> Esta carpeta es el equivalente de `docs/abm/` pero para esta funcionalidad. Cada
> documento numerado se desarrolla en **una conversación nueva** de Claude Code sobre
> este repo, en orden, para no saturar un solo hilo.

---

## Qué se construye

Desde la ficha de un tratamiento, un usuario del consultorio genera una **sesión de
firma** eligiendo 1 o más documentos de consentimiento (3 plantillas fijas). El sistema
emite **un token de un solo uso con vencimiento** y lo muestra como **un QR** en la PC.
El paciente lo escanea con una tablet, **confirma su DNI**, y **firma cada documento en
secuencia** sobre un lienzo. Cada firma dispara en el backend el **sellado de un PDF
inmutable** (texto exacto + datos del paciente + firma + timestamp del servidor + huella
SHA-256), que queda vinculado al tratamiento con trazabilidad completa. Los consentimientos
no se borran: se **anulan** lógicamente con motivo.

---

## Cómo usar esta carpeta

1. Abrí una conversación nueva de Claude Code sobre este repo.
2. Decí: **"Leé `docs/abm/00-contexto-base.md` y `docs/Consentimiento/00-contexto-y-arquitectura.md`. Después desarrollá `docs/Consentimiento/0X-<archivo>.md`."**
3. Claude muestra el **plan** (archivos a crear/editar, SQL, endpoints, contratos) → das OK.
4. Se implementa esa fase, se prueba, se marca ✅ en `00-roadmap.md`.
5. Siguiente conversación, siguiente documento. **Respetá el orden 01 → 06.**

---

## Índice

| # | Documento | Conversación | Entregable |
|---|---|---|---|
| — | [`00-contexto-y-arquitectura.md`](00-contexto-y-arquitectura.md) | *(se lee al inicio de cada una)* | Contrato: decisiones cerradas, cambios de arquitectura, dependencias nuevas, **modelo de datos completo**, reglas transversales, glosario. |
| — | [`00-roadmap.md`](00-roadmap.md) | *(planificación)* | Orden de las 6 conversaciones, dependencias entre ellas, numeración de HU, checklist global de aceptación. |
| 01 | [`01-base-de-datos.md`](01-base-de-datos.md) | **Conv. 1 — BD** | 3 migraciones: tablas nuevas (`plantillas_consentimiento`, `consentimiento_sesiones`, `consentimientos`, `consentimientos_archivo`), seed de las 3 plantillas, 3 permisos nuevos. Actualiza `database/README.md` y `schema-actual.sql`. |
| 02 | [`02-backend-panel.md`](02-backend-panel.md) | **Conv. 2 — Backend panel** | Módulo `modules/consentimientos/` autenticado: generar sesión + QR, listar sesiones por tratamiento, descargar PDF, anular consentimiento, cancelar sesión. Alta en `app.js`. |
| 03 | [`03-backend-firma-y-sellado.md`](03-backend-firma-y-sellado.md) | **Conv. 3 — Backend firma pública** | Router público `modules/consentimientos/publico.*`: leer token, confirmar identidad, firmar documento. **Sellado del PDF con `pdfkit` + huella SHA-256.** Rate limiting propio. |
| 04 | [`04-frontend-panel.md`](04-frontend-panel.md) | **Conv. 4 — Frontend panel** | `modules/consentimientos/` (front): sección embebida en `DetalleTratamientoPage.jsx`, modal de selección de plantillas, panel de QR con *polling*, ver/descargar PDF, modal de anulación. |
| 05 | [`05-frontend-firma-tablet.md`](05-frontend-firma-tablet.md) | **Conv. 5 — Frontend tablet** | Ruta pública `/firmar/:token` **fuera de `/panel`**: asistente paso a paso (identidad → documento → lienzo → siguiente → éxito). Dependencia nueva `react-signature-canvas`. Cliente axios público separado. |
| 06 | [`06-documentacion-sprintlog.md`](06-documentacion-sprintlog.md) | **Conv. 6 — SprintLog** | Documento `.docx` Sprint 6 (formato calcado de `com.docx`) + mockups en escala de grises + checklist + tabla de prueba manual de la API. Entrega en `docs/Consentimiento/entregas/`. |

---

## Estado

Ver [`00-roadmap.md`](00-roadmap.md) §Estado. Al cierre de cada conversación se marca la fase.

- [ ] 01 — Base de datos
- [ ] 02 — Backend panel
- [ ] 03 — Backend firma y sellado
- [ ] 04 — Frontend panel
- [ ] 05 — Frontend firma (tablet)
- [ ] 06 — Documentación SprintLog

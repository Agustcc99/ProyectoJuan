# Conversación 6 — Documentación SprintLog (Sprint 6)

> Requiere: `docs/abm/_plantilla-documentacion.md` + `docs/abm/00-contexto-base.md`
> + `docs/Consentimiento/00-contexto-y-arquitectura.md` + Conversaciones 1–5 **implementadas y probadas**.
> Entregable: `docs/Consentimiento/entregas/consentimientos/SprintLog-Consentimientos.docx`
> + `sprintlog.md` + `mockups/*.png` + `generar-sprintlog.js` + `generar-mockups.js`.

---

## Objetivo

Generar el documento formal del Sprint 6, con **exactamente** el formato del modelo
`docs/abm/modelo/com.docx` (el mismo que siguieron los SprintLog de pagos y gastos). Este
módulo **no es un ABM**, pero el documento sigue la misma plantilla — con las secciones de
entidad transaccional adaptadas (tiene ciclo de estados y trazabilidad).

---

## Reutilizar el tooling ya conocido

Todo el "cómo" está en la memoria del proyecto y en los SprintLog previos:

- **`.docx`** con docx-js: el paquete `docx` no está en el repo. Instalarlo en un scratchpad
  y correr con `NODE_PATH`:
  `cd <scratchpad>/docxbuild && npm init -y && npm install docx@9`
  luego `NODE_PATH=<scratchpad>/docxbuild/node_modules node generar-sprintlog.js`.
- **Mockups HTML → PNG**: no hay LibreOffice ni Word. Chrome headless:
  `chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --window-size=1002,682 --screenshot="$WD/figN.png" "file:///$WD/figN.html"`
  (`WD=$(pwd -W)`). Da PNG 2004×1364.
- **Verificar el `.docx`** sin PDF: comparar estructura con `python-docx` contra
  `docs/abm/entregas/01-catalogos/SprintLog-Catalogos.docx` (referencia buena: page size,
  headings, tablas 9075 DXA, header con borde + footer con nº de página).
- Copiar `generar-sprintlog.js` y `generar-mockups.js` de una entrega previa
  (`docs/abm/entregas/05-gastos/`) como base y adaptar contenido.

Constantes de estilo (Calibri, `#1F3864` / `#2E74B5`, bordes `#999999`, header `#D9D9D9`,
A4, márgenes 1417 DXA): están en `docs/abm/_plantilla-documentacion.md` §1 — copiarlas tal cual.

---

## Ubicación de la entrega

Siguiendo el patrón `docs/abm/entregas/NN-<entidad>/`, pero dentro de esta carpeta:

```
docs/Consentimiento/entregas/consentimientos/
  SprintLog-Consentimientos.docx
  sprintlog.md
  generar-sprintlog.js
  generar-mockups.js
  mockups/
    fig1-generar.(html|png)
    fig2-qr-seguimiento.(html|png)
    fig3-identidad.(html|png)
    fig4-documento-lienzo.(html|png)
    fig5-progreso-exito.(html|png)
    fig6-seccion-ficha.(html|png)
    fig7-anular.(html|png)
    fig8-permisos.(html|png)
```

---

## Estructura del documento (orden calcado de `_plantilla-documentacion.md` §2)

```
[bloque de identificación — 4 párrafos]

H1  SPRINT 6 — Módulo de Consentimiento Informado con firma electrónica
normal  Subtítulo: "Generación, firma en dispositivo secundario y sellado inmutable de consentimientos"
normal  Agustin Tacconi Gianello - Practica Profesionalizante
normal  Desarrollo Web - 5to Semestre 2026
normal  Docente - Nadia Gallardo

H2  Objetivo del Sprint
    1–2 párrafos: qué resuelve (protección legal del consultorio), el flujo QR → tablet → PDF sellado,
    y por qué es un subsistema y no un ABM (pantalla pública, generación de archivos).

H2  Entidad seleccionada: Consentimiento (transaccional con firma externa)
    Intro + TABLA [ Señal exigida | Cómo la cumple el Consentimiento ]:
      Es un evento de negocio           | Se firma en un momento puntual, ligado a un tratamiento
      Afecta procesos                   | Habilita/documenta la ejecución del tratamiento; respaldo ante reclamos
      Tiene actores                     | Usuario que genera · Paciente que firma (no es usuario del sistema)
      Tiene ciclo de estados            | Documento: pendiente_firma → firmado → anulado. Sesión: pendiente → parcial → completa / expirada / cancelada
      Requiere trazabilidad/integridad  | Timestamp de servidor, IP, huella SHA-256, PDF inmutable en BD
    Cierre: relación 1—N con tratamientos; snapshot del texto legal.

H2  Sprint Backlog
    TABLA [ Nro | Historia de Usuario | Prioridad | Estimación | Dependencias ]  → HU1…HU7 de 00-roadmap.md §2

H2  Descripción de cada Historia de Usuario
    (H3 por HU, con "Descripción (formato Scrum)", H4 "Criterios de aceptación" en Gherkin,
     H4 "Prototipo de interfaz" + figura, H4 "Subtareas técnicas con estimación" + tabla TSHIRT)

H2  Reglas de negocio
    - Máquina de estados del DOCUMENTO (con diagrama ASCII) + transiciones válidas/prohibidas.
    - Máquina de estados de la SESIÓN (derivada) + cómo se llega a cada estado.
    - Seguridad de la superficie pública: token de un solo uso, hash en BD, TTL 30 min,
      expiración perezosa, tope de 5 intentos de DNI, salida mínima, anti-replay.
    - Integridad: payload canónico y huella SHA-256 (fórmula), timestamp de servidor, snapshot del texto.
    - Auditoría: qué va a auditoria_cambios (alta/anulación/cancelación) y por qué la firma del
      paciente NO va (FK a usuarios).

H2  Pruebas de criterios de aceptación
    TABLA por criterio [ Datos | Pasos | Resultado esperado | Evidencia ]  → derivar de las tablas de
    prueba manual de 02 y 03.

H2  Consideración para el Sprint 7: (lo que quedó fuera)
    - Plantillas editables desde el panel (hoy seed fijo).
    - Revocación del consentimiento por el propio paciente.
    - Logo del consultorio en el PDF.
    - Envío del PDF firmado por email al paciente (requiere SMTP real; hoy email.service.js es stub).
    - Migración del BLOB a storage externo si el volumen crece.
```

### HU y su figura

| HU | Título | Figura principal |
|---|---|---|
| HU1 | Seleccionar documentos y obtener el QR | fig1-generar + fig2-qr-seguimiento |
| HU2 | Confirmar identidad por DNI en la tablet | fig3-identidad |
| HU3 | Leer y firmar cada documento en secuencia | fig4-documento-lienzo + fig5-progreso-exito |
| HU4 | Sellado inmutable del PDF con huella SHA-256 | *(sin pantalla — describir el PDF resultante; opcional: recorte del pie del PDF)* |
| HU5 | Ver y descargar los consentimientos del tratamiento | fig6-seccion-ficha |
| HU6 | Anular un consentimiento firmado con motivo | fig7-anular |
| HU7 | Permisos diferenciados y trazabilidad | fig8-permisos |

### Criterios de aceptación (Gherkin) — deben coincidir 1:1 con los checklists

Fuente: el "Checklist de aceptación" de cada uno de `01`…`05`. Redactar en
`Dado / Cuando / Entonces` con datos concretos de los seeds reales (paciente **Ana Pérez**,
DNI **12.345.678**, tratamiento de **endodoncia**). Al menos 1 criterio positivo + 1 de
bloqueo por HU.

Ejemplos de arranque:

- **HU1 · Criterio "generación válida":**
  *Dado* un tratamiento de Ana Pérez en estado "en proceso" y el permiso `generar_consentimientos`,
  *Cuando* selecciono el "Consentimiento informado general" y confirmo,
  *Entonces* el sistema muestra un código QR y un enlace que vence en 30 minutos, y el
  documento queda en estado "pendiente_firma".
- **HU1 · Criterio "bloqueo por tratamiento cancelado":**
  *Dado* un tratamiento en estado "cancelado",
  *Cuando* intento generar un consentimiento,
  *Entonces* el sistema responde 409 con "No se puede generar un consentimiento para un
  tratamiento cancelado.".
- **HU2 · Criterio "tope de intentos":**
  *Dado* una sesión de firma abierta,
  *Cuando* ingreso un DNI incorrecto 6 veces,
  *Entonces* la sesión pasa a "cancelada" y la tablet muestra "Se canceló la firma por
  demasiados intentos.".
- **HU4 · Criterio "huella reproducible":**
  *Dado* un consentimiento firmado,
  *Cuando* recompongo el payload canónico desde la base de datos y lo hasheo con SHA-256,
  *Entonces* obtengo exactamente el valor guardado en `hash_documento` y el mismo que
  figura en el pie del PDF.

---

## Mockups (wireframes en escala de grises)

Estilo del modelo: fondo blanco, bordes finos gris, botón primario relleno gris oscuro,
sin color de marca. Las de panel (fig1, fig2, fig6, fig7, fig8) llevan el chrome del sistema
(sidebar "Consultorio Herrera" + topbar con breadcrumb). Las de tablet (fig3, fig4, fig5)
son pantallas despojadas, formato vertical angosto (simular tablet en mano).

| Figura | Pantalla |
|---|---|
| fig1-generar | Modal "Generar consentimiento": lista de plantillas con checkboxes + botón Generar |
| fig2-qr-seguimiento | Modal en modo QR: código grande + enlace + "Firmado 1 de 2" con lista de documentos |
| fig3-identidad | Tablet: "Confirmá tu DNI", pista "termina en 5678", input, botón Confirmar |
| fig4-documento-lienzo | Tablet: título + texto legal scrolleable + checkbox "leí y entiendo" + lienzo + Borrar/Confirmar |
| fig5-progreso-exito | Tablet: "Documento 2 de 2" y, al lado, pantalla de éxito "¡Listo! Firmaste los 2 documentos" |
| fig6-seccion-ficha | Ficha del tratamiento con la sección "Consentimientos": tarjeta de sesión, badges, "Ver PDF" / "Anular" |
| fig7-anular | Modal "Anular consentimiento": textarea de motivo + botón rojo |
| fig8-permisos | Pantalla de roles con los 3 permisos nuevos tildados para el rol administrador |

---

## `sprintlog.md`

El resumen en Markdown (como `docs/abm/entregas/04-pagos/sprintlog.md`): objetivo, backlog,
migraciones, endpoints (autenticados + públicos), reglas de negocio (2 máquinas de estado),
frontend (panel + tablet), checklist de aceptación consolidado, y la **tabla de prueba
manual de la API** unificada (autenticada de `02` + pública de `03`).

---

## Checklist de aceptación (Conversación 6)

- [ ] `SprintLog-Consentimientos.docx` generado con docx-js, abre limpio (validado con python-docx contra la referencia).
- [ ] Formato calcado de `com.docx`: A4, márgenes 1417, Calibri, H1/H2 `#1F3864`, H4 `#2E74B5` itálica, tablas 9075 DXA con borde `#999999` y header `#D9D9D9`, header con borde inferior + footer con nº de página centrado.
- [ ] Bloque de identificación (4 párrafos) al inicio.
- [ ] Sprint Backlog con HU1–HU7 (numeración propia del Sprint 6).
- [ ] Una H3 por HU con Scrum + Criterios Gherkin + figura + subtareas TSHIRT (sin horas).
- [ ] Sección "Reglas de negocio" con las 2 máquinas de estado y la fórmula de la huella.
- [ ] Sección "Pruebas de criterios" (Datos/Pasos/Resultado/Evidencia).
- [ ] 8 mockups PNG en escala de grises en `mockups/`, insertados 1 por `Paragraph` con su pie "Figura N – …".
- [ ] `sprintlog.md` + `generar-sprintlog.js` + `generar-mockups.js` en la carpeta de entrega.
- [ ] Criterios del `.docx` == checklists de `01`–`05` (revisado 1:1).
- [ ] `00-roadmap.md` §Estado marcado ✅ en las 6 fases.

---

## Cierre del módulo

Al terminar esta conversación, actualizar:
- `docs/Consentimiento/README.md` §Estado y `00-roadmap.md` §Estado → todas ✅.
- Si corresponde, una línea en `MEMORY.md` apuntando a esta carpeta como referencia del módulo.
